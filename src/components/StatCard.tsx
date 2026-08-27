import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * Tone is *semantic*, never decorative. A card is neutral unless the number
 * itself carries a warning — a shortfall, an overdue payable. Colouring every
 * card a different hue makes none of them mean anything.
 */
type Tone = "neutral" | "positive" | "warning" | "critical";

interface Delta {
  /** Pre-formatted, sign included: "+21%", "-0.7%", "+3". */
  value: string;
  direction: "up" | "down";
  /**
   * Whether this movement is good news. Defaults to `direction === "up"`.
   * Set explicitly where up is bad — open invoices, labour cost, shortfall.
   */
  good?: boolean;
  /** Comparison basis: "vs Mar", "vs last season". */
  label?: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Third tier — the context line. "24 beds · 63% of output". */
  context?: string;
  delta?: Delta;
  tone?: Tone;
  /** One card per row, at most: the metric the page is actually about. */
  variant?: "default" | "hero";
  /** Grid placement from the parent — e.g. "xl:col-span-2" for a hero. */
  className?: string;

  /** @deprecated Decorative per-card colour. Accepted so existing call sites
   *  keep compiling; deliberately ignored. Use `tone` for meaning. */
  color?: "green" | "blue" | "amber" | "red" | "lime";
  /** @deprecated Use `delta`. */
  trend?: { value: string; positive: boolean };
}

const toneStyles: Record<Tone, { icon: string; wrap: string }> = {
  neutral: { icon: "text-navy-400", wrap: "bg-sand-100 ring-sand-200" },
  positive: { icon: "text-green-600", wrap: "bg-green-50 ring-green-100" },
  warning: { icon: "text-amber-600", wrap: "bg-amber-50 ring-amber-100" },
  critical: { icon: "text-red-600", wrap: "bg-red-50 ring-red-100" },
};

function DeltaPill({ delta, onDark = false }: { delta: Delta; onDark?: boolean }) {
  const good = delta.good ?? delta.direction === "up";
  const Arrow = delta.direction === "up" ? ArrowUpRight : ArrowDownRight;

  const tint = onDark
    ? good
      ? "text-green-300"
      : "text-red-300"
    : good
      ? "text-green-600"
      : "text-red-600";

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap ${tint}`}>
      <Arrow className="w-3 h-3 shrink-0" strokeWidth={2.5} />
      {delta.value}
      {delta.label && (
        <span className={`font-medium ${onDark ? "text-white/50" : "text-navy-400"}`}>
          {delta.label}
        </span>
      )}
    </span>
  );
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  context,
  delta,
  tone = "neutral",
  variant = "default",
  className = "",
  trend,
}: StatCardProps) {
  // Bridge the old trend prop onto the new delta shape.
  const resolved: Delta | undefined =
    delta ??
    (trend ? { value: trend.value, direction: trend.positive ? "up" : "down", good: trend.positive } : undefined);

  if (variant === "hero") {
    return (
      <div className={`card-surface stat-hero relative overflow-hidden rounded-xl bg-navy-800 p-5 flex flex-col justify-between min-h-[132px] ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] text-white/55 font-semibold uppercase tracking-[0.14em]">
            {label}
          </p>
          <Icon className="w-4 h-4 text-lime-300/70 shrink-0" />
        </div>

        <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1 mt-2">
          <p className="font-display text-[38px] leading-none font-semibold text-white tracking-tight shrink-0">
            {value}
          </p>
          {resolved && <DeltaPill delta={resolved} onDark />}
        </div>

        {context && (
          <p className="text-[11px] text-white/55 mt-2 truncate">{context}</p>
        )}
      </div>
    );
  }

  const t = toneStyles[tone];

  return (
    <div className={`card-surface bg-white rounded-xl border border-sand-200/80 p-4 flex flex-col justify-between min-h-[132px] hover:shadow-sm transition-shadow ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] text-navy-400 font-semibold uppercase tracking-[0.14em] leading-tight">
          {label}
        </p>
        <div
          className={`stat-icon-wrap flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ring-1 ${t.wrap}`}
          data-tone={tone}
        >
          <Icon className={`stat-icon w-[15px] h-[15px] ${t.icon}`} />
        </div>
      </div>

      <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 mt-2">
        <p className="text-[26px] leading-none font-bold text-navy-900 tracking-tight shrink-0">{value}</p>
        {resolved && <DeltaPill delta={resolved} />}
      </div>

      <p className="text-[11px] text-navy-400 mt-2 truncate">{context ?? " "}</p>
    </div>
  );
}
