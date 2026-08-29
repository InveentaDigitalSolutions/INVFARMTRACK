/**
 * The order book, and whether it is moving.
 *
 * Sales had a list of orders and no answer to the two questions a nursery asks
 * before it commits to a customer: how much is promised but not yet shipped,
 * and how concentrated is the book. A nursery with 80% of its orders behind one
 * buyer is a different business from one with ten, and the table never said so.
 */
import { monthBefore, monthKey, daysFrom, ranked, sum, monthlySeries, changePct } from "./period";

export interface Order {
  number?: string;
  customer?: string;
  date?: string;
  delivery?: string;
  status?: string;
  total?: number;
}

export interface Shipment {
  code?: string;
  customer?: string;
  date?: string;
  status?: string;
  etd?: string;
}

/** Statuses that mean the order is still owed to the customer. */
const OPEN = new Set(["Draft", "Confirmed", "In Progress", "Partially Shipped", "Pending"]);
/** Statuses that mean the boxes have left. */
const GONE = new Set(["Shipped", "Delivered"]);

export interface SalesSummary {
  openOrders: number;
  openValue: number;
  /** Orders whose delivery date has passed while still open. */
  lateOrders: number;
  shippedThisMonth: number;
  shippedLastMonth: number;
  shippedChange?: number;
  averageOrder: number;
  customers: number;
  /** Share of the open book behind the largest single customer. */
  topShare: number;
  topCustomer?: string;
  /** Open value by customer, largest first. */
  byCustomer: { name: string; value: number }[];
  /** How many orders sit at each status — the pipeline, as a distribution. */
  byStatus: { name: string; value: number }[];
  /** Six months of shipped value, oldest first. */
  valueSeries: number[];
  /** Shipments not yet delivered, soonest departure first. */
  inFlight: Shipment[];
}

export function salesSummary(input: {
  orders: Order[];
  shipments: Shipment[];
  today?: Date;
}): SalesSummary {
  const { orders, shipments } = input;
  const today = input.today ?? new Date();

  const open = orders.filter((o) => !o.status || OPEN.has(String(o.status)));
  const shipped = orders.filter((o) => GONE.has(String(o.status)));

  const openValue = sum(open, (o) => o.total);
  const byCustomer = new Map<string, number>();
  for (const o of open) {
    if (!o.customer) continue;
    byCustomer.set(o.customer, (byCustomer.get(o.customer) ?? 0) + (Number(o.total) || 0));
  }
  const ranking = ranked(byCustomer);

  const byStatus = new Map<string, number>();
  for (const o of orders) byStatus.set(String(o.status ?? "No status"), (byStatus.get(String(o.status ?? "No status")) ?? 0) + 1);

  const thisMonth = monthBefore(today, 0);
  const lastMonth = monthBefore(today, 1);
  const shippedThisMonth = sum(shipped.filter((o) => monthKey(o.date) === thisMonth), (o) => o.total);
  const shippedLastMonth = sum(shipped.filter((o) => monthKey(o.date) === lastMonth), (o) => o.total);

  const withValue = orders.filter((o) => (Number(o.total) || 0) > 0);

  return {
    openOrders: open.length,
    openValue: Math.round(openValue),
    lateOrders: open.filter((o) => (daysFrom(o.delivery, today) ?? 1) < 0).length,
    shippedThisMonth: Math.round(shippedThisMonth),
    shippedLastMonth: Math.round(shippedLastMonth),
    shippedChange: changePct(shippedThisMonth, shippedLastMonth),
    averageOrder: withValue.length ? Math.round(sum(withValue, (o) => o.total) / withValue.length) : 0,
    customers: new Set(orders.map((o) => o.customer).filter(Boolean)).size,
    topShare: openValue > 0 && ranking[0] ? Math.round((ranking[0].value / openValue) * 100) : 0,
    topCustomer: ranking[0]?.name,
    byCustomer: ranking,
    byStatus: [...byStatus.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    valueSeries: monthlySeries(shipped, (o) => o.date, (o) => Number(o.total) || 0, today).map((m) => Math.round(m.value)),
    inFlight: shipments
      .filter((s) => s.status !== "Delivered" && s.status !== "Cancelled")
      .sort((a, b) => String(a.etd ?? a.date ?? "") < String(b.etd ?? b.date ?? "") ? -1 : 1),
  };
}
