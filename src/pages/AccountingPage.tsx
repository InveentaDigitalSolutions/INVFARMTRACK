import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Receipt, DollarSign, FileText, Shield, Wallet, Landmark, ArrowDownToLine,
  ArrowUpFromLine, Banknote, Percent, BarChart3, TrendingUp, AlertCircle, Building2,
} from "lucide-react";
import PageShell from "../components/PageShell";
import TabBar from "../components/TabBar";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import FormModal from "../components/FormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useFormModal, useConfirmDialog } from "../hooks/useFormModal";

/* -----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------- */
type Currency = "USD" | "HNL";

interface Invoice {
  number: string; customer: string; date: string; dueDate: string; week: number;
  subtotal: number; isv: number; total: number; balance: number;
  currency: Currency; status: string;
}
interface Bill {
  number: string; supplier: string; poRef: string; date: string; dueDate: string;
  subtotal: number; isv: number; total: number; balance: number;
  currency: Currency; status: string; rtn: string; notes: string;
}
interface Expense {
  name: string; date: string; category: string; amount: number; currency: Currency;
  vendor: string; bankAccount: string; status: string; notes: string;
}
interface Payment {
  id: string; type: "Receipt" | "Payment" | "Expense"; date: string;
  counterparty: string; bankAccount: string; amount: number; currency: Currency;
  reference: string; method: string; status: string;
}
interface BankAccount {
  id: string; name: string; bank: string; accountNumber: string; currency: Currency;
  openingBalance: number; active: boolean;
}
interface BankStatementLine {
  id: string; bankAccount: string; date: string; description: string;
  amount: number; balance: number; matchedTo: string; reconciled: boolean;
}

const FX_HNL_USD = 25; // 1 USD = 25 HNL (display-only conversion)

const fmt = (a: number, c: Currency = "USD") =>
  `${c === "USD" ? "$" : "L "}${a.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toUSD = (amount: number, currency: Currency) =>
  currency === "USD" ? amount : amount / FX_HNL_USD;
const daysBetween = (a: string, b: string) =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
const today = "2026-04-30";

/* -----------------------------------------------------------------
 * Sample data
 * ----------------------------------------------------------------- */
const initInvoices: Invoice[] = [
  { number: "000-001-01-00001461", customer: "The Plant Company, LLC", date: "2026-04-08", dueDate: "2026-05-08", week: 14, subtotal: 1520, isv: 0, total: 1520, balance: 1520, currency: "USD", status: "Sent" },
  { number: "000-001-01-00001460", customer: "Green Gardens Inc.", date: "2026-04-01", dueDate: "2026-05-01", week: 13, subtotal: 600, isv: 0, total: 600, balance: 0, currency: "USD", status: "Paid" },
  { number: "000-001-01-00001459", customer: "Tropical Imports Co.", date: "2026-02-25", dueDate: "2026-03-25", week: 8, subtotal: 2200, isv: 0, total: 2200, balance: 1100, currency: "USD", status: "Overdue" },
];

const initBills: Bill[] = [
  { number: "B-2026-0042", supplier: "AgroSupply HN", poRef: "PO-2026-013", date: "2026-04-09", dueDate: "2026-05-09", subtotal: 380, isv: 57, total: 437, balance: 437, currency: "USD", status: "Open", rtn: "08019988007632", notes: "Neem oil 5L x10" },
  { number: "B-2026-0041", supplier: "TecniAgua", poRef: "PO-2026-012", date: "2026-04-02", dueDate: "2026-05-02", subtotal: 2174, isv: 326, total: 2500, balance: 0, currency: "HNL", status: "Paid", rtn: "08011995004421", notes: "Pump repair" },
  { number: "B-2026-0040", supplier: "ENEE", poRef: "—", date: "2026-04-01", dueDate: "2026-04-15", subtotal: 7391, isv: 1109, total: 8500, balance: 4250, currency: "HNL", status: "Partially Paid", rtn: "06019994201001", notes: "Electricity April" },
];

const initExpenses: Expense[] = [
  { name: "Office supplies", date: "2026-04-10", category: "Office", amount: 60, currency: "USD", vendor: "Librería Maya", bankAccount: "BAC USD Operating", status: "Paid", notes: "" },
  { name: "Fuel — pickup", date: "2026-04-09", category: "Transportation", amount: 1200, currency: "HNL", vendor: "UNO", bankAccount: "BAC HNL Cash", status: "Paid", notes: "" },
  { name: "Coffee for crew", date: "2026-04-07", category: "Other", amount: 200, currency: "HNL", vendor: "Sula Pulpería", bankAccount: "BAC HNL Cash", status: "Paid", notes: "" },
];

const initBankAccounts: BankAccount[] = [
  { id: "BA-001", name: "BAC USD Operating", bank: "Banco BAC", accountNumber: "725012345", currency: "USD", openingBalance: 18500, active: true },
  { id: "BA-002", name: "Atlántida HNL Operations", bank: "Banco Atlántida", accountNumber: "11045678", currency: "HNL", openingBalance: 250000, active: true },
  { id: "BA-003", name: "BAC HNL Cash", bank: "Banco BAC", accountNumber: "725098765", currency: "HNL", openingBalance: 35000, active: true },
];

const initPayments: Payment[] = [
  { id: "PMT-0001", type: "Receipt",  date: "2026-04-02", counterparty: "Green Gardens Inc.",      bankAccount: "BAC USD Operating",        amount: 600,   currency: "USD", reference: "000-001-01-00001460", method: "Wire",  status: "Cleared" },
  { id: "PMT-0002", type: "Receipt",  date: "2026-03-15", counterparty: "Tropical Imports Co.",    bankAccount: "BAC USD Operating",        amount: 1100,  currency: "USD", reference: "000-001-01-00001459", method: "Wire",  status: "Cleared" },
  { id: "PMT-0003", type: "Payment",  date: "2026-04-04", counterparty: "TecniAgua",               bankAccount: "Atlántida HNL Operations", amount: 2500,  currency: "HNL", reference: "B-2026-0041",         method: "Wire",  status: "Cleared" },
  { id: "PMT-0004", type: "Payment",  date: "2026-04-16", counterparty: "ENEE",                    bankAccount: "Atlántida HNL Operations", amount: 4250,  currency: "HNL", reference: "B-2026-0040",         method: "Wire",  status: "Cleared" },
  { id: "PMT-0005", type: "Expense",  date: "2026-04-10", counterparty: "Librería Maya",           bankAccount: "BAC USD Operating",        amount: 60,    currency: "USD", reference: "Office supplies",     method: "Card",  status: "Cleared" },
  { id: "PMT-0006", type: "Expense",  date: "2026-04-09", counterparty: "UNO",                     bankAccount: "BAC HNL Cash",             amount: 1200,  currency: "HNL", reference: "Fuel — pickup",       method: "Cash",  status: "Cleared" },
  { id: "PMT-0007", type: "Expense",  date: "2026-04-07", counterparty: "Sula Pulpería",           bankAccount: "BAC HNL Cash",             amount: 200,   currency: "HNL", reference: "Coffee for crew",     method: "Cash",  status: "Cleared" },
];

const initStatementLines: BankStatementLine[] = [
  { id: "ST-001", bankAccount: "BAC USD Operating",        date: "2026-04-02", description: "WIRE IN GREEN GARDENS",     amount:  600,   balance: 19100,  matchedTo: "PMT-0001", reconciled: true },
  { id: "ST-002", bankAccount: "BAC USD Operating",        date: "2026-04-10", description: "POS LIBRERIA MAYA",         amount:  -60,   balance: 19040,  matchedTo: "PMT-0005", reconciled: true },
  { id: "ST-003", bankAccount: "Atlántida HNL Operations", date: "2026-04-04", description: "TRX TECNIAGUA",             amount: -2500,  balance: 247500, matchedTo: "PMT-0003", reconciled: true },
  { id: "ST-004", bankAccount: "Atlántida HNL Operations", date: "2026-04-16", description: "ENEE PAGO PARCIAL",         amount: -4250,  balance: 243250, matchedTo: "PMT-0004", reconciled: true },
  { id: "ST-005", bankAccount: "BAC USD Operating",        date: "2026-04-22", description: "BANK FEE",                  amount:  -12,   balance: 19028,  matchedTo: "",         reconciled: false },
];

const initFiscal = [
  { name: "CAI 2026", cai: "4ED113-4AB1C5-B6B9E0-63BE03-090919-95", rtn: "05019011379855", rangeStart: "000-001-01-00001461", rangeEnd: "000-001-01-00001530", expiry: "2027-04-06", total: 70, next: 1462, requestDate: "2026-04-06", active: true },
];

/* -----------------------------------------------------------------
 * Form definitions
 * ----------------------------------------------------------------- */
const customerOptions = [
  { value: "The Plant Company, LLC", label: "The Plant Company, LLC" },
  { value: "Green Gardens Inc.", label: "Green Gardens Inc." },
  { value: "Tropical Imports Co.", label: "Tropical Imports Co." },
];

const supplierOptions = [
  { value: "AgroSupply HN", label: "AgroSupply HN" },
  { value: "TecniAgua", label: "TecniAgua" },
  { value: "ENEE", label: "ENEE" },
  { value: "DHL Express", label: "DHL Express" },
];

const bankAccountOptions = (accounts: BankAccount[]) =>
  accounts.map((a) => ({ value: a.name, label: `${a.name} (${a.currency})` }));

const currencyOptions = [{ value: "HNL", label: "HNL" }, { value: "USD", label: "USD" }];

const invoiceFormGroups = [
  { title: "Invoice Details", columns: 2 as const, fields: [
    { key: "number", label: "Invoice Number", type: "text" as const, required: true },
    { key: "customer", label: "Customer", type: "select" as const, options: customerOptions, required: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "dueDate", label: "Due Date", type: "date" as const, required: true },
    { key: "week", label: "Week", type: "number" as const },
    { key: "currency", label: "Currency", type: "toggle" as const, options: currencyOptions },
    { key: "subtotal", label: "Subtotal", type: "number" as const, min: 0, required: true },
    { key: "isv", label: "ISV (15%)", type: "number" as const, min: 0 },
    { key: "total", label: "Total", type: "number" as const, min: 0, required: true },
    { key: "balance", label: "Balance Due", type: "number" as const, min: 0 },
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Draft", label: "Draft" }, { value: "Sent", label: "Sent" },
      { value: "Paid", label: "Paid" }, { value: "Overdue", label: "Overdue" },
    ]},
  ]},
];

const billFormGroups = [
  { title: "Bill Details", columns: 2 as const, fields: [
    { key: "number", label: "Bill Number", type: "text" as const, required: true },
    { key: "supplier", label: "Supplier", type: "select" as const, options: supplierOptions, required: true },
    { key: "poRef", label: "PO Reference", type: "text" as const, placeholder: "PO-2026-…" },
    { key: "rtn", label: "Supplier RTN", type: "text" as const },
    { key: "date", label: "Issue Date", type: "date" as const, required: true },
    { key: "dueDate", label: "Due Date", type: "date" as const, required: true },
    { key: "currency", label: "Currency", type: "toggle" as const, options: currencyOptions },
    { key: "subtotal", label: "Subtotal", type: "number" as const, min: 0, required: true },
    { key: "isv", label: "ISV (15%)", type: "number" as const, min: 0 },
    { key: "total", label: "Total", type: "number" as const, min: 0, required: true },
    { key: "balance", label: "Balance Due", type: "number" as const, min: 0 },
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Draft", label: "Draft" }, { value: "Open", label: "Open" },
      { value: "Partially Paid", label: "Partially Paid" }, { value: "Paid", label: "Paid" },
      { value: "Overdue", label: "Overdue" },
    ]},
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const expenseFormGroups = (accounts: BankAccount[]) => [
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
    { key: "currency", label: "Currency", type: "toggle" as const, options: currencyOptions },
    { key: "vendor", label: "Vendor", type: "text" as const },
    { key: "bankAccount", label: "Paid From", type: "select" as const, options: bankAccountOptions(accounts) },
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Pending", label: "Pending" }, { value: "Approved", label: "Approved" },
      { value: "Rejected", label: "Rejected" }, { value: "Paid", label: "Paid" },
    ]},
    { key: "notes", label: "Notes", type: "textarea" as const, span: 2 as const },
  ]},
];

const paymentFormGroups = (accounts: BankAccount[]) => [
  { title: "Payment Details", columns: 2 as const, fields: [
    { key: "id", label: "Payment ID", type: "text" as const, required: true },
    { key: "type", label: "Type", type: "select" as const, options: [
      { value: "Receipt", label: "Receipt (money in)" },
      { value: "Payment", label: "Payment (money out)" },
      { value: "Expense", label: "Expense" },
    ], required: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "counterparty", label: "Counterparty", type: "text" as const, required: true },
    { key: "bankAccount", label: "Bank Account", type: "select" as const, options: bankAccountOptions(accounts), required: true },
    { key: "amount", label: "Amount", type: "number" as const, min: 0, required: true },
    { key: "currency", label: "Currency", type: "toggle" as const, options: currencyOptions },
    { key: "reference", label: "Reference (Invoice/Bill #)", type: "text" as const },
    { key: "method", label: "Method", type: "select" as const, options: [
      { value: "Wire", label: "Wire" }, { value: "Check", label: "Check" },
      { value: "Cash", label: "Cash" }, { value: "Card", label: "Card" }, { value: "ACH", label: "ACH" },
    ]},
    { key: "status", label: "Status", type: "select" as const, options: [
      { value: "Pending", label: "Pending" }, { value: "Cleared", label: "Cleared" }, { value: "Voided", label: "Voided" },
    ]},
  ]},
];

const bankAccountFormGroups = [
  { title: "Bank Account", columns: 2 as const, fields: [
    { key: "id", label: "Account ID", type: "text" as const, required: true, placeholder: "BA-001" },
    { key: "name", label: "Display Name", type: "text" as const, required: true },
    { key: "bank", label: "Bank", type: "text" as const, required: true },
    { key: "accountNumber", label: "Account Number", type: "text" as const },
    { key: "currency", label: "Currency", type: "toggle" as const, options: currencyOptions },
    { key: "openingBalance", label: "Opening Balance", type: "number" as const, min: 0 },
    { key: "active", label: "Active", type: "boolean" as const },
  ]},
];

const statementFormGroups = (accounts: BankAccount[]) => [
  { title: "Statement Line", columns: 2 as const, fields: [
    { key: "id", label: "Line ID", type: "text" as const, required: true },
    { key: "bankAccount", label: "Bank Account", type: "select" as const, options: bankAccountOptions(accounts), required: true },
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "description", label: "Description", type: "text" as const, required: true, span: 2 as const },
    { key: "amount", label: "Amount (signed)", type: "number" as const, required: true },
    { key: "balance", label: "Running Balance", type: "number" as const },
    { key: "matchedTo", label: "Matched Payment ID", type: "text" as const, placeholder: "PMT-…" },
    { key: "reconciled", label: "Reconciled", type: "boolean" as const },
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

/* -----------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------- */
const arStatusBadge = (s: string) => {
  const v = s === "Paid" ? "green" : s === "Sent" ? "amber" : s === "Overdue" ? "red" : "gray";
  return <Badge variant={v}>{s}</Badge>;
};
const apStatusBadge = (s: string) => {
  const v = s === "Paid" ? "green" : s === "Open" ? "amber" : s === "Partially Paid" ? "blue" : s === "Overdue" ? "red" : "gray";
  return <Badge variant={v}>{s}</Badge>;
};
const paymentTypeBadge = (t: string) => {
  const v = t === "Receipt" ? "green" : t === "Payment" ? "blue" : "amber";
  return <Badge variant={v}>{t}</Badge>;
};

/* Bucket open balances by aging window. */
function buildAging<T extends { dueDate: string; balance: number; currency: Currency }>(rows: T[]) {
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
  rows.forEach((r) => {
    if (r.balance <= 0) return;
    const usd = toUSD(r.balance, r.currency);
    const dpd = daysBetween(r.dueDate, today);
    if (dpd <= 0) buckets.current += usd;
    else if (dpd <= 30) buckets.d30 += usd;
    else if (dpd <= 60) buckets.d60 += usd;
    else buckets.d90 += usd;
  });
  return buckets;
}

function AgingStrip({ buckets, color }: { buckets: ReturnType<typeof buildAging>; color: "green" | "amber" }) {
  const cells = [
    { label: "Current", v: buckets.current, tone: "bg-green-50 text-green-700 border-green-200" },
    { label: "1–30 days", v: buckets.d30, tone: "bg-lime-50 text-lime-700 border-lime-200" },
    { label: "31–60 days", v: buckets.d60, tone: "bg-amber-50 text-amber-700 border-amber-200" },
    { label: "60+ days", v: buckets.d90, tone: "bg-red-50 text-red-700 border-red-200" },
  ];
  const total = cells.reduce((s, c) => s + c.v, 0);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {cells.map((c) => (
        <div key={c.label} className={`rounded-xl border ${c.tone} px-3 py-2.5`}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{c.label}</p>
          <p className="text-[15px] font-bold mt-0.5 font-mono">{fmt(c.v)}</p>
          <p className="text-[10px] opacity-60 mt-0.5">{total > 0 ? `${Math.round((c.v / total) * 100)}% of ${color === "green" ? "AR" : "AP"}` : "0%"}</p>
        </div>
      ))}
    </div>
  );
}

/* -----------------------------------------------------------------
 * Page
 * ----------------------------------------------------------------- */
const tabs = [
  { id: "dashboard",  label: "Dashboard" },
  { id: "income",     label: "Income (AR)" },
  { id: "bills",      label: "Bills (AP)" },
  { id: "expenses",   label: "Expenses" },
  { id: "payments",   label: "Payments" },
  { id: "accounts",   label: "Bank Accounts" },
  { id: "statements", label: "Bank Statements" },
  { id: "fiscal",     label: "Fiscal (CAI)" },
  { id: "taxes",      label: "Taxes" },
  { id: "reports",    label: "Reports" },
];

export default function AccountingPage() {
  const [tab, setTab] = useState("dashboard");

  const [invoices, setInvoices] = useState(initInvoices);
  const [bills, setBills] = useState(initBills);
  const [expenses, setExpenses] = useState(initExpenses);
  const [payments, setPayments] = useState(initPayments);
  const [bankAccounts, setBankAccounts] = useState(initBankAccounts);
  const [statements, setStatements] = useState(initStatementLines);
  const [fiscal, setFiscal] = useState(initFiscal);

  const invoiceForm = useFormModal(initInvoices[0] as unknown as Record<string, unknown>);
  const billForm = useFormModal(initBills[0] as unknown as Record<string, unknown>);
  const expenseForm = useFormModal(initExpenses[0] as unknown as Record<string, unknown>);
  const paymentForm = useFormModal(initPayments[0] as unknown as Record<string, unknown>);
  const bankAccountForm = useFormModal(initBankAccounts[0] as unknown as Record<string, unknown>);
  const statementForm = useFormModal(initStatementLines[0] as unknown as Record<string, unknown>);
  const fiscalForm = useFormModal(initFiscal[0]);
  const confirm = useConfirmDialog();

  /* Derived totals (USD-equivalent for cross-currency rollups) */
  const arOutstandingUSD = useMemo(
    () => invoices.reduce((s, i) => s + (i.balance > 0 ? toUSD(i.balance, i.currency) : 0), 0),
    [invoices],
  );
  const apOutstandingUSD = useMemo(
    () => bills.reduce((s, b) => s + (b.balance > 0 ? toUSD(b.balance, b.currency) : 0), 0),
    [bills],
  );
  const cashOnHandUSD = useMemo(() => {
    return bankAccounts.reduce((s, a) => {
      const delta = payments
        .filter((p) => p.bankAccount === a.name && p.status === "Cleared")
        .reduce((acc, p) => acc + (p.type === "Receipt" ? p.amount : -p.amount), 0);
      const balance = a.openingBalance + delta;
      return s + toUSD(balance, a.currency);
    }, 0);
  }, [bankAccounts, payments]);
  const monthIncomeUSD = useMemo(
    () => payments.filter((p) => p.type === "Receipt" && p.date.startsWith("2026-04"))
      .reduce((s, p) => s + toUSD(p.amount, p.currency), 0),
    [payments],
  );
  const monthExpensesUSD = useMemo(
    () => payments.filter((p) => (p.type === "Payment" || p.type === "Expense") && p.date.startsWith("2026-04"))
      .reduce((s, p) => s + toUSD(p.amount, p.currency), 0),
    [payments],
  );
  const arAging = useMemo(() => buildAging(invoices), [invoices]);
  const apAging = useMemo(() => buildAging(bills), [bills]);
  const caiRemaining = fiscal.length > 0 ? fiscal[0].total - (fiscal[0].next - 1461) : 0;

  const accountBalance = (a: BankAccount) => {
    const delta = payments
      .filter((p) => p.bankAccount === a.name && p.status === "Cleared")
      .reduce((acc, p) => acc + (p.type === "Receipt" ? p.amount : -p.amount), 0);
    return a.openingBalance + delta;
  };

  const save = <T,>(data: T[], setData: (d: T[]) => void, form: ReturnType<typeof useFormModal>, values: Record<string, unknown>) => {
    if (form.isEdit && form.editIndex !== null) {
      const u = [...data]; u[form.editIndex] = values as T; setData(u);
    } else { setData([...data, values as T]); }
    form.close();
  };
  const del = <T,>(data: T[], setData: (d: T[]) => void) => {
    if (confirm.pending) setData(data.filter((_, i) => i !== confirm.pending!.index));
  };

  /* -----------------------------------------------------------------
   * Tab renderers
   * ----------------------------------------------------------------- */
  const renderDashboard = () => {
    const overdueInvoices = invoices.filter((i) => i.status === "Overdue" || (i.balance > 0 && daysBetween(i.dueDate, today) > 0));
    const overdueBills = bills.filter((b) => b.balance > 0 && daysBetween(b.dueDate, today) > 0);
    const recentPayments = [...payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-navy-900">Cash Position</h3>
              <Banknote className="w-4 h-4 text-navy-400" />
            </div>
            <p className="text-[28px] font-bold text-navy-900 font-mono">{fmt(cashOnHandUSD)}</p>
            <p className="text-[11px] text-navy-400 mt-1">across {bankAccounts.length} accounts · USD-equivalent</p>
            <div className="mt-3 space-y-1.5">
              {bankAccounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-navy-600">{a.name}</span>
                  <span className="font-mono font-semibold text-navy-800">{fmt(accountBalance(a), a.currency)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-navy-900">April 2026 P&amp;L</h3>
              <TrendingUp className="w-4 h-4 text-navy-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-navy-400 font-bold">Income</p>
                <p className="text-[22px] font-bold text-green-700 font-mono">{fmt(monthIncomeUSD)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-navy-400 font-bold">Expenses</p>
                <p className="text-[22px] font-bold text-red-600 font-mono">{fmt(monthExpensesUSD)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-sand-100">
              <p className="text-[10px] uppercase tracking-wider text-navy-400 font-bold">Net</p>
              <p className={`text-[22px] font-bold font-mono ${monthIncomeUSD - monthExpensesUSD >= 0 ? "text-navy-900" : "text-red-600"}`}>
                {fmt(monthIncomeUSD - monthExpensesUSD)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
            <h3 className="text-[14px] font-bold text-navy-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Overdue Invoices
            </h3>
            {overdueInvoices.length === 0 ? (
              <p className="text-[12px] text-navy-400">None — nicely done.</p>
            ) : (
              <ul className="space-y-2">
                {overdueInvoices.slice(0, 5).map((i) => (
                  <li key={i.number} className="flex items-center justify-between text-[12px]">
                    <div>
                      <p className="font-semibold text-navy-800">{i.customer}</p>
                      <p className="text-[10px] text-navy-400 font-mono">{i.number} · due {i.dueDate}</p>
                    </div>
                    <span className="font-mono font-bold text-red-600">{fmt(i.balance, i.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
            <h3 className="text-[14px] font-bold text-navy-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Overdue Bills
            </h3>
            {overdueBills.length === 0 ? (
              <p className="text-[12px] text-navy-400">None.</p>
            ) : (
              <ul className="space-y-2">
                {overdueBills.slice(0, 5).map((b) => (
                  <li key={b.number} className="flex items-center justify-between text-[12px]">
                    <div>
                      <p className="font-semibold text-navy-800">{b.supplier}</p>
                      <p className="text-[10px] text-navy-400 font-mono">{b.number} · due {b.dueDate}</p>
                    </div>
                    <span className="font-mono font-bold text-red-600">{fmt(b.balance, b.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-navy-900 mb-3">Recent Payments</h3>
          <div className="divide-y divide-sand-100">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  {p.type === "Receipt" ? (
                    <ArrowDownToLine className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowUpFromLine className="w-4 h-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-[12px] font-semibold text-navy-800">{p.counterparty}</p>
                    <p className="text-[10px] text-navy-400 font-mono">{p.date} · {p.bankAccount} · {p.method}</p>
                  </div>
                </div>
                <span className={`font-mono font-bold text-[13px] ${p.type === "Receipt" ? "text-green-700" : "text-red-600"}`}>
                  {p.type === "Receipt" ? "+" : "−"}{fmt(p.amount, p.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTab = () => {
    switch (tab) {
      case "dashboard":
        return renderDashboard();

      case "income":
        return (
          <>
            <AgingStrip buckets={arAging} color="green" />
            <DataTable
              columns={[
                { key: "number", label: "Invoice #" },
                { key: "customer", label: "Customer" },
                { key: "date", label: "Date" },
                { key: "dueDate", label: "Due" },
                { key: "total", label: "Total", render: (r) => fmt(r.total as number, r.currency as Currency) },
                { key: "balance", label: "Balance", render: (r) => fmt(r.balance as number, r.currency as Currency) },
                { key: "status", label: "Status", render: (r) => arStatusBadge(r.status as string) },
              ]}
              data={invoices as unknown as Record<string, unknown>[]}
              onAdd={invoiceForm.openCreate}
              onEdit={(row, i) => invoiceForm.openEdit(row as Record<string, unknown>, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="New Invoice"
              searchPlaceholder="Search invoices..."
            />
            <FormModal open={invoiceForm.open} onClose={invoiceForm.close} title={invoiceForm.isEdit ? "Edit Invoice" : "New Invoice"} groups={invoiceFormGroups} values={invoiceForm.values} onChange={invoiceForm.onChange} isEdit={invoiceForm.isEdit} onSubmit={(v) => save(invoices, setInvoices, invoiceForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Invoice" message="Delete this invoice record?" onConfirm={() => del(invoices, setInvoices)} />
          </>
        );

      case "bills":
        return (
          <>
            <AgingStrip buckets={apAging} color="amber" />
            <DataTable
              columns={[
                { key: "number", label: "Bill #" },
                { key: "supplier", label: "Supplier" },
                { key: "poRef", label: "PO" },
                { key: "date", label: "Date" },
                { key: "dueDate", label: "Due" },
                { key: "total", label: "Total", render: (r) => fmt(r.total as number, r.currency as Currency) },
                { key: "balance", label: "Balance", render: (r) => fmt(r.balance as number, r.currency as Currency) },
                { key: "status", label: "Status", render: (r) => apStatusBadge(r.status as string) },
              ]}
              data={bills as unknown as Record<string, unknown>[]}
              onAdd={billForm.openCreate}
              onEdit={(row, i) => billForm.openEdit(row as Record<string, unknown>, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="New Bill"
              searchPlaceholder="Search bills..."
            />
            <FormModal open={billForm.open} onClose={billForm.close} title={billForm.isEdit ? "Edit Bill" : "New Bill"} subtitle="Supplier invoice / Accounts Payable" groups={billFormGroups} values={billForm.values} onChange={billForm.onChange} isEdit={billForm.isEdit} onSubmit={(v) => save(bills, setBills, billForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Bill" message="Delete this bill record?" onConfirm={() => del(bills, setBills)} />
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
                { key: "amount", label: "Amount", render: (r) => fmt(r.amount as number, r.currency as Currency) },
                { key: "vendor", label: "Vendor" },
                { key: "bankAccount", label: "Paid From" },
                { key: "status", label: "Status", render: (r) => {
                  const s = r.status as string;
                  const v = s === "Paid" ? "green" : s === "Approved" ? "blue" : s === "Rejected" ? "red" : "amber";
                  return <Badge variant={v}>{s}</Badge>;
                }},
              ]}
              data={expenses as unknown as Record<string, unknown>[]}
              onAdd={expenseForm.openCreate}
              onEdit={(row, i) => expenseForm.openEdit(row as Record<string, unknown>, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Expense"
              searchPlaceholder="Search expenses..."
            />
            <FormModal open={expenseForm.open} onClose={expenseForm.close} title={expenseForm.isEdit ? "Edit Expense" : "Add Expense"} groups={expenseFormGroups(bankAccounts)} values={expenseForm.values} onChange={expenseForm.onChange} isEdit={expenseForm.isEdit} onSubmit={(v) => save(expenses, setExpenses, expenseForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Expense" message="Delete this expense record?" onConfirm={() => del(expenses, setExpenses)} />
          </>
        );

      case "payments":
        return (
          <>
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "type", label: "Type", render: (r) => paymentTypeBadge(r.type as string) },
                { key: "date", label: "Date" },
                { key: "counterparty", label: "Counterparty" },
                { key: "bankAccount", label: "Bank Account" },
                { key: "amount", label: "Amount", render: (r) => {
                  const sign = r.type === "Receipt" ? "+" : "−";
                  const cls = r.type === "Receipt" ? "text-green-700" : "text-red-600";
                  return <span className={`font-mono font-semibold ${cls}`}>{sign}{fmt(r.amount as number, r.currency as Currency)}</span>;
                }},
                { key: "reference", label: "Reference" },
                { key: "method", label: "Method" },
                { key: "status", label: "Status", render: (r) => {
                  const s = r.status as string;
                  const v = s === "Cleared" ? "green" : s === "Pending" ? "amber" : "red";
                  return <Badge variant={v}>{s}</Badge>;
                }},
              ]}
              data={payments as unknown as Record<string, unknown>[]}
              onAdd={paymentForm.openCreate}
              onEdit={(row, i) => paymentForm.openEdit(row as Record<string, unknown>, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Record Payment"
              searchPlaceholder="Search payments..."
            />
            <FormModal open={paymentForm.open} onClose={paymentForm.close} title={paymentForm.isEdit ? "Edit Payment" : "Record Payment"} subtitle="Receipts (AR) / Payments (AP) / Expenses" groups={paymentFormGroups(bankAccounts)} values={paymentForm.values} onChange={paymentForm.onChange} isEdit={paymentForm.isEdit} onSubmit={(v) => save(payments, setPayments, paymentForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Payment" message="Delete this payment record?" onConfirm={() => del(payments, setPayments)} />
          </>
        );

      case "accounts":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {bankAccounts.map((a) => {
                const bal = accountBalance(a);
                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Building2 className="w-5 h-5 text-navy-400" />
                      <Badge variant={a.active ? "green" : "gray"}>{a.active ? "Active" : "Closed"}</Badge>
                    </div>
                    <p className="text-[13px] font-semibold text-navy-900">{a.name}</p>
                    <p className="text-[11px] text-navy-400 font-mono">{a.bank} · {a.accountNumber}</p>
                    <div className="mt-3 pt-3 border-t border-sand-100">
                      <p className="text-[10px] uppercase tracking-wider text-navy-400 font-bold">Balance</p>
                      <p className="text-[20px] font-bold text-navy-900 font-mono mt-0.5">{fmt(bal, a.currency)}</p>
                      <p className="text-[10px] text-navy-400 mt-0.5">opening {fmt(a.openingBalance, a.currency)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "bank", label: "Bank" },
                { key: "accountNumber", label: "Account #" },
                { key: "currency", label: "Currency", render: (r) => <Badge variant="blue">{r.currency as string}</Badge> },
                { key: "openingBalance", label: "Opening", render: (r) => fmt(r.openingBalance as number, r.currency as Currency) },
                { key: "active", label: "Status", render: (r) => <Badge variant={r.active ? "green" : "gray"}>{r.active ? "Active" : "Closed"}</Badge> },
              ]}
              data={bankAccounts as unknown as Record<string, unknown>[]}
              onAdd={bankAccountForm.openCreate}
              onEdit={(row, i) => bankAccountForm.openEdit(row as Record<string, unknown>, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Bank Account"
              searchPlaceholder="Search accounts..."
            />
            <FormModal open={bankAccountForm.open} onClose={bankAccountForm.close} title={bankAccountForm.isEdit ? "Edit Bank Account" : "Add Bank Account"} groups={bankAccountFormGroups} values={bankAccountForm.values} onChange={bankAccountForm.onChange} isEdit={bankAccountForm.isEdit} onSubmit={(v) => save(bankAccounts, setBankAccounts, bankAccountForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Bank Account" message="Delete this bank account?" onConfirm={() => del(bankAccounts, setBankAccounts)} />
          </>
        );

      case "statements": {
        const unreconciled = statements.filter((s) => !s.reconciled).length;
        return (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-navy-500">
                {statements.length} lines · <span className={unreconciled > 0 ? "text-amber-600 font-semibold" : "text-green-700 font-semibold"}>
                  {unreconciled} unreconciled
                </span>
              </p>
            </div>
            <DataTable
              columns={[
                { key: "date", label: "Date" },
                { key: "bankAccount", label: "Account" },
                { key: "description", label: "Description" },
                { key: "amount", label: "Amount", render: (r) => {
                  const a = r.amount as number;
                  return <span className={`font-mono font-semibold ${a >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {a >= 0 ? "+" : "−"}{fmt(Math.abs(a))}
                  </span>;
                }},
                { key: "balance", label: "Running Bal.", render: (r) => fmt(r.balance as number) },
                { key: "matchedTo", label: "Matched", render: (r) => r.matchedTo ? <Badge variant="blue">{r.matchedTo as string}</Badge> : <span className="text-navy-300">—</span> },
                { key: "reconciled", label: "Status", render: (r) => <Badge variant={r.reconciled ? "green" : "amber"}>{r.reconciled ? "Reconciled" : "Pending"}</Badge> },
              ]}
              data={statements as unknown as Record<string, unknown>[]}
              onAdd={statementForm.openCreate}
              onEdit={(row, i) => statementForm.openEdit(row as Record<string, unknown>, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add Line"
              searchPlaceholder="Search statement lines..."
            />
            <FormModal open={statementForm.open} onClose={statementForm.close} title={statementForm.isEdit ? "Edit Statement Line" : "Add Statement Line"} subtitle="Manual entry · CSV import coming in Phase 2" groups={statementFormGroups(bankAccounts)} values={statementForm.values} onChange={statementForm.onChange} isEdit={statementForm.isEdit} onSubmit={(v) => save(statements, setStatements, statementForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete Statement Line" message="Delete this statement line?" onConfirm={() => del(statements, setStatements)} />
          </>
        );
      }

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
              onEdit={(row, i) => fiscalForm.openEdit(row as Record<string, unknown>, i)}
              onDelete={(row, i) => confirm.requestDelete(row, i)}
              addLabel="Add CAI"
              searchPlaceholder="Search fiscal..."
            />
            <FormModal open={fiscalForm.open} onClose={fiscalForm.close} title={fiscalForm.isEdit ? "Edit Fiscal Authorization" : "Add Fiscal Authorization"} subtitle="Honduras SAR CAI management" groups={fiscalFormGroups} values={fiscalForm.values} onChange={fiscalForm.onChange} isEdit={fiscalForm.isEdit} onSubmit={(v) => save(fiscal, setFiscal, fiscalForm, v)} />
            <ConfirmDialog open={confirm.open} onClose={confirm.close} title="Delete CAI" message="Delete this fiscal authorization?" onConfirm={() => del(fiscal, setFiscal)} />
          </>
        );

      case "taxes": {
        const isvCollected = invoices.reduce((s, i) => s + toUSD(i.isv, i.currency), 0);
        const isvPaid = bills.reduce((s, b) => s + toUSD(b.isv, b.currency), 0);
        const net = isvCollected - isvPaid;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-navy-400 font-bold">ISV Collected (sales)</p>
                <p className="text-[24px] font-bold text-green-700 font-mono mt-1">{fmt(isvCollected)}</p>
                <p className="text-[11px] text-navy-400 mt-1">15% on customer invoices</p>
              </div>
              <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-navy-400 font-bold">ISV Paid (purchases)</p>
                <p className="text-[24px] font-bold text-red-600 font-mono mt-1">{fmt(isvPaid)}</p>
                <p className="text-[11px] text-navy-400 mt-1">15% on supplier bills</p>
              </div>
              <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-navy-400 font-bold">Net Payable to SAR</p>
                <p className={`text-[24px] font-bold font-mono mt-1 ${net >= 0 ? "text-navy-900" : "text-green-700"}`}>{fmt(Math.abs(net))}</p>
                <p className="text-[11px] text-navy-400 mt-1">{net >= 0 ? "owed to SAR" : "credit (refundable)"}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
              <h3 className="text-[14px] font-bold text-navy-900 mb-3 flex items-center gap-2"><Percent className="w-4 h-4 text-navy-500" /> ISV Detail</h3>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-navy-500 border-b border-sand-100">
                    <th className="py-2">Document</th><th className="py-2">Counterparty</th><th className="py-2">Date</th>
                    <th className="py-2 text-right">Subtotal</th><th className="py-2 text-right">ISV</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.filter((i) => i.isv > 0).map((i) => (
                    <tr key={i.number} className="border-b border-sand-50">
                      <td className="py-1.5 font-mono">{i.number}</td>
                      <td className="py-1.5">{i.customer}</td>
                      <td className="py-1.5">{i.date}</td>
                      <td className="py-1.5 text-right font-mono">{fmt(i.subtotal, i.currency)}</td>
                      <td className="py-1.5 text-right font-mono text-green-700">+{fmt(i.isv, i.currency)}</td>
                    </tr>
                  ))}
                  {bills.filter((b) => b.isv > 0).map((b) => (
                    <tr key={b.number} className="border-b border-sand-50">
                      <td className="py-1.5 font-mono">{b.number}</td>
                      <td className="py-1.5">{b.supplier}</td>
                      <td className="py-1.5">{b.date}</td>
                      <td className="py-1.5 text-right font-mono">{fmt(b.subtotal, b.currency)}</td>
                      <td className="py-1.5 text-right font-mono text-red-600">−{fmt(b.isv, b.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case "reports": {
        const incomeByCustomer = invoices.reduce((m, i) => {
          m[i.customer] = (m[i.customer] || 0) + toUSD(i.total, i.currency);
          return m;
        }, {} as Record<string, number>);
        const expensesByCategory = expenses.reduce((m, e) => {
          m[e.category] = (m[e.category] || 0) + toUSD(e.amount, e.currency);
          return m;
        }, {} as Record<string, number>);
        const totalIncome = Object.values(incomeByCustomer).reduce((s, v) => s + v, 0);
        const totalExpenses = Object.values(expensesByCategory).reduce((s, v) => s + v, 0);

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
                <h3 className="text-[14px] font-bold text-navy-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-green-600" /> P&amp;L — April 2026
                </h3>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between font-semibold text-green-700">
                    <span>Income</span>
                    <span className="font-mono">{fmt(totalIncome)}</span>
                  </div>
                  {Object.entries(incomeByCustomer).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-navy-600 pl-3 text-[11px]">
                      <span>· {k}</span>
                      <span className="font-mono">{fmt(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold text-red-600 pt-2 border-t border-sand-100">
                    <span>Expenses</span>
                    <span className="font-mono">{fmt(totalExpenses)}</span>
                  </div>
                  {Object.entries(expensesByCategory).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-navy-600 pl-3 text-[11px]">
                      <span>· {k}</span>
                      <span className="font-mono">{fmt(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-navy-900 pt-2 border-t-2 border-navy-200 text-[13px]">
                    <span>Net Income</span>
                    <span className="font-mono">{fmt(totalIncome - totalExpenses)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
                <h3 className="text-[14px] font-bold text-navy-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Cash Flow — April 2026
                </h3>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between font-semibold text-green-700">
                    <span>Money in (receipts)</span>
                    <span className="font-mono">{fmt(monthIncomeUSD)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-red-600">
                    <span>Money out (payments + expenses)</span>
                    <span className="font-mono">{fmt(monthExpensesUSD)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-navy-900 pt-2 border-t border-sand-100">
                    <span>Net cash flow</span>
                    <span className="font-mono">{fmt(monthIncomeUSD - monthExpensesUSD)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-navy-700 pt-2 border-t border-sand-100">
                    <span>Closing cash position</span>
                    <span className="font-mono">{fmt(cashOnHandUSD)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
                <h3 className="text-[14px] font-bold text-navy-900 mb-3">AR Aging</h3>
                <AgingStrip buckets={arAging} color="green" />
              </div>
              <div className="bg-white rounded-2xl border border-sand-200/80 shadow-sm p-5">
                <h3 className="text-[14px] font-bold text-navy-900 mb-3">AP Aging</h3>
                <AgingStrip buckets={apAging} color="amber" />
              </div>
            </div>

            <p className="text-[11px] text-navy-400 text-center">
              All figures USD-equivalent at L 25 / USD · PDF export comes in Phase 2
            </p>
          </div>
        );
      }
    }
  };

  return (
    <PageShell title="Accounting" subtitle="AR · AP · Cash · Fiscal · Reports" icon={Receipt}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Cash Position" value={fmt(cashOnHandUSD)} icon={Banknote} color="green" />
        <StatCard label="AR Outstanding" value={fmt(arOutstandingUSD)} icon={DollarSign} color="amber" />
        <StatCard label="AP Outstanding" value={fmt(apOutstandingUSD)} icon={Wallet} color="red" />
        <StatCard label="CAI Remaining" value={caiRemaining} icon={Shield} color="blue" />
      </motion.div>

      <div className="mb-4 overflow-x-auto"><TabBar tabs={tabs} active={tab} onChange={setTab} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderTab()}
      </motion.div>
    </PageShell>
  );
}

/* Reference unused imports to avoid noUnusedLocals */
void Landmark; void FileText;
