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
import { CHOICE_MAP, CHOICE_LABELS } from "./choiceMap.generated";

type Row = Record<string, unknown>;

export class DataverseStore<T extends Identified> implements DataStore<T> {
  private readonly client = getClient(dataSourcesInfo);

  private readonly dataSourceName: string;
  private readonly primaryKey: string;
  /** app field -> Dataverse column */
  private readonly toColumn: Record<string, string>;
  /** Dataverse column -> app field */
  private readonly toField: Record<string, string>;

  /** Primary name column to fill on create, when no app field writes it. */
  private readonly primaryName?: string;
  /** App fields joined to build that name. */
  private readonly nameFrom: string[];

  /**
   * @param dataSourceName as it appears in power.config.json, e.g. "bv_shadehouses"
   * @param primaryKey     the Dataverse key column, e.g. "bv_shadehouseid"
   * @param fields         app field -> Dataverse column; unmapped names pass through
   * @param primaryName    name column to synthesize on create — see DataverseBinding
   * @param nameFrom       app fields to build that name from
   */
  constructor(
    dataSourceName: string,
    primaryKey: string,
    fields: Record<string, string> = {},
    primaryName?: string,
    nameFrom: string[] = []
  ) {
    this.dataSourceName = dataSourceName;
    this.primaryKey = primaryKey;
    this.toColumn = fields;
    this.toField = Object.fromEntries(Object.entries(fields).map(([k, v]) => [v, k]));
    this.primaryName = primaryName;
    this.nameFrom = nameFrom;
  }

  /**
   * Build the primary name for a new record.
   *
   * Lookup fields hold display text in the app (DataverseStore unwraps the
   * formatted annotation on read), so joining them reads the way a person
   * would say it: "Bed A-12 · 2026-08-28 · Export". Dataverse caps primary
   * name at 100 characters and silently rejects longer, so trim.
   */
  private buildName(record: Row): string | undefined {
    if (!this.primaryName) return undefined;
    const parts = this.nameFrom
      .map((field) => record[field])
      .filter((v) => v !== undefined && v !== null && v !== "")
      .map((v) => String(v));
    if (parts.length === 0) return undefined;
    return parts.join(" · ").slice(0, 100);
  }

  /** Dataverse record -> app record: rename columns and expose the key as `id`. */
  private toApp(record: Row): T {
    const out: Row = {};

    for (const [column, value] of Object.entries(record)) {
      if (column === this.primaryKey) continue;

      // A lookup arrives as _bv_bedid_value (a GUID) alongside a formatted
      // annotation carrying the text a person would recognise. Screens show
      // the text, so the annotation is the useful half — take it and let the
      // raw GUID through under its own name for writes.
      const formatted = column.match(
        /^(_.+_value)@OData\.Community\.Display\.V1\.FormattedValue$/
      );
      if (formatted) {
        const field = this.toField[formatted[1]];
        if (field) out[field] = value;
        continue;
      }

      // Everything else annotation-shaped is noise.
      if (column.startsWith("@") || column.includes("@odata") || column.includes("@OData")) continue;

      const field = this.toField[column] ?? column;
      // Do not let a raw GUID overwrite a display value already taken from an
      // annotation — order of keys in the payload is not guaranteed.
      if (out[field] === undefined) out[field] = this.toChoiceLabel(column, value);
    }

    out.id = String(record[this.primaryKey] ?? "");
    return out as unknown as T;
  }

  /** App record -> Dataverse record: rename fields, never send the key. */
  private toDataverse(record: Row): Row {
    const out: Row = {};
    for (const [field, value] of Object.entries(record)) {
      if (field === "id" || field === this.primaryKey) continue;
      // Autonumber and other server-computed columns must not be written.
      if (value === undefined) continue;
      const column = this.toColumn[field] ?? field;
      // Only send columns Dataverse knows about; an unmapped app-only field
      // would be rejected for the whole request.
      if (!column.startsWith("bv_")) continue;
      const translated = this.toChoiceValue(column, value);
      if (translated === undefined) continue;
      out[column] = translated;
    }
    return out;
  }


  /**
   * Choice columns hold integers in Dataverse and readable text in the app.
   * The Web API rejects the text outright (400), so every write has to be
   * translated; reads come back as bare numbers without it.
   */
  private choiceColumns(): Record<string, Record<string, number>> {
    return CHOICE_MAP[this.dataSourceName] ?? {};
  }

  /** Text -> option value on the way out. */
  private toChoiceValue(column: string, value: unknown): unknown {
    const options = this.choiceColumns()[column];
    if (!options || typeof value !== "string") return value;
    const mapped = options[value];
    if (mapped !== undefined) return mapped;
    // An unrecognised label would fail the whole request with an opaque
    // Dataverse error, so drop it and say exactly what was wrong.
    console.error(
      `[data] ${this.dataSourceName}.${column}: "${value}" is not one of ` +
        `${Object.keys(options).join(", ")} — the column was left unset.`
    );
    return undefined;
  }

  /** Option value -> text on the way in. */
  private toChoiceLabel(column: string, value: unknown): unknown {
    const labels = CHOICE_LABELS[this.dataSourceName]?.[column];
    if (!labels || typeof value !== "number") return value;
    return labels[value] ?? value;
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
    const payload = this.toDataverse(record as Row);

    // Fill the primary name only when the mapped fields left it empty — a
    // table that maps its own `name` field has already written it.
    if (this.primaryName && !payload[this.primaryName]) {
      const name = this.buildName(record as Row);
      if (name) payload[this.primaryName] = name;
    }

    const result = await this.client.createRecordAsync<Row, Row>(
      this.dataSourceName,
      payload
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
