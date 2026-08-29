import { Lightbulb, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ShadehouseBed } from "./ShadehouseView";
import { plotConfigs } from "./ShadehouseView";

/**
 * The insight is *derived*, never authored. Every figure below traces back to
 * the bed set, so it cannot drift out of step with what the layout shows.
 *
 * It used to close with a paragraph that spelled the same numbers out in
 * prose. Santiago's read was that the prose earned none of the space it took —
 * so the figures stand on their own, four of them, read at a glance.
 */
export interface Insight {
  eyebrow: string;
  headline: string;
  standfirst: string;
  figure: string;
  figureNote: string;
  /** The supporting figures, in the order they are worth reading. */
  stats: { label: string; value: string; tone?: "good" | "bad" }[];
  delta?: { value: string; direction: "up" | "down"; good: boolean; label: string };
}

export function deriveShadehouseInsight(beds: ShadehouseBed[]): Insight | null {
  if (!beds.length) return null;

  const byField = plotConfigs.map((field) => {
    const own = beds.filter((b) => b.fieldId === field.id);
    const empty = own.filter((b) => b.state === "empty").length;
    const issues = own.filter((b) => b.state === "issue").length;
    const ready = own.filter((b) => b.state === "harvest-ready").length;
    return {
      id: field.id,
      label: field.label,
      total: own.length,
      empty,
      issues,
      ready,
      occupancy: own.length ? (own.length - empty) / own.length : 0,
    };
  });

  // The field with the most idle capacity is the one worth acting on.
  const weakest = [...byField].sort((a, b) => a.occupancy - b.occupancy)[0];
  const strongest = [...byField].sort((a, b) => b.occupancy - a.occupancy)[0];

  const totalBeds = beds.length;
  const totalEmpty = beds.filter((b) => b.state === "empty").length;
  const totalReady = beds.filter((b) => b.state === "harvest-ready").length;
  const totalIssues = beds.filter((b) => b.state === "issue").length;
  const occupancy = (totalBeds - totalEmpty) / totalBeds;

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return {
    eyebrow: "Key insight",
    headline: `${weakest.label} Underplanted`,
    standfirst: `${weakest.empty} of ${weakest.total} beds sitting idle`,
    figure: pct(weakest.occupancy),
    figureNote: "bed occupancy",
    stats: [
      { label: "Planted overall", value: pct(occupancy) },
      { label: "Idle beds", value: `${totalEmpty}`, tone: totalEmpty > 0 ? "bad" : "good" },
      { label: "Harvest-ready", value: `${totalReady}`, tone: totalReady > 0 ? "good" : undefined },
      { label: "Needs attention", value: `${totalIssues}`, tone: totalIssues > 0 ? "bad" : "good" },
      { label: "Best field", value: `${strongest.label} · ${pct(strongest.occupancy)}` },
      { label: "Beds in total", value: `${totalBeds}` },
    ],
    delta: {
      value: `${Math.round((weakest.occupancy - occupancy) * 100)} pts`,
      direction: weakest.occupancy < occupancy ? "down" : "up",
      good: weakest.occupancy >= occupancy,
      label: "vs shadehouse average",
    },
  };
}

export default function InsightPanel({
  insight,
  className = "",
}: {
  insight: Insight | null;
  className?: string;
}) {
  if (!insight) return null;

  const Arrow = insight.delta?.direction === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={`card-surface insight-panel relative overflow-hidden rounded-xl bg-navy-800 p-6 flex flex-col ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-lime-400/15 ring-1 ring-lime-400/25">
        <Lightbulb className="w-3 h-3 text-lime-300" />
        <span className="text-[10px] font-semibold text-lime-300 uppercase tracking-[0.14em]">
          {insight.eyebrow}
        </span>
      </span>

      <h3 className="font-display text-[30px] leading-[1.1] font-semibold text-white mt-4 tracking-tight">
        {insight.headline}
      </h3>
      <p className="text-[12px] text-white/60 mt-1.5">{insight.standfirst}</p>

      <div className="flex items-baseline gap-3 mt-4 flex-wrap">
        <span className="font-display text-[44px] leading-none font-semibold text-lime-300 tracking-tight">
          {insight.figure}
        </span>
        <span className="text-[11px] text-white/50 uppercase tracking-[0.12em]">
          {insight.figureNote}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 mt-5 pt-5 border-t border-white/10">
        {insight.stats.map((s) => (
          <div key={s.label}>
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">{s.label}</p>
            <p
              className={`text-[17px] font-semibold tabular-nums leading-tight truncate ${
                s.tone === "bad" ? "text-red-300" : s.tone === "good" ? "text-lime-300" : "text-white"
              }`}
              title={s.value}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {insight.delta && (
        <span className="inline-flex items-center gap-1.5 self-start mt-5 px-3 py-1.5 rounded-full bg-white/6 ring-1 ring-white/10">
          <Arrow
            className={`w-3.5 h-3.5 ${insight.delta.good ? "text-green-300" : "text-red-300"}`}
            strokeWidth={2.5}
          />
          <span
            className={`text-[12px] font-semibold ${insight.delta.good ? "text-green-300" : "text-red-300"}`}
          >
            {insight.delta.value}
          </span>
          <span className="text-[11px] text-white/45">{insight.delta.label}</span>
        </span>
      )}
    </div>
  );
}
