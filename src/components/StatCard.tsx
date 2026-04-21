import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  color?: "green" | "blue" | "amber" | "red" | "lime";
}

const colorMap = {
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    ring: "ring-green-100",
    darkBg: "bg-green-900/40",
    darkIcon: "text-green-400",
    darkRing: "ring-green-500/30",
  },
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    ring: "ring-blue-100",
    darkBg: "bg-blue-900/40",
    darkIcon: "text-blue-400",
    darkRing: "ring-blue-500/30",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    ring: "ring-amber-100",
    darkBg: "bg-amber-900/40",
    darkIcon: "text-amber-400",
    darkRing: "ring-amber-500/30",
  },
  red: {
    bg: "bg-red-50",
    icon: "text-red-600",
    ring: "ring-red-100",
    darkBg: "bg-red-900/40",
    darkIcon: "text-red-400",
    darkRing: "ring-red-500/30",
  },
  lime: {
    bg: "bg-lime-50",
    icon: "text-lime-600",
    ring: "ring-lime-100",
    darkBg: "bg-lime-900/40",
    darkIcon: "text-lime-400",
    darkRing: "ring-lime-500/30",
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = "green",
}: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="card-surface bg-white rounded-xl border border-sand-200/80 p-4 flex items-center gap-3.5 hover:shadow-sm transition-shadow">
      <div
        className={`stat-icon-wrap flex items-center justify-center w-10 h-10 rounded-xl ${c.bg} ring-1 ${c.ring}`}
        data-color={color}
      >
        <Icon className={`stat-icon w-[18px] h-[18px] ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-navy-400 font-medium uppercase tracking-wider truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-navy-900 tracking-tight">{value}</p>
          {trend && (
            <span
              className={`text-[11px] font-semibold ${
                trend.positive ? "text-green-500" : "text-red-500"
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
