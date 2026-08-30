/**
 * The moon, as a planner reads it: four figures and a month at a glance.
 *
 * Seeding, pruning and cutting are timed against the phase here, so this is
 * production information rather than an ornament. It lives in the Production
 * overview beside the other figures, not behind a tab of its own — a tab makes
 * it somewhere to go, and this is context you want in front of you while
 * reading everything else.
 *
 * The tiles are the same MetricTile the rest of the overview uses, so the moon
 * figures sit level with harvest and occupancy instead of looking bolted on.
 */

import { useMemo } from "react";
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
export default function MoonSection({ dateISO }: { dateISO?: string }) {
  const today = dateISO ?? new Date().toISOString().slice(0, 10);
  const k = useMemo(() => moonKpis(today), [today]);
  const days = useMemo(() => moonCalendar(today, 3, 17), [today]);

  return (
    <div className="bg-white rounded-xl border border-sand-200/80 shadow-sm px-5 py-4">
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
      </div>

      {/* Three weeks, not five: enough to see the next turning point coming
          without the strip running the width of the screen. */}
      <div className="overflow-x-auto -mx-1 px-1 mt-3.5 pt-3.5 border-t border-sand-200/70">
        <div className="flex gap-1 min-w-max">
          {days.map((d) => (
            <div
              key={d.dateISO}
              title={`${d.dateISO} · ${d.phase.name} · ${(d.phase.illumination * 100).toFixed(0)}% lit`}
              className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-md w-[34px] shrink-0 ${
                d.isToday ? "bg-navy-900" : d.isTurning ? "bg-sand-100" : ""
              }`}
            >
              <MoonDisc phase={d.phase} size={18} />
              <span className={`text-[9px] tabular-nums ${
                d.isToday ? "text-white font-semibold" : d.isTurning ? "text-navy-700 font-semibold" : "text-navy-400"}`}>
                {dayNum(d.dateISO)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-navy-300 mt-1.5">
          Three weeks of the cycle. Today is filled; the turning points are shaded.
        </p>
      </div>
    </div>
  );
}
