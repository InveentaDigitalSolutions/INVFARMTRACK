/**
 * DataverseWebApiStore — DataStore<T> over the Dataverse Web API.
 *
 * The standalone counterpart to DataverseStore. That one leans on the Power
 * Apps host for its session; this one signs the user in with MSAL and calls
 * Dataverse directly, so the app can be hosted anywhere — which is what lets
 * the 3D view run outside the player's sandbox.
 *
 * Identity and field translation match DataverseStore exactly, so swapping
 * between them is invisible to pages.
 */

import type { DataStore, Identified, QueryOptions } from "./DataService";
import { DATAVERSE_URL, getDataverseToken } from "./auth";

type Row = Record<string, unknown>;

export class DataverseWebApiStore<T extends Identified> implements DataStore<T> {
  private readonly entitySet: string;
  private readonly primaryKey: string;
  private readonly toColumn: Record<string, string>;
  private readonly toField: Record<string, string>;

  /**
   * @param entitySet  plural set name, e.g. "bv_plants"
   * @param primaryKey key column, e.g. "bv_plantid"
   * @param fields     app field -> Dataverse column; unmapped names pass through
   */
  /** Primary name column to fill on create — see DataverseBinding. */
  private readonly primaryName?: string;
  /** App fields joined to build that name. */
  private readonly nameFrom: string[];

  constructor(
    entitySet: string,
    primaryKey: string,
    fields: Record<string, string> = {},
    primaryName?: string,
    nameFrom: string[] = []
  ) {
    this.entitySet = entitySet;
    this.primaryKey = primaryKey;
    this.toColumn = fields;
    this.toField = Object.fromEntries(Object.entries(fields).map(([k, v]) => [v, k]));
    this.primaryName = primaryName;
    this.nameFrom = nameFrom;
  }

  /** Mirrors DataverseStore.buildName — see the note there. */
  private buildName(record: Row): string | undefined {
    if (!this.primaryName) return undefined;
    const parts = this.nameFrom
      .map((field) => record[field])
      .filter((v) => v !== undefined && v !== null && v !== "")
      .map((v) => String(v));
    if (parts.length === 0) return undefined;
    return parts.join(" · ").slice(0, 100);
  }

  private async request<R>(path: string, init: RequestInit = {}): Promise<R | null> {
    const token = await getDataverseToken();
    const res = await fetch(`${DATAVERSE_URL}/api/data/v9.2/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        // Formatted values carry the display text for lookups and choices,
        // which is what the screens show.
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue",return=representation',
        ...(init.headers ?? {}),
      },
    });

    if (res.status === 204) return null;
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(payload?.error?.message ?? `${res.status} ${res.statusText}`);
    }
    return payload as R;
  }

  /** Dataverse record -> app record. Mirrors DataverseStore.toApp. */
  private toApp(record: Row): T {
    const out: Row = {};
    for (const [column, value] of Object.entries(record)) {
      if (column === this.primaryKey) continue;

      const formatted = column.match(
        /^(_.+_value|.+)@OData\.Community\.Display\.V1\.FormattedValue$/
      );
      if (formatted) {
        const field = this.toField[formatted[1]];
        if (field) out[field] = value;
        continue;
      }
      if (column.startsWith("@") || column.includes("@odata") || column.includes("@OData")) continue;

      const field = this.toField[column] ?? column;
      if (out[field] === undefined) out[field] = value;
    }
    out.id = String(record[this.primaryKey] ?? "");
    return out as unknown as T;
  }

  /** App record -> Dataverse record. Never sends the key or unknown fields. */
  private toDataverse(record: Row): Row {
    const out: Row = {};
    for (const [field, value] of Object.entries(record)) {
      if (field === "id" || field === this.primaryKey) continue;
      if (value === undefined) continue;
      const column = this.toColumn[field] ?? field;
      if (!column.startsWith("bv_")) continue;
      out[column] = value;
    }
    return out;
  }

  async getAll(options?: QueryOptions): Promise<T[]> {
    const params: string[] = [];

    const filters: string[] = [];
    for (const [key, value] of Object.entries(options?.filter ?? {})) {
      if (value === undefined || value === null) continue;
      const column = this.toColumn[key] ?? key;
      filters.push(
        typeof value === "string"
          ? `${column} eq '${value.replace(/'/g, "''")}'`
          : `${column} eq ${String(value)}`
      );
    }
    if (filters.length) params.push(`$filter=${encodeURIComponent(filters.join(" and "))}`);

    if (options?.orderBy) {
      const desc = options.orderBy.startsWith("-");
      const key = desc ? options.orderBy.slice(1) : options.orderBy;
      const column = this.toColumn[key] ?? key;
      params.push(`$orderby=${encodeURIComponent(`${column}${desc ? " desc" : ""}`)}`);
    }
    if (options?.top) params.push(`$top=${options.top}`);

    const query = params.length ? `?${params.join("&")}` : "";
    const data = await this.request<{ value: Row[] }>(`${this.entitySet}${query}`);
    let rows = (data?.value ?? []).map((r) => this.toApp(r));

    // Free-text search stays client-side: it spans arbitrary columns, which
    // OData cannot express without knowing their types.
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
      const data = await this.request<Row>(`${this.entitySet}(${id})`);
      return data ? this.toApp(data) : null;
    } catch {
      return null;
    }
  }

  async create(record: Omit<T, "id">): Promise<T> {
    const payload = this.toDataverse(record as Row);
    if (this.primaryName && !payload[this.primaryName]) {
      const name = this.buildName(record as Row);
      if (name) payload[this.primaryName] = name;
    }
    const data = await this.request<Row>(this.entitySet, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return this.toApp(data ?? {});
  }

  async update(id: string, changes: Partial<T>): Promise<T> {
    const data = await this.request<Row>(`${this.entitySet}(${id})`, {
      method: "PATCH",
      body: JSON.stringify(this.toDataverse(changes as Row)),
    });
    return this.toApp(data ?? {});
  }

  async delete(id: string): Promise<void> {
    await this.request(`${this.entitySet}(${id})`, { method: "DELETE" });
  }

  async count(): Promise<number> {
    const data = await this.request<{ "@odata.count": number }>(
      `${this.entitySet}?$count=true&$top=1`
    );
    return data?.["@odata.count"] ?? 0;
  }
}
