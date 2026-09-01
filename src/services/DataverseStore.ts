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
import { CHOICE_MAP, CHOICE_LABELS, LOOKUP_MAP } from "./choiceMap.generated";
import { COLUMN_KIND } from "./columnKinds.generated";
import { buildPayload } from "./payload";
import { LookupResolver } from "./lookupResolver";

type Row = Record<string, unknown>;

/**
 * Every page, not the first one.
 *
 * Dataverse answers a list query one page at a time and hands back a skip
 * token for the next; a single call therefore returns some of the table and
 * looks exactly like all of it. That was harmless while the biggest table held
 * 200 beds. It stopped being harmless when the ports table became 6,591
 * airports and seaports: a picker missing four thousand destinations, with
 * nothing on screen to say so.
 *
 * The cap is a runaway guard, not a limit anyone should reach — 50 pages is
 * a quarter of a million rows.
 */
async function retrieveAll(
  client: { retrieveMultipleRecordsAsync: <R>(t: string, o?: Record<string, unknown>) => Promise<IOperationResult<R[]>> },
  table: string,
  options: Record<string, unknown> = {}
): Promise<Row[]> {
  const rows: Row[] = [];
  let skipToken: string | undefined;
  for (let page = 0; page < 50; page++) {
    const result: IOperationResult<Row[]> = await client.retrieveMultipleRecordsAsync<Row>(table, {
      ...options,
      ...(skipToken ? { skipToken } : {}),
    });
    if (!result.success) return rows;
    rows.push(...(result.data ?? []));
    // A page short of the asked-for size is the last one whatever the token
    // says, and a token that does not change would loop forever.
    if (!result.skipToken || result.skipToken === skipToken) break;
    skipToken = result.skipToken;
  }
  return rows;
}

/**
 * One resolver for the whole app so the bed index is fetched once, not once
 * per screen that references a bed.
 */
export const dataverseResolver = new LookupResolver(async (entitySet, labelColumns, join) => {
  const client = getClient(dataSourcesInfo);
  const rows = await retrieveAll(client, entitySet, { select: labelColumns });
  const keyColumn = `${entitySet.replace(/s$/, "")}id`;
  return rows.map((row) => ({
    id: String(row[keyColumn] ?? ""),
    label: labelColumns
      .map((c) => row[c])
      .filter((v) => v !== undefined && v !== null && v !== "")
      .join(join),
  }));
});

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
      // The formatted annotation on a lookup is the target's primary name,
      // which here is its autonumber — "BED-0001", not "E3-01". The id is kept
      // instead and resolved to the descriptive name by resolveLookupLabels.
      if (formatted) continue;

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
    return buildPayload(record, {
      toColumn: this.toColumn,
      kinds: COLUMN_KIND[this.dataSourceName] ?? {},
      primaryKey: this.primaryKey,
      choices: this.choiceColumns(),
      onUnknownChoice: (column, value, allowed) =>
        // An unrecognised label would fail the whole request with an opaque
        // Dataverse error, so it is dropped and said out loud instead.
        console.error(
          `[data] ${this.dataSourceName}.${column}: "${value}" is not one of ` +
            `${allowed.join(", ")} — the column was left unset.`
        ),
    });
  }


  /**
   * Choice columns hold integers in Dataverse and readable text in the app.
   * The Web API rejects the text outright (400), so every write has to be
   * translated; reads come back as bare numbers without it.
   */
  private choiceColumns(): Record<string, Record<string, number>> {
    return CHOICE_MAP[this.dataSourceName] ?? {};
  }


  /** Option value -> text on the way in. */
  private toChoiceLabel(column: string, value: unknown): unknown {
    const labels = CHOICE_LABELS[this.dataSourceName]?.[column];
    if (!labels || typeof value !== "number") return value;
    return labels[value] ?? value;
  }

  /** The lookup columns this table has, as { appField: column }. */
  private lookupFields(): Array<[string, string, { nav: string; targetSet: string }]> {
    const columns = LOOKUP_MAP[this.dataSourceName] ?? {};
    const out: Array<[string, string, { nav: string; targetSet: string }]> = [];
    for (const [field, column] of Object.entries(this.toColumn)) {
      const meta = columns[column];
      if (meta) out.push([field, column, meta]);
    }
    return out;
  }

  /**
   * Adds the @odata.bind entries for whichever lookups this record sets.
   * Writing to the _value column instead fails the whole request with a 400.
   */
  private async bindLookups(payload: Row, record: Row): Promise<void> {
    for (const [field, , meta] of this.lookupFields()) {
      const chosen = record[field];
      if (chosen === undefined || chosen === null || chosen === "") continue;
      const id = await dataverseResolver.idFor(meta.targetSet, chosen);
      if (id) payload[`${meta.nav}@odata.bind`] = `/${meta.targetSet}(${id})`;
    }
  }

  /**
   * Replaces lookup ids with the name the row is known by. Without this every
   * lookup on screen reads as the target's autonumber, because that is the
   * primary name on all of these tables.
   */
  private async resolveLookupLabels(rows: T[]): Promise<void> {
    const fields = this.lookupFields();
    if (fields.length === 0) return;
    await Promise.all(
      rows.map(async (row) => {
        const r = row as Row;
        for (const [field, , meta] of fields) {
          const label = await dataverseResolver.labelFor(meta.targetSet, r[field]);
          if (label !== undefined) r[field] = label;
        }
      })
    );
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

    // `top` asks for a bounded slice, so it is answered in one call; without
    // it the caller asked for the table, and the table is what it gets.
    const query = {
      ...(filters.length ? { filter: filters.join(" and ") } : {}),
      ...(options?.orderBy
        ? { orderBy: [options.orderBy.startsWith("-") ? `${options.orderBy.slice(1)} desc` : options.orderBy] }
        : {}),
      ...(options?.top ? { top: options.top } : {}),
    };
    const data = options?.top
      ? this.unwrap(await this.client.retrieveMultipleRecordsAsync<Row>(this.dataSourceName, query))
      : await retrieveAll(this.client, this.dataSourceName, query);

    let rows = data.map((r) => this.toApp(r));
    await this.resolveLookupLabels(rows);

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

    await this.bindLookups(payload, record as Row);

    const result = await this.client.createRecordAsync<Row, Row>(
      this.dataSourceName,
      payload
    );
    const saved = this.toApp(this.unwrap(result));
    await this.resolveLookupLabels([saved]);
    return saved;
  }

  async update(id: string, changes: Partial<T>): Promise<T> {
    const payload = this.toDataverse(changes as Row);
    await this.bindLookups(payload, changes as Row);

    const result = await this.client.updateRecordAsync<Row, Row>(
      this.dataSourceName,
      id,
      payload
    );
    const saved = this.toApp(this.unwrap(result));
    await this.resolveLookupLabels([saved]);
    return saved;
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
