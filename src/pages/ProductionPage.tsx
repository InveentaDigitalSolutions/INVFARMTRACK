import { Fragment, useState } from "react";
import { motion } from "framer-motion";
import { Sprout, Leaf, Bug, Droplets, Scissors, ClipboardList, FlaskConical } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "plantings", label: "Plantings" },
  { id: "plan", label: "Production Plan" },
  { id: "utilization", label: "Bed Utilization" },
  { id: "treatments", label: "Treatments" },
  { id: "irrigation", label: "Irrigation" },
  { id: "harvest", label: "Harvest" },
  { id: "tasks", label: "Tasks" },
  { id: "pruning", label: "Pruning" },
  { id: "fertilization", label: "Fertilization" },
  { id: "seasons", label: "Seasons" },
];

// Initial data
const initPlantings = [
  { plant: "Pothos / Hawaiian", bed: "E3-01", season: "2026-S1", date: "2026-03-15", qty: 5000, status: "Active" },
  { plant: "Pothos / Marble Queen", bed: "E1-05", season: "2026-S1", date: "2026-03-10", qty: 3000, status: "Active" },
  { plant: "Pothos / Jade", bed: "C3-12", season: "2026-S1", date: "2026-02-28", qty: 2000, status: "Active" },
];
const initTreatments = [
  { date: "2026-04-08", bed: "E3-01", input: "Neem Oil", type: "Insecticide", worker: "Carlos M.", temp: "28", humidity: "75", ph: "6.5" },
  { date: "2026-04-05", bed: "E1-05", input: "Copper Fungicide", type: "Fungicide", worker: "Maria L.", temp: "26", humidity: "80", ph: "6.2" },
];
const initIrrigation = [
  { date: "2026-04-09", bed: "E3-01", liters: 450, method: "Drip" },
  { date: "2026-04-09", bed: "E1-05", liters: 320, method: "Sprinkler" },
  { date: "2026-04-08", bed: "C3-12", liters: 200, method: "Manual" },
];
const initHarvest = [
  { date: "2026-04-07", bed: "E3-01", qty: 4200, quality: "Excellent", worker: "Juan P." },
  { date: "2026-04-05", bed: "E1-05", qty: 2800, quality: "Good", worker: "Carlos M." },
];
const initTasks = [
  { title: "Water Shadehouse 1", type: "Watering", due: "2026-04-10", assigned: "Carlos M.", priority: "High", status: "Pending", notes: "" },
  { title: "Apply Neem Oil E3-01", type: "Pest Control", due: "2026-04-11", assigned: "Maria L.", priority: "Normal", status: "Pending", notes: "" },
  { title: "Harvest Epipremnum Hawaiian", type: "Harvesting", due: "2026-04-10", assigned: "Juan P.", priority: "Urgent", status: "In Progress", notes: "" },
];

const initPruning = [
  { date: "2026-04-08", bed: "SHN-C1-B5", week: 15, bedsPruned: 3, cuttingsEstimated: 1500, worker: "Carlos M." },
  { date: "2026-04-06", bed: "SHS-C1-B42", week: 15, bedsPruned: 2, cuttingsEstimated: 1000, worker: "Maria L." },
  { date: "2026-04-03", bed: "SHN-C2-B16", week: 14, bedsPruned: 4, cuttingsEstimated: 2100, worker: "Juan P." },
  { date: "2026-04-01", bed: "SHE-C1-B103", week: 14, bedsPruned: 3, cuttingsEstimated: 1400, worker: "Ana R." },
];
const initSeasons = [
  { name: "2026-S1", start: "2026-01-01", end: "2026-06-30", description: "First season 2026", active: true },
  { name: "2025-S2", start: "2025-07-01", end: "2025-12-31", description: "Second season 2025", active: false },
];
const productionPlanWeeks = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const productionPlan = [
  { variety: "Pothos / Hawaiian",       bed: "SHN-C1",  plant: [10, 11], grow: [12, 15], harvest: [16, 17], ship: [17, 18], qty: 53525 },
  { variety: "Pothos / Marble Queen",   bed: "SHN-C2",  plant: [11, 12], grow: [13, 16], harvest: [16, 18], ship: [17, 19], qty: 102500 },
  { variety: "Pothos / Jade",           bed: "SHS-C1",  plant: [10, 11], grow: [12, 15], harvest: [16, 17], ship: [17, 18], qty: 39250 },
  { variety: "Pothos / N'Joy",          bed: "SHE-C1",  plant: [12, 13], grow: [14, 17], harvest: [18, 19], ship: [19, 20], qty: 2526 },
  { variety: "Pothos / Golden Glen",    bed: "SHE-C2",  plant: [12, 13], grow: [14, 18], harvest: [18, 20], ship: [19, 21], qty: 6365 },
  { variety: "Sansevieria",             bed: "SHN-C3",  plant: [10, 12], grow: [13, 19], harvest: [20, 21], ship: [21, 22], qty: 4000 },
];

const utilizationWeeks = [14, 15, 16, 17, 18, 19, 20];
const bedUtilization = [
  { bed: "SHN-C1-B01", area: "Shadehouse North", weeks: { 14: 60, 15: 75, 16: 95, 17: 100, 18: 110, 19: 80, 20: 40 } },
  { bed: "SHN-C1-B02", area: "Shadehouse North", weeks: { 14: 80, 15: 90, 16: 100, 17: 105, 18: 95, 19: 70, 20: 50 } },
  { bed: "SHN-C2-B12", area: "Shadehouse North", weeks: { 14: 50, 15: 60, 16: 75, 17: 90, 18: 100, 19: 95, 20: 70 } },
  { bed: "SHN-C2-B16", area: "Shadehouse North", weeks: { 14: 40, 15: 55, 16: 70, 17: 95, 18: 115, 19: 100, 20: 65 } },
  { bed: "SHN-C3-B05", area: "Shadehouse North", weeks: { 14: 30, 15: 40, 16: 60, 17: 80, 18: 90, 19: 95, 20: 100 } },
  { bed: "SHS-C1-B01", area: "Shadehouse South", weeks: { 14: 70, 15: 85, 16: 100, 17: 110, 18: 120, 19: 80, 20: 30 } },
  { bed: "SHS-C1-B14", area: "Shadehouse South", weeks: { 14: 65, 15: 70, 16: 80, 17: 95, 18: 100, 19: 70, 20: 40 } },
  { bed: "SHS-C2-B22", area: "Shadehouse South", weeks: { 14: 45, 15: 60, 16: 75, 17: 85, 18: 90, 19: 65, 20: 35 } },
  { bed: "SHE-C1-B03", area: "Shadehouse East",  weeks: { 14: 30, 15: 40, 16: 55, 17: 70, 18: 85, 19: 100, 20: 95 } },
  { bed: "SHE-C1-B08", area: "Shadehouse East",  weeks: { 14: 25, 15: 35, 16: 50, 17: 65, 18: 80, 19: 95, 20: 105 } },
  { bed: "SHE-C2-B11", area: "Shadehouse East",  weeks: { 14: 20, 15: 30, 16: 45, 17: 60, 18: 75, 19: 90, 20: 100 } },
];

const initFertilization = [
  { date: "2026-04-09", bed: "SHN-C1-B3", input: "NPK 20-20-20", qtyKg: 5, method: "Drench", nKg: 1.0, pKg: 1.0, kKg: 1.0, caKg: 0, worker: "Carlos M." },
  { date: "2026-04-07", bed: "SHS-C1-B45", input: "Calcium Nitrate", qtyKg: 3, method: "Foliar", nKg: 0.5, pKg: 0, kKg: 0, caKg: 0.6, worker: "Maria L." },
  { date: "2026-04-04", bed: "SHN-C3-B22", input: "NPK 20-20-20", qtyKg: 4, method: "Drench", nKg: 0.8, pKg: 0.8, kKg: 0.8, caKg: 0, worker: "Juan P." },
  { date: "2026-04-01", bed: "SHE-C1-B108", input: "MKP (0-52-34)", qtyKg: 2, method: "Foliar", nKg: 0, pKg: 1.04, kKg: 0.68, caKg: 0, worker: "Ana R." },
];

const plantOptions = [
  { value: "Pothos / Hawaiian", label: "Pothos / Hawaiian" },
  { value: "Pothos / Marble Queen", label: "Pothos / Marble Queen" },
  { value: "Pothos / Jade", label: "Pothos / Jade" },
  { value: "Pothos / N'Joy", label: "Pothos / N'Joy" },
  { value: "Pothos / Neon", label: "Pothos / Neon" },
];
const seasonOptions = [
  { value: "2026-S1", label: "2026-S1" },
  { value: "2025-S2", label: "2025-S2" },
];
const inputOptions = [
  { value: "Neem Oil", label: "Neem Oil" },
  { value: "Copper Fungicide", label: "Copper Fungicide" },
  { value: "NPK 20-20-20", label: "NPK 20-20-20" },
];
const workerOptions = [
  { value: "Carlos M.", label: "Carlos M. (W001)" },
  { value: "Maria L.", label: "Maria L. (W002)" },
  { value: "Juan P.", label: "Juan P. (W003)" },
  { value: "Ana R.", label: "Ana R. (W004)" },
];

// Form definitions
const plantingFields = [
  { title: "Planting Details", columns: 2 as const, fields: [
    { key: "plant", label: "Plant", type: "select" as const, options: plantOptions, required: true },
    { key: "bed", label: "Bed", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: false },
    { key: "season", label: "Season", type: "select" as const, options: seasonOptions, required: true },
    { key: "date", label: "Planting Date", type: "date" as const, required: true },
    { key: "qty", label: "Quantity", type: "number" as const, min: 1 },
    { key: "status", label: "Status", type: "toggle" as const, options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }] },
  ]},
];

const treatmentFields = [
  { title: "Treatment Details", columns: 2 as const, fields: [
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "input", label: "Input (Chemical)", type: "select" as const, options: inputOptions, required: true },
    { key: "type", label: "Type", type: "select" as const, options: [
      { value: "Insecticide", label: "Insecticide" }, { value: "Fungicide", label: "Fungicide" },
      { value: "Herbicide", label: "Herbicide" }, { value: "Regulator", label: "Regulator" },
    ], required: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptions },
    { key: "temp", label: "Temperature", type: "number" as const, suffix: "C" },
    { key: "humidity", label: "Humidity", type: "number" as const, suffix: "%" },
    { key: "ph", label: "pH", type: "number" as const },
  ]},
];

const irrigationFields = [
  { title: "Irrigation Event", columns: 2 as const, fields: [
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "liters", label: "Amount", type: "number" as const, min: 0, suffix: "L", required: true },
    { key: "method", label: "Method", type: "select" as const, options: [
      { value: "Drip", label: "Drip" }, { value: "Sprinkler", label: "Sprinkler" },
      { value: "Manual", label: "Manual" }, { value: "Flood", label: "Flood" },
    ]},
  ]},
];

const harvestFields = [
  { title: "Harvest Event", columns: 2 as const, fields: [
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "qty", label: "Quantity", type: "number" as const, min: 0, required: true },
    { key: "quality", label: "Quality", type: "select" as const, options: [
      { value: "Excellent", label: "Excellent" }, { value: "Good", label: "Good" },
      { value: "Average", label: "Average" }, { value: "Poor", label: "Poor" },
    ]},
    { key: "worker", label: "Harvested By", type: "select" as const, options: workerOptions },
  ]},
];

const taskFormGroups = [
  { title: "Task Details", columns: 2 as const, fields: [
    { key: "title", label: "Title", type: "text" as const, required: true, span: 2 as const },
    { key: "type", label: "Type", type: "select" as const, options: [
      { value: "Watering", label: "Watering" }, { value: "Fertilizing", label: "Fertilizing" },
      { value: "Pruning", label: "Pruning" }, { value: "Pest Control", label: "Pest Control" },
      { value: "Harvesting", label: "Harvesting" }, { value: "Seeding", label: "Seeding" },
      { value: "Packing", label: "Packing" }, { value: "General Maintenance", label: "General Maintenance" },
    ], required: true },
    { key: "due", label: "Due Date", type: "date" as const, required: true },
    { key: "assigned", label: "Assigned To", type: "select" as const, options: workerOptions },
    { key: "priority", label: "Priority", type: "select" as const, options: [
      { value: "Low", label: "Low" }, { value: "Normal", label: "Normal" },
      { value: "High", label: "High" }, { value: "Urgent", label: "Urgent" },
    ]},
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Pending", label: "Pending" }, { value: "In Progress", label: "In Progress" },
      { value: "Done", label: "Done" }, { value: "Skipped", label: "Skipped" },
    ]},
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const fertilizerInputOptions = [
  { value: "NPK 20-20-20", label: "NPK 20-20-20" },
  { value: "Calcium Nitrate", label: "Calcium Nitrate" },
  { value: "MKP (0-52-34)", label: "MKP (0-52-34)" },
  { value: "Potassium Sulfate", label: "Potassium Sulfate" },
  { value: "Magnesium Sulfate", label: "Magnesium Sulfate" },
];

const pruningFields = [
  { title: "Pruning Event", columns: 2 as const, fields: [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "bed", label: "Bed", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: false },
    { key: "week", label: "Week", type: "number" as const, min: 1, max: 52, required: true },
    { key: "bedsPruned", label: "Beds Pruned", type: "number" as const, min: 1, required: true },
    { key: "cuttingsEstimated", label: "Cuttings Estimated", type: "number" as const, min: 0 },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptions },
  ]},
];

const seasonFormGroups = [
  { title: "Season Details", columns: 2 as const, fields: [
    { key: "name", label: "Season Name", type: "text" as const, required: true },
    { key: "start", label: "Start Date", type: "date" as const, required: true },
    { key: "end", label: "End Date", type: "date" as const, required: true },
    { key: "description", label: "Description", type: "textarea" as const, span: 2 as const },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

const fertilizationFields = [
  { title: "Fertilization Event", columns: 2 as const, fields: [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "bed", label: "Bed", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: false },
    { key: "input", label: "Fertilizer", type: "select" as const, options: fertilizerInputOptions, required: true },
    { key: "qtyKg", label: "Qty (kg)", type: "number" as const, min: 0, required: true },
    { key: "method", label: "Method", type: "select" as const, options: [
      { value: "Drench", label: "Drench" }, { value: "Foliar", label: "Foliar" },
      { value: "Granular", label: "Granular" }, { value: "Fertigation", label: "Fertigation" },
    ]},
    { key: "nKg", label: "N (kg)", type: "number" as const, min: 0 },
    { key: "pKg", label: "P (kg)", type: "number" as const, min: 0 },
    { key: "kKg", label: "K (kg)", type: "number" as const, min: 0 },
    { key: "caKg", label: "Ca (kg)", type: "number" as const, min: 0 },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptions },
  ]},
];

const qualityBadge = (q: string) => {
  const v = q === "Excellent" ? "green" : q === "Good" ? "blue" : q === "Average" ? "amber" : "red";
  return <Badge variant={v}>{q}</Badge>;
};
const priorityBadge = (p: string) => {
  const v = p === "Urgent" ? "red" : p === "High" ? "amber" : p === "Normal" ? "blue" : "gray";
  return <Badge variant={v}>{p}</Badge>;
};
const statusBadge = (s: string) => {
  const v = s === "Done" ? "green" : s === "In Progress" ? "blue" : s === "Pending" ? "amber" : "gray";
  return <Badge variant={v}>{s}</Badge>;
};

const phaseStyles = {
  plant:   { fill: "bg-lime-300",   ring: "ring-lime-500/30",   text: "text-lime-900",  short: "P", label: "Plant" },
  grow:    { fill: "bg-green-500",  ring: "ring-green-700/30",  text: "text-white",     short: "G", label: "Grow" },
  harvest: { fill: "bg-amber-500",  ring: "ring-amber-600/30",  text: "text-amber-950", short: "H", label: "Harvest" },
  ship:    { fill: "bg-navy-700",   ring: "ring-navy-800/40",   text: "text-lime-300",  short: "S", label: "Ship" },
} as const;

const CURRENT_WEEK = 15;

function ProductionPlanGantt() {
  const minWeek = productionPlanWeeks[0];
  const maxWeek = productionPlanWeeks[productionPlanWeeks.length - 1];
  const span = maxWeek - minWeek + 1;
  const pct = (week: number) => ((week - minWeek) / span) * 100;
  const widthPct = (start: number, end: number) => ((end - start + 1) / span) * 100;
  const totalQty = productionPlan.reduce((s, r) => s + r.qty, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-navy-900 tracking-tight">Production Schedule</h3>
          <p className="text-[12px] text-navy-500 mt-0.5">
            Q2 2026 · {productionPlan.length} varieties · Weeks {minWeek}–{maxWeek} · <span className="font-mono font-semibold text-navy-700">{totalQty.toLocaleString()}</span> stems
          </p>
        </div>
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-full bg-white border border-sand-200/80 shadow-sm">
          {(["plant", "grow", "harvest", "ship"] as const).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${phaseStyles[k].fill} shadow-sm ring-1 ${phaseStyles[k].ring}`} />
              <span className="text-[11px] font-medium text-navy-700">{phaseStyles[k].label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            {/* Header */}
            <div className="flex border-b border-sand-200/80 bg-sand-50/60 sticky top-0 z-10">
              <div className="w-[240px] shrink-0 px-5 py-3 text-[10px] font-bold text-navy-500 uppercase tracking-[0.12em]">
                Variety
              </div>
              <div className="flex-1 relative">
                <div className="grid" style={{ gridTemplateColumns: `repeat(${span}, 1fr)` }}>
                  {productionPlanWeeks.map((w) => (
                    <div
                      key={w}
                      className={`py-3 text-center text-[10px] font-bold uppercase tracking-wider border-l border-sand-100 ${
                        w === CURRENT_WEEK ? "text-lime-700 bg-lime-50/60" : "text-navy-500"
                      }`}
                    >
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-[110px] shrink-0 px-4 py-3 text-right text-[10px] font-bold text-navy-500 uppercase tracking-[0.12em]">
                Qty
              </div>
            </div>

            {/* Rows */}
            <div>
              {productionPlan.map((row, idx) => (
                <div
                  key={row.variety}
                  className={`flex items-stretch transition-colors ${
                    idx % 2 === 0 ? "bg-white" : "bg-sand-50/40"
                  } hover:bg-lime-50/30`}
                >
                  <div className="w-[240px] shrink-0 px-5 py-3.5 border-r border-sand-100">
                    <p className="text-[13px] font-semibold text-navy-900 leading-tight">{row.variety}</p>
                    <p className="text-[11px] text-navy-400 mt-0.5 font-mono">{row.bed}</p>
                  </div>
                  <div className="flex-1 relative">
                    {/* Gridlines */}
                    <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${span}, 1fr)` }}>
                      {productionPlanWeeks.map((w) => (
                        <div
                          key={w}
                          className={`border-l ${
                            w === CURRENT_WEEK ? "border-lime-300/60 bg-lime-50/30" : "border-sand-100/70"
                          } h-full`}
                        />
                      ))}
                    </div>
                    {/* Phase bars */}
                    <div className="relative h-full min-h-[56px] py-3">
                      {(["plant", "grow", "harvest", "ship"] as const).map((phase) => {
                        const [s, e] = row[phase];
                        const ps = phaseStyles[phase];
                        const w = widthPct(s, e);
                        const showLabel = w > 7;
                        return (
                          <div
                            key={phase}
                            title={`${ps.label} · Wk ${s}${e !== s ? `–${e}` : ""}`}
                            className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-md ${ps.fill} shadow-sm ring-1 ${ps.ring} flex items-center justify-center transition-transform hover:scale-[1.02] hover:z-10 cursor-default`}
                            style={{ left: `calc(${pct(s)}% + 1px)`, width: `calc(${w}% - 2px)` }}
                          >
                            <span className={`text-[10px] font-bold tracking-wide ${ps.text} truncate px-1.5`}>
                              {showLabel ? ps.label : ps.short}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="w-[110px] shrink-0 px-4 py-3.5 text-right border-l border-sand-100 flex flex-col items-end justify-center">
                    <span className="text-[13px] font-mono font-bold text-navy-900">
                      {row.qty.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-navy-400 uppercase tracking-wider">stems</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer total */}
            <div className="flex items-center bg-sand-50/80 border-t border-sand-200/80">
              <div className="w-[240px] shrink-0 px-5 py-3 text-[11px] font-bold text-navy-700 uppercase tracking-[0.12em]">
                Total
              </div>
              <div className="flex-1" />
              <div className="w-[110px] shrink-0 px-4 py-3 text-right border-l border-sand-100">
                <span className="text-[13px] font-mono font-bold text-navy-900">{totalQty.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function utilizationColor(pct: number): string {
  if (pct === 0) return "bg-sand-100 text-navy-300";
  if (pct < 40) return "bg-lime-100 text-lime-800";
  if (pct < 70) return "bg-lime-300 text-lime-900";
  if (pct < 95) return "bg-green-500 text-white";
  if (pct <= 100) return "bg-green-700 text-white";
  return "bg-red-500 text-white ring-2 ring-red-300";
}

const legendStops = [
  { color: "bg-sand-100", label: "0%" },
  { color: "bg-lime-100", label: "<40" },
  { color: "bg-lime-300", label: "<70" },
  { color: "bg-green-500", label: "<95" },
  { color: "bg-green-700", label: "100" },
  { color: "bg-red-500", label: ">100" },
];

function BedUtilizationHeatmap() {
  const groups = Array.from(new Set(bedUtilization.map((b) => b.area)));
  const overCount = bedUtilization.reduce(
    (n, b) => n + utilizationWeeks.filter((w) => (b.weeks[w as keyof typeof b.weeks] ?? 0) > 100).length,
    0,
  );
  const allValues = bedUtilization.flatMap((b) =>
    utilizationWeeks.map((w) => b.weeks[w as keyof typeof b.weeks] ?? 0),
  );
  const avgAll = Math.round(allValues.reduce((s, v) => s + v, 0) / allValues.length);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-navy-900 tracking-tight">Bed Utilization</h3>
          <p className="text-[12px] text-navy-500 mt-0.5">
            Weeks {utilizationWeeks[0]}–{utilizationWeeks[utilizationWeeks.length - 1]} · {bedUtilization.length} beds · avg <span className="font-mono font-semibold text-navy-700">{avgAll}%</span>
            {overCount > 0 && (
              <> · <span className="text-red-600 font-semibold">{overCount} over-capacity cell{overCount === 1 ? "" : "s"}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-sand-200/80 shadow-sm">
          <span className="text-[10px] font-medium text-navy-500 uppercase tracking-wider">Capacity</span>
          <div className="flex items-center gap-1">
            {legendStops.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span className={`inline-block w-5 h-3 rounded-sm ${s.color} shadow-sm`} />
                <span className="text-[9px] font-mono text-navy-500 mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ minWidth: "max-content" }}>
            <thead>
              <tr className="bg-sand-50/60 border-b border-sand-200/80 sticky top-0 z-20">
                <th className="px-5 py-3 text-left text-[10px] font-bold text-navy-500 uppercase tracking-[0.12em] sticky left-0 bg-sand-50/60 z-30 min-w-[140px]">
                  Bed
                </th>
                {utilizationWeeks.map((w) => (
                  <th key={w} className="px-3 py-3 text-center text-[10px] font-bold text-navy-500 uppercase tracking-wider min-w-[72px] border-l border-sand-100">
                    Wk {w}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-[10px] font-bold text-navy-700 uppercase tracking-wider min-w-[72px] bg-sand-100/60 border-l border-sand-200">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((area) => (
                <Fragment key={area}>
                  <tr className="bg-sand-100/70 border-y border-sand-200/60">
                    <td
                      colSpan={utilizationWeeks.length + 2}
                      className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-navy-700 sticky left-0 bg-sand-100/70 z-20"
                    >
                      {area}
                    </td>
                  </tr>
                  {bedUtilization.filter((b) => b.area === area).map((b, idx) => {
                    const values = utilizationWeeks.map((w) => b.weeks[w as keyof typeof b.weeks] ?? 0);
                    const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
                    return (
                      <tr key={b.bed} className={`group hover:bg-lime-50/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-sand-50/30"}`}>
                        <td className={`px-5 py-1.5 font-mono text-[11px] font-semibold text-navy-800 sticky left-0 z-10 border-r border-sand-100 ${idx % 2 === 0 ? "bg-white" : "bg-sand-50/30"} group-hover:bg-lime-50/30`}>
                          {b.bed}
                        </td>
                        {utilizationWeeks.map((w) => {
                          const v = b.weeks[w as keyof typeof b.weeks] ?? 0;
                          return (
                            <td key={w} className="px-1.5 py-1.5 border-l border-sand-100/60">
                              <div
                                title={`${b.bed} · Wk ${w} · ${v}%`}
                                className={`mx-auto flex items-center justify-center rounded-md text-[11px] font-mono font-bold shadow-sm transition-transform hover:scale-110 cursor-default ${utilizationColor(v)}`}
                                style={{ width: 60, height: 30 }}
                              >
                                {v}%
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-1.5 py-1.5 bg-sand-50/40 border-l border-sand-200">
                          <div
                            className={`mx-auto flex items-center justify-center rounded-md text-[11px] font-mono font-bold shadow-sm ${utilizationColor(avg)}`}
                            style={{ width: 60, height: 30 }}
                          >
                            {avg}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ProductionPage() {
  const [tab, setTab] = useState("plantings");

  const [plantings, setPlantings] = useState(initPlantings);
  const [treatments, setTreatments] = useState(initTreatments);
  const [irrigation, setIrrigation] = useState(initIrrigation);
  const [harvest, setHarvest] = useState(initHarvest);
  const [tasks, setTasks] = useState(initTasks);
  const [pruning, setPruning] = useState(initPruning);
  const [fertilization, setFertilization] = useState(initFertilization);
  const [seasons, setSeasons] = useState(initSeasons);

  const plantingForm = useFormModal(initPlantings[0]);
  const treatmentForm = useFormModal(initTreatments[0]);
  const irrigationForm = useFormModal(initIrrigation[0]);
  const harvestForm = useFormModal(initHarvest[0]);
  const taskForm = useFormModal(initTasks[0]);
  const pruningForm = useFormModal(initPruning[0]);
  const fertilizationForm = useFormModal(initFertilization[0]);
  const seasonForm = useFormModal(initSeasons[0]);
  const confirm = useConfirmDialog();

  const handleSave = (data: Record<string, unknown>[], setData: (d: any) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      const updated = [...data];
      updated[form.editIndex] = values as any;
      setData(updated);
    } else {
      setData([...data, values]);
    }
    form.close();
  };

  const handleDelete = (data: Record<string, unknown>[], setData: (d: any) => void) => {
    if (confirm.pending) {
      const updated = data.filter((_, i) => i !== confirm.pending!.index);
      setData(updated);
    }
  };

  const renderTab = () => {
    switch (tab) {
      case "plantings":
        return (
          <>
            <DataTable
              columns={[
                { key: "plant", label: "Plant" },
                { key: "bed", label: "Bed" },
                { key: "season", label: "Season" },
                { key: "date", label: "Planted" },
                { key: "qty", label: "Qty" },
                { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "Active" ? "green" : "gray"}>{r.status as string}</Badge> },
              ]}
              data={plantings}
              onAdd={plantingForm.openCreate}
              onEdit={(row, i) => plantingForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="New Planting"
              searchPlaceholder="Search plantings..."
            />
            <FormModal open={plantingForm.open} onClose={plantingForm.close} title={plantingForm.isEdit ? "Edit Planting" : "New Planting"} groups={plantingFields} values={plantingForm.values} onChange={plantingForm.onChange} isEdit={plantingForm.isEdit} onSubmit={(v) => handleSave(plantings, setPlantings, plantingForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Planting" message="Are you sure you want to delete this planting record? This cannot be undone." onConfirm={() => handleDelete(plantings, setPlantings)} />
          </>
        );
      case "plan":
        return <ProductionPlanGantt />;
      case "utilization":
        return <BedUtilizationHeatmap />;
      case "treatments":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "input", label: "Input Used" },
                { key: "type", label: "Type", render: (r) => <Badge variant="amber">{r.type as string}</Badge> },
                { key: "worker", label: "Worker" },
              ]}
              data={treatments}
              onAdd={treatmentForm.openCreate}
              onEdit={(row, i) => treatmentForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Treatment"
              searchPlaceholder="Search treatments..."
            />
            <FormModal open={treatmentForm.open} onClose={treatmentForm.close} title={treatmentForm.isEdit ? "Edit Treatment" : "Log Treatment"} subtitle="Record a treatment application" groups={treatmentFields} values={treatmentForm.values} onChange={treatmentForm.onChange} isEdit={treatmentForm.isEdit} onSubmit={(v) => handleSave(treatments, setTreatments, treatmentForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Treatment" message="Are you sure you want to delete this treatment record?" onConfirm={() => handleDelete(treatments, setTreatments)} />
          </>
        );
      case "irrigation":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "liters", label: "Liters" },
                { key: "method", label: "Method", render: (r) => <Badge variant="blue">{r.method as string}</Badge> },
              ]}
              data={irrigation}
              onAdd={irrigationForm.openCreate}
              onEdit={(row, i) => irrigationForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Irrigation"
              searchPlaceholder="Search irrigation..."
            />
            <FormModal open={irrigationForm.open} onClose={irrigationForm.close} title={irrigationForm.isEdit ? "Edit Irrigation" : "Log Irrigation"} groups={irrigationFields} values={irrigationForm.values} onChange={irrigationForm.onChange} isEdit={irrigationForm.isEdit} onSubmit={(v) => handleSave(irrigation, setIrrigation, irrigationForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Record" message="Are you sure you want to delete this irrigation record?" onConfirm={() => handleDelete(irrigation, setIrrigation)} />
          </>
        );
      case "harvest":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "qty", label: "Quantity" },
                { key: "quality", label: "Quality", render: (r) => qualityBadge(r.quality as string) },
                { key: "worker", label: "Harvested By" },
              ]}
              data={harvest}
              onAdd={harvestForm.openCreate}
              onEdit={(row, i) => harvestForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Harvest"
              searchPlaceholder="Search harvests..."
            />
            <FormModal open={harvestForm.open} onClose={harvestForm.close} title={harvestForm.isEdit ? "Edit Harvest" : "Log Harvest"} groups={harvestFields} values={harvestForm.values} onChange={harvestForm.onChange} isEdit={harvestForm.isEdit} onSubmit={(v) => handleSave(harvest, setHarvest, harvestForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Record" message="Are you sure you want to delete this harvest record?" onConfirm={() => handleDelete(harvest, setHarvest)} />
          </>
        );
      case "tasks":
        return (
          <>
            <DataTable
              columns={[
                { key: "title", label: "Task" },
                { key: "type", label: "Type" },
                { key: "due", label: "Due" },
                { key: "assigned", label: "Assigned" },
                { key: "priority", label: "Priority", render: (r) => priorityBadge(r.priority as string) },
                { key: "status", label: "Status", render: (r) => statusBadge(r.status as string) },
              ]}
              data={tasks}
              onAdd={taskForm.openCreate}
              onEdit={(row, i) => taskForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Task"
              searchPlaceholder="Search tasks..."
            />
            <FormModal open={taskForm.open} onClose={taskForm.close} title={taskForm.isEdit ? "Edit Task" : "Add Task"} groups={taskFormGroups} values={taskForm.values} onChange={taskForm.onChange} isEdit={taskForm.isEdit} onSubmit={(v) => handleSave(tasks, setTasks, taskForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Task" message="Delete this task?" onConfirm={() => handleDelete(tasks, setTasks)} />
          </>
        );
      case "pruning":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "week", label: "Week" },
                { key: "bedsPruned", label: "Beds Pruned" },
                { key: "cuttingsEstimated", label: "Cuttings Est." },
                { key: "worker", label: "Worker" },
              ]}
              data={pruning}
              onAdd={pruningForm.openCreate}
              onEdit={(row, i) => pruningForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Pruning"
              searchPlaceholder="Search pruning..."
            />
            <FormModal open={pruningForm.open} onClose={pruningForm.close} title={pruningForm.isEdit ? "Edit Pruning" : "Log Pruning"} groups={pruningFields} values={pruningForm.values} onChange={pruningForm.onChange} isEdit={pruningForm.isEdit} onSubmit={(v) => handleSave(pruning, setPruning, pruningForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Pruning" message="Delete this pruning record?" onConfirm={() => handleDelete(pruning, setPruning)} />
          </>
        );
      case "fertilization":
        return (
          <>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bed", label: "Bed" },
                { key: "input", label: "Fertilizer" },
                { key: "qtyKg", label: "Qty (kg)" },
                { key: "method", label: "Method", render: (r) => <Badge variant="blue">{r.method as string}</Badge> },
                { key: "nKg", label: "N" },
                { key: "pKg", label: "P" },
                { key: "kKg", label: "K" },
                { key: "caKg", label: "Ca" },
                { key: "worker", label: "Worker" },
              ]}
              data={fertilization}
              onAdd={fertilizationForm.openCreate}
              onEdit={(row, i) => fertilizationForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Fertilization"
              searchPlaceholder="Search fertilization..."
            />
            <FormModal open={fertilizationForm.open} onClose={fertilizationForm.close} title={fertilizationForm.isEdit ? "Edit Fertilization" : "Log Fertilization"} subtitle="Record a fertilization event" groups={fertilizationFields} values={fertilizationForm.values} onChange={fertilizationForm.onChange} isEdit={fertilizationForm.isEdit} onSubmit={(v) => handleSave(fertilization, setFertilization, fertilizationForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Record" message="Delete this fertilization record?" onConfirm={() => handleDelete(fertilization, setFertilization)} />
          </>
        );
      case "seasons":
        return (
          <>
            <DataTable
              columns={[
                { key: "name", label: "Season" },
                { key: "start", label: "Start" },
                { key: "end", label: "End" },
                { key: "description", label: "Description" },
                { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Closed"}</Badge> },
              ]}
              data={seasons}
              onAdd={seasonForm.openCreate}
              onEdit={(row, i) => seasonForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Season"
              searchPlaceholder="Search seasons..."
            />
            <FormModal open={seasonForm.open} onClose={seasonForm.close} title={seasonForm.isEdit ? "Edit Season" : "Add Season"} groups={seasonFormGroups} values={seasonForm.values} onChange={seasonForm.onChange} isEdit={seasonForm.isEdit} onSubmit={(v) => handleSave(seasons, setSeasons, seasonForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Season" message="Delete this season?" onConfirm={() => handleDelete(seasons, setSeasons)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Production" subtitle="Plantings, treatments, irrigation and harvest" icon={Sprout}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Plantings" value={plantings.filter((p) => p.status === "Active").length} icon={Leaf} color="green" />
        <StatCard label="Treatments (month)" value={treatments.length} icon={Bug} color="amber" />
        <StatCard label="Water Used (L)" value={irrigation.reduce((s, i) => s + i.liters, 0).toLocaleString()} icon={Droplets} color="blue" />
        <StatCard label="Harvested" value={harvest.reduce((s, h) => s + h.qty, 0).toLocaleString()} icon={Scissors} color="green" />
      </motion.div>

      <div className="mb-4">
        <TabBar tabs={tabs} active={tab} onChange={setTab} />
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
