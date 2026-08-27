/**
 * Irrigation telemetry model.
 *
 * Borrowed wholesale from God's Eye View's handling of live feeds, because the
 * failure mode is identical: telemetry arrives at intervals, and naive
 * rendering either freezes or jumps. Two rules carry over —
 *
 *   1. Render one polling interval BEHIND the newest fix and interpolate
 *      toward it, so choppy updates read as continuous motion.
 *   2. Coast forward only for a BOUNDED window after last contact, then say
 *      "stale" out loud. Never keep showing water on a bed because the
 *      controller went quiet — a grower would believe a row was watered.
 */

export type ZoneStatus = "idle" | "running" | "stale" | "fault" | "unknown";

/** Freshness of the feed itself, distinct from what the valve is doing. */
export type FeedState = "live" | "delayed" | "simulated" | "unavailable";

export interface ZoneFix {
  /** When the controller observed this state. */
  epochMs: number;
  status: "idle" | "running" | "fault";
  /** Litres per minute at the valve; 0 when idle. */
  flowLpm: number;
  /** Fraction of the run completed, 0-1, when the controller reports a plan. */
  progress?: number;
}

export interface IrrigationZone {
  zoneId: string;
  /** The bed-level this valve feeds — one cable line, or one ground row. */
  bedId: string;
  label: string;
  fixes: ZoneFix[];
  feed: FeedState;
}

/** Matches the 15-30s cadence God's Eye View assumes for live feeds. */
export const POLL_INTERVAL_MS = 20_000;

/**
 * How long a zone may coast on its last fix before it is called stale.
 * Bounded: a cached or dead feed must never water a bed indefinitely.
 */
export function staleCoastLimitMs({
  fixEpochMs,
  lastContactEpochMs,
  minimumMs = 45_000,
  contactGraceMs = 30_000,
  maximumMs = 180_000,
}: {
  fixEpochMs: number;
  lastContactEpochMs: number;
  minimumMs?: number;
  contactGraceMs?: number;
  maximumMs?: number;
}): number {
  const floor = Math.max(0, minimumMs);
  const ceiling = Math.max(floor, maximumMs);
  if (!Number.isFinite(fixEpochMs) || !Number.isFinite(lastContactEpochMs)) return floor;
  const contactLead = Math.max(0, lastContactEpochMs - fixEpochMs);
  return Math.min(ceiling, Math.max(floor, contactLead + contactGraceMs));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export interface ZoneReading {
  zoneId: string;
  bedId: string;
  label: string;
  status: ZoneStatus;
  /** Interpolated, not the raw newest fix. */
  flowLpm: number;
  progress: number;
  feed: FeedState;
  ageMs: number;
  /** Time since this zone last actually ran; Infinity if never seen running. */
  lastRunAgeMs: number;
}

/**
 * Resolve what to DISPLAY for a zone at wall-clock time `nowMs`.
 *
 * Deliberately renders at `nowMs - POLL_INTERVAL_MS` and interpolates between
 * the two fixes bracketing that moment. The cost is one interval of latency;
 * the gain is that the visual never jumps.
 */
export function readZone(zone: IrrigationZone, nowMs: number): ZoneReading {
  const base = {
    zoneId: zone.zoneId,
    bedId: zone.bedId,
    label: zone.label,
    feed: zone.feed,
  };

  if (zone.feed === "unavailable" || zone.fixes.length === 0) {
    return { ...base, status: "unknown", flowLpm: 0, progress: 0, ageMs: Infinity, lastRunAgeMs: Infinity };
  }

  const fixes = [...zone.fixes].sort((a, b) => a.epochMs - b.epochMs);
  const lastRun = [...fixes].reverse().find((f) => f.status === "running" && f.flowLpm > 0);
  const lastRunAgeMs = lastRun ? nowMs - lastRun.epochMs : Infinity;
  const newest = fixes[fixes.length - 1];
  const renderAt = nowMs - POLL_INTERVAL_MS;
  const ageMs = nowMs - newest.epochMs;

  const coastLimit = staleCoastLimitMs({
    fixEpochMs: newest.epochMs,
    lastContactEpochMs: newest.epochMs,
  });

  // Past the coast horizon the feed has gone quiet. Say so; do not extrapolate.
  if (ageMs > coastLimit) {
    return { ...base, status: "stale", flowLpm: 0, progress: 0, ageMs, lastRunAgeMs };
  }

  if (newest.status === "fault") {
    return { ...base, status: "fault", flowLpm: 0, progress: newest.progress ?? 0, ageMs, lastRunAgeMs };
  }

  // Find the pair of fixes bracketing the render moment.
  let prev = fixes[0];
  let next = fixes[fixes.length - 1];
  for (let i = 0; i < fixes.length - 1; i++) {
    if (fixes[i].epochMs <= renderAt && fixes[i + 1].epochMs >= renderAt) {
      prev = fixes[i];
      next = fixes[i + 1];
      break;
    }
  }

  const span = next.epochMs - prev.epochMs;
  const t = span <= 0 ? 1 : Math.min(1, Math.max(0, (renderAt - prev.epochMs) / span));

  // A valve that is opening or closing crosses zero smoothly rather than
  // snapping, which is what makes the flow read as water rather than a toggle.
  const flowLpm = lerp(prev.flowLpm, next.flowLpm, t);
  const progress = lerp(prev.progress ?? 0, next.progress ?? 0, t);

  const running = flowLpm > 0.05;
  return {
    ...base,
    status: running ? "running" : "idle",
    flowLpm,
    progress,
    ageMs,
    lastRunAgeMs: running ? 0 : lastRunAgeMs,
  };
}

export const zoneStatusColors: Record<ZoneStatus, { fill: string; label: string }> = {
  running: { fill: "#38bdf8", label: "Irrigating" },
  idle: { fill: "#94a3b8", label: "Idle" },
  stale: { fill: "#a855f7", label: "Signal lost" },
  fault: { fill: "#ef4444", label: "Fault" },
  unknown: { fill: "#64748b", label: "No data" },
};
