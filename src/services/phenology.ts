/**
 * How long a variety takes, given when it was planted.
 *
 * `bv_WeeksToFirstHarvest` used to answer this with one number for the whole
 * year, which the nursery's own figures say is wrong: the same cutting reaches
 * eight leaves in 8-10 weeks between March and August and 10-12 between
 * September and February. Measured daylight here explains it — 45.3 mol/m2 a
 * day in the bright half against 34.7 in the dark — and the two seasons come
 * out to within 7% of the same accumulated light.
 *
 * So the season is not a detail to average away. It is the difference between
 * promising stock in November and having it.
 */

import type { PhenologyPlant } from "./rowTypes.helpers";

/** March to August is the bright half; September to February the dark one. */
export type Season = "Mar-Aug" | "Sep-Feb";

export function seasonOf(date: Date | string): Season {
  const month =
    typeof date === "string"
      ? Number(date.slice(5, 7))
      : date.getUTCMonth() + 1;
  return month >= 3 && month <= 8 ? "Mar-Aug" : "Sep-Feb";
}

export interface GrowthWeeks {
  /** Fastest and slowest the variety reaches 8 leaves, in weeks. */
  min: number;
  max: number;
  /** The middle of that range, for anything that needs one number. */
  expected: number;
  season: Season;
}

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * Weeks from planting to first cut, for the season the planting falls in.
 *
 * Returns null when the variety has no figures recorded. That is deliberate: a
 * bed whose cycle is unknown can only be called "growing", and inventing a
 * number would have the nursery going out to cut it.
 */
export function growthWeeks(
  plant: PhenologyPlant | undefined,
  plantedOn: Date | string
): GrowthWeeks | null {
  if (!plant) return null;
  const season = seasonOf(plantedOn);

  const min = num(season === "Mar-Aug" ? plant.growthWeeksMinMarAug : plant.growthWeeksMinSepFeb);
  const max = num(season === "Mar-Aug" ? plant.growthWeeksMaxMarAug : plant.growthWeeksMaxSepFeb);

  // Either end alone is enough to work with; a range needs only one number to
  // be usable, and half a figure is better than refusing to schedule at all.
  const lo = min ?? max;
  const hi = max ?? min;
  if (lo === undefined || hi === undefined) return null;

  return { min: lo, max: hi, expected: (lo + hi) / 2, season };
}

/** Weeks between harvests once the plant is at 8 leaves. */
export function harvestInterval(
  plant: PhenologyPlant | undefined,
  on: Date | string
): number | null {
  if (!plant) return null;
  const season = seasonOf(on);
  return num(season === "Mar-Aug" ? plant.harvestWeeksMarAug : plant.harvestWeeksSepFeb) ?? null;
}

/** Weeks to recover after pruning back to two leaves. */
export function pruningRecovery(
  plant: PhenologyPlant | undefined,
  on: Date | string
): number | null {
  if (!plant) return null;
  const season = seasonOf(on);
  return num(season === "Mar-Aug" ? plant.pruningWeeksMarAug : plant.pruningWeeksSepFeb) ?? null;
}
