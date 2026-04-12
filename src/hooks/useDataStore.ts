/**
 * useDataStore — React hook for async CRUD operations against a DataStore.
 *
 * Provides: data, loading, error states + create/update/delete/refresh actions.
 * All pages use this instead of local useState arrays.
 */

import { useState, useEffect, useCallback } from "react";
import type { DataStore, QueryOptions } from "../services/DataService";

interface UseDataStoreResult<T extends Record<string, unknown>> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (record: Omit<T, "id">) => Promise<T>;
  update: (id: string, changes: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  count: number;
}

export function useDataStore<T extends Record<string, unknown>>(
  store: DataStore<T>,
  options?: QueryOptions
): UseDataStoreResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const results = await store.getAll(options);
      setData(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [store, options]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (record: Omit<T, "id">): Promise<T> => {
      try {
        const created = await store.create(record);
        await refresh();
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create record");
        throw err;
      }
    },
    [store, refresh]
  );

  const update = useCallback(
    async (id: string, changes: Partial<T>): Promise<T> => {
      try {
        const updated = await store.update(id, changes);
        await refresh();
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update record");
        throw err;
      }
    },
    [store, refresh]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        await store.delete(id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete record");
        throw err;
      }
    },
    [store, refresh]
  );

  return {
    data,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    count: data.length,
  };
}
