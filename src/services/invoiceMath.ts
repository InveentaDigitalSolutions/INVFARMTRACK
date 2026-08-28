/**
 * The arithmetic on an invoice or a bill.
 *
 * These were fields somebody typed. ISV was entered by hand despite being a
 * fixed rate, totals did not follow their parts, and amounts in dollars and
 * lempiras were added together as though they were the same unit — which they
 * are not, at roughly 26 lempiras to the dollar.
 */

/** Honduran sales tax. 18% applies to a short list of goods a nursery does not sell. */
export const ISV_RATE = 0.15;

export type Currency = "HNL" | "USD";

/** Rounds to cents, avoiding the float dust that makes totals disagree by a centavo. */
export const money = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export interface InvoiceAmounts {
  subtotal: number;
  isv: number;
  total: number;
  balance: number;
}

/**
 * Works the invoice out from its subtotal and what has been paid.
 *
 * Exports are zero-rated: goods leaving Honduras carry no ISV, which is why an
 * export invoice shows 1,520.00 rather than 1,748.00. The nursery's local
 * sales do carry it, so the caller says which this is rather than the rule
 * being guessed from the currency.
 */
export function invoiceAmounts(
  subtotal: number,
  { exempt = false, paid = 0, discounts = 0, freight = 0 } = {}
): InvoiceAmounts {
  const net = money(subtotal - discounts);
  const isv = exempt ? 0 : money(net * ISV_RATE);
  const total = money(net + isv + freight);
  return { subtotal: money(subtotal), isv, total, balance: money(total - paid) };
}

/**
 * The same figure in lempiras.
 *
 * Invoices are raised in the currency the customer pays in, but the books and
 * every tax filing are in lempiras, so an amount is only comparable once the
 * rate it was converted at is recorded beside it. Converting later at today's
 * rate would silently restate last month's sales.
 */
export function toHNL(amount: number, currency: Currency, rate: number): number {
  return currency === "HNL" ? money(amount) : money(amount * rate);
}

/** Totals a mixed-currency set in lempiras. Adding the raw numbers is meaningless. */
export function totalInHNL(
  rows: Array<{ amount: number; currency?: Currency }>,
  rate: number
): number {
  return money(
    rows.reduce((sum, row) => sum + toHNL(row.amount, row.currency ?? "HNL", rate), 0)
  );
}

export type AgeBucket = "Current" | "1-30" | "31-60" | "61-90" | "90+";

/** Which ageing bucket an unpaid invoice falls into, by how late it is. */
export function ageBucket(dueDate: string, today = new Date()): AgeBucket {
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "Current";
  const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  if (days <= 0) return "Current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

/**
 * What an invoice's status should be, given what has been paid against it.
 *
 * Derived rather than chosen: a status somebody sets by hand drifts from the
 * payments as soon as one is recorded, and then the ageing report is wrong.
 */
export function invoiceStatus(
  total: number,
  paid: number,
  dueDate: string,
  today = new Date()
): "Draft" | "Sent" | "Partially Paid" | "Paid" | "Overdue" {
  if (paid >= total && total > 0) return "Paid";
  const overdue = ageBucket(dueDate, today) !== "Current";
  if (paid > 0) return overdue ? "Overdue" : "Partially Paid";
  return overdue ? "Overdue" : "Sent";
}

/** Sums the payments recorded against one invoice. */
export function paidAgainst(
  invoiceId: string,
  payments: Array<{ invoice?: string; amount?: number; status?: string }>
): number {
  return money(
    payments
      .filter((p) => p.invoice === invoiceId && p.status !== "Voided")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0)
  );
}
