/**
 * Translates between the name a person picks and the row Dataverse stores.
 *
 * A lookup cannot be written by assigning to its _value column — Dataverse
 * answers 400. It has to be bound by navigation property and target row:
 *
 *   "bv_BedId@odata.bind": "/bv_beds(<guid>)"
 *
 * Reading has the mirror problem. Every table here uses its autonumber as the
 * primary name, so the formatted annotation on a lookup returns "BED-0001" —
 * an identifier nobody at the nursery picks a bed by. The descriptive column
 * (bv_bedname, holding "E3-01") is what the screens show and what the forms
 * offer, so both directions go through the index below.
 *
 * The index for a table is fetched once and reused. Nursery reference tables
 * are small — 120 beds, 5 plants, a handful of customers — so one pass is
 * cheaper than resolving a name per saved record.
 */

import { LABEL_COLUMN } from "./choiceMap.generated";
import { LABEL_OVERRIDES } from "./lookupLabels";

interface Index {
  byId: Map<string, string>;
  byLabel: Map<string, string>;
}

/**
 * Fetches (id, label) pairs for one table, supplied by whichever store is in
 * use. More than one column may be requested: a plant is identified by name
 * and variety together, not by either alone.
 */
export type IndexLoader = (
  entitySet: string,
  labelColumns: string[],
  join: string
) => Promise<Array<{ id: string; label: string }>>;

/** The columns that name a row in this table, and how they join. */
export function labelSpecFor(entitySet: string): { columns: string[]; join: string } {
  const override = LABEL_OVERRIDES[entitySet];
  if (override) return override;
  const single = LABEL_COLUMN[entitySet];
  return { columns: single ? [single] : [], join: " " };
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isGuid = (value: unknown): value is string =>
  typeof value === "string" && GUID.test(value);

export class LookupResolver {
  /** Promises, not values, so concurrent callers share one fetch. */
  private readonly indexes = new Map<string, Promise<Index>>();

  private readonly load: IndexLoader;

  constructor(load: IndexLoader) {
    this.load = load;
  }

  private index(entitySet: string): Promise<Index> {
    const cached = this.indexes.get(entitySet);
    if (cached) return cached;

    const spec = labelSpecFor(entitySet);
    const pending = (async (): Promise<Index> => {
      const byId = new Map<string, string>();
      const byLabel = new Map<string, string>();
      if (spec.columns.length === 0) return { byId, byLabel };
      for (const row of await this.load(entitySet, spec.columns, spec.join)) {
        if (!row.id) continue;
        byId.set(row.id.toLowerCase(), row.label);
        // First writer wins: if two rows share a label the earlier one is
        // what a person picking that name would expect to get.
        if (row.label && !byLabel.has(row.label)) byLabel.set(row.label, row.id);
      }
      return { byId, byLabel };
    })();

    this.indexes.set(entitySet, pending);
    return pending;
  }

  /**
   * The name to show for a row id, or undefined when it cannot be resolved.
   *
   * A miss usually means the index was built before the row existed — someone
   * added a bed in another tab, or straight into Dataverse. Left alone, the
   * column keeps the raw GUID and the screen looks broken, so a miss refreshes
   * the index once and asks again. The cooldown stops a page full of genuinely
   * unresolvable ids from refetching per row.
   */
  private readonly refreshedAt = new Map<string, number>();

  async labelFor(entitySet: string, id: unknown): Promise<string | undefined> {
    if (!isGuid(id)) return undefined;
    const key = id.toLowerCase();

    const found = (await this.index(entitySet)).byId.get(key);
    if (found !== undefined) return found;

    const last = this.refreshedAt.get(entitySet) ?? 0;
    if (Date.now() - last < 10_000) return undefined;
    this.refreshedAt.set(entitySet, Date.now());

    this.indexes.delete(entitySet);
    return (await this.index(entitySet)).byId.get(key);
  }

  /**
   * The row id for a chosen name, for writing. A value that is already a GUID
   * passes through, so a form may offer either.
   */
  async idFor(entitySet: string, value: unknown): Promise<string | undefined> {
    if (isGuid(value)) return value;
    if (typeof value !== "string" || value === "") return undefined;
    const found = (await this.index(entitySet)).byLabel.get(value);
    if (found) return found;
    console.error(
      `[data] no row in ${entitySet} is called "${value}" — the lookup was left unset. ` +
        `The list offering that name is probably out of step with the table.`
    );
    return undefined;
  }

  /**
   * Every name in this table, for offering as choices. Built from the same
   * index the writes resolve against, so a list can only ever offer a name
   * that will resolve — which is the failure the hardcoded lists had.
   */
  async labels(entitySet: string): Promise<string[]> {
    return [...(await this.index(entitySet)).byLabel.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }

  /** Drops cached indexes so a newly created reference row becomes selectable. */
  invalidate(entitySet?: string): void {
    if (entitySet) this.indexes.delete(entitySet);
    else this.indexes.clear();
    // Dropping the cache is not enough on its own: the lists were built once
    // when the app loaded and nothing asked again, so a season created after
    // that could not be picked until a full reload. Anyone showing those names
    // needs telling.
    for (const listener of this.listeners) listener();
  }

  private readonly listeners = new Set<() => void>();

  /** Called whenever any cached index is dropped. Returns an unsubscribe. */
  onInvalidate(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}
