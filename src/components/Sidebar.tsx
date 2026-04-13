import { motion } from "framer-motion";
import {
  Leaf,
  LayoutDashboard,
  Sprout,
  PackageSearch,
  Warehouse,
  ShoppingCart,
  Receipt,
  CalendarCheck,
  FlaskConical,
  Truck,
  HardHat,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  User,
} from "lucide-react";
import type { PageId } from "../App";
import WeatherWidget from "./WeatherWidget";

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  open: boolean;
  onToggle: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

interface NavSection {
  label: string;
  items: { id: PageId; label: string; icon: typeof LayoutDashboard }[];
}

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "production", label: "Production", icon: Sprout },
      { id: "inventory", label: "Inventory", icon: PackageSearch },
      { id: "infrastructure", label: "Infrastructure", icon: Warehouse },
      { id: "availability", label: "Availability", icon: CalendarCheck },
      { id: "nutrition", label: "Nutrition", icon: FlaskConical },
    ],
  },
  {
    label: "Commercial",
    items: [
      { id: "sales", label: "Sales & Shipping", icon: ShoppingCart },
      { id: "finance", label: "Finance", icon: Receipt },
      { id: "suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    label: "People",
    items: [
      { id: "labor", label: "Labor", icon: HardHat },
    ],
  },
  {
    label: "System",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  open,
  onToggle,
  darkMode,
  onToggleDark,
}: SidebarProps) {
  return (
    <motion.aside
      animate={{ width: open ? 240 : 72 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="relative flex flex-col bg-navy-900 h-screen shrink-0 border-r border-navy-800/50"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-green-500 shadow-lg shadow-lime-400/20">
          <Leaf className="w-5 h-5 text-navy-900" />
        </div>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="overflow-hidden"
          >
            <p className="text-[14px] font-bold text-white tracking-tight leading-tight">
              Broton <span className="text-lime-400">Verde</span>
            </p>
            <p className="text-[9px] text-navy-500 tracking-[0.12em] uppercase mt-0.5">
              Nursery Intelligence
            </p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1 px-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            {open && (
              <p className="text-[9px] text-navy-600 uppercase tracking-[0.15em] font-semibold px-3 mb-1.5">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = currentPage === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`
                      relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                      transition-all duration-200 cursor-pointer group
                      ${
                        isActive
                          ? "bg-gradient-to-r from-lime-400/15 to-lime-400/5 text-lime-400"
                          : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/50"
                      }
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-lime-400"
                        transition={{ duration: 0.2 }}
                      />
                    )}
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                        isActive ? "text-lime-400" : "text-navy-600 group-hover:text-navy-400"
                      }`}
                    />
                    {open && (
                      <span className="text-[13px] font-medium truncate">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-3 space-y-2">
        {open && <WeatherWidget compact className="w-full" />}

        <button
          onClick={onToggleDark}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-navy-500
                     hover:text-navy-300 hover:bg-navy-800/50 transition-all cursor-pointer"
        >
          {darkMode ? (
            <Sun className="w-[18px] h-[18px] text-amber-400" />
          ) : (
            <Moon className="w-[18px] h-[18px]" />
          )}
          {open && (
            <span className="text-[13px] font-medium">
              {darkMode ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>

        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-navy-800/50 ${open ? "" : "justify-center"}`}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-lime-400/20 shrink-0">
            <User className="w-4 h-4 text-lime-400" />
          </div>
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">Santiago G.</p>
              <p className="text-[10px] text-navy-500 truncate">Admin</p>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-navy-800/50 space-y-2">
          {open && (
            <div className="px-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-lime-500 text-[10px]">.</span>
                <span className="text-[9px] text-navy-600 tracking-wide">inveenta</span>
              </div>
              <span className="text-[8px] text-navy-700 font-mono">v0.1.0</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-full py-2 rounded-lg text-navy-600 hover:text-navy-400 hover:bg-navy-800/50 transition-colors cursor-pointer"
          >
            {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
