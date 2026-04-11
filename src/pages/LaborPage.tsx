import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { HardHat, Users, Clock, TrendingUp, Boxes, ArrowUpRight, ArrowDownRight } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "workers", label: "Workers" },
  { id: "timesheets", label: "Timesheets" },
  { id: "performance", label: "Performance" },
];

const initWorkers = [
  { name: "Carlos Martinez", code: "W001", role: "Harvester", phone: "+504 9812 1001", identity: "0801-1990-12345", hireDate: "2024-03-15", hourlyRate: 45, pieceRate: 15, active: true, notes: "" },
  { name: "Maria Lopez", code: "W002", role: "Packer", phone: "+504 9812 1002", identity: "0801-1992-23456", hireDate: "2024-06-01", hourlyRate: 42, pieceRate: 12, active: true, notes: "" },
  { name: "Juan Perez", code: "W003", role: "Field Worker", phone: "+504 9812 1003", identity: "0801-1988-34567", hireDate: "2023-01-10", hourlyRate: 40, pieceRate: 14, active: true, notes: "Also handles irrigation" },
  { name: "Ana Rodriguez", code: "W004", role: "Packer", phone: "+504 9812 1004", identity: "0801-1995-45678", hireDate: "2025-01-15", hourlyRate: 42, pieceRate: 12, active: true, notes: "" },
  { name: "Pedro Hernandez", code: "W005", role: "Irrigator", phone: "+504 9812 1005", identity: "0801-1991-56789", hireDate: "2024-09-01", hourlyRate: 43, pieceRate: 0, active: true, notes: "Irrigation specialist" },
];

const initTimesheets = [
  { entry: "Carlos — Harvest SH-N", workerId: "W001", worker: "Carlos Martinez", date: "2026-04-10", activity: "Harvesting", hours: 8, pieces: 4200, boxes: 0, bed: "Bed 3-A", cost: 360, notes: "" },
  { entry: "Maria — Packing TPC", workerId: "W002", worker: "Maria Lopez", date: "2026-04-10", activity: "Packing", hours: 7, pieces: 0, boxes: 17, bed: "", cost: 294, notes: "Hawaiian for TPC shipment" },
  { entry: "Juan — Treatment SH-S", workerId: "W003", worker: "Juan Perez", date: "2026-04-10", activity: "Treatment", hours: 4, pieces: 0, boxes: 0, bed: "Bed 41-55", cost: 160, notes: "Neem oil application" },
  { entry: "Ana — Packing TPC", workerId: "W004", worker: "Ana Rodriguez", date: "2026-04-10", activity: "Packing", hours: 7, pieces: 0, boxes: 13, bed: "", cost: 294, notes: "Marble Queen for TPC" },
  { entry: "Pedro — Irrigation SH-N", workerId: "W005", worker: "Pedro Hernandez", date: "2026-04-10", activity: "Irrigation", hours: 6, pieces: 0, boxes: 0, bed: "Batch C1-C2", cost: 258, notes: "" },
  { entry: "Carlos — Harvest SH-S", workerId: "W001", worker: "Carlos Martinez", date: "2026-04-09", activity: "Harvesting", hours: 8, pieces: 3800, boxes: 0, bed: "Bed 5-C", cost: 360, notes: "" },
  { entry: "Maria — Packing GG", workerId: "W002", worker: "Maria Lopez", date: "2026-04-09", activity: "Packing", hours: 6, pieces: 0, boxes: 10, bed: "", cost: 252, notes: "Green Gardens shipment" },
];

const workerOptions = initWorkers.map((w) => ({ value: w.name, label: `${w.name} (${w.code})` }));

const workerFormGroups = [
  { title: "Personal Information", columns: 2 as const, fields: [
    { key: "name", label: "Full Name", type: "text" as const, required: true },
    { key: "code", label: "Worker ID", type: "text" as const, required: true },
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
    { key: "worker", label: "Worker", type: "select" as const, options: workerOptions, required: true },
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
  const [tab, setTab] = useState("workers");
  const [workers, setWorkers] = useState(initWorkers);
  const [timesheets, setTimesheets] = useState(initTimesheets);

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

  // Performance metrics
  const performance = useMemo(() => {
    const workerStats = new Map<string, { hours: number; pieces: number; boxes: number; cost: number; days: number }>();
    timesheets.forEach((ts) => {
      const prev = workerStats.get(ts.worker) || { hours: 0, pieces: 0, boxes: 0, cost: 0, days: 0 };
      workerStats.set(ts.worker, {
        hours: prev.hours + ts.hours,
        pieces: prev.pieces + ts.pieces,
        boxes: prev.boxes + ts.boxes,
        cost: prev.cost + ts.cost,
        days: prev.days + 1,
      });
    });
    return Array.from(workerStats, ([name, stats]) => {
      const worker = workers.find((w) => w.name === name);
      return {
        name,
        code: worker?.code || "",
        role: worker?.role || "",
        totalHours: stats.hours,
        totalPieces: stats.pieces,
        totalBoxes: stats.boxes,
        totalCost: stats.cost,
        daysWorked: stats.days,
        avgHoursPerDay: stats.days > 0 ? (stats.hours / stats.days).toFixed(1) : "0",
        piecesPerHour: stats.hours > 0 ? Math.round(stats.pieces / stats.hours) : 0,
      };
    }).sort((a, b) => (b.totalPieces + b.totalBoxes * 2000) - (a.totalPieces + a.totalBoxes * 2000));
  }, [timesheets, workers]);

  const totalHoursToday = timesheets.filter((t) => t.date === "2026-04-10").reduce((s, t) => s + t.hours, 0);
  const totalCostToday = timesheets.filter((t) => t.date === "2026-04-10").reduce((s, t) => s + t.cost, 0);

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
              { key: "hourlyRate", label: "Rate/hr", render: (r) => `L ${r.hourlyRate}` },
              { key: "pieceRate", label: "Rate/1K", render: (r) => (r.pieceRate as number) > 0 ? `L ${r.pieceRate}` : "—" },
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
              { key: "hours", label: "Hours" },
              { key: "pieces", label: "Pieces", render: (r) => (r.pieces as number) > 0 ? (r.pieces as number).toLocaleString() : "—" },
              { key: "boxes", label: "Boxes", render: (r) => (r.boxes as number) > 0 ? String(r.boxes) : "—" },
              { key: "cost", label: "Cost", render: (r) => `L ${(r.cost as number).toLocaleString()}` },
            ]} data={timesheets} onAdd={tsForm.openCreate} onEdit={(r, i) => tsForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Log Time" searchPlaceholder="Search timesheets..." />
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
                        <span className="text-[10px] text-navy-400 font-mono">{p.code}</span>
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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Workers" value={workers.filter((w) => w.active).length} icon={Users} color="green" />
        <StatCard label="Hours Today" value={totalHoursToday} icon={Clock} color="blue" />
        <StatCard label="Labor Cost Today" value={`L ${totalCostToday.toLocaleString()}`} icon={TrendingUp} color="amber" />
        <StatCard label="Boxes Today" value={timesheets.filter((t) => t.date === "2026-04-10").reduce((s, t) => s + t.boxes, 0)} icon={Boxes} color="green" />
      </motion.div>
      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>
      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
