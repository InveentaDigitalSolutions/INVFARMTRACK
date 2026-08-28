/**
 * What each bed has held over the past year.
 *
 * Replaces a utilisation heatmap that read near 100% everywhere, because the
 * nursery's beds are occupied nearly year-round. A bed holding one variety for
 * eleven months and a bed that turned over four times both read as "full" —
 * this shows the difference.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRecords } from "../hooks/useRecords";
import { useNurseryBeds } from "../hooks/useNurseryBeds";
import { occupancies, rotationSummary, spanFraction } from "../services/bedRotation";
import Badge from "./Badge";

interface PlantingRow {
  id: string;
  bed?: string;
  plant?: string;
  date?: string;
  qty?: number;
  status?: string;
}

/** Stable colour per variety, so a bed's history reads at a glance. */
const PALETTE = [
  "#7f9228", "#3a506b", "#a3b835", "#566d8a",
  "#c4d93e", "#2c3e55", "#8fc47e", "#7e92ab",
];
function colourFor(plant: string, known: string[]): string {
  const i = known.indexOf(plant);
  return i < 0 ? "#b0becf" : PALETTE[i % PALETTE.length];
}

const MONTHS = 12;

export default function BedRotation() {
  const [plantings] = useRecords<PlantingRow>("plantings", []);
  const { beds } = useNurseryBeds();
  const [field, setField] = useState<string>("");

  const fields = useMemo(
    () => [...new Set(beds.map((b) => b.fieldName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [beds]
  );
  const active = field || fields[0] || "";

  // A year back from today, which is the span a rotation question is asked over.
  const { windowStart, windowEnd, ticks } = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - MONTHS);
    const marks: { label: string; at: number }[] = [];
    for (let i = 0; i <= MONTHS; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      marks.push({
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        at: (d.getTime() - start.getTime()) / (end.getTime() - start.getTime()),
      });
    }
    return { windowStart: start, windowEnd: end, ticks: marks.filter((m) => m.at <= 1) };
  }, []);

  const spans = useMemo(() => occupancies(plantings, windowEnd), [plantings, windowEnd]);
  const summary = useMemo(() => rotationSummary(plantings, windowEnd), [plantings, windowEnd]);

  const varieties = useMemo(
    () => [...new Set(spans.map((s) => s.plant).filter(Boolean))].sort(),
    [spans]
  );

  const rows = useMemo(() => {
    const inField = beds.filter((b) => b.fieldName === active).map((b) => b.name);
    return inField.map((bed) => ({
      bed,
      spans: spans.filter((s) => s.bed === bed),
      summary: summary.find((s) => s.bed === bed),
    }));
  }, [beds, active, spans, summary]);

  const everPlanted = rows.filter((r) => r.spans.length > 0).length;
  const turned = rows.filter((r) => (r.summary?.turns ?? 0) > 1).length;

  if (fields.length === 0) {
    return (
      <div className="text-[13px] text-navy-400 py-8 text-center">
        No beds yet. Add them under Infrastructure and their history will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-navy-800">Bed Rotation</h3>
          <p className="text-[12px] text-navy-400 mt-0.5">
            {everPlanted} of {rows.length} beds in {active} planted in the last {MONTHS} months
            {turned > 0 && ` · ${turned} turned over more than once`}
          </p>
        </div>
        <div className="flex bg-sand-100 rounded-lg p-0.5" role="group" aria-label="Field">
          {fields.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setField(f)}
              aria-pressed={active === f}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer
                focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40 ${
                active === f ? "bg-white text-navy-800 shadow-sm" : "text-navy-400 hover:text-navy-600"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {varieties.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {varieties.map((v) => (
            <span key={v} className="flex items-center gap-1.5 text-[11px] text-navy-500">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: colourFor(v, varieties) }}
              />
              {v}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Month scale, so a bar's length can be read as time. */}
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-20 shrink-0" />
            <div className="relative flex-1 h-4">
              {ticks.map((t, i) => (
                <span
                  key={i}
                  className="absolute top-0 text-[9px] text-navy-300 -translate-x-1/2"
                  style={{ left: `${t.at * 100}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>
            <div className="w-14 shrink-0 text-[9px] text-navy-300 text-right">turns</div>
          </div>

          <div className="space-y-1">
            {rows.map(({ bed, spans: bedSpans, summary: s }) => (
              <div key={bed} className="flex items-center gap-3">
                <div className="w-20 shrink-0 text-[11px] font-mono text-navy-600 truncate">{bed}</div>
                <div className="relative flex-1 h-6 rounded bg-sand-100 overflow-hidden">
                  {ticks.map((t, i) => (
                    <span
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-white/60"
                      style={{ left: `${t.at * 100}%` }}
                    />
                  ))}
                  {bedSpans.map((span, i) => {
                    const box = spanFraction(span, windowStart, windowEnd);
                    if (!box) return null;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        title={`${span.plant || "Unnamed"} · ${span.from} to ${span.current ? "now" : span.to} · ${span.days} days${span.qty ? ` · ${span.qty}` : ""}`}
                        className="absolute top-0.5 bottom-0.5 rounded-sm"
                        style={{
                          left: `${box.left * 100}%`,
                          width: `${Math.max(box.width * 100, 0.6)}%`,
                          backgroundColor: colourFor(span.plant, varieties),
                        }}
                      />
                    );
                  })}
                </div>
                <div className="w-14 shrink-0 text-right">
                  {s && s.turns > 0 && (
                    <Badge variant={s.turns > 2 ? "green" : s.turns > 1 ? "lime" : "gray"}>
                      {s.turns}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
