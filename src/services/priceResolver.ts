/**
 * What to charge for a thing, to a customer, into a port, on a date.
 *
 * Price is keyed on more than the variety: the same cutting costs a different
 * amount to a different customer, and a different amount again into Rotterdam
 * than into Miami, because the freight does. Product matters too — only L&E is
 * sold today, but E, Bulbs and Tips are coming, and a price list that cannot
 * tell them apart would have to be rebuilt when they arrive.
 *
 * A row may leave any of those blank, meaning "any". So a nursery can price
 * broadly — one figure for a variety — and then override narrowly for one
 * customer, one port, one size, without restating everything.
 *
 * **It returns null rather than a number it is not sure of.** The invoice used
 * to fall back to $0.020 a cutting when nothing matched, which is a price
 * nobody agreed, on a fiscal document, that looks exactly like one that was.
 */

export interface PriceRow {
  id?: string;
  plant?: string;
  customer?: string;
  port?: string;
  product?: string;
  size?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  priceEXT?: number;
  priceINT?: number;
  active?: boolean;
}

export interface PriceQuery {
  plant: string;
  customer?: string;
  port?: string;
  product?: string;
  size?: string;
  /** ISO date the sale is priced on. Defaults to today. */
  on?: string;
}

const text = (v: unknown) => String(v ?? "").trim();
const same = (a: unknown, b: unknown) =>
  text(a).toLowerCase() === text(b).toLowerCase();

/** Blank on the row means "any", so it matches anything and scores nothing. */
function score(rowValue: unknown, asked: unknown): number | null {
  if (text(rowValue) === "") return 0;
  if (asked === undefined) return null;         // the row is specific, the question is not
  return same(rowValue, asked) ? 1 : null;
}

function withinDates(row: PriceRow, on: string): boolean {
  const from = text(row.effectiveFrom).slice(0, 10);
  const to = text(row.effectiveTo).slice(0, 10);
  if (from && on < from) return false;
  if (to && on > to) return false;
  return true;
}

export interface PriceMatch {
  row: PriceRow;
  /** Export price, which is what an invoice carries. */
  price: number;
  /** How many of customer, port, product and size the row pinned down. */
  specificity: number;
}

/**
 * The price to use, or null when nothing covers the question.
 *
 * The most specific row wins — a price set for this customer at this port beats
 * a general one for the variety. Ties go to the one that came into effect most
 * recently, because that is the correction.
 */
export function resolvePrice(rows: PriceRow[], query: PriceQuery): PriceMatch | null {
  const on = text(query.on).slice(0, 10) || new Date().toISOString().slice(0, 10);
  if (!text(query.plant)) return null;

  let best: PriceMatch | null = null;
  for (const row of rows) {
    if (row.active === false) continue;
    if (!same(row.plant, query.plant)) continue;
    if (!withinDates(row, on)) continue;

    const parts = [
      score(row.customer, query.customer),
      score(row.port, query.port),
      score(row.product, query.product),
      score(row.size, query.size),
    ];
    if (parts.some((p) => p === null)) continue;

    const price = Number(row.priceEXT);
    // A row with no export price is not a price. Zero is excluded on purpose:
    // free stock is not something an invoice should infer from a blank field.
    if (!Number.isFinite(price) || price <= 0) continue;

    const specificity = parts.reduce<number>((sum, p) => sum + (p ?? 0), 0);
    if (
      !best ||
      specificity > best.specificity ||
      (specificity === best.specificity &&
        text(row.effectiveFrom) > text(best.row.effectiveFrom))
    ) {
      best = { row, price, specificity };
    }
  }
  return best;
}

/**
 * Everything on a packing list that cannot be priced.
 *
 * Named so the screen can say which varieties need a price rather than
 * refusing as a whole and leaving someone to find out which one it meant.
 */
export function unpriced(
  rows: PriceRow[],
  lines: PriceQuery[]
): { line: PriceQuery; label: string }[] {
  const out: { line: PriceQuery; label: string }[] = [];
  for (const line of lines) {
    if (resolvePrice(rows, line)) continue;
    const bits = [line.plant, line.size, line.product].filter(Boolean);
    out.push({ line, label: bits.join(" · ") });
  }
  return out;
}
