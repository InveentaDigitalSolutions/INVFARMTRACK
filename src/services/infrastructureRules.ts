/**
 * The rules that decide what a season, a field and a bed may be called, and
 * how many of each can exist.
 *
 * These were all free text before, which is how the nursery ended up with
 * fields called "Plot E3" while everyone says "E3", and why nothing stopped a
 * bed being numbered past the end of its field or a basket being put at
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
 * Baskets hang on cables above a ground row, up to three levels, and are
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
  /** 0 for a ground bed, 1 or 2 for a basket above it. */
  level: number;
}

/**
 * Reads a bed name back apart. Both shapes have to be handled by one parser:
 * treating the trailing "-1" of a basket as its row would put E3-01-1 in
 * row 1 and E3-12-3 in row 3, quietly corrupting every count per row.
 */
export function parseBedName(name: string): ParsedBed | null {
  // Two digits or more: row numbers are padded to two, but a field with a
  // hundred rows would produce "E3-100" and a fixed \d{2} would refuse to
  // parse it — silently dropping every bed past 99 from position counts.
  const match = /^(.+?)-(\d{2,})(?:-([1-2]))?$/.exec(String(name ?? "").trim());
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
 * does not stop a basket hanging above it, and a basket on level 1 does
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
 * be. Baskets are pots hanging on cables above it, so 0 is the one level they
 * cannot be.
 */
export function levelsFor(type: string | undefined): string[] {
  // Never "3": that height carries the irrigation line, not a bed.
  return type === "Ground" ? ["0"] : ["1", "2"];
}

/** A bed's type follows from its level, and nothing else. */
export function typeForLevel(level: number | string | undefined): "Ground" | "Basket" | undefined {
  const value = Number(level);
  if (!Number.isFinite(value)) return undefined;
  return value === 0 ? "Ground" : "Basket";
}

/** The level a bed of this type should default to. */
export function defaultLevel(type: string | undefined): string {
  return type === "Ground" ? "0" : "1";
}

export function levelProblem(type: string | undefined, level: string | number | undefined): string | null {
  const value = String(level ?? "");
  if (!type || !value) return null;
  if (type === "Ground" && value !== "0") return "A ground bed is planted in the earth, so it is always level 0.";
  if (type === "Basket" && value === "0") return "A basket hangs above the ground, so it cannot be level 0.";
  // Three cable lines are strung above each row, but the top one carries the
  // irrigation, so only the first two ever hold a bed.
  if (type === "Basket" && value === "3") return "Level 3 carries the irrigation line, not a bed. Baskets go up to level 2.";
  return null;
}

export interface BulkBedRequest {
  field: FieldLike | undefined;
  level: number;
  fromRow: number;
  toRow: number;
  existing: BedLike[];
  shadehouse?: ShadehouseLike;
}

export interface BulkBedPlan {
  /** Names that would be created, in row order. */
  create: string[];
  /** Rows skipped because a bed is already there at this level. */
  alreadyThere: number[];
  /** Rows past the end of the field. */
  outOfRange: number[];
  /** Why nothing can be created, when that is the case. */
  problem?: string;
}

/**
 * Works out which beds a bulk request would actually create.
 *
 * Baskets come in runs — a cable spans rows 1 to 20 of a field — so entering
 * them one at a time is a hundred clicks for something better said once. The
 * plan is returned rather than acted on so the form can show exactly what will
 * happen before anything is written: which rows are new, which already have a
 * bed at that level, and which fall off the end of the field.
 */
export function planBulkBeds(request: BulkBedRequest): BulkBedPlan {
  const { field, level, fromRow, toRow, existing, shadehouse } = request;

  const empty: BulkBedPlan = { create: [], alreadyThere: [], outOfRange: [] };
  if (!field?.name) return { ...empty, problem: "Choose a field." };
  if (!field.rows || field.rows < 1) {
    return { ...empty, problem: `${field.name} has no row count recorded, so its beds cannot be numbered.` };
  }
  if (!Number.isFinite(fromRow) || !Number.isFinite(toRow) || fromRow < 1 || toRow < 1) {
    return { ...empty, problem: "Give a first and last row." };
  }
  if (toRow < fromRow) return { ...empty, problem: "The last row comes before the first." };
  if (level < 0 || level > 2) return { ...empty, problem: "Levels run from 0 to 2 — level 3 is the irrigation line." };

  const taken = new Set(
    existing
      .map((b) => parseBedName(String(b.name ?? "")))
      .filter((p): p is ParsedBed => p !== null && p.field === field.name && p.level === level)
      .map((p) => p.row)
  );

  const create: string[] = [];
  const alreadyThere: number[] = [];
  const outOfRange: number[] = [];
  for (let row = fromRow; row <= toRow; row++) {
    if (row > field.rows) { outOfRange.push(row); continue; }
    if (taken.has(row)) { alreadyThere.push(row); continue; }
    create.push(bedName(field.name, row, level));
  }

  // Checked against the whole batch, not one bed at a time, and in positions
  // rather than records — a run of baskets over existing rows takes no new
  // ground and must not be refused for capacity.
  const capacity = bedCapacityProblem(shadehouse, existing, create);
  if (capacity) return { create: [], alreadyThere, outOfRange, problem: capacity };
  if (create.length === 0 && !alreadyThere.length && !outOfRange.length) {
    return { ...empty, problem: "That range covers no rows." };
  }
  return { create, alreadyThere, outOfRange };
}

/**
 * How many bed positions are occupied — field and row pairs, counted once.
 *
 * A shadehouse's capacity is a number of positions on the ground, not a number
 * of bed records. E3 row 33 is one position whether it carries a ground bed
 * alone or a ground bed with three baskets stacked above it; the cables use
 * the same floor. Counting records instead made a shadehouse of 120 positions
 * look full the moment the ground beds existed, refusing every basket.
 *
 * Production treats each level as its own bed — a planting goes in E3-01-2,
 * not in "E3-01" — which is why they are separate records. Only the capacity
 * question is about positions.
 */
export function positionCount(beds: BedLike[]): number {
  const positions = new Set<string>();
  for (const bed of beds) {
    const parsed = parseBedName(String(bed.name ?? ""));
    if (parsed) positions.add(`${parsed.field}-${parsed.row}`);
  }
  return positions.size;
}

/** The positions a set of bed names would occupy. */
export function positionsOf(names: string[]): Set<string> {
  const positions = new Set<string>();
  for (const name of names) {
    const parsed = parseBedName(name);
    if (parsed) positions.add(`${parsed.field}-${parsed.row}`);
  }
  return positions;
}

/**
 * Whether another bed will fit. Only a bed on new ground counts against the
 * shadehouse; one stacked above a row already in use does not.
 */
export function bedCapacityProblem(
  shadehouse: ShadehouseLike | undefined,
  beds: BedLike[],
  adding: string[] = []
): string | null {
  if (!shadehouse?.capacity) return null;

  const occupied = new Set<string>();
  for (const bed of beds) {
    const parsed = parseBedName(String(bed.name ?? ""));
    if (parsed) occupied.add(`${parsed.field}-${parsed.row}`);
  }
  const newPositions = [...positionsOf(adding)].filter((p) => !occupied.has(p)).length;
  if (newPositions === 0) return null;

  const after = occupied.size + newPositions;
  return after > shadehouse.capacity
    ? `${shadehouse.name} has room for ${shadehouse.capacity} bed positions and ${occupied.size} are in use. ` +
      `This would need ${newPositions} more.`
    : null;
}

/** What a run-update would touch, before it touches it. */
export interface BedUpdatePlan {
  /** Bed names that match the range and will be patched. */
  match: string[];
  /** Rows in the range with no bed at that level. */
  missing: number[];
  /** Rows past the end of the field. */
  outOfRange: number[];
  problem?: string;
}

export interface BedUpdateRequest {
  field: FieldLike | undefined;
  /** A single level, or undefined for every level over those rows. */
  level?: number;
  fromRow: number;
  toRow: number;
  existing: BedLike[];
}

/**
 * Which beds a change to a run would touch.
 *
 * Shade is recorded per bed but strung over whole runs, so setting it one bed
 * at a time across a nursery of 120 is not a real option. The same is true of
 * soil, drainage and irrigation — they were only ever settable at creation,
 * which left no way to correct them afterwards.
 *
 * This only finds the beds. What changes about them is the caller's business,
 * so one plan serves every attribute.
 */
export function planBedUpdate(request: BedUpdateRequest): BedUpdatePlan {
  const { field, level, fromRow, toRow, existing } = request;
  const empty: BedUpdatePlan = { match: [], missing: [], outOfRange: [] };

  if (!field?.name) return { ...empty, problem: "Choose a field." };
  if (!Number.isFinite(fromRow) || !Number.isFinite(toRow) || fromRow < 1 || toRow < 1) {
    return { ...empty, problem: "Give a first and last row." };
  }
  if (toRow < fromRow) return { ...empty, problem: "The last row comes before the first." };
  if (level !== undefined && (level < 0 || level > 3)) {
    return { ...empty, problem: "Levels run from 0 to 3." };
  }

  const parsed = existing
    .map((b) => ({ name: String(b.name ?? ""), at: parseBedName(String(b.name ?? "")) }))
    .filter((b): b is { name: string; at: ParsedBed } => b.at !== null && b.at.field === field.name);

  const match: string[] = [];
  const missing: number[] = [];
  const outOfRange: number[] = [];

  for (let row = fromRow; row <= toRow; row++) {
    if (field.rows && row > field.rows) { outOfRange.push(row); continue; }
    const here = parsed.filter((b) => b.at.row === row && (level === undefined || b.at.level === level));
    if (here.length === 0) { missing.push(row); continue; }
    match.push(...here.map((b) => b.name));
  }

  if (match.length === 0 && !missing.length && !outOfRange.length) {
    return { ...empty, problem: "That range covers no rows." };
  }
  // Sorted so "E3-02" follows "E3-01" rather than "E3-10".
  match.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return { match, missing, outOfRange };
}
