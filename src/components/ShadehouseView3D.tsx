import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Droplets, Layers, RotateCcw, Eye, Tag, Map as MapIcon, Compass, CloudRain, Mountain, Sun, Maximize2, Minimize2 } from "lucide-react";
import { terrainFall } from "../services/terrain";
import { atLocal, sunPosition, dayArc, localHours, nurseryToday } from "../services/solar";
import SceneCompass from "./SceneCompass";
import { useRadiation } from "../hooks/useRadiation";

/** Decimal local hours as a clock reading: 6.75 -> "06:45". */
function fmtHour(hours: number): string {
  const total = Math.round(hours * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
import {
  stateColors,
  type BedLevel,
  type ShadehouseBed,
} from "../services/shadehouseLayout";
import type { BedActivity } from "../services/bedState";
import ShadehouseScene, { placeBeds, HOME_CAMERA, HOME_TARGET, type LensMode } from "./ShadehouseScene";
import { useShadehouseBeds } from "../hooks/useShadehouseBeds";
import { readZone, zoneStatusColors, type ZoneReading } from "../services/irrigation";
import { buildZones, demoAnomalies, simulateFixes } from "../services/irrigationSim";
import { useCurrentWeather } from "../hooks/useCurrentWeather";
import { SceneErrorBoundary, WebglUnavailable, useWebgl } from "./WebglGuard";
import BedCockpit from "./BedCockpit";
import FeedBadge from "./FeedBadge";
import { useFeeds } from "../hooks/useFeeds";
import { precipitationKind, windDirectionLabel } from "../services/weather";

// Two air levels. The third carries the irrigation line, never a bed.
const ALL_LEVELS: BedLevel[] = [0, 1, 2];
const LEVEL_LABELS: Record<BedLevel, string> = {
  0: "Ground",
  1: "Air L1",
  2: "Air L2",
  3: "Air L3",
};

/** Wall clock drives the telemetry reader; the scene animates independently. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const LENSES: { id: LensMode; label: string }[] = [
  { id: "state", label: "Status" },
  { id: "age", label: "Plant age" },
  { id: "harvest", label: "Days to harvest" },
  { id: "irrigated", label: "Last irrigated" },
  { id: "issues", label: "Issues" },
  { id: "shade", label: "Shade" },
  { id: "light", label: "Light" },
];

const LENS_SCALES: Record<Exclude<LensMode, "state">, { low: string; high: string; gradient: string }> = {
  age: { low: "Just planted", high: "120+ days", gradient: "linear-gradient(90deg,#e8f4c8,#1a5c30)" },
  harvest: { low: "Overdue", high: "90+ days out", gradient: "linear-gradient(90deg,#c2410c,#fbbf24,#3d8b40)" },
  irrigated: { low: "Just watered", high: "12h+ dry", gradient: "linear-gradient(90deg,#38bdf8,#d6c7a0)" },
  issues: { low: "Healthy", high: "Needs attention", gradient: "linear-gradient(90deg,#c8cec4,#dc2626)" },
  shade: { low: "Single", high: "Triple", gradient: "linear-gradient(90deg,#c2cfc4,#7d9384,#3f5348)" },
  light: { low: "Triple · 4.3%", high: "Single · 35%", gradient: "linear-gradient(90deg,#26364a,#7d8a6a,#fad652)" },
};

export default function ShadehouseView3D({ className = "" }: { className?: string }) {
  // The stack is the real bed set: ground beds and whatever cable levels have
  // actually been created above them. It used to be generated, which is why
  // the model showed cables the nursery has not strung.
  const {
    beds, loading, historyFor,
  }: {
    beds: ShadehouseBed[];
    loading: boolean;
    historyFor: (bedName: string) => BedActivity[];
  } = useShadehouseBeds();
  const [visibleLevels, setVisibleLevels] = useState<Set<BedLevel>>(
    () => new Set(ALL_LEVELS)
  );
  /**
   * Off, and not switchable, until a controller is connected.
   *
   * The zone colours, the flow rates and the "signal lost" states are a
   * simulation — good for showing what the layer will do, and dishonest on a
   * screen somebody makes decisions from. The layer chip says unavailable and
   * this stays false; nothing here is deleted, so connecting a controller is
   * a matter of feeding it real readings.
   */
  const showIrrigation = false;
  const [lens, setLens] = useState<LensMode>("state");
  const [showPlotLabels, setShowPlotLabels] = useState(true);
  // On by default: a bed you cannot name is a bed you cannot go and find.
  const [showBedNumbers, setShowBedNumbers] = useState(true);
  const [showCompass, setShowCompass] = useState(true);
  // Off by default: it is reference, and it competes with the bed colours.
  const [showTopography, setShowTopography] = useState(false);
  /** Which way the camera faces, so the corner rose can turn with it. */
  const [heading, setHeading] = useState(0);

  /**
   * Sun simulation. Off by default — the studio lamp reads the layout better —
   * but once on, the scene is lit by where the sun actually is at that moment,
   * so the shadows are the real ones.
   */
  const [showSun, setShowSun] = useState(false);
  /**
   * The layer opens where the sun actually is.
   *
   * It used to open at noon on today's date, which is a fair guess and never
   * the answer to the question being asked — "is that bed in shade right now".
   * Honduras keeps UTC-6 all year, so the nursery's clock is a fixed offset
   * from this machine's, whatever timezone the machine is in.
   */
  const [sunHour, setSunHour] = useState(() => localHours(new Date()));
  const [sunDate, setSunDate] = useState(() => nurseryToday());
  const [showSunPath, setShowSunPath] = useState(true);
  /** True while the sun is following the clock rather than the slider. */
  const [followNow, setFollowNow] = useState(true);

  // Keep it there. A view of "now" that stops being now within the minute is
  // worse than one that never claimed to be.
  useEffect(() => {
    if (!showSun || !followNow) return;
    const tick = () => {
      setSunHour(localHours(new Date()));
      setSunDate(nurseryToday());
    };
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [showSun, followNow]);

  const sunAt = useMemo(
    () => (showSun ? atLocal(sunDate, sunHour) : null),
    [showSun, sunDate, sunHour]
  );
  /** Where the sun stands at that moment, for the readout beside the slider. */
  const sunNow = useMemo(() => (sunAt ? sunPosition(sunAt) : null), [sunAt]);
  const arc = useMemo(() => (showSun ? dayArc(sunDate) : null), [showSun, sunDate]);
  // The cloth is the point of a shadehouse, so it is on by default.
  const [showShade, setShowShade] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const feeds = useFeeds();
  const weatherFeed = feeds.find((f) => f.id === "weather");
  const webgl = useWebgl();
  useEffect(() => {
    console.info(
      webgl.ok ? `[3d] WebGL OK — ${webgl.renderer}` : `[3d] WebGL unavailable — ${webgl.reason}`
    );
  }, [webgl]);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  /**
   * The scene filled a fixed 460 px whatever the screen was, which on a laptop
   * is a letterbox: the house is 110 m wide and 80 deep, so a wide, shallow
   * frame either shows it tiny or crops the far fields. It now takes what the
   * window can spare, and expands to the whole of it on request.
   */
  const [expanded, setExpanded] = useState(false);

  // Escape leaves the expanded view. Without it the only way out is the
  // button, which is somewhere the eye is not while orbiting.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const placements = useMemo(() => placeBeds(beds), [beds]);
  const baseZones = useMemo(() => buildZones(beds), [beds]);
  const anomalies = useMemo(() => demoAnomalies(baseZones), [baseZones]);

  // Re-read at 1s; the reader itself renders one poll interval behind and
  // interpolates, so this only controls how often we re-sample that curve.
  const now = useNow(1000);
  const { conditions: weather, loading: weatherLoading } = useCurrentWeather();
  // Stored history plus the live window: the store reaches back past the feed's
  // 92 days, which is what a planting older than that needs.
  const { radiation } = useRadiation();

  const readings = useMemo(() => {
    const zones = simulateFixes(baseZones, now, anomalies);
    const map = new Map<string, ZoneReading>();
    for (const zone of zones) map.set(zone.bedId, readZone(zone, now));
    return map;
  }, [baseZones, now, anomalies]);

  const toggleLevel = (level: BedLevel) => {
    setVisibleLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      // Never leave the scene empty.
      return next.size === 0 ? new Set([level]) : next;
    });
  };

  const levelCounts = useMemo(() => {
    const counts = new Map<BedLevel, number>();
    for (const bed of beds) counts.set(bed.level, (counts.get(bed.level) ?? 0) + 1);
    return counts;
  }, [beds]);

  const running = useMemo(
    () =>
      [...readings.values()].filter(
        (r) => r.status === "running" && visibleLevels.has(
          beds.find((b) => b.bedId === r.bedId)?.level ?? 0
        )
      ),
    [readings, visibleLevels, beds]
  );

  const degraded = useMemo(
    () => [...readings.values()].filter((r) => r.status === "stale" || r.status === "fault"),
    [readings]
  );

  const selected = selectedBedId ? beds.find((b) => b.bedId === selectedBedId) : null;

  const selectedReading = selectedBedId ? readings.get(selectedBedId) : undefined;

  const totalFlow = running.reduce((sum, r) => sum + r.flowLpm, 0);

  return (
    <div
      className={`card-surface bg-white dark:bg-d-card border border-sand-200/80 dark:border-white/10 overflow-hidden ${
        expanded
          ? "fixed inset-3 z-50 rounded-xl shadow-2xl overflow-y-auto"
          : `rounded-xl ${className}`
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h3 className="text-[15px] font-bold text-navy-900 dark:text-d-primary">Shadehouse — 3D</h3>
          <p className="text-[11px] text-navy-400 dark:text-d-secondary">
            {beds.length} beds across {new Set(beds.map((b) => b.fieldId)).size} fields ·
            ground rows plus cable lines above · drag to orbit
          </p>
        </div>


        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Back to the page (Esc)" : "Fill the window"}
            aria-label={expanded ? "Shrink the scene" : "Expand the scene"}
            className="p-2 rounded-lg bg-sand-100 text-navy-500 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            {expanded
              ? <Minimize2 className="w-3.5 h-3.5" />
              : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setResetKey((k) => k + 1)}
            title="Reset view"
            className="p-2 rounded-lg bg-sand-100 text-navy-500 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layer strip */}
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-navy-400 dark:text-d-secondary uppercase tracking-[0.12em] mr-1">
          <Layers className="w-3.5 h-3.5" />
          Layers
        </span>
        {ALL_LEVELS.map((level) => {
          const active = visibleLevels.has(level);
          const count = levelCounts.get(level) ?? 0;
          if (!count) return null;
          return (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                active
                  ? "chip-selected"
                  : "bg-sand-100 text-navy-400 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10"
              }`}
            >
              {LEVEL_LABELS[level]}
              <span className={active ? "text-white/50" : "text-navy-300"}>{count}</span>
            </button>
          );
        })}

        <span className="w-px h-4 bg-sand-200 mx-1" />

        <button
          onClick={() => setShowPlotLabels((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
            showPlotLabels ? "chip-selected" : "bg-sand-100 text-navy-400 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10"
          }`}
        >
          <MapIcon className="w-3 h-3" />
          Fields
        </button>
        <button
          onClick={() => setShowWeather((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
            showWeather ? "chip-selected" : "bg-sand-100 text-navy-400 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10"
          }`}
        >
          <CloudRain className="w-3 h-3" />
          Weather
        </button>
        <button
          onClick={() => setShowCompass((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
            showCompass ? "chip-selected" : "bg-sand-100 text-navy-400 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10"
          }`}
        >
          <Compass className="w-3 h-3" />
          Compass
        </button>
        <button
          onClick={() => setShowShade((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
            showShade ? "chip-selected" : "bg-sand-100 text-navy-400 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10"
          }`}
        >
          <Layers className="w-3 h-3" />
          Shade
        </button>
        <button
          onClick={() => setShowSun((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
            showSun ? "chip-selected" : "bg-sand-100 text-navy-400 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10"
          }`}
        >
          <Sun className="w-3 h-3" />
          Sun
        </button>
        <button
          onClick={() => setShowTopography((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
            showTopography ? "chip-selected" : "bg-sand-100 text-navy-400 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10"
          }`}
        >
          <Mountain className="w-3 h-3" />
          Terrain
        </button>
        <button
          onClick={() => setShowBedNumbers((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
            showBedNumbers ? "chip-selected" : "bg-sand-100 text-navy-400 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10"
          }`}
        >
          <Tag className="w-3 h-3" />
          Bed numbers
        </button>

        {/* Irrigation sits with the other layers because that is what it will
            be. It is not switchable yet: no controller is connected, and the
            zone colours elsewhere in this view are a simulation. A layer that
            says "unavailable" is honest; one that toggles a demonstration and
            calls it irrigation is not. */}
        <span
          title="No controller is connected yet — see Settings, where the data comes from"
          aria-disabled="true"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold
                     bg-sand-50 text-navy-300 ring-1 ring-sand-200 cursor-not-allowed
                     dark:bg-white/[0.03] dark:text-white/25 dark:ring-white/5"
        >
          <Droplets className="w-3 h-3" />
          Irrigation
          <span className="text-[9px] uppercase tracking-[0.1em] font-bold">unavailable</span>
        </span>

        {showSun && arc && sunNow && (
          <span className="inline-flex items-center gap-2 ml-auto px-2.5 py-1 rounded-md bg-amber-50 ring-1 ring-amber-200/70">
            <span className="text-[10px] text-amber-900 tabular-nums whitespace-nowrap">
              {/* Sunrise and sunset for the date being simulated, so the
                  slider's ends mean something. */}
              {fmtHour(arc.sunrise ?? 0)}–{fmtHour(arc.sunset ?? 0)} ·
              {" "}{arc.daylight.toFixed(1)} h of daylight
            </span>
          </span>
        )}

        {showTopography && (
          <span className="inline-flex items-center gap-2 ml-auto px-2.5 py-1 rounded-md bg-sand-100 ring-1 ring-sand-300/70">
            {/* Say what the reader is looking at, and what it is not. The
                survey covers the whole nursery, so the overlay is stretched
                onto this block: where the ground is high is right, a distance
                measured off it is not. */}
            <span
              className="w-8 h-2 rounded-sm"
              style={{ background: "linear-gradient(90deg, rgb(122 148 154), rgb(166 178 150), rgb(198 176 132))" }}
            />
            <span className="text-[10px] text-navy-500 whitespace-nowrap">
              Survey contours · 0.5 m · falls {terrainFall().fall.toFixed(1)} m
              <span className="text-navy-400"> · indicative, not to scale</span>
            </span>
          </span>
        )}

        {showIrrigation && (
          <span className="inline-flex items-center gap-2 ml-auto px-2.5 py-1 rounded-md bg-sky-50 ring-1 ring-sky-200/60">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-sky-400 opacity-70 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-sky-500" />
            </span>
            <span className="text-[11px] font-semibold text-sky-700 tabular-nums">
              {running.length} irrigating · {totalFlow.toFixed(1)} L/min
            </span>
            {/* Provenance is never implied. The feed says what it is. */}
            <span className="text-[10px] font-semibold text-sky-600/70 uppercase tracking-wider">
              simulated
            </span>
          </span>
        )}
      </div>

      {/* Lens strip — same geometry, different question. */}
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-navy-400 dark:text-d-secondary uppercase tracking-[0.12em] mr-1">
          <Eye className="w-3.5 h-3.5" />
          View by
        </span>
        {LENSES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setLens(id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
              lens === id
                ? "chip-selected"
                : "bg-sand-100 text-navy-400 hover:bg-sand-200 dark:bg-white/5 dark:text-d-secondary dark:hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
        {showIrrigation && lens !== "state" && (
          <span className="text-[10px] text-navy-400 ml-1">
            Live irrigation still overrides this view
          </span>
        )}
      </div>

      {/* ── The day, as a slider ────────────────────────────────────────────
          Where the shade falls at any hour is the whole question, and it is
          not a thing to be read off a table. Drag it and watch. */}
      {showSun && sunNow && arc && (
        <div className="mx-5 mb-3 p-3 rounded-lg bg-navy-900 ring-1 ring-navy-700/50">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-[11px] text-white/55">
              Date
              <input
                type="date"
                value={sunDate}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setSunDate(e.target.value);
                  setFollowNow(false);
                }}
                className="bg-white/10 text-white rounded px-2 py-1 text-[11px]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50"
              />
            </label>

            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-[17px] font-bold text-white">{fmtHour(sunHour)}</span>
              {followNow && (
                <span className="px-1.5 py-0.5 rounded bg-lime-400/15 text-[9px] font-semibold
                                 uppercase tracking-[0.1em] text-lime-300">
                  Now
                </span>
              )}
              <span className="text-[11px] text-white/50">
                {sunNow.altitude > 0
                  ? `sun ${sunNow.altitude.toFixed(0)}° up, bearing ${sunNow.azimuth.toFixed(0)}°`
                  : "below the horizon"}
              </span>
            </div>

            {/* Back to the clock, after a look at some other hour. */}
            <button
              type="button"
              onClick={() => {
                setSunDate(nurseryToday());
                setSunHour(localHours(new Date()));
                setFollowNow(true);
              }}
              disabled={followNow}
              className="ml-auto px-2 py-1 rounded text-[10px] font-semibold cursor-pointer
                bg-white/10 text-white/70 hover:text-white disabled:opacity-30
                disabled:cursor-not-allowed transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50"
            >
              Now
            </button>

            <button
              type="button"
              onClick={() => setShowSunPath((v) => !v)}
              aria-pressed={showSunPath}
              className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50 ${
                showSunPath ? "bg-lime-400 text-navy-900" : "bg-white/10 text-white/55 hover:text-white/85"
              }`}
            >
              Sun path
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={24}
            step={0.25}
            value={sunHour}
            onChange={(e) => {
              setSunHour(Number(e.target.value));
              setFollowNow(false);
            }}
            aria-label="Time of day"
            className="w-full mt-2.5 accent-lime-400 cursor-pointer"
          />

          <div className="flex justify-between mt-1 text-[10px] text-white/35 tabular-nums">
            {[0, 6, 12, 18, 24].map((h) => <span key={h}>{fmtHour(h)}</span>)}
          </div>
        </div>
      )}

      {/* Scene */}
      <div
        className="relative bg-gradient-to-b from-sand-50 to-sand-100
                   dark:from-[#0b1119] dark:to-[#131c28]"
        style={{
          // Enough to see the house in, never taller than the window: clamp
          // keeps a short laptop screen usable and lets a large one breathe.
          height: expanded ? "calc(100vh - 210px)" : "clamp(460px, 68vh, 860px)",
        }}
      >
        {loading ? (
          /* The house is drawn to fit the beds, so with none read yet it is
             built at a default size and then rebuilt — a different model
             flashing up for a frame. Better to say it is loading. */
          <div className="h-full flex flex-col items-center justify-center gap-2 text-navy-400">
            <div className="w-5 h-5 rounded-full border-2 border-navy-200 border-t-navy-500 animate-spin" />
            <p className="text-[12px]">Reading the beds…</p>
          </div>
        ) : beds.length === 0 ? (
          /* Same reason: with nothing to draw, the house has no size, and what
             comes out is roads at full width around a floor built for nothing. */
          <div className="h-full flex flex-col items-center justify-center gap-1 text-navy-400">
            <p className="text-[13px] font-semibold text-navy-600">No beds recorded yet</p>
            <p className="text-[12px]">Add them under Infrastructure and the house appears here.</p>
          </div>
        ) : !webgl.ok ? (
          <WebglUnavailable report={webgl} />
        ) : (
        <SceneErrorBoundary>
        <Canvas
          key={resetKey}
          shadows="percentage"
          dpr={[1, 2]}
          gl={{ antialias: true, toneMappingExposure: 1.05 }}
          // Near and far matter twice over: the sky dome and the valley are
          // kilometres out and were being clipped away entirely, and a
          // 0.1–2000 range spends most of its depth precision on the first
          // metre, which is what lets coplanar surfaces flicker. 1–12000 is a
          // shallower ratio than the default and reaches the horizon.
          camera={{ position: HOME_CAMERA, fov: 36, near: 1, far: 12000 }}
          onPointerMissed={() => setSelectedBedId(null)}
        >
          <ShadehouseScene
            placements={placements}
            readings={readings}
            visibleLevels={visibleLevels}
            showIrrigation={showIrrigation}
            showRoof={false}
            showShade={showShade}
            lens={lens}
            nowMs={now}
            showPlotLabels={showPlotLabels}
            showBedNumbers={showBedNumbers}
            showCompass={showCompass}
            onCameraHeading={showCompass ? setHeading : undefined}
            showTopography={showTopography}
            sunAt={sunAt}
            showSunPath={showSunPath}
            weather={showWeather ? weather : null}
            selectedBedId={selectedBedId}
            onSelect={setSelectedBedId}
          />
          <OrbitControls
            makeDefault
            enablePan
            minDistance={12}
            // Far enough out to see the nursery in its valley: the ground
            // model runs 1.2 km each way, and a limit of 140 m meant nobody
            // could ever pull back far enough to look at it.
            maxDistance={900}
            maxPolarAngle={Math.PI / 2.15}
            target={HOME_TARGET}
          />
        </Canvas>

        {showCompass && <SceneCompass heading={heading} />}
        </SceneErrorBoundary>
        )}

        {/* Live conditions — provenance stated, like the irrigation feed. */}
        {showWeather && (
          <div className="absolute left-4 top-4 px-3 py-2 rounded-lg bg-white/92 dark:bg-navy-900/85 backdrop-blur ring-1 ring-sand-200 dark:ring-white/10 shadow-sm">
            {weatherLoading && !weather ? (
              <p className="text-[11px] text-navy-400">Loading weather…</p>
            ) : weather ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-[17px] font-bold text-navy-900 dark:text-d-primary tabular-nums">
                    {weather.temperature.toFixed(1)}°C
                  </span>
                  <span className="text-[11px] text-navy-500 dark:text-d-secondary">
                    {weather.windSpeed.toFixed(0)} km/h{" "}
                    {windDirectionLabel(weather.windDirection)}
                  </span>
                </div>
                <p className="text-[10px] text-navy-400 dark:text-d-secondary mt-0.5">
                  {weather.humidity}% humidity · {weather.cloudCover}% cloud
                  {precipitationKind(weather.weatherCode) !== "none" &&
                    ` · ${weather.precipitation.toFixed(1)} mm`}
                </p>
                {/* Not a fixed "Live" any more: the chip says how old the
                    reading actually is, so a feed that stopped an hour ago
                    stops looking like a quiet afternoon. */}
                {weatherFeed && <FeedBadge feed={weatherFeed} className="mt-1" />}
              </>
            ) : (
              <p className="text-[11px] text-amber-600">Weather unavailable</p>
            )}
          </div>
        )}

        {/* Selection readout */}
        {selected && (
          <BedCockpit
            bed={selected}
            activity={historyFor(selected.bedId)}
            onDate={sunDate}
            radiation={radiation}
            onClose={() => setSelectedBedId(null)}
          >
            {selectedReading && showIrrigation && (
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 border-t border-white/10">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: zoneStatusColors[selectedReading.status].fill }}
                />
                <span className="text-[11px] text-white/80">
                  {zoneStatusColors[selectedReading.status].label}
                  {selectedReading.status === "running" &&
                    ` · ${selectedReading.flowLpm.toFixed(1)} L/min`}
                  {selectedReading.status === "stale" &&
                    ` · ${Math.round(selectedReading.ageMs / 1000)}s since contact`}
                </span>
                <span className="ml-auto text-[9px] font-semibold text-white/35 uppercase tracking-wider">
                  {selectedReading.feed}
                </span>
              </div>
            )}
          </BedCockpit>
        )}

        {/* Degraded-feed notice — the one thing that must never be silent. */}
        {showIrrigation && degraded.length > 0 && (
          <div className="absolute right-4 top-4 px-3 py-2 rounded-lg bg-white/95 dark:bg-navy-900/90 backdrop-blur ring-1 ring-sand-200 dark:ring-white/10 shadow-sm">
            <p className="text-[11px] font-semibold text-navy-800">
              {degraded.length} {degraded.length === 1 ? "zone" : "zones"} not reporting
            </p>
            <p className="text-[10px] text-navy-400 mt-0.5">
              Coast window exceeded — state unknown, not idle
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 border-t border-sand-100">
        {showIrrigation &&
          (["running", "stale", "fault"] as const).map((st) => (
            <span key={st} className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-[3px]"
                style={{ backgroundColor: zoneStatusColors[st].fill }}
              />
              <span className="text-[11px] text-navy-400">{zoneStatusColors[st].label}</span>
            </span>
          ))}

        {showIrrigation && <span className="w-px h-3.5 bg-sand-200" />}

        {lens === "state" ? (
          Object.entries(stateColors).map(([key, c]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: c.fill }} />
              <span className="text-[11px] text-navy-400">{c.label}</span>
            </span>
          ))
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="text-[11px] text-navy-400">{LENS_SCALES[lens].low}</span>
            <span
              className="h-2 w-24 rounded-full"
              style={{ background: LENS_SCALES[lens].gradient }}
            />
            <span className="text-[11px] text-navy-400">{LENS_SCALES[lens].high}</span>
          </span>
        )}
      </div>
    </div>
  );
}
