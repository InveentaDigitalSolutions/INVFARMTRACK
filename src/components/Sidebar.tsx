import { motion } from "framer-motion";
import {
  Leaf,
  Home,
  Package,
  Sprout,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  User,
  Thermometer,
} from "lucide-react";
import WeatherWidget from "./WeatherWidget";
import type { PageId } from "../App";

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  open: boolean;
  onToggle: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

const navItems: { id: PageId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Dashboard", icon: Home },
  { id: "plant-care", label: "Plant Care", icon: Sprout },
  { id: "packing", label: "Packing", icon: Package },
  { id: "management", label: "Management", icon: BarChart3 },
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
            exit={{ opacity: 0 }}
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
      <nav className="flex-1 py-2 px-3 space-y-1">
        {open && (
          <p className="text-[9px] text-navy-600 uppercase tracking-[0.15em] font-semibold px-3 mb-2 mt-1">
            Menu
          </p>
        )}
        {navItems.map((item) => {
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
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-3 space-y-2">
        {/* Weather */}
        {open && (
          <WeatherWidget compact className="w-full" />
        )}

        {/* Dark mode toggle */}
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

        {/* User info */}
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

        {/* Version, Inveenta branding & collapse */}
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
            {open ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
