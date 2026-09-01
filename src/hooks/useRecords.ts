import { useCallback, useEffect, useMemo, useState } from "react";
import { LocalStore, type DataStore, type Identified } from "../services/DataService";
import { DataverseStore, dataverseResolver } from "../services/DataverseStore";
import { DATAVERSE_TABLES, ENABLED_TABLES, hostingMode } from "../services/tableMap";
import { planWrites } from "../services/syncPlan";
import { reportWriteError } from "../services/writeErrors";

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
  const mode = hostingMode();

  if (binding && ENABLED_TABLES.has(table) && mode !== "demo") {
    store = new DataverseStore<Identified>(
      binding.dataSource, binding.primaryKey, binding.fields,
      binding.primaryName, binding.nameFrom
    );
    console.info(`[data] ${table} -> Dataverse (${binding.dataSource}) via ${mode}`);
  } else {
    store = new LocalStore<Identified>(table, seed as Identified[]);
  }

  registry.set(table, store);
  return store;
}

/**
 * T is deliberately unconstrained: pages carry their own row interfaces
 * (Invoice, Bill, Worker...) and should not have to weaken them to satisfy the
 * store. The store speaks in `Identified`; the boundary is crossed here, once.
 */
type Updater<T> = T[] | ((prev: T[]) => T[]);

/**
 * The third element is whether the first read is still in flight.
 *
 * An empty array means two very different things — "nothing recorded" and
 * "not read yet" — and a screen that cannot tell them apart draws a half-built
 * nursery for the fraction of a second before the rows arrive. The 3D view
 * showed a shrunken house of posts on an empty floor, which reads as the wrong
 * model rather than as a loading state.
 */
export function useRecords<T>(
  table: string,
  seed: T[]
): [T[], (next: Updater<T>) => void, boolean] {
  const store = useMemo(
    () => storeFor(table, seed as unknown as Record<string, unknown>[]),
    [table, seed]
  );
  const [rows, setRowsState] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const all = await store.getAll();
      setRowsState(all as unknown as T[]);
    } catch (err) {
      // A silent empty table is the worst failure mode here: it looks like
      // "no records" rather than "the read failed". Say so where it can be
      // seen — the console is not somewhere anyone is looking.
      console.error(`[data] failed to load "${table}"`, err);
      reportWriteError(table, "read", err);
      setRowsState([]);
    } finally {
      // A failed read is still a finished one: the screen has to stop saying
      // "loading" and start saying what it does know, which is nothing.
      setLoading(false);
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
        // Declared out here so the check after the reload can see it.
        const removed: string[] = [];
        try {
          const current = (await store.getAll()) as unknown as T[];
          const plan = planWrites(
            current as unknown as { id?: string }[],
            next as unknown as { id?: string }[]
          );

          // Each write is reported on its own. One rejected row must not stop
          // the others, and the message has to name what failed — the whole
          // block used to run uncaught, so a rejection vanished into an
          // unhandled promise and the row simply disappeared on next load.
          for (const id of plan.remove) {
            try { await store.delete(id); removed.push(id); }
            catch (err) { reportWriteError(table, "delete", err); }
          }
          for (const row of plan.create) {
            try { await store.create(row as unknown as Omit<Identified, "id">); }
            catch (err) { reportWriteError(table, "create", err); }
          }
          for (const { id, row } of plan.update) {
            try { await store.update(id, row as unknown as Partial<Identified>); }
            catch (err) { reportWriteError(table, "update", err); }
          }
        } catch (err) {
          reportWriteError(table, "update", err);
        }
        /**
         * Anything that writes to a table can change what other forms may
         * pick from it — a new season, a new plant, a renamed customer. The
         * lookup index is cached, so it has to be told.
         */
        const binding = DATAVERSE_TABLES[table];
        if (binding) dataverseResolver.invalidate(binding.dataSource);

        // Reload either way: the screen must end up showing what is stored,
        // not what was typed.
        await load();

        /**
         * And check the delete actually took.
         *
         * A row that leaves the screen and comes back on the next read is the
         * most confusing failure this app has: it looks like the button did
         * nothing, or worse, like it worked. The store reports what it is told;
         * this reports what is still there afterwards.
         */
        if (removed.length > 0) {
          try {
            const after = await store.getAll();
            const survived = new Set(after.map((r) => String((r as Identified).id)));
            const back = removed.filter((id) => survived.has(id));
            if (back.length > 0) {
              reportWriteError(table, "delete", {
                message: `${back.length} record${back.length === 1 ? "" : "s"} came back after being deleted. `
                  + "Dataverse accepted the request and kept the row — check for another record pointing at it.",
              });
            }
          } catch {
            // The reload already reported its own failure; nothing to add.
          }
        }
      })();
    },
    [store, load, table]
  );

  return [rows, setRows, loading];
}
