import { useMemo } from "react";
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
  Layers,
  CalendarDays,
} from "lucide-react";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";
import ShadehouseView from "../components/ShadehouseView";
import InsightPanel, { deriveShadehouseInsight } from "../components/InsightPanel";
import BedWaffle from "../components/BedWaffle";
import WeatherWidget from "../components/WeatherWidget";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { useShadehouseBeds } from "../hooks/useShadehouseBeds";
import { useRecords } from "../hooks/useRecords";
import type { ShipmentsRow } from "../services/rowTypes.generated";
import RankedBars from "../components/RankedBars";
import VarietyFulfilment from "../components/VarietyFulfilment";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// Dummy KPI data
/** Varieties are coloured by position, since the set is not known ahead. */
// One ramp, navy through lime, so the donut reads as part of the same design
// as every bar in the app rather than a second palette of assorted greens.
const VARIETY_COLORS = ["#1f2f42", "#33465e", "#4a6280", "#667f57", "#8aa832", "#a3b835"];



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
  const { beds } = useShadehouseBeds();
  const [shipments] = useRecords<ShipmentsRow>("shipments", []);
  const m = useDashboardMetrics();

  /** Shipments still moving, soonest first. Was two invented consignments. */
  const activeShipments = useMemo(
    () => shipments
      .filter((s) => s.status !== "Delivered" && s.status !== "Cancelled")
      .sort((a, b) => String(a.etd ?? a.date ?? "").localeCompare(String(b.etd ?? b.date ?? "")))
      .slice(0, 4),
    [shipments]
  );
  const insight = useMemo(() => deriveShadehouseInsight(beds), [beds]);
  const { rate: exchangeRate, loading: fxLoading, isLive: fxLive, staleDays: fxStaleDays } = useExchangeRate();
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
          <h1 className="font-display text-[32px] leading-tight font-semibold text-navy-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-[12px] text-navy-400">
            Production · Sales · Season 2026-S1
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Reference rate lives with the other page context, not in the body. */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-navy-800 ring-1 ring-navy-700/50">
            <DollarSign className="w-4 h-4 text-lime-400 shrink-0" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] text-white/45 uppercase tracking-[0.1em]">USD/HNL</span>
              <span className="text-[15px] font-bold text-white tabular-nums">
                {fxLoading ? "…" : exchangeRate ? `L ${exchangeRate.value.toFixed(4)}` : "—"}
              </span>
            </div>
            {exchangeRate && (
              <span className="flex items-center gap-1.5 pl-2.5 border-l border-white/10">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    !fxLive || fxStaleDays > 4 ? "bg-amber-400" : "bg-green-400"
                  }`}
                />
                {/* The rate's own publication date, not when the app read it.
                    A figure fetched a minute ago can still be a week old, and
                    that is what would put the wrong number on an invoice. */}
                <span className="text-[10px] text-white/50 whitespace-nowrap">
                  {fxLive ? "BCH" : "No rate stored"} ·{" "}
                  {new Date(exchangeRate.dateISO).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {fxStaleDays > 4 ? ` · ${fxStaleDays} days old` : ""}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[12px]">
            <CalendarDays className="w-4 h-4 text-navy-400" />
            <span className="text-navy-500">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="page-rule mb-5" />

      {/* Every figure here is recorded, not asserted. A metric that cannot be
          worked out shows a dash, and a comparison appears only when there is
          a real prior period — the previous version claimed "+23% vs 2025-S1"
          for a nursery with no 2025 season on file. */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <StatCard
          variant="hero"
          className="xl:col-span-2"
          label="Harvest this month"
          value={m.harvest.value === undefined ? "—" : m.harvest.value.toLocaleString()}
          icon={Scissors}
          delta={
            m.harvest.changePct === undefined
              ? undefined
              : {
                  value: `${m.harvest.changePct > 0 ? "+" : ""}${m.harvest.changePct}%`,
                  direction: m.harvest.changePct >= 0 ? "up" : "down",
                  label: m.harvest.against ?? "",
                }
          }
          context={m.harvest.value === undefined ? "no harvests recorded yet" : "stems cut"}
        />
        <StatCard
          label={`Counted for wk ${m.nextWeek}`}
          value={m.counted.value === undefined ? "—" : m.counted.value.toLocaleString()}
          icon={Boxes}
          context={m.counted.value === undefined ? "not counted yet" : "cuttings"}
        />
        <StatCard
          label="Active seedings"
          value={m.activePlantings.value === undefined ? "—" : m.activePlantings.value}
          icon={Sprout}
          context={m.totalBeds ? `${m.planted.value ?? 0} of ${m.totalBeds} beds` : undefined}
        />
        {/* Work due, not beds planted. Occupancy barely moves in a nursery
            whose beds run year-round; what is late changes daily. */}
        <StatCard
          label="Open tasks"
          value={m.openTasks.count}
          icon={BarChart3}
          tone={m.openTasks.overdue > 0 ? "critical" : undefined}
          context={
            m.openTasks.overdue > 0
              ? `${m.openTasks.overdue} overdue`
              : m.openTasks.count > 0 ? "none overdue" : undefined
          }
        />
        <StatCard
          label="Receivable"
          value={m.receivable.value === undefined ? "—" : `$${m.receivable.value.toLocaleString()}`}
          icon={DollarSign}
          tone={m.receivable.value && m.receivable.value > 0 ? "warning" : undefined}
          context={m.receivable.value === undefined ? "no invoices yet" : "unpaid on issued invoices"}
        />
      </motion.div>

      {/* Weather */}
      <motion.div variants={item} className="mb-5">
        <WeatherWidget />
      </motion.div>

      {/* Can we keep our promises, by variety. The three numbers behind
          each one are not interchangeable — forecast, count, demand — so the
          bar shows which of them it rests on. */}
      <motion.div variants={item} className="mb-5">
        <VarietyFulfilment />
      </motion.div>

      {/* Main grid: charts + map */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Harvest trend, from what was cut. This card used to show a revenue
            series that came from a literal array — the numbers, the "$19,300"
            total and the "+18% YTD" were all asserted. */}
        <motion.div
          variants={item}
          className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-navy-900">Harvest</p>
              <p className="text-[11px] text-navy-400">Stems cut, last six months</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-navy-900 tabular-nums">
                {m.months.reduce((t, x) => t + x.value, 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-navy-400">total</p>
            </div>
          </div>
          {m.months.some((x) => x.value > 0) ? (
            <MiniBarChart data={m.months} max={Math.max(...m.months.map((x) => x.value), 1)} />
          ) : (
            <p className="text-[12px] text-navy-400 py-8 text-center">
              No harvests recorded in the last six months.
            </p>
          )}
        </motion.div>

        {/* Harvest by variety donut */}
        <motion.div
          variants={item}
          className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm"
        >
          <p className="text-[13px] font-semibold text-navy-900 mb-1">Harvest by Variety</p>
          <p className="text-[11px] text-navy-400 mb-4">
            Attributed through the bed each cut came from
          </p>
          {m.byVariety.length === 0 ? (
            <p className="text-[12px] text-navy-400 py-8 text-center">
              Nothing to attribute yet — harvests appear here once their beds have a planting.
            </p>
          ) : (
          <div className="flex items-center gap-4">
            <DonutChart
              segments={m.byVariety.map((h, i) => ({ value: h.value, color: VARIETY_COLORS[i % VARIETY_COLORS.length] }))}
              total={m.byVariety.reduce((t, h) => t + h.value, 0)}
              label="stems"
            />
            <div className="flex-1 space-y-1.5">
              {m.byVariety.map((h, i) => {
                const total = m.byVariety.reduce((t, x) => t + x.value, 0);
                return (
                <div key={h.name} className="flex items-center gap-2 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: VARIETY_COLORS[i % VARIETY_COLORS.length] }} />
                  <span className="flex-1 text-navy-700 truncate">{h.name}</span>
                  <span className="text-navy-400 font-mono">{h.value.toLocaleString()}</span>
                  <span className="text-navy-300 w-8 text-right">{Math.round((h.value / total) * 100)}%</span>
                </div>
              );})}
            </div>
          </div>
          )}
        </motion.div>

        {/* Harvest by field. This was bed utilisation: three hardcoded rows
            all called "Shadehouse 1", which with one shadehouse could only
            ever say the same thing three times. Which field is producing
            varies and can be acted on. */}
        <motion.div
          variants={item}
          className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm"
        >
          <p className="text-[13px] font-semibold text-navy-900 mb-1">Harvest by Field</p>
          <p className="text-[11px] text-navy-400 mb-4">
            Attributed through the bed each cut came from
          </p>
          {m.byField.length === 0 ? (
            <p className="text-[12px] text-navy-400 py-6 text-center">
              No harvest attributed to a field yet.
            </p>
          ) : (
            <RankedBars rows={m.byField} />
          )}
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
          <motion.div variants={item}>
            <InsightPanel insight={insight} />
          </motion.div>

          {/* Shipments */}
          <motion.div variants={item} className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-navy-900">Active Shipments</p>
              <Plane className="w-4 h-4 text-navy-300" />
            </div>
            <div className="space-y-2">
              {activeShipments.length === 0 ? (
                <p className="text-[12px] text-navy-400 py-4 text-center">
                  Nothing in transit. Shipments appear here once one is created under Sales.
                </p>
              ) : activeShipments.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-sand-50/80 hover:bg-sand-100 transition-colors">
                  <div className="shipment-icon flex items-center justify-center w-8 h-8 rounded-lg bg-navy-50">
                    <Package className="shipment-icon-svg w-4 h-4 text-navy-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-navy-800 truncate">{s.customer || "No customer"}</p>
                    <p className="text-[10px] text-navy-400">
                      {[s.code, s.carrier, s.etd ? `ETD ${String(s.etd).slice(0, 10)}` : ""].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge variant={s.status === "Shipped" ? "green" : "amber"}>{s.status || "Draft"}</Badge>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tasks */}
          <motion.div variants={item} className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-navy-900">Next due</p>
              <CalendarDays className="w-4 h-4 text-navy-300" />
            </div>
            <div className="space-y-1.5">
              {m.openTasks.next.length === 0 ? (
                <p className="text-[12px] text-navy-400 py-4 text-center">
                  {m.openTasks.count === 0
                    ? "No open tasks. Add one under Production."
                    : "Open tasks have no due date set."}
                </p>
              ) : m.openTasks.next.map((t, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-sand-100/80 last:border-0">
                  {/* Late is the only state worth a colour here; a task that is
                      merely upcoming does not need one. */}
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.late ? "bg-red-500" : "bg-navy-300"}`} />
                  <p className="flex-1 text-[12px] text-navy-800 truncate">{t.title || "Untitled task"}</p>
                  <span className={`text-[10px] ${t.late ? "text-red-600 font-medium" : "text-navy-400"}`}>{t.due}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom row: worker performance + activity */}
      <motion.div variants={item} className="mb-5">
        <BedWaffle beds={beds} />
      </motion.div>

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
            {m.byWorker.map((w, i) => (
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
                {/* Boxes packed, from timesheets. No trend arrow: comparing a
                    worker to their own past needs a prior period the sheets do
                    not yet cover, and the old arrows were literals. */}
                <span className="text-[13px] font-bold text-navy-900 w-14 text-right tabular-nums">
                  {w.boxes.toLocaleString()}
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
            {/* Counted, not claimed. The previous version asserted a change
                against a prior season that does not exist on file. */}
            {[
              { label: "Invoiced", value: `$${m.totals.invoiced.toLocaleString()}`, icon: DollarSign },
              { label: "Stems Harvested", value: m.totals.harvested.toLocaleString(), icon: Scissors },
              { label: "Cuttings Counted", value: m.totals.counted.toLocaleString(), icon: Boxes },
              { label: "Active Customers", value: String(m.totals.customers), icon: Users },
              { label: "Treatments", value: String(m.totals.treatments), icon: Bug },
              { label: "Irrigation (L)", value: m.totals.irrigationLitres.toLocaleString(), icon: Droplets },
              { label: "Beds Planted", value: `${m.totals.bedsPlanted}/${m.totalBeds}`, icon: Layers },
              { label: "Seedings", value: String(m.totals.plantings), icon: Leaf },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-sand-50/80">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white ring-1 ring-sand-200/60 shrink-0">
                    <Icon className="w-3.5 h-3.5 text-navy-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-navy-400 truncate">{kpi.label}</p>
                    {/* No change indicator: there is no prior season on file
                        to compare against, and a green "+18%" beside a number
                        nobody measured is the thing this page was doing. */}
                    <span className="text-[13px] font-bold text-navy-900 tabular-nums">{kpi.value}</span>
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
