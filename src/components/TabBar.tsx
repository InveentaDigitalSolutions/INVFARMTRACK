import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export default function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex gap-0.5 bg-sand-100 rounded-lg p-0.5">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative px-4 py-2 text-[13px] font-medium rounded-md transition-colors cursor-pointer ${
              isActive ? "text-navy-900" : "text-navy-400 hover:text-navy-600"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 bg-white rounded-[7px] shadow-sm ring-1 ring-sand-200/50"
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? "bg-lime-100 text-lime-700"
                      : "bg-sand-200 text-navy-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
