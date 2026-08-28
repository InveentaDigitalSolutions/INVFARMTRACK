/**
 * A figure, what it is measured against, and where it has been.
 *
 * Modelled on the reports Santiago shared. Three things recur in all of them
 * and none were in this app: every number carries a comparison rather than
 * standing alone; the heading is a verdict, not a label — "Transit Quality is
 * declining" rather than "Transit Quality"; and a sparkline sits under the
 * value so the number has a past without needing a second chart.
 *
 * A comparison is only drawn when one exists. Half the value of saying "vs
 * last month" is that it is true.
 */

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type Direction = "up" | "down" | "flat";

/** Which way a series is moving, and whether the move is big enough to claim. */
export function trendOf(values: number[], threshold = 0.05): Direction {
  const real = values.filter((v) => Number.isFinite(v));
  if (real.length < 2) return "flat";
  const half = Math.max(1, Math.floor(real.length / 2));
  const earlier = real.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const later = real.slice(-half).reduce((a, b) => a + b, 0) / half;
  if (earlier === 0) return later > 0 ? "up" : "flat";
  const change = (later - earlier) / Math.abs(earlier);
  if (Math.abs(change) < threshold) return "flat";
  return change > 0 ? "up" : "down";
}

export const trendWord = (d: Direction) =>
  d === "up" ? "rising" : d === "down" ? "falling" : "steady";

/** A sparkline with its last point marked, which is the point being reported. */
function Spark({ values, tone }: { values: number[]; tone: string }) {
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return <div className="h-8" />;

  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const span = max - min || 1;
  const x = (i: number) => (i / (pts.length - 1)) * 100;
  const y = (v: number) => 28 - ((v - min) / span) * 24;

  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L100,30 L0,30 Z`;
  const lastX = x(pts.length - 1);
  const lastY = y(pts[pts.length - 1]);

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-8" aria-hidden="true">
      <path d={area} fill={tone} opacity={0.12} />
      <path d={line} fill="none" stroke={tone} strokeWidth={1.5}
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={2.5} fill={tone} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface MetricTileProps {
  label: string;
  /** The figure itself, already formatted. */
  value: string;
  icon?: LucideIcon;
  /** Points behind the value, oldest first. */
  series?: number[];
  /** What the value is measured against — "vs last month", "of 120 beds". */
  comparison?: { label: string; value: string; direction?: Direction };
  /** A second supporting figure, as the reference reports carry. */
  context?: { label: string; value: string };
  tone?: "default" | "good" | "warn" | "bad";
}

const TONES = {
  default: "#3a506b",
  good: "#5f6e20",
  warn: "#9a6b16",
  bad: "#9c4a3c",
} as const;

export default function MetricTile({
  label, value, icon: Icon, series, comparison, context, tone = "default",
}: MetricTileProps) {
  const colour = TONES[tone];
  const Arrow =
    comparison?.direction === "up" ? TrendingUp
    : comparison?.direction === "down" ? TrendingDown
    : Minus;

  return (
    <div className="bg-white rounded-xl border border-sand-200/80 p-4 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] text-navy-400 leading-tight">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-navy-300 shrink-0" />}
      </div>

      <p className="text-[26px] font-bold text-navy-900 leading-none tabular-nums">{value}</p>

      {series && series.length > 1 && (
        <div className="mt-2 -mx-1">
          <Spark values={series} tone={colour} />
        </div>
      )}

      {(comparison || context) && (
        <div className="mt-2 pt-2 border-t border-sand-200/70 space-y-1">
          {comparison && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-navy-400">
                {comparison.label}
              </span>
              <span
                className="text-[12px] font-semibold tabular-nums flex items-center gap-1"
                style={{ color: comparison.direction ? colour : undefined }}
              >
                {comparison.direction && <Arrow className="w-3 h-3" />}
                {comparison.value}
              </span>
            </div>
          )}
          {context && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-navy-400">
                {context.label}
              </span>
              <span className="text-[12px] text-navy-600 tabular-nums">{context.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
