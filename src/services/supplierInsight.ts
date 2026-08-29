/**
 * What has been ordered in, from whom, and what is still owed.
 *
 * Procurement's risk is concentration and age: one supplier carrying most of
 * the spend, and a purchase order that was raised and then forgotten. Both are
 * invisible in a list sorted by date.
 */
import { daysFrom, ranked, sum } from "./period";

export interface PurchaseOrder {
  number?: string;
  supplier?: string;
  date?: string;
  delivery?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

export interface Supplier {
  name?: string;
  category?: string;
  active?: boolean;
}

const OPEN = new Set(["Draft", "Sent", "Confirmed", "Partially Received", "Pending"]);

export interface SupplierSummary {
  activeSuppliers: number;
  totalSuppliers: number;
  openOrders: number;
  openValue: number;
  /** Open orders whose delivery date has passed. */
  lateOrders: number;
  /** Days since the oldest open order was raised. */
  oldestDays: number;
  spendThisYear: number;
  /** Share of this year's spend behind the largest supplier. */
  topShare: number;
  topSupplier?: string;
  /** Spend by supplier this year, largest first. */
  bySupplier: { name: string; value: number }[];
  /** Suppliers per category — where the nursery is single-sourced. */
  byCategory: { name: string; value: number }[];
}

export function supplierSummary(input: {
  suppliers: Supplier[];
  orders: PurchaseOrder[];
  today?: Date;
}): SupplierSummary {
  const { suppliers, orders } = input;
  const today = input.today ?? new Date();
  const year = String(today.getFullYear());

  const open = orders.filter((o) => !o.status || OPEN.has(String(o.status)));
  const thisYear = orders.filter((o) => String(o.date ?? "").startsWith(year));

  const bySupplier = new Map<string, number>();
  for (const o of thisYear) {
    if (!o.supplier) continue;
    bySupplier.set(o.supplier, (bySupplier.get(o.supplier) ?? 0) + (Number(o.amount) || 0));
  }
  const ranking = ranked(bySupplier);
  const spend = sum(thisYear, (o) => o.amount);

  const byCategory = new Map<string, number>();
  for (const s of suppliers.filter((s) => s.active !== false)) {
    const c = s.category ?? "Uncategorised";
    byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
  }

  return {
    activeSuppliers: suppliers.filter((s) => s.active !== false).length,
    totalSuppliers: suppliers.length,
    openOrders: open.length,
    openValue: Math.round(sum(open, (o) => o.amount)),
    lateOrders: open.filter((o) => (daysFrom(o.delivery, today) ?? 1) < 0).length,
    oldestDays: open.reduce((worst, o) => Math.max(worst, -(daysFrom(o.date, today) ?? 0)), 0),
    spendThisYear: Math.round(spend),
    topShare: spend > 0 && ranking[0] ? Math.round((ranking[0].value / spend) * 100) : 0,
    topSupplier: ranking[0]?.name,
    bySupplier: ranking,
    byCategory: [...byCategory.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
  };
}
