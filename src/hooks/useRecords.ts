import { useCallback, useEffect, useMemo, useState } from "react";
import { LocalStore, type DataStore, type Identified } from "../services/DataService";
import { DataverseStore } from "../services/DataverseStore";
import { DATAVERSE_TABLES, ENABLED_TABLES, dataverseConfigured } from "../services/tableMap";

/**
 * Store-backed replacement for `useState(initialArray)`.
 *
 * Pages already funnel every mutation through a per-page `save(data, setData)`
 * and `del(data, setData)`, so this deliberately keeps the `[rows, setRows]`
 * shape: swapping a page over is a one-line change and no handler is touched.
 *
 * Underneath it is not a whole-array write. `setRows` diffs the incoming array
 * against the current one by id and issues per-record create / update / delete
 * against the DataStore — which is what Dataverse needs, and what makes the
 * eventual LocalStore -> DataverseStore swap invisible to pages.
 */

const registry = new Map<string, DataStore<Identified>>();

/**
 * One store per table, shared across mounts so pages agree on the data.
 *
 * A table backed by Dataverse — mapped, enabled, and with a session available —
 * gets a DataverseStore. Everything else stays on LocalStore, so the app keeps
 * working while tables are migrated one at a time and still runs entirely
 * offline under plain `npm run dev`.
 */
function storeFor(table: string, seed: Record<string, unknown>[]): DataStore<Identified> {
  let store = registry.get(table);
  if (store) return store;

  const binding = DATAVERSE_TABLES[table];
  if (binding && ENABLED_TABLES.has(table) && dataverseConfigured()) {
    store = new DataverseStore<Identified>(binding.dataSource, binding.primaryKey);
    console.info(`[data] ${table} -> Dataverse (${binding.dataSource})`);
  } else {
    store = new LocalStore<Identified>(table, seed as Identified[]);
  }

  registry.set(table, store);
  return store;
}

function sameContent(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === "id") continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
  }
  return true;
}

/**
 * T is deliberately unconstrained: pages carry their own row interfaces
 * (Invoice, Bill, Worker...) and should not have to weaken them to satisfy the
 * store. The store speaks in `Identified`; the boundary is crossed here, once.
 */
type Updater<T> = T[] | ((prev: T[]) => T[]);

export function useRecords<T>(
  table: string,
  seed: T[]
): [T[], (next: Updater<T>) => void] {
  const store = useMemo(
    () => storeFor(table, seed as unknown as Record<string, unknown>[]),
    [table, seed]
  );
  const [rows, setRowsState] = useState<T[]>([]);

  const load = useCallback(async () => {
    try {
      const all = await store.getAll();
      setRowsState(all as unknown as T[]);
    } catch (err) {
      // A silent empty table is the worst failure mode here: it looks like
      // "no records" rather than "the read failed". Say so loudly.
      console.error(`[data] failed to load "${table}"`, err);
      setRowsState([]);
    }
  }, [store, table]);

  useEffect(() => {
    void load();
  }, [load]);

  const setRows = useCallback(
    (update: Updater<T>) => {
      // Accepts an array or an updater, matching useState so pages that do
      // setRows(prev => ...) keep working.
      let next: T[] = [];
      setRowsState((prev) => {
        next = typeof update === "function" ? (update as (p: T[]) => T[])(prev) : update;
        return next;
      });

      void (async () => {
        const current = (await store.getAll()) as unknown as T[];
        const idOf = (r: T) => String((r as { id?: unknown }).id ?? "");
        const currentById = new Map(current.map((r) => [idOf(r), r]));
        const nextIds = new Set(next.map(idOf).filter(Boolean));

        for (const [id] of currentById) {
          if (!nextIds.has(id)) await store.delete(id);
        }
        for (const row of next) {
          const id = idOf(row);
          if (!id) {
            await store.create(row as unknown as Omit<Identified, "id">);
          } else {
            const existing = currentById.get(id);
            if (existing && !sameContent(
              existing as Record<string, unknown>, row as Record<string, unknown>
            )) {
              await store.update(id, row as unknown as Partial<Identified>);
            }
          }
        }
        await load();
      })();
    },
    [store, load]
  );

  return [rows, setRows];
}
