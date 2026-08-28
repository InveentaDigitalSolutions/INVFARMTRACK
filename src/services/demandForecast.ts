/**
 * Turning a customer's forecast between the shape it is read in and the shape
 * it is stored in.
 *
 * A forecast arrives as a spreadsheet and is read as a grid: one row per
 * variety and size, with a column per week. Dataverse stores one row per
 * variety, size and week, because that is the grain everything else asks
 * about — what is wanted in week 16, across all customers.
 *
 * Neither shape is wrong, so this converts rather than picking a winner. The
 * screen was keeping the grid in component state and never saving it at all,
 * which meant importing a customer's spreadsheet persisted nothing.
 */

export interface ForecastRow {
  /** "Pothos / Hawaiian", as the plant lookup shows it. */
  variety: string;
  size: string;
  /** "Current Order", "Additional Request", "Additional Order". */
  type: string;
  /** Quantity per ISO week, keyed "wk14", "wk15" … */
  [week: string]: string | number;
}

export interface ForecastRecord {
  id: string;
  customer?: string;
  plant?: string;
  size?: string;
  requestType?: string;
  week?: number;
  year?: number;
  requested?: number;
  confirmed?: number;
  status?: string;
  batch?: string;
}

const weekKey = (n: number) => `wk${n}`;
const weekOf = (key: string) => {
  const m = /^wk(\d+)$/.exec(key);
  return m ? Number(m[1]) : null;
};

/** The week columns present in a grid, in order. */
export function weeksIn(rows: ForecastRow[]): number[] {
  const weeks = new Set<number>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      const w = weekOf(key);
      if (w !== null) weeks.add(w);
    }
  }
  return [...weeks].sort((a, b) => a - b);
}

/**
 * Grid to records. A week with no quantity produces no row: storing a zero
 * would claim the customer asked for none, which is not the same as not
 * having asked.
 */
export function toRecords(
  rows: ForecastRow[],
  context: { customer?: string; year: number; batch?: string }
): Omit<ForecastRecord, "id">[] {
  const out: Omit<ForecastRecord, "id">[] = [];
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const week = weekOf(key);
      if (week === null) continue;
      const qty = Number(value);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      out.push({
        customer: context.customer,
        plant: String(row.variety ?? ""),
        size: String(row.size ?? ""),
        requestType: String(row.type ?? "Current Order"),
        week,
        year: context.year,
        requested: qty,
        status: "Pending",
        batch: context.batch,
      });
    }
  }
  return out;
}

/**
 * Records back to the grid the screen shows.
 *
 * Rows are keyed by variety, size and request type together: the same variety
 * at two sizes is two lines on the customer's sheet, and merging them would
 * misreport both.
 */
export function toGrid(records: ForecastRecord[], customer?: string): ForecastRow[] {
  const wanted = records.filter((r) => !customer || r.customer === customer);
  const byLine = new Map<string, ForecastRow>();

  for (const r of wanted) {
    const key = `${r.plant}|${r.size}|${r.requestType}`;
    const row = byLine.get(key) ?? {
      variety: String(r.plant ?? ""),
      size: String(r.size ?? ""),
      type: String(r.requestType ?? ""),
      total: 0,
    };
    if (r.week !== undefined) {
      const k = weekKey(r.week);
      row[k] = (Number(row[k]) || 0) + (r.requested ?? 0);
    }
    row.total = (Number(row.total) || 0) + (r.requested ?? 0);
    byLine.set(key, row);
  }

  return [...byLine.values()].sort((a, b) =>
    a.variety === b.variety
      ? String(a.size).localeCompare(String(b.size))
      : String(a.variety).localeCompare(String(b.variety))
  );
}

/** What a week is asked for across every line, for the column totals. */
export function weekTotals(rows: ForecastRow[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const week of weeksIn(rows)) {
    out[week] = rows.reduce((sum, r) => sum + (Number(r[weekKey(week)]) || 0), 0);
  }
  return out;
}
