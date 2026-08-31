/**
 * How long a variety takes, given when it was planted.
 *
 * Two things this has been wrong about, both corrected here.
 *
 * It began as one number for the whole year, which the nursery's own figures
 * contradict: the same cutting reaches its target in 8-10 weeks between March
 * and August and 10-12 between September and February. Measured daylight
 * explains it — 45.3 mol/m² a day in the bright half against 34.7 in the dark —
 * and the two seasons come out within 7% of the same accumulated light.
 *
 * Then it lived as columns on the plant named "weeks to 8 leaves". Most
 * varieties are grown to eight; some are grown to three. A column with the
 * stage in its name cannot hold that, so the stage is a field and the figures
 * live in their own table.
 *
 * And now there is one row per variety rather than two. The season is not
 * recorded because it is *measured*: 731 days of radiation say what light each
 * bed actually received, so a planting in the dark half reaches its stage later
 * on its own. Recording it twice as well would be two numbers that can
 * disagree — and the typed pair would win over the measurement, which is
 * exactly backwards.
 *
 * The weeks entered are read as "in a normal year"; `readyOn` in
 * growthProgress.ts turns them into the light that implies, and then into a
 * date from the light that actually fell.
 */

/** The two halves of the year the nursery plans in. */
export type Season = "Mar-Aug" | "Sep-Feb";

export function seasonOf(date: Date | string): Season {
  const month = typeof date === "string" ? Number(date.slice(5, 7)) : date.getUTCMonth() + 1;
  return month >= 3 && month <= 8 ? "Mar-Aug" : "Sep-Feb";
}

/** One row of the phenology table. */
export interface PhenologyRow {
  plant?: string;
  /** The leaf count this variety is grown to. Eight for most, three for some. */
  targetLeaves?: number;
  growthWeeksMin?: number;
  growthWeeksMax?: number;
  harvestWeeks?: number;
  pruneToLeaves?: number;
  pruningWeeks?: number;
}

export interface GrowthWeeks {
  min: number;
  max: number;
  /** The middle of the range, for anything that needs one number. */
  expected: number;
  /** What "grown" means for this variety, when it is recorded. */
  targetLeaves?: number;
}

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const same = (a: unknown, b: unknown) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/** The row for a variety, or null. */
export function rowFor(rows: PhenologyRow[], plant: string | undefined): PhenologyRow | null {
  if (!plant) return null;
  return rows.find((r) => same(r.plant, plant)) ?? null;
}

/**
 * Weeks from planting to the variety's own target stage, for the season the
 * planting falls in.
 *
 * Null when nothing is recorded. A bed whose cycle is unknown can only be
 * called growing; inventing a number would send someone out to cut it.
 */
export function growthWeeks(
  rows: PhenologyRow[],
  plant: string | undefined
): GrowthWeeks | null {
  const row = rowFor(rows, plant);
  if (!row) return null;

  const min = num(row.growthWeeksMin);
  const max = num(row.growthWeeksMax);
  // Either end alone is usable: half a range still schedules, and refusing on
  // it helps nobody.
  const lo = min ?? max;
  const hi = max ?? min;
  if (lo === undefined || hi === undefined) return null;

  return { min: lo, max: hi, expected: (lo + hi) / 2, targetLeaves: num(row.targetLeaves) };
}

/** Weeks between cuts once the plant is at its target stage. */
export function harvestInterval(rows: PhenologyRow[], plant: string | undefined): number | null {
  return num(rowFor(rows, plant)?.harvestWeeks) ?? null;
}

/** Weeks to grow back from the pruned stage to the target one. */
export function pruningRecovery(rows: PhenologyRow[], plant: string | undefined): number | null {
  return num(rowFor(rows, plant)?.pruningWeeks) ?? null;
}

/**
 * "8 leaves", or "3 leaves", or nothing when it is not recorded — for a screen
 * that wants to say what it is counting towards rather than assume.
 */
export function stageLabel(row: PhenologyRow | null): string | null {
  const n = num(row?.targetLeaves);
  return n === undefined ? null : `${n} ${n === 1 ? "leaf" : "leaves"}`;
}
