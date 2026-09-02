/**
 * Which days of measured sunlight are missing from the store.
 *
 * Kept apart from the hook so it can be tested on its own: the hook reaches
 * for Dataverse and for Vite's build-time environment, and neither belongs in
 * a test about which dates are missing.
 */

export interface StoredDay {
  date?: string;
}

export interface MissingDay {
  date: string;
  megajoules: number;
}

export function missingDays(
  stored: StoredDay[],
  live: Map<string, number>,
  today: string
): MissingDay[] {
  const known = new Set(stored.map((r) => String(r.date ?? "").slice(0, 10)));
  const out: MissingDay[] = [];
  for (const [date, megajoules] of live) {
    if (date.length !== 10 || known.has(date)) continue;
    // Tomorrow's number is a forecast. Storing it beside measurements would
    // make the record claim something nobody measured; today's own total is
    // still being revised, so it waits too.
    if (date >= today) continue;
    if (!Number.isFinite(megajoules)) continue;
    out.push({ date, megajoules });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
