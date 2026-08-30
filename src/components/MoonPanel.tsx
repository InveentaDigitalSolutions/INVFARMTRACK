/**
 * The moon: what phase it is in, how lit it is, and when it is up.
 *
 * Computed rather than fetched. Open-Meteo does return moon phase, and it
 * agrees with this to within 0.7 hours over 76 days — but it only covers the
 * forecast window, and work planned around the moon looks a season ahead and a
 * season back. It also needs no network, which the player would refuse anyway.
 *
 * The disc is drawn rather than iconified so the shape is the real one: the
 * terminator is an ellipse whose width follows the lit fraction, and it sits on
 * the correct side depending on whether the moon is waxing or waning.
 */

import { useMemo } from "react";
import { moonDay, nextPhase, type MoonPhase } from "../services/moon";

/** Decimal local hours as a clock reading. */
const clock = (hours: number | null) => {
  if (hours === null) return "—";
  const total = Math.round(hours * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const shortDate = (iso: string | null) =>
  iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", timeZone: "UTC",
      })
    : "—";

/** The lit disc, drawn to the actual phase. */
export function MoonDisc({ phase, size = 46 }: { phase: MoonPhase; size?: number }) {
  const r = 22;
  // How far the terminator bulges. At the quarters it is a straight line, so
  // the ellipse collapses to zero width rather than jumping.
  const k = Math.abs(1 - 2 * phase.illumination);
  const sweepLit = phase.waxing ? 1 : 0;
  const sweepTerm = phase.illumination > 0.5 ? sweepLit : 1 - sweepLit;

  return (
    <svg viewBox="-25 -25 50 50" width={size} height={size} aria-hidden="true">
      <circle cx="0" cy="0" r={r} fill="#232f3d" />
      <path
        d={`M 0 ${-r} A ${r} ${r} 0 0 ${sweepLit} 0 ${r} A ${r * k} ${r} 0 0 ${sweepTerm} 0 ${-r} Z`}
        fill="#f2ecd8"
      />
      <circle cx="0" cy="0" r={r} fill="none" stroke="#8a9aae" strokeOpacity=".45" />
    </svg>
  );
}

export interface MoonPanelProps {
  /** Local ISO date to describe. Defaults to today at the nursery. */
  dateISO?: string;
  className?: string;
}

export default function MoonPanel({ dateISO, className = "" }: MoonPanelProps) {
  const today = dateISO ?? new Date().toISOString().slice(0, 10);
  const day = useMemo(() => moonDay(today), [today]);
  const nextFull = useMemo(() => nextPhase(today, "Full moon"), [today]);
  const nextNew = useMemo(() => nextPhase(today, "New moon"), [today]);

  return (
    <div className={`px-4 py-3 border-t border-sand-200 ${className}`}>
      <div className="flex items-center gap-3.5">
        <MoonDisc phase={day.phase} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-navy-800 leading-tight">
            {day.phase.name}
          </p>
          <p className="text-[11px] text-navy-400 tabular-nums">
            {(day.phase.illumination * 100).toFixed(0)}% lit ·{" "}
            day {day.phase.age.toFixed(1)} of 29.5 ·{" "}
            {day.phase.waxing ? "waxing" : "waning"}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
        {[
          ["Moonrise", clock(day.rise)],
          ["Moonset", clock(day.set)],
          ["Next full", shortDate(nextFull)],
          ["Next new", shortDate(nextNew)],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-2">
            <dt className="text-[10px] uppercase tracking-[0.09em] text-navy-300">{label}</dt>
            <dd className="text-[11px] font-medium text-navy-600 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
