/**
 * The moon, as a planner reads it: today's figures on a line, and the days
 * ahead as a strip you can run out to three months.
 *
 * Planting, pruning and cutting are timed against the phase here, so this is
 * production information rather than an ornament. It lives in the Production
 * overview beside the other figures, not behind a tab of its own — a tab makes
 * it somewhere to go, and this is context you want in front of you while
 * reading everything else.
 *
 * The strip scrolls rather than wrapping into weeks. A lunar cycle is a run,
 * not a calendar month, and breaking it at Sundays would put the turning points
 * anywhere. The discs shrink as the range grows so a quarter still fits on a
 * screen without becoming unreadable.
 */

import { useMemo, useState } from "react";
import { MoonDisc } from "./MoonPanel";
import { moonKpis, moonCalendar } from "../services/moonInsight";

const clock = (hours: number | null) => {
  if (hours === null) return "—";
  const total = Math.round(hours * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const dayNum = (iso: string) => Number(iso.slice(8, 10));
const shortDate = (iso: string | null) =>
  iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", timeZone: "UTC",
      })
    : "—";
/** How far ahead the strip runs, and how big the discs are at that range. */
const RANGES = [
  { key: "1m", label: "1 month", forward: 30, disc: 32, width: 46 },
  { key: "3m", label: "3 months", forward: 90, disc: 22, width: 30 },
  { key: "6m", label: "6 months", forward: 180, disc: 15, width: 21 },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

/**
 * How many turning points to spell out above the strip. Eight covers two
 * months of them, which is as far as anyone reads a line of dates before it
 * stops being a summary; the rest are counted.
 */
const NAMED_AHEAD = 8;

const monthOf = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });

export default function MoonSection({ dateISO }: { dateISO?: string }) {
  const today = dateISO ?? new Date().toISOString().slice(0, 10);
  const [rangeKey, setRangeKey] = useState<RangeKey>("1m");
  const range = RANGES.find((r) => r.key === rangeKey)!;

  const k = useMemo(() => moonKpis(today), [today]);
  const days = useMemo(() => moonCalendar(today, 3, range.forward), [today, range.forward]);
  /** The dates worth planning against, so a long range is useful without scrolling it. */
  const turning = useMemo(() => days.filter((d) => d.isTurning && d.dateISO >= today), [days, today]);

  return (
    /**
     * Collapsed by default, like the schedule and rotation below it.
     *
     * The summary line is the part worth having in front of you — what the moon
     * is doing today and when it turns next. The strip is what you open when
     * you are actually planning, and it does not need to hold vertical space
     * the rest of the time.
     */
    <details className="group bg-white rounded-xl border border-sand-200/80 shadow-sm">
      <summary className="px-5 py-4 cursor-pointer select-none list-none rounded-xl
                          hover:bg-sand-50/60 [&::-webkit-details-marker]:hidden">
      {/* One row rather than four tiles and a banner. The moon is context for
          reading the rest of the page, and four full-size cards made it the
          subject — which is exactly what it is not. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <MoonDisc phase={k.phase} size={38} />
          <div>
            <p className="text-[13px] font-semibold text-navy-900 leading-tight">
              {k.phase.name}
            </p>
            <p className="text-[11px] text-navy-400 tabular-nums">
              {(k.phase.illumination * 100).toFixed(0)}% lit ·{" "}
              day {k.phase.age.toFixed(1)} of 29.5
            </p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-[11px]">
          {[
            ["Next full", k.daysToFull === 0 ? "Today" : `${k.daysToFull} d · ${shortDate(k.nextFullISO)}`],
            ["Next new", k.daysToNew === 0 ? "Today" : `${k.daysToNew} d · ${shortDate(k.nextNewISO)}`],
            ["Rises", clock(k.moonrise)],
            ["Up today", `${k.hoursUp.toFixed(1)} h`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[9px] uppercase tracking-[0.09em] text-navy-300">{label}</dt>
              <dd className="font-medium text-navy-700 tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <span className="ml-auto shrink-0 text-[11px] font-medium text-navy-400">
          <span className="group-open:hidden">Show the days ahead</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </div>
      </summary>

      <div className="px-5 pb-4 -mt-1 border-t border-sand-200/70 pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <p className="text-[11px] text-navy-400">
            {/* The turning points, spelled out. On a three-month strip they are
                what you are actually looking for, and finding them by scrolling
                is not reading. */}
            {turning.length > 0 ? (
              <>
                Ahead:{" "}
                {turning.slice(0, NAMED_AHEAD).map((d, i) => (
                  <span key={d.dateISO}>
                    {i > 0 && " · "}
                    <span className="text-navy-600 font-medium">
                      {d.phase.name.replace(" moon", "")}
                    </span>{" "}
                    {shortDate(d.dateISO)}
                  </span>
                ))}
                {turning.length > NAMED_AHEAD && ` · +${turning.length - NAMED_AHEAD} more`}
              </>
            ) : (
              "No turning point in this range."
            )}
          </p>

          <div className="flex bg-sand-100 rounded-lg p-0.5 shrink-0" role="group" aria-label="Range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRangeKey(r.key)}
                aria-pressed={rangeKey === r.key}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40 ${
                  rangeKey === r.key
                    ? "segment-active shadow-sm"
                    : "text-navy-400 hover:text-navy-600"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <div className="flex gap-1 min-w-max items-end">
            {days.map((d) => {
              const startsMonth = dayNum(d.dateISO) === 1 || d.dateISO === days[0].dateISO;
              return (
                <div
                  key={d.dateISO}
                  title={`${d.dateISO} · ${d.phase.name} · ${(d.phase.illumination * 100).toFixed(0)}% lit`}
                  style={{ width: range.width }}
                  className={`flex flex-col items-center gap-1 px-0.5 py-1.5 rounded-lg shrink-0 ${
                    d.isToday ? "bg-navy-900" : d.isTurning ? "bg-sand-100 ring-1 ring-sand-300/70" : ""
                  }`}
                >
                  <span className={`text-[9px] uppercase tracking-[0.06em] h-3 ${
                    d.isToday ? "text-white/50" : "text-navy-300"}`}>
                    {startsMonth ? monthOf(d.dateISO) : ""}
                  </span>
                  <MoonDisc phase={d.phase} size={range.disc} />
                  <span className={`text-[10px] tabular-nums ${
                    d.isToday ? "text-white font-semibold"
                      : d.isTurning ? "text-navy-800 font-semibold" : "text-navy-400"}`}>
                    {dayNum(d.dateISO)}
                  </span>
                  {/* Only named on the shorter ranges; at three months the
                      labels collide and the shading carries it instead. */}
                  {d.isTurning && range.disc >= 28 && (
                    <span className={`text-[8px] leading-tight text-center ${
                      d.isToday ? "text-lime-300" : "text-navy-400"}`}>
                      {d.phase.name.replace(" moon", "").replace("First ", "1st ")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </details>
  );
}
