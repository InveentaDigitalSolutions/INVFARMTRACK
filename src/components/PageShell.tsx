import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface PageShellProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageShell({
  title,
  subtitle,
  icon: Icon,
  children,
  actions,
}: PageShellProps) {
  return (
    <motion.div
      key={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-6 lg:p-8"
    >
      {/* Page header — matches the Dashboard: display serif, accent rule. */}
      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 ring-1 ring-navy-700/50 shrink-0">
            <Icon className="w-[19px] h-[19px] text-lime-400" />
          </div>
          <div>
            <h1 className="font-display text-[32px] leading-tight font-semibold text-navy-900 tracking-tight">
              {title}
            </h1>
            <p className="text-[12px] text-navy-400">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>

      <div className="page-rule mb-5" />

      {children}
    </motion.div>
  );
}
