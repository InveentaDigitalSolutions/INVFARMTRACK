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
import { useFormModal, useConfirmDialog, withoutPending, withEdited } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import { isoWeek, sum } from "../services/period";
import { PLANT_SIZE_OPTIONS } from "../services/plantSizes";
import BedCountGrid from "../components/BedCountGrid";
import AvailabilityOverview from "../components/AvailabilityOverview";
import { expandBeds } from "../services/expandBeds";
import type { CurveRow, ProjectionsRow, PruningRow } from "../services/rowTypes.generated";

const tabs = [
  // The question the projections exist to answer, before the table of them.
  { id: "overview", label: "Overview" },
  { id: "projections", label: "Weekly Projections" },
  { id: "curve", label: "Pruning Curve" },
  { id: "log", label: "Pruning Log" },
];

// --- Weekly Projections data ---
const initProjections: ProjectionsRow[] = [];

// --- Pruning Curve data (weeks 42-52 of 2025 + weeks 1-16 of 2026) ---
const initCurve: CurveRow[] = [];

// --- Pruning Log data ---
const initLog: PruningRow[] = [];

// --- Options ---
/** No fallback list. These names come from the table the lookup points at;
 *  a hand-written stand-in offered workers and varieties that do not exist,
 *  and picking one saved the record with the lookup empty. */
const plantOptionsFallback: { value: string; label: string }[] = [];
const sizeOptions = PLANT_SIZE_OPTIONS;
const seasonOptionsFallback: { value: string; label: string }[] = [];
const workerOptionsFallback: { value: string; label: string }[] = [];

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
  const maxBeds = Math.max(...data.map((d) => Math.max(d.plannedBeds ?? 0, d.actualBeds ?? 0)), 1);

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
            const planned = entry.plannedBeds ?? 0;
            const actual = entry.actualBeds ?? 0;
            const plannedH = (planned / maxBeds) * 100;
            const actualH = (actual / maxBeds) * 100;
            const onTrack = actual >= planned;
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
      setData(withEdited(data, form, values));
    } else {
      // One record per bed, as in Production — an array cannot bind to a
      // single bed lookup.
      setData([...data, ...expandBeds(values)]);
    }
    form.close();
  };
  const del = (data: any[], setData: (d: any) => void) => {
    if (confirm.pending) setData(withoutPending(data, confirm.pending));
  };

  // "This week" was pinned to 2026-W15, a demo week that would have read zero
  // against real data forever. It is the current ISO week.
  const currentWeek = isoWeek(new Date());
  const thisWeekProjections = projections.filter((p) => Number(p.week) === currentWeek);
  const totalProjected = sum(thisWeekProjections, (p) => p.projectedQty);
  const totalConfirmed = sum(thisWeekProjections, (p) => p.confirmedQty);
  const totalSurplus = sum(projections, (p) => p.surplus);
  const totalShortfall = sum(projections, (p) => p.shortfall);

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
