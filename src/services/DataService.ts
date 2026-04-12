/**
 * DataService — Abstraction layer for CRUD operations.
 *
 * In local dev: uses in-memory store with localStorage persistence.
 * In Power Apps: will use @microsoft/power-apps Dataverse client.
 *
 * This pattern lets us:
 * 1. Develop and test locally without Dataverse
 * 2. Seed sample data for demos
 * 3. Swap to Dataverse with zero page-level changes
 */

export interface QueryOptions {
  filter?: Record<string, unknown>;
  orderBy?: string;
  top?: number;
  search?: string;
}

export interface DataStore<T extends Record<string, unknown>> {
  getAll(options?: QueryOptions): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(record: Omit<T, "id">): Promise<T>;
  update(id: string, changes: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}

// Generate unique IDs
let counter = Date.now();
function generateId(): string {
  return `rec-${(counter++).toString(36)}`;
}

/**
 * LocalStore — In-memory store with localStorage persistence.
 * Used during local development.
 */
export class LocalStore<T extends Record<string, unknown>> implements DataStore<T> {
  private data: Map<string, T>;
  private storageKey: string;

  constructor(tableName: string, seedData: T[] = []) {
    this.storageKey = `dni_${tableName}`;

    // Try to load from localStorage
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as T[];
        this.data = new Map(parsed.map((r) => [(r as any).id || generateId(), r]));
      } catch {
        this.data = new Map();
      }
    } else {
      // Seed with initial data
      this.data = new Map(
        seedData.map((r) => {
          const id = (r as any).id || generateId();
          return [id, { ...r, id }];
        })
      );
      this.persist();
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(Array.from(this.data.values())));
    } catch {
      // localStorage full or unavailable — silent fail
    }
  }

  async getAll(options?: QueryOptions): Promise<T[]> {
    let results = Array.from(this.data.values());

    // Search across all string fields
    if (options?.search) {
      const q = options.search.toLowerCase();
      results = results.filter((r) =>
        Object.values(r).some(
          (v) => v != null && typeof v === "string" && v.toLowerCase().includes(q)
        )
      );
    }

    // Filter by exact match
    if (options?.filter) {
      results = results.filter((r) =>
        Object.entries(options.filter!).every(([key, val]) => r[key] === val)
      );
    }

    // Order by
    if (options?.orderBy) {
      const key = options.orderBy.replace(/^-/, "");
      const desc = options.orderBy.startsWith("-");
      results.sort((a, b) => {
        const va = String(a[key] ?? "");
        const vb = String(b[key] ?? "");
        return desc ? vb.localeCompare(va) : va.localeCompare(vb);
      });
    }

    // Top N
    if (options?.top) {
      results = results.slice(0, options.top);
    }

    return results;
  }

  async getById(id: string): Promise<T | null> {
    return this.data.get(id) || null;
  }

  async create(record: Omit<T, "id">): Promise<T> {
    const id = generateId();
    const newRecord = { ...record, id } as T;
    this.data.set(id, newRecord);
    this.persist();
    return newRecord;
  }

  async update(id: string, changes: Partial<T>): Promise<T> {
    const existing = this.data.get(id);
    if (!existing) throw new Error(`Record ${id} not found`);
    const updated = { ...existing, ...changes, id };
    this.data.set(id, updated);
    this.persist();
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
    this.persist();
  }

  async count(): Promise<number> {
    return this.data.size;
  }

  /** Reset to seed data (useful for demos) */
  reset(seedData: T[]): void {
    this.data = new Map(
      seedData.map((r) => {
        const id = (r as any).id || generateId();
        return [id, { ...r, id }];
      })
    );
    this.persist();
  }
}
