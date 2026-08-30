/**
 * Dropdown choices for a lookup, taken from the table it points at.
 *
 * The lists these replace were written by hand, and drifted: Accounting
 * offered "The Plant Company, LLC" where the customer is recorded as "The
 * Plant Company", and Production offered a Pothos variety called Neon that
 * the nursery does not grow. Picking either saved a record with the lookup
 * empty, because no such row exists to point at.
 *
 * The options come from the same index the store resolves writes against, so
 * a name that appears in the list is by construction a name that will bind.
 */

import { useEffect, useState } from "react";
import { dataverseResolver } from "../services/DataverseStore";
import { DATAVERSE_TABLES, ENABLED_TABLES, hostingMode } from "../services/tableMap";

export interface Option {
  value: string;
  label: string;
}

/**
 * @param table    app table key, as passed to useRecords ("plants", "customers")
 * @param fallback options to use when the table is not Dataverse-backed —
 *                 running on LocalStore, or before the first load returns
 */
export function useLookupOptions(table: string, fallback: Option[] = []): Option[] {
  const [options, setOptions] = useState<Option[]>(fallback);

  useEffect(() => {
    const binding = DATAVERSE_TABLES[table];
    // Same gate useRecords uses to pick a store: demo mode has no Dataverse
    // session, and an unenabled table has no rows there. The hand-written
    // list still serves in both cases.
    if (!binding || !ENABLED_TABLES.has(table) || hostingMode() === "demo") return;

    let cancelled = false;
    dataverseResolver
      .labels(binding.dataSource)
      .then((labels) => {
        if (cancelled || labels.length === 0) return;
        setOptions(labels.map((label) => ({ value: label, label })));
      })
      .catch((err) => {
        console.error(`[data] could not load choices for "${table}"`, err);
      });

    return () => {
      cancelled = true;
    };
  }, [table]);

  return options;
}

/**
 * The same, for several tables at once — what a form needs, since one form may
 * offer plants, workers and inputs. Returns a map keyed by table.
 */
export function useLookupOptionsFor(tables: string[]): Record<string, Option[]> {
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const key = tables.join(",");
  /** Bumped when a lookup table is written to, to fetch the names again. */
  const [version, setVersion] = useState(0);

  useEffect(() => dataverseResolver.onInvalidate(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    if (tables.length === 0 || hostingMode() === "demo") return;
    let cancelled = false;

    Promise.all(
      tables.map(async (table) => {
        const binding = DATAVERSE_TABLES[table];
        if (!binding || !ENABLED_TABLES.has(table)) return [table, []] as const;
        try {
          const labels = await dataverseResolver.labels(binding.dataSource);
          return [table, labels.map((label) => ({ value: label, label }))] as const;
        } catch (err) {
          console.error(`[data] could not load choices for "${table}"`, err);
          return [table, []] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setOptions(Object.fromEntries(entries.filter(([, v]) => v.length > 0)));
    });

    return () => {
      cancelled = true;
    };
    // `key` is the stable identity of the table list; `version` re-runs it
    // after a write, so a season created a moment ago is selectable now
    // instead of after a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  return options;
}
