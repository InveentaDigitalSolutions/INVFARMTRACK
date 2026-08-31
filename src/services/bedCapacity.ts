/**
 * How many plants a bed holds, from the variety's density and the bed's size.
 *
 * It used to be one number typed per variety — "plants per bed". The beds are
 * not the same size: an E row is 1.20 x 37.20 m and a C row 1.80 x 37.20, so a
 * C row is exactly one and a half times an E row and a single count was wrong
 * by fifty per cent for half the nursery.
 *
 * Density fixes that, and it has to be two different densities because the two
 * kinds of bed have different shapes:
 *
 * - A **ground bed** is an area. Plants per square metre times its area.
 * - A **basket** is a cable. Pots hang along it at a spacing, so it is plants
 *   per metre times its length — there is no width to multiply by.
 *
 * Getting that wrong in the other direction, by putting baskets on a per-square
 * metre figure, would make a basket's capacity depend on a width it does not
 * have.
 */

import { plotConfigs } from "./shadehouseLayout";

export interface PlantDensity {
  /** Plants per square metre on the ground. */
  plantsPerSqM?: number;
  /** Plants per metre of cable in a basket. */
  plantsPerCableM?: number;
}

export interface BedGeometry {
  widthM: number;
  lengthM: number;
}

/** The measured size of a row in a given field, or null if the field is unknown. */
export function geometryOf(fieldId: string): BedGeometry | null {
  const plot = plotConfigs.find((p) => p.id === fieldId);
  return plot ? { widthM: plot.bedWidth, lengthM: plot.bedLength } : null;
}

const positive = (n: unknown): number | undefined => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : undefined;
};

/**
 * Capacity of one ground row of a field.
 *
 * Null rather than zero when the density is not recorded: zero is a claim that
 * the bed holds nothing, and an availability figure built on it would be a
 * confident lie.
 */
export function groundCapacity(plant: PlantDensity | undefined, fieldId: string): number | null {
  const density = positive(plant?.plantsPerSqM);
  const geometry = geometryOf(fieldId);
  if (density === undefined || !geometry) return null;
  return Math.round(density * geometry.widthM * geometry.lengthM);
}

/**
 * Capacity of one cable in a field. A cable runs the length of the row it hangs
 * over, so the length is the bed's length and the width plays no part.
 */
export function cableCapacity(plant: PlantDensity | undefined, fieldId: string): number | null {
  const density = positive(plant?.plantsPerCableM);
  const geometry = geometryOf(fieldId);
  if (density === undefined || !geometry) return null;
  return Math.round(density * geometry.lengthM);
}

export interface FieldCapacity {
  fieldId: string;
  widthM: number;
  lengthM: number;
  areaSqM: number;
  rows: number;
  /** One row, and the whole field. Null where the density is not recorded. */
  perRow: number | null;
  perField: number | null;
}

/**
 * What a density means across the nursery, field by field — shown beside the
 * density on the form so a number typed once can be sanity-checked against the
 * beds it will be applied to.
 */
export function capacityByField(
  plant: PlantDensity | undefined,
  kind: "ground" | "basket" = "ground"
): FieldCapacity[] {
  return plotConfigs.map((plot) => {
    const perRow = kind === "ground"
      ? groundCapacity(plant, plot.id)
      : cableCapacity(plant, plot.id);
    return {
      fieldId: plot.id,
      widthM: plot.bedWidth,
      lengthM: plot.bedLength,
      areaSqM: Number((plot.bedWidth * plot.bedLength).toFixed(2)),
      rows: plot.bedCount,
      perRow,
      perField: perRow === null ? null : perRow * plot.bedCount,
    };
  });
}
