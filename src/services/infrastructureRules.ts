/**
 * The rules that decide what a season, a field and a bed may be called, and
 * how many of each can exist.
 *
 * These were all free text before, which is how the nursery ended up with
 * fields called "Plot E3" while everyone says "E3", and why nothing stopped a
 * bed being numbered past the end of its field or an air bed being put at
 * ground level.
 */

export interface SeasonLike {
  id?: string;
  name?: string;
  start?: string;
}

export interface FieldLike {
  id?: string;
  name?: string;
  shadehouse?: string;
  /** How many bed rows the field physically has. */
  rows?: number;
}

export interface BedLike {
  id?: string;
  name?: string;
  field?: string;
  type?: string;
  level?: string | number;
}

export interface ShadehouseLike {
  id?: string;
  name?: string;
  /** The most beds this shadehouse holds. */
  capacity?: number;
  /** The most fields it is laid out for. */
  fieldCapacity?: number;
}

/* ---------------------------------------------------------------- seasons */

/**
 * The name for a new season: the year it starts in, then its number within
 * that year. 2026-S1 is followed by 2026-S2, and a season starting in 2027
 * begins again at 2027-S1.
 *
 * Counting existing seasons is not enough — if 2026-S2 were deleted the next
 * one would be named 2026-S2 again, colliding with nothing but reading as a
 * repeat. The highest number already used is what matters.
 */
export function nextSeasonName(startDate: string, existing: SeasonLike[]): string {
  const year = String(startDate).slice(0, 4);
  if (!/^\d{4}$/.test(year)) return "";

  const highest = existing.reduce((max, season) => {
    const match = /^(\d{4})-S(\d+)$/.exec(String(season.name ?? ""));
    if (!match || match[1] !== year) return max;
    return Math.max(max, Number(match[2]));
  }, 0);

  return `${year}-S${highest + 1}`;
}

/* ----------------------------------------------------------------- fields */

/** A field name is free text, but it has to be unique within its shadehouse. */
export function fieldNameProblem(
  name: string,
  shadehouse: string,
  existing: FieldLike[],
  selfId?: string
): string | null {
  const clean = name.trim();
  if (!clean) return "Give the field a name.";
  const clash = existing.find(
    (f) =>
      f.id !== selfId &&
      f.shadehouse === shadehouse &&
      String(f.name ?? "").trim().toLowerCase() === clean.toLowerCase()
  );
  return clash ? `${shadehouse} already has a field called ${clean}.` : null;
}

/** Whether another field will fit in the shadehouse. */
export function fieldCapacityProblem(
  shadehouse: ShadehouseLike | undefined,
  existing: FieldLike[]
): string | null {
  if (!shadehouse?.fieldCapacity) return null;
  const used = existing.filter((f) => f.shadehouse === shadehouse.name).length;
  return used >= shadehouse.fieldCapacity
    ? `${shadehouse.name} is laid out for ${shadehouse.fieldCapacity} fields and already has ${used}.`
    : null;
}

/* ------------------------------------------------------------------- beds */

/**
 * How a bed is named.
 *
 * A field's rows are its ground beds: E3 row 1 is "E3-01", always level 0.
 * Air beds hang on cables above a ground row, up to three levels, and are
 * named for the row they sit over: "E3-01-1", "E3-01-2", "E3-01-3". Not every
 * row has air above it — the cables cover part of a field, not all of it — so
 * which rows do is recorded, never derived.
 */
export function bedName(fieldName: string, row: number, level: number = 0): string {
  if (!fieldName || !Number.isFinite(row) || row < 1) return "";
  const ground = `${fieldName}-${String(row).padStart(2, "0")}`;
  return level > 0 ? `${ground}-${level}` : ground;
}

export interface ParsedBed {
  field: string;
  row: number;
  /** 0 for a ground bed, 1-3 for an air bed above it. */
  level: number;
}

/**
 * Reads a bed name back apart. Both shapes have to be handled by one parser:
 * treating the trailing "-1" of an air bed as its row would put E3-01-1 in
 * row 1 and E3-12-3 in row 3, quietly corrupting every count per row.
 */
export function parseBedName(name: string): ParsedBed | null {
  const match = /^(.+?)-(\d{2})(?:-([1-3]))?$/.exec(String(name ?? "").trim());
  if (!match) return null;
  return { field: match[1], row: Number(match[2]), level: match[3] ? Number(match[3]) : 0 };
}

/** The row number of a bed name, ground or air. */
export function rowOf(name: string): number | null {
  return parseBedName(name)?.row ?? null;
}

/** The level of a bed name; 0 means it sits on the ground. */
export function levelOf(name: string): number | null {
  return parseBedName(name)?.level ?? null;
}

/**
 * The row numbers still free in a field, at the level being added.
 *
 * Bounded by the field's own row count, so a bed cannot be numbered past the
 * end of the field. Levels are counted separately: row 7 having a ground bed
 * does not stop an air bed hanging above it, and an air bed on level 1 does
 * not block level 2.
 */
export function availableRows(
  field: FieldLike | undefined,
  beds: BedLike[],
  level: number = 0
): number[] {
  if (!field?.rows || field.rows < 1) return [];
  const taken = new Set(
    beds
      .map((b) => parseBedName(String(b.name ?? "")))
      .filter((p): p is ParsedBed => p !== null && p.field === field.name && p.level === level)
      .map((p) => p.row)
  );
  const free: number[] = [];
  for (let row = 1; row <= field.rows; row++) if (!taken.has(row)) free.push(row);
  return free;
}

/**
 * The levels a bed of this type may sit at.
 *
 * Ground beds are planted in the earth, so level 0 is the only thing they can
 * be. Air beds are pots hanging on cables above it, so 0 is the one level they
 * cannot be.
 */
export function levelsFor(type: string | undefined): string[] {
  return type === "Ground" ? ["0"] : ["1", "2", "3"];
}

/** A bed's type follows from its level, and nothing else. */
export function typeForLevel(level: number | string | undefined): "Ground" | "Air" | undefined {
  const value = Number(level);
  if (!Number.isFinite(value)) return undefined;
  return value === 0 ? "Ground" : "Air";
}

/** The level a bed of this type should default to. */
export function defaultLevel(type: string | undefined): string {
  return type === "Ground" ? "0" : "1";
}

export function levelProblem(type: string | undefined, level: string | number | undefined): string | null {
  const value = String(level ?? "");
  if (!type || !value) return null;
  if (type === "Ground" && value !== "0") return "A ground bed is planted in the earth, so it is always level 0.";
  if (type === "Air" && value === "0") return "An air bed hangs above the ground, so it cannot be level 0.";
  return null;
}

/** Whether another bed will fit in the shadehouse. */
export function bedCapacityProblem(
  shadehouse: ShadehouseLike | undefined,
  bedCount: number
): string | null {
  if (!shadehouse?.capacity) return null;
  return bedCount >= shadehouse.capacity
    ? `${shadehouse.name} holds ${shadehouse.capacity} beds and already has ${bedCount}.`
    : null;
}
