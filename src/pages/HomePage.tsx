import { motion } from "framer-motion";
import {
  Package,
  Sprout,
  BarChart3,
  ArrowRight,
  Leaf,
  TrendingUp,
  CalendarDays,
  Boxes,
  Droplets,
  Bug,
  Scissors,
  Plane,
} from "lucide-react";
import StatCard from "../components/StatCard";
import NurseryMap from "../components/NurseryMap";
import type { PageId } from "../App";

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

const modules = [
  {
    id: "plant-care" as PageId,
    title: "Plant Care",
    description: "Plantings, treatments, irrigation & harvest",
    icon: Sprout,
    color: "bg-green-600",
  },
  {
    id: "packing" as PageId,
    title: "Packing",
    description: "Shipments, orders & invoicing",
    icon: Package,
    color: "bg-navy-700",
  },
  {
    id: "management" as PageId,
    title: "Management",
    description: "Infrastructure, tasks & fiscal",
    icon: BarChart3,
    color: "bg-navy-800",
  },
];

const recentActivity = [
  { icon: Droplets, text: "Irrigation — Shadehouse North, Batch 2", time: "2h ago", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Bug, text: "Treatment — Neem Oil on Pothos / Hawaiian", time: "4h ago", color: "text-amber-500", bg: "bg-amber-50" },
  { icon: Scissors, text: "Harvest — 12 boxes from Bed 3-A", time: "5h ago", color: "text-green-500", bg: "bg-green-50" },
  { icon: Plane, text: "Shipment — 38 boxes packed for TPC, DHL", time: "Yesterday", color: "text-navy-500", bg: "bg-navy-50" },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <motion.div
      key="home"
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      variants={container}
      className="min-h-screen p-6 lg:p-8"
    >
      {/* Header */}
      <motion.header variants={item} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-800 ring-1 ring-navy-700/50">
            <Leaf className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">
              Broton <span className="text-lime-500">Verde</span>
            </h1>
            <p className="text-[12px] text-navy-400 tracking-wide">
              Digital Nursery Intelligence — El Olvido, Honduras
            </p>
          </div>
        </div>
      </motion.header>

      {/* Split layout: Stats + Map */}
      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-6">
        {/* Left: Stats grid */}
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Active Plantings" value="24" icon={Leaf} color="green" />
            <StatCard label="This Week" value="12" icon={CalendarDays} color="blue" />
            <StatCard label="Boxes Packed" value="38" icon={Boxes} color="amber" />
            <StatCard
              label="Season Yield"
              value="76K"
              icon={TrendingUp}
              color="lime"
              trend={{ value: "+23%", positive: true }}
            />
          </div>

          {/* Quick actions */}
          <div className="space-y-2">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <motion.button
                  key={mod.id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onNavigate(mod.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-sand-200/80
                             hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${mod.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[13px] font-semibold text-navy-900">{mod.title}</p>
                    <p className="text-[11px] text-navy-400">{mod.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-navy-300 group-hover:text-lime-500 group-hover:translate-x-0.5 transition-all" />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right: Map */}
        <div className="xl:col-span-3">
          <NurseryMap className="h-72 xl:h-full min-h-[320px] w-full" />
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold text-navy-400 uppercase tracking-[0.1em]">
            Recent Activity
          </h2>
          <button className="text-[11px] text-lime-600 font-semibold hover:text-lime-700 cursor-pointer">
            View all
          </button>
        </div>
        <div className="bg-white rounded-xl border border-sand-200/80 divide-y divide-sand-100/80 shadow-sm">
          {recentActivity.map((act, i) => {
            const Icon = act.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-sand-50/50 transition-colors">
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${act.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${act.color}`} />
                </div>
                <p className="text-[13px] text-navy-800 flex-1">{act.text}</p>
                <span className="text-[11px] text-navy-300 font-medium">{act.time}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
