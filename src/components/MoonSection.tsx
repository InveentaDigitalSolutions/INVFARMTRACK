/**
 * The moon, as a planner reads it: four figures and a month at a glance.
 *
 * Seeding, pruning and cutting are timed against the phase here, so this is
 * production information rather than an ornament — which is why it sits in
 * Production rather than beside the weather.
 */

import { useMemo } from "react";
import { Moon, MoonStar, Sunrise, Clock } from "lucide-react";
import StatCard from "./StatCard";
import { MoonDisc } from "./MoonPanel";
import { moonKpis, moonCalendar } from "../services/moonInsight";

const clock = (hours: number | null) => {
  if (hours === null) return "—";
  const total = Math.round(hours * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const dayNum = (iso: string) => Number(iso.slice(8, 10));
const monthOf = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });

export default function MoonSection({ dateISO }: { dateISO?: string }) {
  const today = dateISO ?? new Date().toISOString().slice(0, 10);
  const k = useMemo(() => moonKpis(today), [today]);
  const days = useMemo(() => moonCalendar(today), [today]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Phase today"
          value={k.phase.name}
          icon={Moon}
          context={`${(k.phase.illumination * 100).toFixed(0)}% lit · ${k.phase.waxing ? "waxing" : "waning"}`}
        />
        <StatCard
          label="Day of cycle"
          value={k.phase.age.toFixed(1)}
          icon={MoonStar}
          context="of 29.5 days since the new moon"
        />
        <StatCard
          label="Next full moon"
          value={k.daysToFull === 0 ? "Today" : `${k.daysToFull} days`}
          icon={Moon}
          context={k.nextFullISO ?? "—"}
        />
        <StatCard
          label="Next new moon"
          value={k.daysToNew === 0 ? "Today" : `${k.daysToNew} days`}
          icon={Moon}
          context={k.nextNewISO ?? "—"}
        />
      </div>

      <div className="bg-white rounded-xl border border-sand-200 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
          <h3 className="text-[15px] font-bold text-navy-900">The month ahead</h3>
          <span className="inline-flex items-center gap-3 text-[11px] text-navy-400 tabular-nums">
            <span className="inline-flex items-center gap-1"><Sunrise className="w-3 h-3" /> rises {clock(k.moonrise)}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> up {k.hoursUp.toFixed(1)} h</span>
          </span>
        </div>
        <p className="text-[11px] text-navy-400 mb-3.5">
          Six days back and four weeks on. Turning points — new, both quarters and
          full — are marked.
        </p>

        {/* Horizontal because a lunar cycle is a run, not a grid of weeks: what
            matters is how far today sits from the next turning point. */}
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-1.5 min-w-max pb-1">
            {days.map((d) => (
              <div
                key={d.dateISO}
                title={`${d.dateISO} · ${d.phase.name} · ${(d.phase.illumination * 100).toFixed(0)}% lit`}
                className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg w-[46px] shrink-0 transition-colors ${
                  d.isToday
                    ? "bg-navy-900 ring-1 ring-navy-700"
                    : d.isTurning
                      ? "bg-sand-100 ring-1 ring-sand-300/70"
                      : "hover:bg-sand-50"
                }`}
              >
                <span className={`text-[9px] uppercase tracking-[0.06em] tabular-nums ${
                  d.isToday ? "text-white/50" : "text-navy-300"}`}>
                  {dayNum(d.dateISO) === 1 || d.dateISO === days[0].dateISO
                    ? monthOf(d.dateISO) : " "}
                </span>
                <MoonDisc phase={d.phase} size={26} />
                <span className={`text-[10px] font-semibold tabular-nums ${
                  d.isToday ? "text-white" : d.isTurning ? "text-navy-800" : "text-navy-500"}`}>
                  {dayNum(d.dateISO)}
                </span>
                {d.isTurning && (
                  <span className={`text-[8px] leading-tight text-center ${
                    d.isToday ? "text-lime-300" : "text-navy-400"}`}>
                    {d.phase.name.replace(" moon", "").replace("First ", "1st ").replace("Last ", "Last ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
