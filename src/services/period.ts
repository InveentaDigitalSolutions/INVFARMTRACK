/**
 * Calendar helpers the KPI services share.
 *
 * Every module wants the same comparison — this week against last, this month
 * against last — and every module was about to grow its own slightly different
 * version. A figure means nothing without something to read it against, so the
 * comparison is the point, not an extra.
 */

/** ISO week number, which is how the nursery counts: pruning, counts, demand. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round((t.getTime() - first.getTime()) / (7 * 86_400_000));
}

/** "2026-08" — the key a date string sorts and groups by. */
export const monthKey = (date: string | undefined): string => String(date ?? "").slice(0, 7);

/** The month key n months before `from`. */
export function monthBefore(from: Date, n: number): string {
  const d = new Date(from);
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Whole days between two dates; negative when `date` is in the past. */
export function daysFrom(date: string | undefined, today = new Date()): number | null {
  if (!date) return null;
  const t = Date.parse(String(date));
  if (Number.isNaN(t)) return null;
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((t - midnight) / 86_400_000);
}

/** True when `date` falls in the same ISO week and year as `today`. */
export function inWeekOf(date: string | undefined, today: Date): boolean {
  if (!date) return false;
  const d = new Date(String(date));
  if (Number.isNaN(d.getTime())) return false;
  return isoWeek(d) === isoWeek(today) && d.getFullYear() === today.getFullYear();
}

/**
 * Percentage change, or undefined when there is no baseline.
 *
 * Returning 0 for "nothing last month" would draw a flat arrow next to the
 * nursery's first month of trading, which is the opposite of what happened.
 */
export function changePct(now: number, before: number): number | undefined {
  if (!before) return undefined;
  return Math.round(((now - before) / before) * 100);
}

/** The six months ending with `today`, oldest first, summed by `pick`. */
export function monthlySeries<T>(
  rows: T[],
  dateOf: (r: T) => string | undefined,
  pick: (r: T) => number,
  today = new Date(),
  months = 6
): { key: string; label: string; value: number }[] {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(today);
    d.setDate(1);
    d.setMonth(d.getMonth() - (months - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: d.toLocaleDateString("en-GB", { month: "short" }),
      value: rows.filter((r) => monthKey(dateOf(r)) === key).reduce((s, r) => s + pick(r), 0),
    };
  });
}

/** Ranked descending, dropping empties — the shape RankedBars wants. */
export function ranked(map: Map<string, number>): { name: string; value: number }[] {
  return [...map.entries()]
    .filter(([name, value]) => name && value)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/** Sum a column, treating a missing cell as nothing rather than as NaN. */
export const sum = <T>(rows: T[], pick: (r: T) => number | undefined): number =>
  rows.reduce((s, r) => s + (Number(pick(r)) || 0), 0);
