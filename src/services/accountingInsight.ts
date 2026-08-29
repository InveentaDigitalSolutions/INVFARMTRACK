/**
 * Whether the nursery is owed more than it owes, and how old the gap is.
 *
 * Accounting had four tiles that each stated a total with nothing to read it
 * against. The questions a grower actually asks are: how much is outstanding,
 * how much of it is late, is there cash to cover what is due, and where is the
 * money going. Those are the five figures here.
 *
 * Everything is expressed in lempira. A USD invoice is converted at the rate
 * held against it rather than today's — the receivable is what was billed.
 */
import { ageBucket, toHNL, type Currency } from "./invoiceMath";
import { monthKey, monthBefore, daysFrom, ranked, sum, monthlySeries } from "./period";

export interface Doc {
  date?: string;
  dueDate?: string;
  total?: number;
  balance?: number;
  paid?: number;
  currency?: string;
  status?: string;
  customer?: string;
  supplier?: string;
}

export interface Expense {
  date?: string;
  category?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

export interface Account {
  name?: string;
  currency?: string;
  openingBalance?: number;
  active?: boolean;
}

export interface Movement {
  type?: string;
  date?: string;
  amount?: number;
  currency?: string;
  bankAccount?: string;
  status?: string;
}

const hnl = (amount: number | undefined, currency: string | undefined, rate: number) =>
  toHNL(Number(amount) || 0, (currency === "USD" ? "USD" : "HNL") as Currency, rate);

export interface AccountingSummary {
  receivable: number;
  payable: number;
  /** Receivable minus payable: positive means the nursery is a net creditor. */
  net: number;
  overdue: number;
  overdueCount: number;
  /** Share of the receivable that is past its due date. */
  overdueShare: number;
  /** The oldest unpaid invoice, in days past due. */
  oldestDays: number;
  cash: number;
  expensesThisMonth: number;
  expensesLastMonth: number;
  /** Receivable split by how late it is, for a distribution bar. */
  ageing: { name: string; value: number }[];
  /** Where the money went this year. */
  byCategory: { name: string; value: number }[];
  /** Who owes the most. */
  byCustomer: { name: string; value: number }[];
  /** Six months of expense, oldest first. */
  expenseSeries: number[];
}

export function accountingSummary(input: {
  invoices: Doc[];
  bills: Doc[];
  expenses: Expense[];
  payments: Movement[];
  accounts: Account[];
  /** HNL per USD, for the documents that are not already in lempira. */
  rate: number;
  today?: Date;
}): AccountingSummary {
  const { invoices, bills, expenses, payments, accounts, rate } = input;
  const today = input.today ?? new Date();

  // An unpaid document is one with a balance left, whatever its status says —
  // a status is typed by a person and drifts; the balance is arithmetic.
  const openInvoices = invoices.filter((d) => (Number(d.balance) || 0) > 0);
  const openBills = bills.filter((d) => (Number(d.balance) || 0) > 0);

  const receivable = openInvoices.reduce((s, d) => s + hnl(d.balance, d.currency, rate), 0);
  const payable = openBills.reduce((s, d) => s + hnl(d.balance, d.currency, rate), 0);

  const late = openInvoices.filter((d) => (daysFrom(d.dueDate, today) ?? 1) < 0);
  const overdue = late.reduce((s, d) => s + hnl(d.balance, d.currency, rate), 0);
  const oldestDays = late.reduce((worst, d) => Math.max(worst, -(daysFrom(d.dueDate, today) ?? 0)), 0);

  const ageingMap = new Map<string, number>();
  for (const d of openInvoices) {
    if (!d.dueDate) continue;
    const bucket = ageBucket(String(d.dueDate), today);
    ageingMap.set(bucket, (ageingMap.get(bucket) ?? 0) + hnl(d.balance, d.currency, rate));
  }
  // Ageing reads oldest-last in every ledger; keep that order rather than
  // ranking by size, which would shuffle the buckets around.
  const order = ["Current", "1-30", "31-60", "61-90", "90+"];
  const ageing = order
    .filter((b) => ageingMap.has(b))
    .map((b) => ({ name: b, value: Math.round(ageingMap.get(b)!) }));

  // Cash is the opening balance plus everything cleared through the account.
  const cleared = payments.filter((p) => p.status !== "Pending" && p.status !== "Void");
  const cash = accounts
    .filter((a) => a.active !== false)
    .reduce((s, a) => {
      const moves = cleared.filter((p) => p.bankAccount === a.name);
      const inflow = moves.filter((p) => p.type === "Receipt").reduce((t, p) => t + hnl(p.amount, p.currency, rate), 0);
      const outflow = moves
        .filter((p) => p.type !== "Receipt")
        .reduce((t, p) => t + hnl(p.amount, p.currency, rate), 0);
      return s + hnl(a.openingBalance, a.currency, rate) + inflow - outflow;
    }, 0);

  const thisMonth = monthBefore(today, 0);
  const lastMonth = monthBefore(today, 1);
  const inMonth = (e: Expense, key: string) => monthKey(e.date) === key;

  const categoryMap = new Map<string, number>();
  const year = String(today.getFullYear());
  for (const e of expenses) {
    if (!String(e.date ?? "").startsWith(year)) continue;
    categoryMap.set(
      e.category ?? "Uncategorised",
      (categoryMap.get(e.category ?? "Uncategorised") ?? 0) + hnl(e.amount, e.currency, rate)
    );
  }

  const customerMap = new Map<string, number>();
  for (const d of openInvoices) {
    if (!d.customer) continue;
    customerMap.set(d.customer, (customerMap.get(d.customer) ?? 0) + hnl(d.balance, d.currency, rate));
  }

  return {
    receivable: Math.round(receivable),
    payable: Math.round(payable),
    net: Math.round(receivable - payable),
    overdue: Math.round(overdue),
    overdueCount: late.length,
    overdueShare: receivable > 0 ? Math.round((overdue / receivable) * 100) : 0,
    oldestDays,
    cash: Math.round(cash),
    expensesThisMonth: Math.round(
      sum(expenses.filter((e) => inMonth(e, thisMonth)), (e) => hnl(e.amount, e.currency, rate))
    ),
    expensesLastMonth: Math.round(
      sum(expenses.filter((e) => inMonth(e, lastMonth)), (e) => hnl(e.amount, e.currency, rate))
    ),
    ageing,
    byCategory: ranked(categoryMap),
    byCustomer: ranked(customerMap),
    expenseSeries: monthlySeries(expenses, (e) => e.date, (e) => hnl(e.amount, e.currency, rate), today)
      .map((m) => Math.round(m.value)),
  };
}
