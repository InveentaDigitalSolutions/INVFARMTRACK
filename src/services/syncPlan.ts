/**
 * What to write when a page hands back a changed array.
 *
 * Pages keep the `[rows, setRows]` shape, so every save arrives as a whole
 * array and the difference has to be worked out here. Getting this wrong is
 * silent: the screen shows the new row because React state took it, and
 * nothing was ever sent.
 *
 * That is exactly what happened to shipments. A page that mints its own
 * identifier — `SHP-2026-001` — produced a row with an id the store had never
 * seen, so it was treated as an update to a record that does not exist and
 * quietly did nothing.
 */

export interface HasId { id?: string }

export interface WritePlan<T> {
  create: T[];
  update: { id: string; row: T }[];
  remove: string[];
}

/** True when two rows differ in anything but their id. */
export function differs(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === "id") continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return true;
  }
  return false;
}

export function planWrites<T extends HasId>(current: T[], next: T[]): WritePlan<T> {
  const byId = new Map(current.filter((r) => r.id).map((r) => [String(r.id), r]));
  const keep = new Set(next.map((r) => String(r.id ?? "")).filter(Boolean));

  const plan: WritePlan<T> = { create: [], update: [], remove: [] };

  for (const id of byId.keys()) if (!keep.has(id)) plan.remove.push(id);

  for (const row of next) {
    const id = String(row.id ?? "");
    const existing = id ? byId.get(id) : undefined;
    if (!existing) {
      // No id, or an id the store has never issued. Both are new records: the
      // second is a page that named the row itself, and dropping it was the
      // bug that lost every shipment.
      plan.create.push(row);
    } else if (differs(existing as Record<string, unknown>, row as Record<string, unknown>)) {
      plan.update.push({ id, row });
    }
  }

  return plan;
}
