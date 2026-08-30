/**
 * The lempira against the dollar, over the last three months, six months or
 * year.
 *
 * The header chip shows today's rate, which says nothing about direction. An
 * invoice raised in March and still open in August is worth a different number
 * of lempira than it was, and this is where that is visible.
 *
 * Drawn as SVG by hand, like the rest of the charts here — no chart library,
 * and nothing that reaches the network.
 */

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  RANGES, rateSeries, withinRange, rateStats, plotPoints,
  type RangeKey, type RatePoint,
} from "../services/rateHistory";

const W = 320;
const H = 96;
const PAD = 6;

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });

export interface RateHistoryChartProps {
  rows: { date?: unknown; value?: unknown }[];
}

export default function RateHistoryChart({ rows }: RateHistoryChartProps) {
  const [range, setRange] = useState<RangeKey>("3M");
  /** Which point the pointer is nearest, or null when it is away. */
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(() => rateSeries(rows), [rows]);
  const points = useMemo(
    () => withinRange(series, RANGES.find((r) => r.key === range)!.days),
    [series, range]
  );
  const stats = useMemo(() => rateStats(points), [points]);
  const plotted = useMemo(() => plotPoints(points, W, H, PAD), [points]);

  const path = useMemo(
    () => plotted.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" "),
    [plotted]
  );
  const area = useMemo(
    () => (plotted.length ? `${path} L${plotted.at(-1)!.x.toFixed(2)} ${H} L${plotted[0].x.toFixed(2)} ${H} Z` : ""),
    [path, plotted]
  );

  /** The point under the pointer, else the newest — so the readout is never empty. */
  const shown: RatePoint | null =
    (hover !== null ? plotted[hover]?.point : null) ?? stats.last;

  const rising = stats.change > 0.0001;
  const falling = stats.change < -0.0001;
  // A weaker lempira costs more of them per dollar. Which of those is good
  // news depends on which side of the invoice you are on, so this is coloured
  // by direction only, and never green-for-good.
  const Trend = rising ? TrendingUp : falling ? TrendingDown : Minus;
  const trendColor = rising ? "text-amber-300" : falling ? "text-sky-300" : "text-white/50";

  const nearest = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!plotted.length) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * W;
    let best = 0;
    for (let i = 1; i < plotted.length; i++) {
      if (Math.abs(plotted[i].x - x) < Math.abs(plotted[best].x - x)) best = i;
    }
    setHover(best);
  };

  return (
    <div className="w-[344px] p-3.5">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">
            Lempira per US dollar
          </p>
          {shown ? (
            <p className="text-[19px] font-bold text-white tabular-nums leading-tight">
              L {shown.value.toFixed(4)}
              <span className="ml-2 text-[11px] font-normal text-white/45 tabular-nums">
                {day(shown.date)}
              </span>
            </p>
          ) : (
            <p className="text-[13px] text-white/50">No rates stored yet</p>
          )}
        </div>

        <div className="flex bg-white/5 rounded-md p-0.5 shrink-0" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => { setRange(r.key); setHover(null); }}
              aria-pressed={range === r.key}
              // No aria-label here. It would replace the visible "3M" with
              // "3 months", so anyone driving the page by voice would say what
              // they can see and hit nothing. The tooltip carries the long form.
              title={r.label}
              className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors cursor-pointer
                focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50 ${
                range === r.key ? "bg-lime-400 text-navy-900" : "text-white/55 hover:text-white/85"
              }`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      {plotted.length > 1 ? (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[96px] overflow-visible touch-none"
            onPointerMove={nearest}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={`Rate over ${RANGES.find((r) => r.key === range)!.label}: ` +
              `L ${stats.first!.value.toFixed(4)} to L ${stats.last!.value.toFixed(4)}`}
          >
            <defs>
              <linearGradient id="rate-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4d93e" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#c4d93e" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* The high and low of the window, so the line has a scale. */}
            <line x1="0" y1={PAD} x2={W} y2={PAD} stroke="#ffffff" strokeOpacity="0.08" />
            <line x1="0" y1={H - PAD} x2={W} y2={H - PAD} stroke="#ffffff" strokeOpacity="0.08" />

            <path d={area} fill="url(#rate-fill)" />
            <path d={path} fill="none" stroke="#c4d93e" strokeWidth="1.6"
              strokeLinejoin="round" strokeLinecap="round" />

            {hover !== null && plotted[hover] && (
              <g>
                <line
                  x1={plotted[hover].x} y1="0" x2={plotted[hover].x} y2={H}
                  stroke="#ffffff" strokeOpacity="0.22" strokeDasharray="2 3"
                />
                <circle cx={plotted[hover].x} cy={plotted[hover].y} r="3.5"
                  fill="#c4d93e" stroke="#151f2d" strokeWidth="1.5" />
              </g>
            )}
          </svg>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
            <span className="text-[10px] text-white/40 tabular-nums">
              L {stats.low.toFixed(4)} – {stats.high.toFixed(4)}
            </span>
            <span className={`flex items-center gap-1 text-[11px] font-semibold tabular-nums ${trendColor}`}>
              <Trend className="w-3 h-3" />
              {stats.change >= 0 ? "+" : ""}{stats.change.toFixed(4)}
              <span className="font-normal text-white/40">
                ({stats.changePct >= 0 ? "+" : ""}{stats.changePct.toFixed(2)}%)
              </span>
            </span>
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-[11px] text-white/40">
          {series.length
            ? "Only one rate in this window — try a longer range."
            : "The daily rate flow has not filled any history yet."}
        </p>
      )}
    </div>
  );
}
