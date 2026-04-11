import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, TrendingUp, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "projections", label: "Weekly Projections" },
  { id: "curve", label: "Pruning Curve" },
  { id: "log", label: "Pruning Log" },
];

// --- Weekly Projections data ---
const initProjections = [
  { week: "2026-W14", plant: "Pothos / Hawaiian", size: '4.5"', projectedQty: 1200, orderedQty: 1000, confirmedQty: 1000, surplus: 200, shortfall: 0, status: "Over" },
  { week: "2026-W14", plant: "Pothos / Marble Queen", size: '4.5"', projectedQty: 800, orderedQty: 800, confirmedQty: 800, surplus: 0, shortfall: 0, status: "Equal" },
  { week: "2026-W15", plant: "Pothos / Hawaiian", size: '4.5"', projectedQty: 1100, orderedQty: 1300, confirmedQty: 1100, surplus: 0, shortfall: 200, status: "Under" },
  { week: "2026-W15", plant: "Pothos / Jade", size: '2.5"', projectedQty: 600, orderedQty: 500, confirmedQty: 500, surplus: 100, shortfall: 0, status: "Over" },
  { week: "2026-W16", plant: "Pothos / Marble Queen", size: '4.5"', projectedQty: 900, orderedQty: 900, confirmedQty: 850, surplus: 0, shortfall: 50, status: "Under" },
  { week: "2026-W16", plant: "Pothos / Hawaiian", size: '2.5"', projectedQty: 500, orderedQty: 500, confirmedQty: 500, surplus: 0, shortfall: 0, status: "Equal" },
  { week: "2026-W17", plant: "Pothos / Hawaiian", size: '4.5"', projectedQty: 1400, orderedQty: 1200, confirmedQty: 1200, surplus: 200, shortfall: 0, status: "Over" },
  { week: "2026-W18", plant: "Pothos / Jade", size: '4.5"', projectedQty: 700, orderedQty: 900, confirmedQty: 700, surplus: 0, shortfall: 200, status: "Under" },
];

// --- Pruning Curve data (weeks 42-52 of 2025 + weeks 1-16 of 2026) ---
const initCurve = [
  { season: "2025-S2", week: 42, plannedBeds: 8, actualBeds: 8, plannedCuttings: 4000, actualCuttings: 3900 },
  { season: "2025-S2", week: 43, plannedBeds: 8, actualBeds: 9, plannedCuttings: 4000, actualCuttings: 4300 },
  { season: "2025-S2", week: 44, plannedBeds: 9, actualBeds: 9, plannedCuttings: 4500, actualCuttings: 4400 },
  { season: "2025-S2", week: 45, plannedBeds: 9, actualBeds: 8, plannedCuttings: 4500, actualCuttings: 3800 },
  { season: "2025-S2", week: 46, plannedBeds: 10, actualBeds: 10, plannedCuttings: 5000, actualCuttings: 5100 },
  { season: "2025-S2", week: 47, plannedBeds: 10, actualBeds: 11, plannedCuttings: 5000, actualCuttings: 5400 },
  { season: "2025-S2", week: 48, plannedBeds: 10, actualBeds: 10, plannedCuttings: 5000, actualCuttings: 4900 },
  { season: "2025-S2", week: 49, plannedBeds: 11, actualBeds: 10, plannedCuttings: 5500, actualCuttings: 5000 },
  { season: "2025-S2", week: 50, plannedBeds: 11, actualBeds: 11, plannedCuttings: 5500, actualCuttings: 5500 },
  { season: "2025-S2", week: 51, plannedBeds: 12, actualBeds: 12, plannedCuttings: 6000, actualCuttings: 6100 },
  { season: "2025-S2", week: 52, plannedBeds: 12, actualBeds: 11, plannedCuttings: 6000, actualCuttings: 5400 },
  { season: "2026-S1", week: 1, plannedBeds: 10, actualBeds: 10, plannedCuttings: 5000, actualCuttings: 5000 },
  { season: "2026-S1", week: 2, plannedBeds: 10, actualBeds: 10, plannedCuttings: 5000, actualCuttings: 5100 },
  { season: "2026-S1", week: 3, plannedBeds: 11, actualBeds: 11, plannedCuttings: 5500, actualCuttings: 5300 },
  { season: "2026-S1", week: 4, plannedBeds: 11, actualBeds: 12, plannedCuttings: 5500, actualCuttings: 5900 },
  { season: "2026-S1", week: 5, plannedBeds: 12, actualBeds: 12, plannedCuttings: 6000, actualCuttings: 6000 },
  { season: "2026-S1", week: 6, plannedBeds: 12, actualBeds: 11, plannedCuttings: 6000, actualCuttings: 5500 },
  { season: "2026-S1", week: 7, plannedBeds: 12, actualBeds: 13, plannedCuttings: 6000, actualCuttings: 6400 },
  { season: "2026-S1", week: 8, plannedBeds: 13, actualBeds: 13, plannedCuttings: 6500, actualCuttings: 6500 },
  { season: "2026-S1", week: 9, plannedBeds: 13, actualBeds: 12, plannedCuttings: 6500, actualCuttings: 5800 },
  { season: "2026-S1", week: 10, plannedBeds: 13, actualBeds: 14, plannedCuttings: 6500, actualCuttings: 7000 },
  { season: "2026-S1", week: 11, plannedBeds: 14, actualBeds: 14, plannedCuttings: 7000, actualCuttings: 7100 },
  { season: "2026-S1", week: 12, plannedBeds: 14, actualBeds: 13, plannedCuttings: 7000, actualCuttings: 6400 },
  { season: "2026-S1", week: 13, plannedBeds: 14, actualBeds: 15, plannedCuttings: 7000, actualCuttings: 7500 },
  { season: "2026-S1", week: 14, plannedBeds: 15, actualBeds: 15, plannedCuttings: 7500, actualCuttings: 7500 },
  { season: "2026-S1", week: 15, plannedBeds: 15, actualBeds: 14, plannedCuttings: 7500, actualCuttings: 6800 },
  { season: "2026-S1", week: 16, plannedBeds: 15, actualBeds: 0, plannedCuttings: 7500, actualCuttings: 0 },
];

// --- Pruning Log data ---
const initLog = [
  { date: "2026-04-07", bed: "SHN-C1-B3", week: 15, bedsPruned: 3, cuttingsEstimated: 1500, worker: "Carlos M." },
  { date: "2026-04-06", bed: "SHN-C2-B14", week: 15, bedsPruned: 2, cuttingsEstimated: 1000, worker: "Maria L." },
  { date: "2026-04-05", bed: "SHS-C1-B45", week: 14, bedsPruned: 4, cuttingsEstimated: 2000, worker: "Juan P." },
  { date: "2026-04-03", bed: "SHN-C3-B25", week: 14, bedsPruned: 3, cuttingsEstimated: 1400, worker: "Ana R." },
  { date: "2026-04-01", bed: "SHS-C2-B60", week: 14, bedsPruned: 5, cuttingsEstimated: 2600, worker: "Carlos M." },
  { date: "2026-03-30", bed: "SHE-C1-B105", week: 13, bedsPruned: 3, cuttingsEstimated: 1500, worker: "Maria L." },
];

// --- Options ---
const plantOptions = [
  { value: "Pothos / Hawaiian", label: "Pothos / Hawaiian" },
  { value: "Pothos / Marble Queen", label: "Pothos / Marble Queen" },
  { value: "Pothos / Jade", label: "Pothos / Jade" },
  { value: "Pothos / N'Joy", label: "Pothos / N'Joy" },
  { value: "Pothos / Neon", label: "Pothos / Neon" },
];
const sizeOptions = [
  { value: '2.5"', label: '2.5"' },
  { value: '4.5"', label: '4.5"' },
  { value: '6"', label: '6"' },
];
const seasonOptions = [
  { value: "2026-S1", label: "2026-S1" },
  { value: "2025-S2", label: "2025-S2" },
];
const workerOptions = [
  { value: "Carlos M.", label: "Carlos M. (W001)" },
  { value: "Maria L.", label: "Maria L. (W002)" },
  { value: "Juan P.", label: "Juan P. (W003)" },
  { value: "Ana R.", label: "Ana R. (W004)" },
];

// --- Form groups ---
const projectionFields = [
  { title: "Projection Details", columns: 2 as const, fields: [
    { key: "week", label: "Week", type: "text" as const, required: true, placeholder: "e.g. 2026-W14" },
    { key: "plant", label: "Plant", type: "select" as const, options: plantOptions, required: true },
    { key: "size", label: "Size", type: "select" as const, options: sizeOptions, required: true },
    { key: "projectedQty", label: "Projected Qty", type: "number" as const, min: 0, required: true },
    { key: "orderedQty", label: "Ordered Qty", type: "number" as const, min: 0 },
    { key: "confirmedQty", label: "Confirmed Qty", type: "number" as const, min: 0 },
    { key: "surplus", label: "Surplus", type: "number" as const, min: 0 },
    { key: "shortfall", label: "Shortfall", type: "number" as const, min: 0 },
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Under", label: "Under" }, { value: "Equal", label: "Equal" }, { value: "Over", label: "Over" },
    ]},
  ]},
];

const curveFields = [
  { title: "Pruning Curve Entry", columns: 2 as const, fields: [
    { key: "season", label: "Season", type: "select" as const, options: seasonOptions, required: true },
    { key: "week", label: "Week", type: "number" as const, min: 1, max: 52, required: true },
    { key: "plannedBeds", label: "Planned Beds", type: "number" as const, min: 0, required: true },
    { key: "actualBeds", label: "Actual Beds", type: "number" as const, min: 0 },
    { key: "plannedCuttings", label: "Planned Cuttings", type: "number" as const, min: 0 },
    { key: "actualCuttings", label: "Actual Cuttings", type: "number" as const, min: 0 },
  ]},
];

const logFields = [
  { title: "Pruning Event", columns: 2 as const, fields: [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "bed", label: "Bed", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: false },
    { key: "week", label: "Week", type: "number" as const, min: 1, max: 52, required: true },
    { key: "bedsPruned", label: "Beds Pruned", type: "number" as const, min: 1, required: true },
    { key: "cuttingsEstimated", label: "Cuttings Estimated", type: "number" as const, min: 0 },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptions },
  ]},
];

// --- Badge helpers ---
const availabilityStatusBadge = (s: string) => {
  const v = s === "Under" ? "red" : s === "Equal" ? "green" : "amber";
  return <Badge variant={v}>{s}</Badge>;
};

// --- Pruning Curve Chart component ---
function PruningCurveChart({ data }: { data: typeof initCurve }) {
  const maxBeds = Math.max(...data.map((d) => Math.max(d.plannedBeds, d.actualBeds)), 1);

  return (
    <div className="bg-white rounded-xl border border-sand-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-navy-800">Planned vs Actual Beds by Week</h3>
        <div className="flex gap-3 text-[10px] text-navy-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-lime-400/70" /> Planned</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-navy-600" /> Actual</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-[3px] items-end min-w-max" style={{ height: 120 }}>
          {data.map((entry, i) => {
            const plannedH = (entry.plannedBeds / maxBeds) * 100;
            const actualH = (entry.actualBeds / maxBeds) * 100;
            const onTrack = entry.actualBeds >= entry.plannedBeds;
            const weekLabel = entry.week;

            return (
              <div key={i} className="flex flex-col items-center gap-0.5" style={{ width: 28 }}>
                <div className="relative flex gap-[1px] items-end" style={{ height: 100 }}>
                  {/* Planned bar */}
                  <div
                    className="w-[11px] rounded-t-sm bg-lime-400/60"
                    style={{ height: `${plannedH}%` }}
                    title={`W${weekLabel} Planned: ${entry.plannedBeds}`}
                  />
                  {/* Actual bar */}
                  <div
                    className={`w-[11px] rounded-t-sm ${
                      entry.actualBeds === 0
                        ? "bg-sand-200"
                        : onTrack
                        ? "bg-navy-600"
                        : "bg-amber-400"
                    }`}
                    style={{ height: entry.actualBeds === 0 ? "2%" : `${actualH}%` }}
                    title={`W${weekLabel} Actual: ${entry.actualBeds}`}
                  />
                </div>
                <span className="text-[8px] font-mono text-navy-400">{weekLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AvailabilityPage() {
  const [tab, setTab] = useState("projections");

  const [projections, setProjections] = useState(initProjections);
  const [curve, setCurve] = useState(initCurve);
  const [log, setLog] = useState(initLog);

  const projectionForm = useFormModal(initProjections[0]);
  const curveForm = useFormModal(initCurve[0]);
  const logForm = useFormModal(initLog[0]);
  const confirm = useConfirmDialog();

  const save = (data: any[], setData: (d: any) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      const u = [...data]; u[form.editIndex] = values; setData(u);
    } else { setData([...data, values]); }
    form.close();
  };
  const del = (data: any[], setData: (d: any) => void) => {
    if (confirm.pending) setData(data.filter((_: any, i: number) => i !== confirm.pending!.index));
  };

  // Stats
  const thisWeekProjections = projections.filter((p) => p.week === "2026-W15");
  const totalProjected = thisWeekProjections.reduce((s, p) => s + p.projectedQty, 0);
  const totalConfirmed = thisWeekProjections.reduce((s, p) => s + p.confirmedQty, 0);
  const totalSurplus = projections.reduce((s, p) => s + p.surplus, 0);
  const totalShortfall = projections.reduce((s, p) => s + p.shortfall, 0);

  const renderTab = () => {
    switch (tab) {
      case "projections":
        return (
          <>
            <DataTable
              columns={[
                { key: "week", label: "Week" },
                { key: "plant", label: "Plant" },
                { key: "size", label: "Size" },
                { key: "projectedQty", label: "Projected" },
                { key: "orderedQty", label: "Ordered" },
                { key: "confirmedQty", label: "Confirmed" },
                { key: "status", label: "Status", render: (r) => availabilityStatusBadge(r.status as string) },
                { key: "surplus", label: "Surplus" },
                { key: "shortfall", label: "Shortfall" },
              ]}
              data={projections}
              onAdd={projectionForm.openCreate}
              onEdit={(row, i) => projectionForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="New Projection"
              searchPlaceholder="Search projections..."
            />
            <FormModal open={projectionForm.open} onClose={projectionForm.close} title={projectionForm.isEdit ? "Edit Projection" : "New Projection"} groups={projectionFields} values={projectionForm.values} onChange={projectionForm.onChange} isEdit={projectionForm.isEdit} onSubmit={(v) => save(projections, setProjections, projectionForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Projection" message="Delete this availability projection?" onConfirm={() => del(projections, setProjections)} />
          </>
        );
      case "curve":
        return (
          <>
            <PruningCurveChart data={curve} />
            <DataTable
              columns={[
                { key: "season", label: "Season" },
                { key: "week", label: "Week" },
                { key: "plannedBeds", label: "Planned Beds" },
                { key: "actualBeds", label: "Actual Beds", render: (r) => {
                  const actual = r.actualBeds as number;
                  const planned = r.plannedBeds as number;
                  const color = actual === 0 ? "gray" : actual >= planned ? "green" : "amber";
                  return <Badge variant={color}>{actual}</Badge>;
                }},
                { key: "plannedCuttings", label: "Planned Cuttings" },
                { key: "actualCuttings", label: "Actual Cuttings", render: (r) => {
                  const actual = r.actualCuttings as number;
                  const planned = r.plannedCuttings as number;
                  const color = actual === 0 ? "gray" : actual >= planned ? "green" : "amber";
                  return <Badge variant={color}>{actual.toLocaleString()}</Badge>;
                }},
              ]}
              data={curve}
              onAdd={curveForm.openCreate}
              onEdit={(row, i) => curveForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Week"
              searchPlaceholder="Search curve..."
            />
            <FormModal open={curveForm.open} onClose={curveForm.close} title={curveForm.isEdit ? "Edit Curve Entry" : "Add Curve Entry"} groups={curveFields} values={curveForm.values} onChange={curveForm.onChange} isEdit={curveForm.isEdit} onSubmit={(v) => save(curve, setCurve, curveForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Entry" message="Delete this pruning curve entry?" onConfirm={() => del(curve, setCurve)} />
          </>
        );
      case "log":
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
              data={log}
              onAdd={logForm.openCreate}
              onEdit={(row, i) => logForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Log Pruning"
              searchPlaceholder="Search pruning log..."
            />
            <FormModal open={logForm.open} onClose={logForm.close} title={logForm.isEdit ? "Edit Pruning Event" : "Log Pruning Event"} groups={logFields} values={logForm.values} onChange={logForm.onChange} isEdit={logForm.isEdit} onSubmit={(v) => save(log, setLog, logForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Entry" message="Delete this pruning log entry?" onConfirm={() => del(log, setLog)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Availability" subtitle="Projections, pruning curves and confirmations" icon={CalendarCheck}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Projected This Week" value={totalProjected.toLocaleString()} icon={TrendingUp} color="blue" />
        <StatCard label="Confirmed" value={totalConfirmed.toLocaleString()} icon={CheckCircle} color="green" />
        <StatCard label="Surplus" value={totalSurplus.toLocaleString()} icon={BarChart3} color="amber" />
        <StatCard label="Shortfall" value={totalShortfall.toLocaleString()} icon={AlertTriangle} color="red" />
      </motion.div>

      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
