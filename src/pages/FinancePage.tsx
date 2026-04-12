import { useState } from "react";
import { motion } from "framer-motion";
import { Receipt, DollarSign, FileText, Shield, Wallet } from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

const tabs = [
  { id: "invoices", label: "Invoices" },
  { id: "fiscal", label: "Fiscal (CAI)" },
  { id: "expenses", label: "Expenses" },
];

const initInvoices = [
  { number: "000-001-01-00001461", customer: "The Plant Company, LLC", date: "2026-04-08", week: 14, total: "$1,520.00", status: "Sent", balance: "$1,520.00" },
  { number: "000-001-01-00001460", customer: "Green Gardens Inc.", date: "2026-04-01", week: 13, total: "$600.00", status: "Paid", balance: "$0.00" },
];
const initFiscal = [
  { name: "CAI 2026", cai: "4ED113-4AB1C5-B6B9E0-63BE03-090919-95", rtn: "05019011379855", rangeStart: "000-001-01-00001461", rangeEnd: "000-001-01-00001530", expiry: "2027-04-06", total: 70, next: 1462, requestDate: "2026-04-06", active: true },
];
const initExpenses = [
  { name: "Neem Oil \u2014 5L", date: "2026-04-05", category: "Chemicals / Inputs", amount: 45.00, currency: "USD", vendor: "AgroSupply HN", status: "Approved", receiptUrl: "", aiExtracted: false, notes: "" },
  { name: "DHL Shipment SHP-015", date: "2026-04-08", category: "Shipping / Freight", amount: 320.00, currency: "USD", vendor: "DHL Express", status: "Paid", receiptUrl: "", aiExtracted: false, notes: "38 boxes to TPC" },
  { name: "Irrigation pump repair", date: "2026-04-02", category: "Maintenance", amount: 2500.00, currency: "HNL", vendor: "TecniAgua", status: "Pending", receiptUrl: "", aiExtracted: false, notes: "" },
  { name: "Monthly electricity", date: "2026-04-01", category: "Utilities", amount: 8500.00, currency: "HNL", vendor: "ENEE", status: "Paid", receiptUrl: "", aiExtracted: false, notes: "Shadehouse 1 + South" },
];

const customerOptions = [
  { value: "The Plant Company, LLC", label: "The Plant Company, LLC" },
  { value: "Green Gardens Inc.", label: "Green Gardens Inc." },
];

const invoiceFormGroups = [
  { title: "Invoice Details", columns: 2 as const, fields: [
    { key: "number", label: "Invoice Number", type: "text" as const, required: true },
    { key: "customer", label: "Customer", type: "select" as const, options: customerOptions, required: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "week", label: "Week", type: "number" as const },
    { key: "total", label: "Total", type: "text" as const, required: true },
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Draft", label: "Draft" }, { value: "Sent", label: "Sent" },
      { value: "Paid", label: "Paid" }, { value: "Overdue", label: "Overdue" },
    ]},
    { key: "balance", label: "Balance", type: "text" as const },
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

const invoiceStatusBadge = (s: string) => {
  const v = s === "Paid" ? "green" : s === "Sent" ? "amber" : s === "Overdue" ? "red" : "gray";
  return <Badge variant={v}>{s}</Badge>;
};

export default function FinancePage() {
  const [tab, setTab] = useState("invoices");

  const [invoices, setInvoices] = useState(initInvoices);
  const [fiscal, setFiscal] = useState(initFiscal);
  const [expenses, setExpenses] = useState(initExpenses);

  const invoiceForm = useFormModal(initInvoices[0]);
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

  const totalRevenue = initInvoices.reduce((sum, inv) => {
    const val = parseFloat(inv.total.replace(/[$,]/g, ""));
    return sum + val;
  }, 0);
  const openInvoices = invoices.filter((i) => i.status !== "Paid").length;
  const caiRemaining = fiscal.length > 0 ? fiscal[0].total - (fiscal[0].next - 1461) : 0;
  const monthlyExpenses = expenses.reduce((sum, e) => {
    if (e.currency === "USD") return sum + e.amount;
    return sum + e.amount / 25;
  }, 0);

  const renderTab = () => {
    switch (tab) {
      case "invoices":
        return (
          <>
            <DataTable
              columns={[
                { key: "number", label: "Invoice #" },
                { key: "customer", label: "Customer" },
                { key: "date", label: "Date" },
                { key: "week", label: "Week" },
                { key: "total", label: "Total" },
                { key: "status", label: "Status", render: (r) => invoiceStatusBadge(r.status as string) },
                { key: "balance", label: "Balance" },
              ]}
              data={invoices}
              onAdd={invoiceForm.openCreate}
              onEdit={(row, i) => invoiceForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Generate Invoice"
              searchPlaceholder="Search invoices..."
            />
            <FormModal open={invoiceForm.open} onClose={invoiceForm.close} title={invoiceForm.isEdit ? "Edit Invoice" : "Generate Invoice"} groups={invoiceFormGroups} values={invoiceForm.values} onChange={invoiceForm.onChange} isEdit={invoiceForm.isEdit} onSubmit={(v) => save(invoices, setInvoices, invoiceForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Invoice" message="Delete this invoice record?" onConfirm={() => del(invoices, setInvoices)} />
          </>
        );
      case "fiscal":
        return (
          <>
            <DataTable
              columns={[
                { key: "name", label: "Name" },
                { key: "cai", label: "CAI" },
                { key: "rangeStart", label: "From" },
                { key: "rangeEnd", label: "To" },
                { key: "expiry", label: "Expires" },
                { key: "total", label: "Used", render: (r) => <span>{(r.next as number) - 1461} / {r.total as number}</span> },
                { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "red"}>{r.active ? "Active" : "Expired"}</Badge> },
              ]}
              data={fiscal}
              onAdd={fiscalForm.openCreate}
              onEdit={(row, i) => fiscalForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add CAI"
              searchPlaceholder="Search fiscal..."
            />
            <FormModal open={fiscalForm.open} onClose={fiscalForm.close} title={fiscalForm.isEdit ? "Edit Fiscal Authorization" : "Add Fiscal Authorization"} subtitle="Honduras SAR CAI management" groups={fiscalFormGroups} values={fiscalForm.values} onChange={fiscalForm.onChange} isEdit={fiscalForm.isEdit} onSubmit={(v) => save(fiscal, setFiscal, fiscalForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete CAI" message="Delete this fiscal authorization?" onConfirm={() => del(fiscal, setFiscal)} />
          </>
        );
      case "expenses":
        return (
          <>
            <DataTable
              columns={[
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
              ]}
              data={expenses}
              onAdd={expenseForm.openCreate}
              onEdit={(row, i) => expenseForm.openEdit(row as any, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Expense"
              searchPlaceholder="Search expenses..."
            />
            <FormModal open={expenseForm.open} onClose={expenseForm.close} title={expenseForm.isEdit ? "Edit Expense" : "Add Expense"} groups={expenseFormGroups} values={expenseForm.values} onChange={expenseForm.onChange} isEdit={expenseForm.isEdit} onSubmit={(v) => save(expenses, setExpenses, expenseForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Expense" message="Delete this expense record?" onConfirm={() => del(expenses, setExpenses)} />
          </>
        );
    }
  };

  return (
    <PageShell title="Finance" subtitle="Invoices, fiscal compliance and expenses" icon={Receipt}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={DollarSign} color="green" />
        <StatCard label="Open Invoices" value={openInvoices} icon={FileText} color="amber" />
        <StatCard label="CAI Remaining" value={caiRemaining} icon={Shield} color="blue" />
        <StatCard label="Monthly Expenses" value={`$${Math.round(monthlyExpenses).toLocaleString()}`} icon={Wallet} color="red" />
      </motion.div>

      <div className="mb-4"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}
