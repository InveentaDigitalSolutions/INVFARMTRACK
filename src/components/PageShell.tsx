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
      {/* Page header */}
      <header className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-800 ring-1 ring-navy-700/50">
            <Icon className="w-[18px] h-[18px] text-lime-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-navy-900 tracking-tight">
              {title}
            </h1>
            <p className="text-[13px] text-navy-400">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>

      {children}
    </motion.div>
  );
}
