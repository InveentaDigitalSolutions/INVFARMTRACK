/**
 * The lempira against the dollar, over time.
 *
 * The dashboard shows today's reference rate. That single number says nothing
 * about which way it is going, and the direction is what matters when an
 * invoice raised in March is still open in August: costs are in lempira,
 * prices are in dollars, and a receivable's worth drifts with the rate.
 *
 * The history is already in Dataverse — four hundred days of it, filled daily
 * by the flow — so this is arithmetic over records the app already holds.
 */

export interface RatePoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  value: number;
}

export type RangeKey = "3M" | "6M" | "1Y";

export const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "3M", label: "3 months", days: 90 },
  { key: "6M", label: "6 months", days: 182 },
  { key: "1Y", label: "1 year", days: 365 },
];

const toISO = (value: unknown): string => String(value ?? "").slice(0, 10);

/**
 * The published rates, oldest first, cleaned of anything unusable.
 *
 * The BCH publishes on working days only, so the series is not evenly spaced
 * and must never be treated as one point per day.
 */
export function rateSeries(
  rows: { date?: unknown; value?: unknown }[]
): RatePoint[] {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const date = toISO(row.date);
    const value = Number(row.value);
    // A date the length of an ISO day, and a rate that is a real number: a
    // half-written record must not put a zero in the middle of the line.
    if (date.length !== 10 || !Number.isFinite(value) || value <= 0) continue;
    seen.set(date, value);
  }
  return [...seen.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * The window ending at the newest published rate — not at today. If the flow
 * stopped a fortnight ago, "3 months" means the three months up to the last
 * rate there is, rather than a chart that trails off into nothing.
 */
export function withinRange(series: RatePoint[], days: number): RatePoint[] {
  const last = series[series.length - 1];
  if (!last) return [];
  const cutoff = new Date(`${last.date}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const from = cutoff.toISOString().slice(0, 10);
  return series.filter((p) => p.date >= from);
}

export interface RateStats {
  first: RatePoint | null;
  last: RatePoint | null;
  low: number;
  high: number;
  /** Absolute move across the window, last minus first. */
  change: number;
  /** The same move as a percentage of where it started. */
  changePct: number;
}

export function rateStats(points: RatePoint[]): RateStats {
  const first = points[0] ?? null;
  const last = points[points.length - 1] ?? null;
  if (!first || !last) {
    return { first: null, last: null, low: 0, high: 0, change: 0, changePct: 0 };
  }
  const values = points.map((p) => p.value);
  const change = last.value - first.value;
  return {
    first, last,
    low: Math.min(...values),
    high: Math.max(...values),
    change,
    changePct: first.value > 0 ? (change / first.value) * 100 : 0,
  };
}

/**
 * The series as points in a box, ready to draw.
 *
 * X is the real date, not the index — the gaps at weekends and holidays are
 * part of the shape, and evenly spacing the points would draw a line that
 * moves when nothing happened.
 *
 * The Y scale is padded and never zero-based: the rate moves by fractions of a
 * lempira on a base of twenty-six, so a chart anchored at zero is a flat line.
 */
export function plotPoints(
  points: RatePoint[],
  width: number,
  height: number,
  pad = 0
): { x: number; y: number; point: RatePoint }[] {
  if (points.length === 0) return [];

  const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  const t0 = t(points[0].date);
  const t1 = t(points[points.length - 1].date);
  const span = t1 - t0;

  const values = points.map((p) => p.value);
  let low = Math.min(...values), high = Math.max(...values);
  const margin = (high - low) * 0.15 || 0.01;
  low -= margin; high += margin;

  const inner = { w: width - pad * 2, h: height - pad * 2 };

  return points.map((point) => ({
    // A single point, or a window where every rate landed on one day, sits in
    // the middle rather than dividing by a zero span.
    x: pad + (span > 0 ? ((t(point.date) - t0) / span) * inner.w : inner.w / 2),
    y: pad + inner.h - ((point.value - low) / (high - low)) * inner.h,
    point,
  }));
}
