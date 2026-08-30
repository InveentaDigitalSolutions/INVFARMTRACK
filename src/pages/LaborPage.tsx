import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { HardHat, Users, Clock, Coins, Scissors, Gauge } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import MetricTile from "../components/MetricTile";
import RankedBars from "../components/RankedBars";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";
import { useRecords } from "../hooks/useRecords";
import type { TimesheetsRow, WorkersRow } from "../services/rowTypes.generated";
import { laborSummary, workerPerformance, weeklyHours } from "../services/laborInsight";
import { changePct } from "../services/period";

const tabs = [
  { id: "workers", label: "Workers" },
  { id: "timesheets", label: "Timesheets" },
  { id: "performance", label: "Performance" },
];

const initWorkers: WorkersRow[] = [];

const initTimesheets: TimesheetsRow[] = [];

/** No fallback list. These names come from the table the lookup points at;
 *  a hand-written stand-in offered workers and varieties that do not exist,
 *  and picking one saved the record with the lookup empty. */
const workerOptionsFallback: { value: string; label: string }[] = [];

const workerFormGroups = [
  { title: "Personal Information", columns: 2 as const, fields: [
    { key: "name", label: "Full Name", type: "text" as const, required: true },
    { key: "code", label: "Worker ID", type: "text" as const, readOnly: true, placeholder: "WRK-0001 (auto)" },
    { key: "role", label: "Role", type: "select" as const, options: [
      { value: "Field Worker", label: "Field Worker" }, { value: "Packer", label: "Packer" },
      { value: "Harvester", label: "Harvester" }, { value: "Irrigator", label: "Irrigator" },
      { value: "Supervisor", label: "Supervisor" }, { value: "Driver", label: "Driver" },
      { value: "General", label: "General" },
    ]},
    { key: "phone", label: "Phone", type: "text" as const },
    { key: "identity", label: "Identity Number", type: "text" as const },
    { key: "hireDate", label: "Hire Date", type: "date" as const },
  ]},
  { title: "Compensation", columns: 2 as const, fields: [
    { key: "hourlyRate", label: "Hourly Rate (HNL)", type: "number" as const, min: 0 },
    { key: "pieceRate", label: "Piece Rate (per 1000 cuttings)", type: "number" as const, min: 0 },
    { key: "active", label: "Active", type: "boolean" as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const timesheetFormGroups = [
  { title: "Timesheet Entry", columns: 2 as const, fields: [
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptionsFallback, optionsFrom: "workers", required: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "activity", label: "Activity", type: "select" as const, required: true, options: [
      { value: "Planting", label: "Planting" }, { value: "Harvesting", label: "Harvesting" },
      { value: "Packing", label: "Packing" }, { value: "Treatment", label: "Treatment" },
      { value: "Irrigation", label: "Irrigation" }, { value: "Maintenance", label: "Maintenance" },
      { value: "General", label: "General" },
    ]},
    { key: "hours", label: "Hours Worked", type: "number" as const, min: 0 },
    { key: "pieces", label: "Piece Count (cuttings)", type: "number" as const, min: 0 },
    { key: "boxes", label: "Boxes Packed", type: "number" as const, min: 0 },
    { key: "bed", label: "Bed / Area", type: "text" as const },
    { key: "cost", label: "Labor Cost (HNL)", type: "number" as const, min: 0 },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const roleBadge = (r: string) => {
  const v = r === "Harvester" ? "green" : r === "Packer" ? "blue" : r === "Irrigator" ? "blue" : r === "Supervisor" ? "amber" : "gray";
  return <Badge variant={v}>{r}</Badge>;
};
const activityBadge = (a: string) => {
  const v = a === "Harvesting" ? "green" : a === "Packing" ? "blue" : a === "Treatment" ? "amber" : a === "Irrigation" ? "blue" : "gray";
  return <Badge variant={v}>{a}</Badge>;
};

export default function LaborPage() {
  const [tab, setTab] = useState(tabs[0].id);
  const [workers, setWorkers] = useRecords("workers", initWorkers);
  const [timesheets, setTimesheets] = useRecords("timesheets", initTimesheets);

  const workerForm = useFormModal(initWorkers[0]);
  const tsForm = useFormModal(initTimesheets[0]);
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

  // Everything measured, in one place. The page had "Hours Today" pinned to
  // 2026-04-10 — a demo date that would read zero forever against real data.
  const summary = useMemo(() => laborSummary(timesheets, workers), [timesheets, workers]);
  const performance = useMemo(() => workerPerformance(timesheets, workers), [timesheets, workers]);
  const hourSeries = useMemo(() => weeklyHours(timesheets), [timesheets]);

  const renderTab = () => {
    switch (tab) {
      case "workers":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Name" },
              { key: "code", label: "ID" },
              { key: "role", label: "Role", render: (r) => roleBadge(r.role as string) },
              { key: "phone", label: "Phone" },
              { key: "hireDate", label: "Hire Date" },
              { key: "hourlyRate", label: "Rate/hr", numeric: true, render: (r) => r.hourlyRate ? `L ${r.hourlyRate}` : "—" },
              { key: "pieceRate", label: "Rate/1K", numeric: true, render: (r) => Number(r.pieceRate) > 0 ? `L ${r.pieceRate}` : "—" },
              { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]} data={workers} onAdd={workerForm.openCreate} onEdit={(r, i) => workerForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Worker" searchPlaceholder="Search workers..." />
            <FormModal open={workerForm.open} onClose={workerForm.close} title={workerForm.isEdit ? "Edit Worker" : "Add Worker"} groups={workerFormGroups} values={workerForm.values} onChange={workerForm.onChange} isEdit={workerForm.isEdit} onSubmit={(v) => save(workers, setWorkers, workerForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Worker" message="Delete this worker record?" onConfirm={() => del(workers, setWorkers)} />
          </>
        );
      case "timesheets":
        return (
          <>
            <DataTable columns={[
              { key: "worker", label: "Worker" },
              { key: "date", label: "Date" },
              { key: "activity", label: "Activity", render: (r) => activityBadge(r.activity as string) },
              { key: "hours", label: "Hours", numeric: true, heatmap: true },
              { key: "pieces", label: "Pieces", numeric: true, heatmap: true, render: (r) => Number(r.pieces) > 0 ? Number(r.pieces).toLocaleString() : "—" },
              { key: "boxes", label: "Boxes", numeric: true, heatmap: true, render: (r) => Number(r.boxes) > 0 ? String(r.boxes) : "—" },
              { key: "cost", label: "Cost", numeric: true, heatmap: true, render: (r) => `L ${(Number(r.cost) || 0).toLocaleString()}` },
            ]} data={timesheets} onAdd={tsForm.openCreate} onEdit={(r, i) => tsForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Log Time" searchPlaceholder="Search timesheets..." showLimits hint="Cell shading compares each figure against the rows on screen" />
            <FormModal open={tsForm.open} onClose={tsForm.close} title={tsForm.isEdit ? "Edit Entry" : "Log Time"} subtitle="Record worker hours and output" groups={timesheetFormGroups} values={tsForm.values} onChange={tsForm.onChange} isEdit={tsForm.isEdit} onSubmit={(v) => save(timesheets, setTimesheets, tsForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Entry" message="Delete this timesheet entry?" onConfirm={() => del(timesheets, setTimesheets)} />
          </>
        );
      case "performance":
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-sand-200/80 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-sand-100">
                <p className="text-[13px] font-semibold text-navy-900">Worker Performance Ranking</p>
                <p className="text-[11px] text-navy-400">Based on current timesheet data</p>
              </div>
              <div className="divide-y divide-sand-100/80">
                {performance.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4 px-4 py-3 hover:bg-sand-50/50 transition-colors">
                    <span className="text-[13px] font-mono text-navy-400 w-5 text-center">{i + 1}</span>
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-50 text-[11px] font-bold text-green-700 shrink-0">
                      {p.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-navy-900">{p.name}</p>
                        {roleBadge(p.role)}
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-sand-100 mt-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((p.totalPieces + p.totalBoxes * 2000) / 10000) * 100)}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-green-500 to-lime-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center shrink-0">
                      <div>
                        <p className="text-[10px] text-navy-400">Hours</p>
                        <p className="text-[13px] font-bold text-navy-900">{p.totalHours}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-navy-400">Cuttings</p>
                        <p className="text-[13px] font-bold text-navy-900">{p.totalPieces.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-navy-400">Boxes</p>
                        <p className="text-[13px] font-bold text-navy-900">{p.totalBoxes}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-navy-400">Cost</p>
                        <p className="text-[13px] font-bold text-navy-900">L {p.totalCost.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <PageShell title="Labor" subtitle="Workforce management, timesheets and performance" icon={HardHat}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        <MetricTile
          label="Hours this week"
          value={summary.hours ? summary.hours.toLocaleString() : "—"}
          icon={Clock}
          series={hourSeries}
          comparison={
            changePct(summary.hours, summary.lastHours) === undefined ? undefined : {
              label: "vs last week",
              value: `${changePct(summary.hours, summary.lastHours)! > 0 ? "+" : ""}${changePct(summary.hours, summary.lastHours)}%`,
              direction: summary.hours > summary.lastHours ? "up" : summary.hours < summary.lastHours ? "down" : "flat",
            }
          }
        />
        <MetricTile
          label="Labour cost this week"
          value={summary.cost ? `L ${summary.cost.toLocaleString()}` : "—"}
          icon={Coins}
          comparison={
            changePct(summary.cost, summary.lastCost) === undefined ? undefined : {
              label: "vs last week",
              value: `${changePct(summary.cost, summary.lastCost)! > 0 ? "+" : ""}${changePct(summary.cost, summary.lastCost)}%`,
              // Rising labour cost is not good news on its own, so the arrow
              // points at the movement and the tone stays neutral.
              direction: summary.cost > summary.lastCost ? "up" : summary.cost < summary.lastCost ? "down" : "flat",
            }
          }
          context={{ label: "cuttings cut", value: summary.pieces.toLocaleString() }}
        />
        <MetricTile
          label="Cost per 1,000 cuttings"
          value={summary.costPerThousand ? `L ${summary.costPerThousand.toLocaleString()}` : "—"}
          icon={Scissors}
          context={{ label: "boxes packed", value: String(summary.boxes) }}
        />
        <MetricTile
          label="Cuttings per hour"
          value={summary.perHour ? summary.perHour.toLocaleString() : "—"}
          icon={Gauge}
          context={{ label: "hours logged", value: summary.hours.toLocaleString() }}
        />
        <MetricTile
          label="Crew on the books"
          value={String(summary.activeWorkers)}
          icon={Users}
          tone={summary.activeWorkers > 0 && summary.loggedThisWeek === 0 ? "warn" : "default"}
          context={{ label: "logged time this week", value: `${summary.loggedThisWeek}` }}
        />
      </motion.div>

      {(summary.byWorker.length > 0 || summary.byActivity.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
          {summary.byWorker.length > 0 && (
            <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
              <h4 className="text-[13px] font-semibold text-navy-900">Cost per worker this week</h4>
              <p className="text-[11px] text-navy-400 mb-4">Against the crew average</p>
              <RankedBars rows={summary.byWorker} format={(v) => `L ${v.toLocaleString()}`} />
            </div>
          )}
          {summary.byActivity.length > 0 && (
            <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
              <h4 className="text-[13px] font-semibold text-navy-900">Where the hours went</h4>
              <p className="text-[11px] text-navy-400 mb-4">Hours by activity this week</p>
              <RankedBars rows={summary.byActivity} format={(v) => `${v} h`} showAverage={false} />
            </div>
          )}
        </div>
      )}

      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>
      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
