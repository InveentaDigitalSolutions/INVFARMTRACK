/**
 * DataverseStore — the DataStore<T> implementation backed by Dataverse.
 *
 * Deliberately generic rather than one store per generated service class:
 * the generated services are 36 near-identical wrappers over the same client,
 * so this talks to the client directly and takes the data-source name.
 *
 * The identity mapping is the substantive part. This layer's contract is that
 * every record carries `id` (see Identified in DataService), while Dataverse
 * names its key after the table — bv_shadehouseid, bv_bedid, and so on. Records
 * are translated in both directions here so pages never see a GUID field whose
 * name changes per table.
 */

import { getClient } from "@microsoft/power-apps/data";
import type { IOperationResult } from "@microsoft/power-apps/data";
import { dataSourcesInfo } from "../../.power/schemas/appschemas/dataSourcesInfo";
import type { DataStore, Identified, QueryOptions } from "./DataService";

type Row = Record<string, unknown>;

export class DataverseStore<T extends Identified> implements DataStore<T> {
  private readonly client = getClient(dataSourcesInfo);

  private readonly dataSourceName: string;
  private readonly primaryKey: string;

  /**
   * @param dataSourceName as it appears in power.config.json, e.g. "bv_shadehouses"
   * @param primaryKey     the Dataverse key column, e.g. "bv_shadehouseid"
   */
  constructor(dataSourceName: string, primaryKey: string) {
    this.dataSourceName = dataSourceName;
    this.primaryKey = primaryKey;
  }

  /** Dataverse record -> app record: expose the key as `id`. */
  private toApp(record: Row): T {
    const { [this.primaryKey]: key, ...rest } = record;
    return { ...rest, id: String(key ?? "") } as unknown as T;
  }

  /** App record -> Dataverse record: drop `id`, never send the key on write. */
  private toDataverse(record: Row): Row {
    const out: Row = {};
    for (const [k, v] of Object.entries(record)) {
      if (k === "id" || k === this.primaryKey) continue;
      // Autonumber and other server-computed columns must not be written.
      if (v === undefined) continue;
      out[k] = v;
    }
    return out;
  }

  private unwrap<R>(result: IOperationResult<R>): R {
    if (!result.success) {
      throw result.error ?? new Error(`Dataverse operation failed on ${this.dataSourceName}`);
    }
    return result.data;
  }

  async getAll(options?: QueryOptions): Promise<T[]> {
    // Filtering and ordering are pushed to the server where the shape allows;
    // free-text search stays client-side because it spans arbitrary columns.
    const filters: string[] = [];
    for (const [key, value] of Object.entries(options?.filter ?? {})) {
      if (value === undefined || value === null) continue;
      filters.push(
        typeof value === "string" ? `${key} eq '${String(value).replace(/'/g, "''")}'` : `${key} eq ${String(value)}`
      );
    }

    const result = await this.client.retrieveMultipleRecordsAsync<Row>(this.dataSourceName, {
      ...(filters.length ? { filter: filters.join(" and ") } : {}),
      ...(options?.orderBy
        ? { orderBy: [options.orderBy.startsWith("-") ? `${options.orderBy.slice(1)} desc` : options.orderBy] }
        : {}),
      ...(options?.top ? { top: options.top } : {}),
    });

    let rows = this.unwrap(result).map((r) => this.toApp(r));

    if (options?.search) {
      const q = options.search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r as Row).some(
          (v) => typeof v === "string" && v.toLowerCase().includes(q)
        )
      );
    }
    return rows;
  }

  async getById(id: string): Promise<T | null> {
    try {
      const result = await this.client.retrieveRecordAsync<Row>(this.dataSourceName, id);
      const data = this.unwrap(result);
      return data ? this.toApp(data) : null;
    } catch {
      return null;
    }
  }

  async create(record: Omit<T, "id">): Promise<T> {
    const result = await this.client.createRecordAsync<Row, Row>(
      this.dataSourceName,
      this.toDataverse(record as Row)
    );
    return this.toApp(this.unwrap(result));
  }

  async update(id: string, changes: Partial<T>): Promise<T> {
    const result = await this.client.updateRecordAsync<Row, Row>(
      this.dataSourceName,
      id,
      this.toDataverse(changes as Row)
    );
    return this.toApp(this.unwrap(result));
  }

  async delete(id: string): Promise<void> {
    await this.client.deleteRecordAsync(this.dataSourceName, id);
  }

  async count(): Promise<number> {
    return (await this.getAll()).length;
  }
}

/** Dataverse names its key after the table: bv_shadehouse -> bv_shadehouseid. */
export function primaryKeyFor(logicalName: string): string {
  return `${logicalName}id`;
}
