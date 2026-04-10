import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  color?: "green" | "blue" | "amber" | "red" | "lime";
}

const colorMap = {
  green: { bg: "bg-green-50", icon: "text-green-600", ring: "ring-green-100" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", ring: "ring-blue-100" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", ring: "ring-amber-100" },
  red: { bg: "bg-red-50", icon: "text-red-600", ring: "ring-red-100" },
  lime: { bg: "bg-lime-50", icon: "text-lime-600", ring: "ring-lime-100" },
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
    <div className="bg-white rounded-xl border border-sand-200/80 p-4 flex items-center gap-3.5 hover:shadow-sm transition-shadow">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-xl ${c.bg} ring-1 ${c.ring}`}
      >
        <Icon className={`w-[18px] h-[18px] ${c.icon}`} />
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
