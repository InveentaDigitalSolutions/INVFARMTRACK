import { useState } from "react";
import { motion } from "framer-motion";
import { Truck, ShoppingBag, FileText, Users } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "suppliers", label: "Suppliers" },
  { id: "purchase-orders", label: "Purchase Orders" },
];

const initSuppliers = [
  { name: "AgroSupply HN", code: "SUP-001", category: "Chemicals / Inputs", contact: "Roberto Mendez", phone: "+504 9812 3456", email: "roberto@agrosupply.hn", taxId: "08019012345678", terms: "Net 30", active: true, notes: "" },
  { name: "DHL Express", code: "SUP-002", category: "Logistics / Freight", contact: "Ana Torres", phone: "+504 2231 4567", email: "ana.torres@dhl.com", taxId: "", terms: "Cash", active: true, notes: "Primary carrier for USA shipments" },
  { name: "TecniAgua", code: "SUP-003", category: "Maintenance", contact: "Mario Reyes", phone: "+504 9745 6789", email: "info@tecniagua.hn", taxId: "05019087654321", terms: "Net 15", active: true, notes: "Irrigation system maintenance" },
  { name: "NutriMax Honduras", code: "SUP-004", category: "Chemicals / Inputs", contact: "Laura Gomez", phone: "+504 9923 4567", email: "ventas@nutrimax.hn", taxId: "08019098765432", terms: "Net 30", active: true, notes: "NPK fertilizers" },
  { name: "PackBox Central", code: "SUP-005", category: "Packaging", contact: "Carlos Mejia", phone: "+504 9634 5678", email: "carlos@packbox.hn", taxId: "", terms: "Cash", active: true, notes: "Cardboard boxes and packaging materials" },
];

const initPOs = [
  { number: "PO-2026-001", supplier: "AgroSupply HN", date: "2026-04-01", delivery: "2026-04-08", description: "Neem Oil 20L + Copper Fungicide 10L", amount: 320.00, currency: "USD", status: "Received", notes: "" },
  { number: "PO-2026-002", supplier: "PackBox Central", date: "2026-04-05", delivery: "2026-04-12", description: "Export boxes (200 units) + foam inserts", amount: 15000.00, currency: "HNL", status: "Confirmed", notes: "" },
  { number: "PO-2026-003", supplier: "NutriMax Honduras", date: "2026-04-08", delivery: "2026-04-15", description: "NPK 20-20-20 (50kg bags x 10)", amount: 8500.00, currency: "HNL", status: "Sent", notes: "Monthly fertilizer order" },
  { number: "PO-2026-004", supplier: "TecniAgua", date: "2026-04-10", delivery: "2026-04-20", description: "Drip line replacement — Shadehouse North C2", amount: 4200.00, currency: "HNL", status: "Draft", notes: "" },
];

const supplierOptions = initSuppliers.map((s) => ({ value: s.name, label: s.name }));

const supplierFormGroups = [
  { title: "Supplier Information", columns: 2 as const, fields: [
    { key: "name", label: "Supplier Name", type: "text" as const, required: true },
    { key: "code", label: "Supplier Code", type: "text" as const },
    { key: "category", label: "Category", type: "select" as const, required: true, options: [
      { value: "Chemicals / Inputs", label: "Chemicals / Inputs" }, { value: "Packaging", label: "Packaging" },
      { value: "Equipment", label: "Equipment" }, { value: "Substrates", label: "Substrates" },
      { value: "Logistics / Freight", label: "Logistics / Freight" }, { value: "Maintenance", label: "Maintenance" },
      { value: "Utilities", label: "Utilities" }, { value: "Professional Services", label: "Professional Services" },
      { value: "Other", label: "Other" },
    ]},
    { key: "terms", label: "Payment Terms", type: "select" as const, options: [
      { value: "Cash", label: "Cash" }, { value: "Net 15", label: "Net 15" },
      { value: "Net 30", label: "Net 30" }, { value: "Net 60", label: "Net 60" }, { value: "Credit", label: "Credit" },
    ]},
  ]},
  { title: "Contact", columns: 2 as const, fields: [
    { key: "contact", label: "Contact Name", type: "text" as const },
    { key: "phone", label: "Phone", type: "text" as const },
    { key: "email", label: "Email", type: "text" as const },
    { key: "taxId", label: "Tax ID / RTN", type: "text" as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

const poFormGroups = [
  { title: "Purchase Order", columns: 2 as const, fields: [
    { key: "number", label: "PO Number", type: "text" as const, required: true },
    { key: "supplier", label: "Supplier", type: "select" as const, options: supplierOptions, required: true },
    { key: "date", label: "Order Date", type: "date" as const, required: true },
    { key: "delivery", label: "Expected Delivery", type: "date" as const },
    { key: "amount", label: "Amount", type: "number" as const, min: 0 },
    { key: "currency", label: "Currency", type: "toggle" as const, options: [{ value: "HNL", label: "HNL" }, { value: "USD", label: "USD" }] },
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Draft", label: "Draft" }, { value: "Sent", label: "Sent" },
      { value: "Confirmed", label: "Confirmed" }, { value: "Received", label: "Received" }, { value: "Cancelled", label: "Cancelled" },
    ]},
    { key: "description", label: "Description", type: "textarea" as const, span: 2 as const },
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const statusBadge = (s: string) => {
  const v = s === "Received" ? "green" : s === "Confirmed" ? "blue" : s === "Sent" ? "amber" : s === "Draft" ? "gray" : "red";
  return <Badge variant={v}>{s}</Badge>;
};

export default function SuppliersPage() {
  const [tab, setTab] = useState("suppliers");
  const [suppliers, setSuppliers] = useState(initSuppliers);
  const [pos, setPOs] = useState(initPOs);

  const supplierForm = useFormModal(initSuppliers[0]);
  const poForm = useFormModal(initPOs[0]);
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

  const renderTab = () => {
    switch (tab) {
      case "suppliers":
        return (
          <>
            <DataTable columns={[
              { key: "name", label: "Supplier" },
              { key: "code", label: "Code" },
              { key: "category", label: "Category", render: (r) => <Badge variant="blue">{r.category as string}</Badge> },
              { key: "contact", label: "Contact" },
              { key: "phone", label: "Phone" },
              { key: "terms", label: "Terms", render: (r) => <Badge variant="gray">{r.terms as string}</Badge> },
              { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Inactive"}</Badge> },
            ]} data={suppliers} onAdd={supplierForm.openCreate} onEdit={(r, i) => supplierForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="Add Supplier" searchPlaceholder="Search suppliers..." />
            <FormModal open={supplierForm.open} onClose={supplierForm.close} title={supplierForm.isEdit ? "Edit Supplier" : "Add Supplier"} groups={supplierFormGroups} values={supplierForm.values} onChange={supplierForm.onChange} isEdit={supplierForm.isEdit} onSubmit={(v) => save(suppliers, setSuppliers, supplierForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Supplier" message="Delete this supplier?" onConfirm={() => del(suppliers, setSuppliers)} />
          </>
        );
      case "purchase-orders":
        return (
          <>
            <DataTable columns={[
              { key: "number", label: "PO #" },
              { key: "supplier", label: "Supplier" },
              { key: "date", label: "Date" },
              { key: "delivery", label: "Delivery" },
              { key: "description", label: "Description" },
              { key: "amount", label: "Amount", render: (r) => `${r.currency === "USD" ? "$" : "L "}${(r.amount as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
              { key: "status", label: "Status", render: (r) => statusBadge(r.status as string) },
            ]} data={pos} onAdd={poForm.openCreate} onEdit={(r, i) => poForm.openEdit(r as any, i)} onDelete={(r, i) => confirm.requestDelete(r, i)} addLabel="New PO" searchPlaceholder="Search purchase orders..." />
            <FormModal open={poForm.open} onClose={poForm.close} title={poForm.isEdit ? "Edit Purchase Order" : "New Purchase Order"} groups={poFormGroups} values={poForm.values} onChange={poForm.onChange} isEdit={poForm.isEdit} onSubmit={(v) => save(pos, setPOs, poForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete PO" message="Delete this purchase order?" onConfirm={() => del(pos, setPOs)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Suppliers" subtitle="Vendor management and purchase orders" icon={Truck}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Suppliers" value={suppliers.filter((s) => s.active).length} icon={Users} color="green" />
        <StatCard label="Open POs" value={pos.filter((p) => p.status !== "Received" && p.status !== "Cancelled").length} icon={FileText} color="amber" />
        <StatCard label="Monthly Spend" value="L 27,700" icon={ShoppingBag} color="blue" />
        <StatCard label="Pending Delivery" value={pos.filter((p) => p.status === "Confirmed" || p.status === "Sent").length} icon={Truck} color="lime" />
      </motion.div>
      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>
      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
