/**
 * When each wave of planting was made and when it should be ready.
 *
 * A cohort — one variety, planted in one week, across however many beds — is
 * the unit, because a variety is chosen per bed and the same variety gets
 * planted in waves. Anything coarser hides the waves; anything finer is a
 * chart of one row per bed.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useRecords } from "../hooks/useRecords";
import { cohorts, missingCycles, type PlantCycle } from "../services/productionSchedule";
import Badge from "./Badge";

interface PlantingRow {
  id: string;
  bed?: string;
  plant?: string;
  date?: string;
  qty?: number;
  status?: string;
}
interface PlantRow {
  id: string;
  name?: string;
  variety?: string;
  growthWeeksMinMarAug?: number;
  growthWeeksMaxMarAug?: number;
  growthWeeksMinSepFeb?: number;
  growthWeeksMaxSepFeb?: number;
}

const day = 86_400_000;
const parse = (s: string) => new Date(`${s}T00:00:00Z`);

export default function ProductionSchedule() {
  const [plantings] = useRecords<PlantingRow>("plantings", []);
  const [plants] = useRecords<PlantRow>("plants", []);

  // Plantings name a variety the way the lookup shows it — "Pothos /
  // Hawaiian" — so the cycle times are keyed the same way.
  const cycles = useMemo<PlantCycle[]>(
    () =>
      plants.map((p) => ({
        plant: [p.name, p.variety].filter(Boolean).join(" / "),
        growthWeeksMinMarAug: p.growthWeeksMinMarAug,
        growthWeeksMaxMarAug: p.growthWeeksMaxMarAug,
        growthWeeksMinSepFeb: p.growthWeeksMinSepFeb,
        growthWeeksMaxSepFeb: p.growthWeeksMaxSepFeb,
      })),
    [plants]
  );

  const waves = useMemo(() => cohorts(plantings, cycles), [plantings, cycles]);
  const missing = useMemo(() => missingCycles(waves), [waves]);

  // The window spans everything planted plus everything projected, so no bar
  // runs off the end.
  const { start, end } = useMemo(() => {
    const dates = waves.flatMap((c) =>
      [c.weekStart, c.harvestTo ?? c.harvestFrom ?? c.weekStart].map((d) => parse(d).getTime())
    );
    const now = Date.now();
    const lo = dates.length ? Math.min(...dates, now - 30 * day) : now - 90 * day;
    const hi = dates.length ? Math.max(...dates, now + 30 * day) : now + 90 * day;
    return { start: lo, end: hi };
  }, [waves]);

  const at = (dateISO: string) => ((parse(dateISO).getTime() - start) / (end - start)) * 100;
  const today = ((Date.now() - start) / (end - start)) * 100;

  if (waves.length === 0) {
    return (
      <div className="text-[13px] text-navy-400 py-8 text-center">
        Nothing planted yet. Record a planting and its wave will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-navy-800">Production Schedule</h3>
        <p className="text-[12px] text-navy-400 mt-0.5">
          {waves.length} planting {waves.length === 1 ? "wave" : "waves"} ·{" "}
          {waves.reduce((n, c) => n + c.beds.length, 0)} beds ·{" "}
          {waves.reduce((n, c) => n + c.qty, 0).toLocaleString()} plants
        </p>
      </div>

      {missing.length > 0 && (
        <div className="text-[12px] text-navy-500 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2">
          No harvest projected for {missing.join(", ")} — set{" "}
          <span className="font-medium text-navy-700">Weeks to First Cut</span> on{" "}
          {missing.length === 1 ? "that variety" : "those varieties"} in the Catalog and their
          windows will appear.
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[720px] space-y-1">
          {waves.map((c, i) => (
            <motion.div
              key={`${c.plant}-${c.weekStart}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.015 }}
              className="flex items-center gap-3"
            >
              <div className="w-44 shrink-0 min-w-0">
                <p className="text-[12px] font-medium text-navy-700 truncate">{c.plant}</p>
                <p className="text-[10px] text-navy-400">
                  wk {c.week} · {c.beds.length} {c.beds.length === 1 ? "bed" : "beds"} ·{" "}
                  {c.qty.toLocaleString()}
                </p>
              </div>

              <div className="relative flex-1 h-7 rounded bg-sand-100 overflow-hidden">
                <span
                  className="absolute top-0 bottom-0 w-px bg-navy-300/70 z-10"
                  style={{ left: `${today}%` }}
                  title="today"
                />
                {/* Planted: a week, drawn as a week. */}
                <div
                  className="absolute top-1 bottom-1 rounded-sm bg-navy-500"
                  style={{ left: `${at(c.weekStart)}%`, width: `${Math.max(at(c.harvestFrom ?? c.weekStart) - at(c.weekStart), 1.2)}%` }}
                  title={`Planted week ${c.week} · ${c.beds.length} beds`}
                />
                {/* Harvest window, only when a cycle time said so. */}
                {c.harvestFrom && (
                  <div
                    className="absolute top-1 bottom-1 rounded-sm bg-lime-500"
                    style={{
                      left: `${at(c.harvestFrom)}%`,
                      width: `${Math.max(at(c.harvestTo ?? c.harvestFrom) - at(c.harvestFrom), 1.2)}%`,
                    }}
                    title={`Cutting from ${c.harvestFrom}${c.harvestTo ? ` to ${c.harvestTo}` : ""}`}
                  />
                )}
              </div>

              <div className="w-20 shrink-0 text-right">
                {c.unscheduled
                  ? <Badge variant="gray">no cycle</Badge>
                  : <span className="text-[10px] font-mono text-navy-500">{c.harvestFrom?.slice(5)}</span>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-navy-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-navy-500" /> growing on
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-lime-500" /> cutting window
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-px h-3 bg-navy-300" /> today
        </span>
      </div>
    </div>
  );
}
