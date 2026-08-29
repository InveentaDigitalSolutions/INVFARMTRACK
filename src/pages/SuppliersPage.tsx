import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Truck, ShoppingBag, FileText, Users } from "lucide-react";
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
import { supplierSummary } from "../services/supplierInsight";
import type { PurchaseOrdersRow, SuppliersRow } from "../services/rowTypes.generated";

const tabs = [
  { id: "suppliers", label: "Suppliers" },
  { id: "purchase-orders", label: "Purchase Orders" },
];

const initSuppliers: SuppliersRow[] = [];

const initPOs: PurchaseOrdersRow[] = [];

/** No fallback list. These names come from the table the lookup points at;
 *  a hand-written stand-in offered workers and varieties that do not exist,
 *  and picking one saved the record with the lookup empty. */
const supplierOptionsFallback: { value: string; label: string }[] = [];

const supplierFormGroups = [
  { title: "Supplier Information", columns: 2 as const, fields: [
    { key: "name", label: "Supplier Name", type: "text" as const, required: true },
    { key: "code", label: "Supplier ID", type: "text" as const, readOnly: true, placeholder: "SUP-0001 (auto)" },
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
    { key: "number", label: "PO Number", type: "text" as const, readOnly: true, placeholder: "PO-0001 (auto)" },
    { key: "supplier", label: "Supplier", type: "select" as const, options: supplierOptionsFallback, optionsFrom: "suppliers", required: true },
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
  const [tab, setTab] = useState(tabs[0].id);
  const [suppliers, setSuppliers] = useRecords("suppliers", initSuppliers);
  const [pos, setPOs] = useRecords("purchaseOrders", initPOs);

  const sup = useMemo(
    () => supplierSummary({ suppliers: suppliers as never, orders: pos as never }),
    [suppliers, pos]
  );

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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricTile
          label="Spend this year"
          value={sup.spendThisYear ? `L ${sup.spendThisYear.toLocaleString()}` : "—"}
          icon={ShoppingBag}
          // "Monthly Spend" was the literal string "L 27,700" — a number that
          // came from nowhere and would never have moved.
          context={{ label: "purchase orders", value: String(pos.length) }}
        />
        <MetricTile
          label="Open purchase orders"
          value={String(sup.openOrders)}
          icon={FileText}
          tone={sup.lateOrders > 0 ? "warn" : "default"}
          context={{ label: "value outstanding", value: sup.openValue ? `L ${sup.openValue.toLocaleString()}` : "—" }}
        />
        <MetricTile
          label="Past their delivery date"
          value={String(sup.lateOrders)}
          icon={Truck}
          tone={sup.lateOrders > 0 ? "bad" : "good"}
          context={{ label: "oldest open PO", value: sup.oldestDays ? `${sup.oldestDays} d` : "—" }}
        />
        <MetricTile
          label="Largest supplier"
          value={sup.topSupplier ?? "—"}
          icon={Users}
          // Single-sourcing is the risk a vendor list never shows.
          tone={sup.topShare >= 60 ? "warn" : "default"}
          context={{ label: "of this year's spend", value: sup.topShare ? `${sup.topShare}%` : "—" }}
        />
      </motion.div>

      {(sup.bySupplier.length > 0 || sup.byCategory.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
          {sup.bySupplier.length > 0 && (
            <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
              <h4 className="text-[13px] font-semibold text-navy-900">Spend by supplier</h4>
              <p className="text-[11px] text-navy-400 mb-4">Purchase orders raised this year</p>
              <RankedBars rows={sup.bySupplier} format={(v) => `L ${v.toLocaleString()}`} />
            </div>
          )}
          {sup.byCategory.length > 0 && (
            <div className="bg-white rounded-xl border border-sand-200/80 p-5 shadow-sm">
              <h4 className="text-[13px] font-semibold text-navy-900">Suppliers per category</h4>
              <p className="text-[11px] text-navy-400 mb-4">A category with one name in it has no second source</p>
              <RankedBars rows={sup.byCategory} format={(v) => `${v}`} showAverage={false} />
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
