import { motion } from "framer-motion";
import {
  Leaf,
  Sprout,
  Droplets,
  Bug,
  Scissors,
  Package,
  Plane,
  DollarSign,
  TrendingUp,
  Users,
  Boxes,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";
import ShadehouseView from "../components/ShadehouseView";
import WeatherWidget from "../components/WeatherWidget";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// Dummy KPI data
const revenueData = [
  { month: "Jan", value: 4200 }, { month: "Feb", value: 3800 },
  { month: "Mar", value: 5100 }, { month: "Apr", value: 6200 },
  { month: "May", value: 0 }, { month: "Jun", value: 0 },
];
const maxRevenue = Math.max(...revenueData.map((d) => d.value), 1);

const harvestByVariety = [
  { name: "Hawaiian", value: 34000, color: "#3d8b40" },
  { name: "Marble Queen", value: 26000, color: "#5aaa5d" },
  { name: "Jade", value: 10000, color: "#88c48a" },
  { name: "N'Joy", value: 2000, color: "#b8ddb9" },
  { name: "Golden Glen", value: 4000, color: "#c4d93e" },
];
const totalHarvest = harvestByVariety.reduce((s, h) => s + h.value, 0);

const bedUtilization = [
  { name: "Shadehouse 1", used: 10, total: 12 },
  { name: "Shadehouse 1", used: 5, total: 8 },
  { name: "Shadehouse 1", used: 3, total: 10 },
];

const recentShipments = [
  { id: "SHP-015", customer: "The Plant Company", boxes: 38, status: "In Progress", carrier: "DHL" },
  { id: "SHP-014", customer: "Green Gardens Inc.", boxes: 15, status: "Shipped", carrier: "FedEx" },
];

const workerPerformance = [
  { name: "Carlos M.", boxes: 142, trend: "+12%" },
  { name: "Maria L.", boxes: 128, trend: "+8%" },
  { name: "Juan P.", boxes: 115, trend: "+5%" },
  { name: "Ana R.", boxes: 98, trend: "-3%" },
];

const upcomingTasks = [
  { title: "Water Shadehouse 1 — Plot E3", due: "Today", priority: "High" },
  { title: "Apply Neem Oil — E3-01", due: "Today", priority: "Normal" },
  { title: "Harvest Hawaiian — Plot C1", due: "Tomorrow", priority: "Urgent" },
];

const alerts = [
  { text: "CAI expiry in 362 days — 69 invoices remaining", type: "info" },
  { text: "C1-20 empty — no planting assigned", type: "warning" },
];

function MiniBarChart({ data, max }: { data: { month: string; value: number }[]; max: number }) {
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: d.value > 0 ? `${(d.value / max) * 100}%` : "2px" }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={`w-full rounded-t-sm ${d.value > 0 ? "bg-gradient-to-t from-green-600 to-lime-400" : "bg-sand-200"}`}
            style={{ minHeight: 2 }}
          />
          <span className="text-[8px] text-navy-400">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, total, label }: { segments: { value: number; color: string }[]; total: number; label: string }) {
  let offset = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#eae8e3" strokeWidth="8" />
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashArray = pct * circumference;
          const dashOffset = offset * circumference;
          offset += pct;
          return (
            <motion.circle
              key={i}
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="8"
              strokeDasharray={`${dashArray} ${circumference - dashArray}`}
              strokeDashoffset={-dashOffset}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
            />
          );
        })}
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-bold text-navy-900">{(total / 1000).toFixed(0)}K</p>
        <p className="text-[8px] text-navy-400">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={container}
      className="min-h-screen p-5 lg:p-7"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-navy-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-[12px] text-navy-400">
            Digital Nursery Intelligence — Season 2026-S1
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <CalendarDays className="w-4 h-4 text-navy-400" />
          <span className="text-navy-500">April 10, 2026</span>
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div variants={item} className="flex gap-3 mb-5">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] ${
                alert.type === "warning"
                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50"
                  : "bg-blue-50 text-blue-700 ring-1 ring-blue-200/50"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {alert.text}
            </div>
          ))}
        </motion.div>
      )}

      {/* Top stats row */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Active Plantings" value="24" icon={Sprout} color="green" trend={{ value: "+3", positive: true }} />
        <StatCard label="Revenue (Apr)" value="$6,200" icon={DollarSign} color="lime" trend={{ value: "+21%", positive: true }} />
        <StatCard label="Boxes This Week" value="38" icon={Boxes} color="amber" />
        <StatCard label="Harvest (season)" value="76K" icon={Scissors} color="green" trend={{ value: "+23%", positive: true }} />
        <StatCard label="Open Invoices" value="$1,520" icon={BarChart3} color="blue" />
      </motion.div>

      {/* Weather */}
      <motion.div variants={item} className="mb-5">
        <WeatherWidget />
      </motion.div>

      {/* Main grid: charts + map */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Revenue chart */}
        <motion.div
          variants={item}
          className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-navy-900">Revenue</p>
              <p className="text-[11px] text-navy-400">Monthly shipment revenue</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-navy-900">$19,300</p>
              <div className="flex items-center gap-0.5 text-[11px] text-green-600">
                <ArrowUpRight className="w-3 h-3" />
                <span>+18% YTD</span>
              </div>
            </div>
          </div>
          <MiniBarChart data={revenueData} max={maxRevenue} />
        </motion.div>

        {/* Harvest by variety donut */}
        <motion.div
          variants={item}
          className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm"
        >
          <p className="text-[13px] font-semibold text-navy-900 mb-1">Harvest by Variety</p>
          <p className="text-[11px] text-navy-400 mb-4">Season 2026-S1</p>
          <div className="flex items-center gap-4">
            <DonutChart
              segments={harvestByVariety.map((h) => ({ value: h.value, color: h.color }))}
              total={totalHarvest}
              label="stems"
            />
            <div className="flex-1 space-y-1.5">
              {harvestByVariety.map((h) => (
                <div key={h.name} className="flex items-center gap-2 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: h.color }} />
                  <span className="flex-1 text-navy-700 truncate">{h.name}</span>
                  <span className="text-navy-400 font-mono">{(h.value / 1000).toFixed(0)}K</span>
                  <span className="text-navy-300 w-8 text-right">{Math.round((h.value / totalHarvest) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bed utilization */}
        <motion.div
          variants={item}
          className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm"
        >
          <p className="text-[13px] font-semibold text-navy-900 mb-1">Bed Utilization</p>
          <p className="text-[11px] text-navy-400 mb-4">Active beds / capacity</p>
          <div className="space-y-3">
            {bedUtilization.map((sh) => {
              const pct = Math.round((sh.used / sh.total) * 100);
              return (
                <div key={sh.name}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-navy-700 font-medium">{sh.name}</span>
                    <span className="text-navy-400">{sh.used}/{sh.total} <span className="font-semibold text-navy-700">{pct}%</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-sand-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      className={`h-full rounded-full ${
                        pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-lime-400" : "bg-amber-400"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-sand-100 flex items-center justify-between">
            <span className="text-[11px] text-navy-400">Overall</span>
            <span className="text-[13px] font-bold text-navy-900">
              {Math.round(bedUtilization.reduce((s, b) => s + b.used, 0) / bedUtilization.reduce((s, b) => s + b.total, 0) * 100)}%
            </span>
          </div>
        </motion.div>
      </div>

      {/* Second row: map + side panels */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-5">
        {/* Shadehouse Layout */}
        <motion.div variants={item} className="xl:col-span-3">
          <ShadehouseView />
        </motion.div>

        {/* Side panels */}
        <div className="xl:col-span-2 space-y-5">
          {/* Shipments */}
          <motion.div variants={item} className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-navy-900">Active Shipments</p>
              <Plane className="w-4 h-4 text-navy-300" />
            </div>
            <div className="space-y-2">
              {recentShipments.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-sand-50/80 hover:bg-sand-100 transition-colors cursor-pointer">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-50">
                    <Package className="w-4 h-4 text-navy-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-navy-800 truncate">{s.customer}</p>
                    <p className="text-[10px] text-navy-400">{s.id} · {s.boxes} boxes · {s.carrier}</p>
                  </div>
                  <Badge variant={s.status === "Shipped" ? "green" : "amber"}>{s.status}</Badge>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tasks */}
          <motion.div variants={item} className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-navy-900">Today's Tasks</p>
              <CalendarDays className="w-4 h-4 text-navy-300" />
            </div>
            <div className="space-y-1.5">
              {upcomingTasks.map((t, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-sand-100/80 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    t.priority === "Urgent" ? "bg-red-500" : t.priority === "High" ? "bg-amber-500" : "bg-blue-400"
                  }`} />
                  <p className="flex-1 text-[12px] text-navy-800">{t.title}</p>
                  <span className="text-[10px] text-navy-400">{t.due}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom row: worker performance + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Worker performance */}
        <motion.div variants={item} className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-navy-900">Worker Performance</p>
              <p className="text-[11px] text-navy-400">Boxes packed this season</p>
            </div>
            <Users className="w-4 h-4 text-navy-300" />
          </div>
          <div className="space-y-2.5">
            {workerPerformance.map((w, i) => (
              <div key={w.name} className="flex items-center gap-3">
                <span className="text-[11px] text-navy-400 w-4 text-center font-mono">{i + 1}</span>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-[11px] font-bold text-green-700">
                  {w.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-navy-800">{w.name}</p>
                  <div className="w-full h-1.5 rounded-full bg-sand-100 mt-1 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(w.boxes / 150) * 100}%` }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-lime-400"
                    />
                  </div>
                </div>
                <span className="text-[13px] font-bold text-navy-900 w-10 text-right">{w.boxes}</span>
                <span className={`text-[10px] font-semibold w-10 text-right flex items-center justify-end gap-0.5 ${
                  w.trend.startsWith("+") ? "text-green-600" : "text-red-500"
                }`}>
                  {w.trend.startsWith("+") ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {w.trend}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Season overview */}
        <motion.div variants={item} className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-navy-900">Season Overview</p>
              <p className="text-[11px] text-navy-400">2026-S1 performance</p>
            </div>
            <TrendingUp className="w-4 h-4 text-navy-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Revenue", value: "$19,300", icon: DollarSign, change: "+18%", positive: true },
              { label: "Boxes Shipped", value: "483", icon: Boxes, change: "+23%", positive: true },
              { label: "Stems Harvested", value: "76,000", icon: Scissors, change: "+15%", positive: true },
              { label: "Active Customers", value: "2", icon: Users, change: "0", positive: true },
              { label: "Treatments", value: "24", icon: Bug, change: "+4", positive: true },
              { label: "Irrigation (L)", value: "12,400", icon: Droplets, change: "+8%", positive: true },
              { label: "Bed Utilization", value: "60%", icon: Layers, change: "-5%", positive: false },
              { label: "Plantings", value: "24", icon: Leaf, change: "+3", positive: true },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-sand-50/80">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white ring-1 ring-sand-200/60 shrink-0">
                    <Icon className="w-3.5 h-3.5 text-navy-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-navy-400 truncate">{kpi.label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[13px] font-bold text-navy-900">{kpi.value}</span>
                      <span className={`text-[9px] font-semibold ${kpi.positive ? "text-green-600" : "text-red-500"}`}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
