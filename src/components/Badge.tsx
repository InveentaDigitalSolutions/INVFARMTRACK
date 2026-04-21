type BadgeVariant = "green" | "blue" | "amber" | "red" | "gray" | "lime" | "navy";

const variants: Record<BadgeVariant, string> = {
  green: "bg-green-50 text-green-700 ring-1 ring-green-200/60",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  red: "bg-red-50 text-red-700 ring-1 ring-red-200/60",
  gray: "bg-sand-100 text-navy-600 ring-1 ring-sand-200/60",
  lime: "bg-lime-50 text-lime-700 ring-1 ring-lime-200/60",
  navy: "bg-navy-50 text-navy-700 ring-1 ring-navy-200/60",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export default function Badge({ children, variant = "green" }: BadgeProps) {
  return (
    <span
      className={`badge badge-${variant} inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
