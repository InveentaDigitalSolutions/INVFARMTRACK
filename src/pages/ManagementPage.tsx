import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Warehouse, Layers, CalendarDays, Shield, Receipt, Camera } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "shadehouses", label: "Shadehouses" },
  { id: "batches", label: "Batches" },
  { id: "beds", label: "Beds" },
  { id: "seasons", label: "Seasons" },
  { id: "tasks", label: "Tasks" },
  { id: "fiscal", label: "Fiscal (CAI)" },
  { id: "expenses", label: "Expenses" },
];

const initShadehouses = [
  { name: "Shadehouse North", code: "SH-N", location: "Zone A", coordinates: "", length: 60, width: 30, capacity: 12, active: true },
  { name: "Shadehouse South", code: "SH-S", location: "Zone B", coordinates: "", length: 50, width: 25, capacity: 8, active: true },
  { name: "Shadehouse East", code: "SH-E", location: "Zone C", coordinates: "", length: 55, width: 28, capacity: 10, active: true },
];
const initBatches = [
  { code: "B-2026-N1", shadehouse: "Shadehouse North", season: "2026-S1", position: "Row 1-4", notes: "" },
  { code: "B-2026-N2", shadehouse: "Shadehouse North", season: "2026-S1", position: "Row 5-8", notes: "" },
  { code: "B-2026-S1", shadehouse: "Shadehouse South", season: "2026-S1", position: "Row 1-6", notes: "" },
];
const initBeds = [
  { name: "Bed 3-A", batch: "B-2026-N1", type: "Air", level: "1", capacity: 500, material: "Metal", soilType: "Loamy", drainage: "Excellent", irrigation: "Drip", active: true },
  { name: "Bed 1-B", batch: "B-2026-N2", type: "Ground", level: "0", capacity: 400, material: "Wood", soilType: "Sandy", drainage: "Good", irrigation: "Sprinkler", active: true },
  { name: "Bed 5-C", batch: "B-2026-S1", type: "Air", level: "2", capacity: 300, material: "Plastic", soilType: "Loamy", drainage: "Good", irrigation: "Drip", active: true },
];
const initSeasons = [
  { name: "2026-S1", start: "2026-01-01", end: "2026-06-30", description: "First season 2026", active: true },
  { name: "2025-S2", start: "2025-07-01", end: "2025-12-31", description: "Second season 2025", active: false },
];
const initTasks = [
  { title: "Water Shadehouse North", type: "Watering", due: "2026-04-10", assigned: "Carlos M.", priority: "High", status: "Pending", notes: "" },
  { title: "Apply Neem Oil Bed 3-A", type: "Pest Control", due: "2026-04-11", assigned: "Maria L.", priority: "Normal", status: "Pending", notes: "" },
  { title: "Harvest Epipremnum Hawaiian", type: "Harvesting", due: "2026-04-10", assigned: "Juan P.", priority: "Urgent", status: "In Progress", notes: "" },
];
const initFiscal = [
  { name: "CAI 2026", cai: "4ED113-4AB1C5-B6B9E0-63BE03-090919-95", rtn: "05019011379855", rangeStart: "000-001-01-00001461", rangeEnd: "000-001-01-00001530", expiry: "2027-04-06", total: 70, next: 1462, requestDate: "2026-04-06", active: true },
];
const initExpenses = [
  { name: "Neem Oil — 5L", date: "2026-04-05", category: "Chemicals / Inputs", amount: 45.00, currency: "USD", vendor: "AgroSupply HN", status: "Approved", receiptUrl: "", aiExtracted: false, notes: "" },
  { name: "DHL Shipment SHP-015", date: "2026-04-08", category: "Shipping / Freight", amount: 320.00, currency: "USD", vendor: "DHL Express", status: "Paid", receiptUrl: "", aiExtracted: false, notes: "38 boxes to TPC" },
  { name: "Irrigation pump repair", date: "2026-04-02", category: "Maintenance", amount: 2500.00, currency: "HNL", vendor: "TecniAgua", status: "Pending", receiptUrl: "", aiExtracted: false, notes: "" },
  { name: "Monthly electricity", date: "2026-04-01", category: "Utilities", amount: 8500.00, currency: "HNL", vendor: "ENEE", status: "Paid", receiptUrl: "", aiExtracted: false, notes: "Shadehouse North + South" },
];

const shOptions = initShadehouses.map((s) => ({ value: s.name, label: s.name }));
const batchOptions = initBatches.map((b) => ({ value: b.code, label: `${b.code} (${b.shadehouse})` }));
const seasonOptions = [{ value: "2026-S1", label: "2026-S1" }, { value: "2025-S2", label: "2025-S2" }];
const workerOptions = [
  { value: "Carlos M.", label: "Carlos M." }, { value: "Maria L.", label: "Maria L." },
  { value: "Juan P.", label: "Juan P." }, { value: "Ana R.", label: "Ana R." },
];

const shadehouseFormGroups = [
  { title: "Shadehouse Details", columns: 2 as const, fields: [
    { key: "name", label: "Name", type: "text" as const, required: true },
    { key: "code", label: "Code", type: "text" as const, required: true },
    { key: "location", label: "Location", type: "text" as const },
    { key: "coordinates", label: "GPS Coordinates", type: "text" as const },
    { key: "length", label: "Length", type: "number" as const, suffix: "m" },
    { key: "width", label: "Width", type: "number" as const, suffix: "m" },
    { key: "capacity", label: "Capacity (beds)", type: "number" as const },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];
const batchFormGroups = [
  { title: "Batch Details", columns: 2 as const, fields: [
    { key: "code", label: "Batch Code", type: "text" as const, required: true },
    { key: "shadehouse", label: "Shadehouse", type: "select" as const, options: shOptions, required: true },
    { key: "season", label: "Season", type: "select" as const, options: seasonOptions },
    { key: "position", label: "Position", type: "text" as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];
const bedFormGroups = [
  { title: "Bed Details", columns: 2 as const, fields: [
    { key: "name", label: "Bed Name", type: "text" as const, required: true },
    { key: "batch", label: "Batch", type: "select" as const, options: batchOptions, required: true },
    { key: "type", label: "Type", type: "toggle" as const, options: [{ value: "Air", label: "Air" }, { value: "Ground", label: "Ground" }] },
    { key: "level", label: "Level", type: "select" as const, options: [{ value: "0", label: "0" }, { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }] },
    { key: "capacity", label: "Capacity", type: "number" as const },
    { key: "material", label: "Material", type: "select" as const, options: [{ value: "Wood", label: "Wood" }, { value: "Concrete", label: "Concrete" }, { value: "Plastic", label: "Plastic" }, { value: "Metal", label: "Metal" }] },
    { key: "soilType", label: "Soil Type", type: "select" as const, options: [{ value: "Sandy", label: "Sandy" }, { value: "Loamy", label: "Loamy" }, { value: "Clay", label: "Clay" }, { value: "Peaty", label: "Peaty" }] },
    { key: "drainage", label: "Drainage", type: "select" as const, options: [{ value: "Excellent", label: "Excellent" }, { value: "Good", label: "Good" }, { value: "Moderate", label: "Moderate" }, { value: "Poor", label: "Poor" }] },
    { key: "irrigation", label: "Irrigation", type: "select" as const, options: [{ value: "Drip", label: "Drip" }, { value: "Sprinkler", label: "Sprinkler" }, { value: "Manual", label: "Manual" }, { value: "None", label: "None" }] },
    { key: "active", label: "Active", type: "boolean" as const },
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
const fiscalFormGroups = [
  { title: "Fiscal Authorization (CAI)", columns: 2 as const, fields: [
    { key: "name", label: "Name", type: "text" as const, required: true },
    { key: "cai", label: "CAI", type: "text" as const, required: true },
    { key: "rtn", label: "RTN", type: "text" as const, required: true },
    { key: "rangeStart", label: "Range Start", type: "text" as const, required: true },
    { key: "rangeEnd", label: "Range End", type: "text" as const, required: true },
    { key: "expiry", label: "Expiration Date", type: "date" as const, required: true },
    { key: "total", label: "Total Authorized", type: "number" as const },
    { key: "next", label: "Next Number", type: "number" as const },
    { key: "requestDate", label: "Request Date", type: "date" as const },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];
const expenseFormGroups = [
  { title: "Expense Details", columns: 2 as const, fields: [
    { key: "name", label: "Description", type: "text" as const, required: true, span: 2 as const },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "category", label: "Category", type: "select" as const, options: [
      { value: "Supplies", label: "Supplies" }, { value: "Equipment", label: "Equipment" },
      { value: "Labor", label: "Labor" }, { value: "Transportation", label: "Transportation" },
      { value: "Utilities", label: "Utilities" }, { value: "Chemicals / Inputs", label: "Chemicals / Inputs" },
      { value: "Shipping / Freight", label: "Shipping / Freight" }, { value: "Maintenance", label: "Maintenance" },
      { value: "Office", label: "Office" }, { value: "Other", label: "Other" },
    ], required: true },
    { key: "amount", label: "Amount", type: "number" as const, min: 0, required: true },
    { key: "currency", label: "Currency", type: "toggle" as const, options: [{ value: "HNL", label: "HNL" }, { value: "USD", label: "USD" }] },
    { key: "vendor", label: "Vendor / Supplier", type: "text" as const },
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Pending", label: "Pending" }, { value: "Approved", label: "Approved" },
      { value: "Rejected", label: "Rejected" }, { value: "Paid", label: "Paid" },
    ]},
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const priorityBadge = (p: string) => {
  const v = p === "Urgent" ? "red" : p === "High" ? "amber" : p === "Normal" ? "blue" : "gray";
  return <Badge variant={v}>{p}</Badge>;
};
const statusBadge = (s: string) => {
  const v = s === "Done" || s === "Active" ? "green" : s === "In Progress" ? "blue" : s === "Pending" ? "amber" : "gray";
  return <Badge variant={v}>{s}</Badge>;
};

export default function ManagementPage() {
  const [tab, setTab] = useState("shadehouses");
  const [shadehouses, setShadehouses] = useState(initShadehouses);
  const [batches, setBatches] = useState(initBatches);
  const [beds, setBeds] = useState(initBeds);
  const [seasons, setSeasons] = useState(initSeasons);
  const [tasks, setTasks] = useState(initTasks);
  const [fiscal, setFiscal] = useState(initFiscal);
  const [expenses, setExpenses] = useState(initExpenses);

  const shForm = useFormModal(initShadehouses[0]);
  const batchForm = useFormModal(initBatches[0]);
  const bedForm = useFormModal(initBeds[0]);
  const seasonForm = useFormModal(initSeasons[0]);
  const taskForm = useFormModal(initTasks[0]);
  const fiscalForm = useFormModal(initFiscal[0]);
  const expenseForm = useFormModal(initExpenses[0]);
  const confirm = useConfirmDialog();

  const save = (data: any[], setData: (d: any) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      const u = [...data]; u[form.editIndex] = values; setData(u);
    } else { setData([...data, values]); }
    form.close();
  };
  const del = (data: any[], setData: (d: any) => void) => {
    if (confirm.pending) setData(data.filter((_, i) => i !== confirm.pending!.index));
  };

  const renderTab = () => {
    switch (tab) {
      case "shadehouses":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "location", label: "Location" },
              { key: "length", label: "L (m)" }, { key: "width", label: "W (m)" }, { key: "capacity", label: "Capacity" },
              { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]} data={shadehouses} onAdd={shForm.openCreate} onEdit={(r, i) => shForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Shadehouse" />
            <FormModal open={shForm.open} onClose={shForm.close} title={shForm.isEdit ? "Edit Shadehouse" : "Add Shadehouse"} groups={shadehouseFormGroups} values={shForm.values} onChange={shForm.onChange} isEdit={shForm.isEdit} onSubmit={(v) => save(shadehouses, setShadehouses, shForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Shadehouse" message="Delete this shadehouse and all related data?" onConfirm={() => del(shadehouses, setShadehouses)} />
          </>
        );
      case "batches":
        return (
          <>
            <DataTable columns={[
              { key: "code", label: "Code" }, { key: "shadehouse", label: "Shadehouse" },
              { key: "season", label: "Season" }, { key: "position", label: "Position" },
            ]} data={batches} onAdd={batchForm.openCreate} onEdit={(r, i) => batchForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Batch" />
            <FormModal open={batchForm.open} onClose={batchForm.close} title={batchForm.isEdit ? "Edit Batch" : "Add Batch"} groups={batchFormGroups} values={batchForm.values} onChange={batchForm.onChange} isEdit={batchForm.isEdit} onSubmit={(v) => save(batches, setBatches, batchForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Batch" message="Delete this batch?" onConfirm={() => del(batches, setBatches)} />
          </>
        );
      case "beds":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Name" }, { key: "batch", label: "Batch" },
              { key: "type", label: "Type", render: (r) => <Badge variant={r.type === "Air" ? "blue" : "green"}>{r.type as string}</Badge> },
              { key: "level", label: "Level" }, { key: "material", label: "Material" }, { key: "drainage", label: "Drainage" },
              { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]} data={beds} onAdd={bedForm.openCreate} onEdit={(r, i) => bedForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Bed" />
            <FormModal open={bedForm.open} onClose={bedForm.close} title={bedForm.isEdit ? "Edit Bed" : "Add Bed"} groups={bedFormGroups} values={bedForm.values} onChange={bedForm.onChange} isEdit={bedForm.isEdit} onSubmit={(v) => save(beds, setBeds, bedForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Bed" message="Delete this bed?" onConfirm={() => del(beds, setBeds)} />
          </>
        );
      case "seasons":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Season" }, { key: "start", label: "Start" }, { key: "end", label: "End" },
              { key: "active", label: "Status", render: (r) => statusBadge(r.active ? "Active" : "Closed") },
            ]} data={seasons} onAdd={seasonForm.openCreate} onEdit={(r, i) => seasonForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Season" />
            <FormModal open={seasonForm.open} onClose={seasonForm.close} title={seasonForm.isEdit ? "Edit Season" : "Add Season"} groups={seasonFormGroups} values={seasonForm.values} onChange={seasonForm.onChange} isEdit={seasonForm.isEdit} onSubmit={(v) => save(seasons, setSeasons, seasonForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Season" message="Delete this season?" onConfirm={() => del(seasons, setSeasons)} />
          </>
        );
      case "tasks":
        return (
          <>
            <DataTable columns={[
              { key: "title", label: "Task" }, { key: "type", label: "Type" }, { key: "due", label: "Due" },
              { key: "assigned", label: "Assigned" },
              { key: "priority", label: "Priority", render: (r) => priorityBadge(r.priority as string) },
              { key: "status", label: "Status", render: (r) => statusBadge(r.status as string) },
            ]} data={tasks} onAdd={taskForm.openCreate} onEdit={(r, i) => taskForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Task" />
            <FormModal open={taskForm.open} onClose={taskForm.close} title={taskForm.isEdit ? "Edit Task" : "Add Task"} groups={taskFormGroups} values={taskForm.values} onChange={taskForm.onChange} isEdit={taskForm.isEdit} onSubmit={(v) => save(tasks, setTasks, taskForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Task" message="Delete this task?" onConfirm={() => del(tasks, setTasks)} />
          </>
        );
      case "fiscal":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Name" }, { key: "cai", label: "CAI" },
              { key: "rangeStart", label: "From" }, { key: "rangeEnd", label: "To" },
              { key: "expiry", label: "Expires" },
              { key: "total", label: "Used", render: (r) => <span>{(r.next as number) - 1461} / {r.total as number}</span> },
              { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "red"}>{r.active ? "Active" : "Expired"}</Badge> },
            ]} data={fiscal} onAdd={fiscalForm.openCreate} onEdit={(r, i) => fiscalForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add CAI" />
            <FormModal open={fiscalForm.open} onClose={fiscalForm.close} title={fiscalForm.isEdit ? "Edit Fiscal Authorization" : "Add Fiscal Authorization"} subtitle="Honduras SAR CAI management" groups={fiscalFormGroups} values={fiscalForm.values} onChange={fiscalForm.onChange} isEdit={fiscalForm.isEdit} onSubmit={(v) => save(fiscal, setFiscal, fiscalForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete CAI" message="Delete this fiscal authorization?" onConfirm={() => del(fiscal, setFiscal)} />
          </>
        );
      case "expenses":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Description" },
              { key: "date", label: "Date" },
              { key: "category", label: "Category", render: (r) => <Badge variant="blue">{r.category as string}</Badge> },
              { key: "amount", label: "Amount", render: (r) => `${r.currency === "USD" ? "$" : "L "}${(r.amount as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
              { key: "vendor", label: "Vendor" },
              { key: "status", label: "Status", render: (r) => {
                const s = r.status as string;
                const v = s === "Paid" ? "green" : s === "Approved" ? "blue" : s === "Rejected" ? "red" : "amber";
                return <Badge variant={v}>{s}</Badge>;
              }},
            ]} data={expenses} onAdd={expenseForm.openCreate} onEdit={(r, i) => expenseForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Expense" searchPlaceholder="Search expenses..." />
            <FormModal open={expenseForm.open} onClose={expenseForm.close} title={expenseForm.isEdit ? "Edit Expense" : "Add Expense"} groups={expenseFormGroups} values={expenseForm.values} onChange={expenseForm.onChange} isEdit={expenseForm.isEdit} onSubmit={(v) => save(expenses, setExpenses, expenseForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Expense" message="Delete this expense record?" onConfirm={() => del(expenses, setExpenses)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Management" subtitle="Infrastructure, tasks, seasons and fiscal compliance" icon={BarChart3}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Shadehouses" value={shadehouses.filter((s) => s.active).length} icon={Warehouse} color="green" />
        <StatCard label="Active Beds" value={beds.filter((b) => b.active).length} icon={Layers} color="blue" />
        <StatCard label="Pending Tasks" value={tasks.filter((t) => t.status === "Pending").length} icon={CalendarDays} color="amber" />
        <StatCard label="CAI Remaining" value={fiscal.length > 0 ? fiscal[0].total - (fiscal[0].next - 1461) : 0} icon={Shield} color="green" />
      </motion.div>

      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
