import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck, TrendingUp, CheckCircle, AlertTriangle, BarChart3, X } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import { PLANT_SIZE_OPTIONS } from "../services/plantSizes";
import BedCountGrid from "../components/BedCountGrid";
import AvailabilityOverview from "../components/AvailabilityOverview";
import { expandBeds } from "../services/expandBeds";

const tabs = [
  // The question the projections exist to answer, before the table of them.
  { id: "overview", label: "Overview" },
  { id: "projections", label: "Weekly Projections" },
  { id: "curve", label: "Pruning Curve" },
  { id: "log", label: "Pruning Log" },
];

// --- Weekly Projections data ---
const initProjections = [
  { week: "2026-W14", plant: "Pothos / Hawaiian", size: "Medium", projectedQty: 1200, orderedQty: 1000, confirmedQty: 1000, surplus: 200, shortfall: 0, status: "Confirmed - Over" },
  { week: "2026-W14", plant: "Pothos / Marble Queen", size: "Medium", projectedQty: 800, orderedQty: 800, confirmedQty: 800, surplus: 0, shortfall: 0, status: "Confirmed - Equal" },
  { week: "2026-W15", plant: "Pothos / Hawaiian", size: "Medium", projectedQty: 1100, orderedQty: 1300, confirmedQty: 1100, surplus: 0, shortfall: 200, status: "Confirmed - Under" },
  { week: "2026-W15", plant: "Pothos / Jade", size: "Small", projectedQty: 600, orderedQty: 500, confirmedQty: 500, surplus: 100, shortfall: 0, status: "Confirmed - Over" },
  { week: "2026-W16", plant: "Pothos / Marble Queen", size: "Medium", projectedQty: 900, orderedQty: 900, confirmedQty: 850, surplus: 0, shortfall: 50, status: "Confirmed - Under" },
  { week: "2026-W16", plant: "Pothos / Hawaiian", size: "Small", projectedQty: 500, orderedQty: 500, confirmedQty: 500, surplus: 0, shortfall: 0, status: "Confirmed - Equal" },
  { week: "2026-W17", plant: "Pothos / Hawaiian", size: "Medium", projectedQty: 1400, orderedQty: 1200, confirmedQty: 1200, surplus: 200, shortfall: 0, status: "Confirmed - Over" },
  { week: "2026-W18", plant: "Pothos / Jade", size: "Medium", projectedQty: 700, orderedQty: 900, confirmedQty: 700, surplus: 0, shortfall: 200, status: "Confirmed - Under" },
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
  { date: "2026-04-07", bed: "E3-31", week: 15, bedsPruned: 1, cuttingsEstimated: 1500, worker: "Carlos M." },
  { date: "2026-04-06", bed: "E1-18", week: 15, bedsPruned: 1, cuttingsEstimated: 1000, worker: "Maria L." },
  { date: "2026-04-05", bed: "E3-01", week: 14, bedsPruned: 1, cuttingsEstimated: 2000, worker: "Juan P." },
  { date: "2026-04-03", bed: "C3-02", week: 14, bedsPruned: 1, cuttingsEstimated: 1400, worker: "Ana R." },
  { date: "2026-04-01", bed: "E1-26", week: 14, bedsPruned: 1, cuttingsEstimated: 2600, worker: "Carlos M." },
  { date: "2026-03-30", bed: "E1-33", week: 13, bedsPruned: 1, cuttingsEstimated: 1500, worker: "Maria L." },
];

// --- Options ---
const plantOptionsFallback = [
  { value: "Pothos / Hawaiian", label: "Pothos / Hawaiian" },
  { value: "Pothos / Marble Queen", label: "Pothos / Marble Queen" },
  { value: "Pothos / Jade", label: "Pothos / Jade" },
  { value: "Pothos / N'Joy", label: "Pothos / N'Joy" },
  { value: "Pothos / Neon", label: "Pothos / Neon" },
];
const sizeOptions = PLANT_SIZE_OPTIONS;
const seasonOptionsFallback = [
  { value: "2026-S1", label: "2026-S1" },
  { value: "2025-S2", label: "2025-S2" },
];
const workerOptionsFallback = [
  { value: "Carlos M.", label: "Carlos M. (W001)" },
  { value: "Maria L.", label: "Maria L. (W002)" },
  { value: "Juan P.", label: "Juan P. (W003)" },
  { value: "Ana R.", label: "Ana R. (W004)" },
];

// --- Form groups ---
const projectionFields = [
  { title: "Projection Details", columns: 2 as const, fields: [
    { key: "week", label: "Week", type: "text" as const, required: true, placeholder: "e.g. 2026-W14" },
    { key: "plant", label: "Plant", type: "select" as const, options: plantOptionsFallback, optionsFrom: "plants", required: true },
    { key: "size", label: "Size", type: "select" as const, options: sizeOptions, required: true },
    { key: "projectedQty", label: "Projected Qty", type: "number" as const, min: 0, required: true },
    { key: "orderedQty", label: "Ordered Qty", type: "number" as const, min: 0 },
    { key: "confirmedQty", label: "Confirmed Qty", type: "number" as const, min: 0 },
    { key: "surplus", label: "Surplus", type: "number" as const, min: 0 },
    { key: "shortfall", label: "Shortfall", type: "number" as const, min: 0 },
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Projected", label: "Projected" },
      { value: "Confirmed - Under", label: "Confirmed - Under" },
      { value: "Confirmed - Equal", label: "Confirmed - Equal" },
      { value: "Confirmed - Over", label: "Confirmed - Over" },
    ]},
  ]},
];

const curveFields = [
  { title: "Pruning Curve Entry", columns: 2 as const, fields: [
    { key: "season", label: "Season", type: "select" as const, options: seasonOptionsFallback, optionsFrom: "seasons", required: true },
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
    { key: "bed", label: "Beds", type: "bedselector" as const, required: true, span: 2 as const, multiSelect: true },
    { key: "week", label: "Week", type: "number" as const, min: 1, max: 52, required: true },
    // Beds pruned is however many are selected — see expandBeds.
    { key: "cuttingsEstimated", label: "Cuttings Estimated (per bed)", type: "number" as const, min: 0 },
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptionsFallback, optionsFrom: "workers" },
  ]},
];

// --- Badge helpers ---
// Values are bv_availabilities.bv_status labels verbatim; Dataverse accepts
// nothing else. The badge drops the "Confirmed - " prefix so the column stays
// readable — every confirmed state carries it, so it distinguishes nothing.
const availabilityStatusBadge = (s: string) => {
  const variant =
    s === "Confirmed - Under" ? "red"
    : s === "Confirmed - Equal" ? "green"
    : s === "Confirmed - Over" ? "amber"
    : "gray";
  return <Badge variant={variant}>{s.replace("Confirmed - ", "")}</Badge>;
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
  const [tab, setTab] = useState(tabs[0].id);
  const [counting, setCounting] = useState(false);

  const [projections, setProjections] = useRecords("projections", initProjections);
  const [curve, setCurve] = useRecords("curve", initCurve);
  // Same records as Production > Crop Care > Pruning. This used the key
  // "log", which is bound to nothing, so everything entered here went to
  // browser storage and was lost on reload.
  const [log, setLog] = useRecords("pruning", initLog);

  const projectionForm = useFormModal(initProjections[0]);
  const curveForm = useFormModal(initCurve[0]);
  const logForm = useFormModal(initLog[0]);
  const confirm = useConfirmDialog();

  const save = (data: any[], setData: (d: any) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      const u = [...data]; u[form.editIndex] = values; setData(u);
    } else {
      // One record per bed, as in Production — an array cannot bind to a
      // single bed lookup.
      setData([...data, ...expandBeds(values)]);
    }
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
      case "overview":
        return <AvailabilityOverview />;
      case "projections":
        return (
          <>
            <AnimatePresence>
              {counting && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setCounting(false)}
                    className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.18 }}
                    role="dialog" aria-modal="true" aria-label="Count beds for a shipment week"
                    className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4"
                  >
                    <div className="w-full max-w-6xl max-h-[90vh] flex flex-col bg-white rounded-2xl
                                    border border-sand-200 shadow-2xl overflow-hidden">
                      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-sand-200">
                        <div>
                          <h2 className="text-[16px] font-semibold text-navy-900">New projection</h2>
                          <p className="text-[12px] text-navy-400 mt-0.5">
                            Count each bed for the shipment week. The pruning estimate is beside it.
                          </p>
                        </div>
                        <button
                          type="button" onClick={() => setCounting(false)} aria-label="Close"
                          className="p-1.5 rounded-lg text-navy-400 hover:text-navy-800 hover:bg-sand-100
                                     focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40
                                     transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto px-6 py-5">
                        <BedCountGrid onSaved={() => setCounting(false)} />
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
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
              onAdd={() => setCounting(true)}
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
        <StatCard variant="hero" label="Projected This Week" value={totalProjected.toLocaleString()} icon={TrendingUp} />
        <StatCard label="Confirmed" value={totalConfirmed.toLocaleString()} icon={CheckCircle} />
        <StatCard tone="warning" label="Surplus" value={totalSurplus.toLocaleString()} icon={BarChart3} />
        <StatCard tone="critical" label="Shortfall" value={totalShortfall.toLocaleString()} icon={AlertTriangle} />
      </motion.div>

      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
