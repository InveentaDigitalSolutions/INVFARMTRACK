/**
 * How many plants a bed holds, from the variety's density and the bed's size.
 *
 * It used to be one number typed per variety — "plants per bed". The beds are
 * not the same size: an E row is 1.20 x 37.20 m and a C row 1.80 x 37.20, so a
 * C row is exactly one and a half times an E row and a single count was wrong
 * by fifty per cent for half the nursery.
 *
 * Density fixes that, and it is ONE density everywhere — plants per square
 * metre, which the nursery counts when it plants. What differs is the area it
 * is multiplied by:
 *
 * - A **ground row** is one rectangle: its width by its length.
 * - A **cable** is a series of small ones: the area of a basket, times the
 *   number of baskets hanging on it.
 *
 * An earlier version asked for a second density per metre of cable. That was
 * wrong: it treated a cable as a line, when a basket has an area of its own and
 * the same density applies inside it.
 */

import { plotConfigs } from "./shadehouseLayout";

export interface PlantDensity {
  /** Plants per square metre, counted when planting. The only density there is. */
  plantsPerSqM?: number;
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

/** A size of hanging basket, as recorded in Basket Sizes. */
export interface BasketSize {
  name?: string;
  /** Across the top, in centimetres. */
  widthCm?: number;
  shape?: string;
  /** Counted, not derived from a spacing — the nursery knows it directly. */
  basketsPerCable?: number;
}

/**
 * The planting area of one basket, in square metres.
 *
 * A round basket only uses the circle inside its width; a square one uses the
 * whole square. Null when the size has not been measured — an assumed shape
 * would change every capacity by a fifth without saying so.
 */
export function basketAreaSqM(size: BasketSize | undefined): number | null {
  const cm = positive(size?.widthCm);
  if (cm === undefined) return null;
  const m = cm / 100;
  return String(size?.shape).toLowerCase() === "square"
    ? m * m
    : Math.PI * (m / 2) ** 2;
}

/**
 * Capacity of one cable: the density for THAT basket size, over the area of the
 * baskets, times how many hang on the cable.
 *
 * Every part comes from a recorded figure. Null if any is missing, because a
 * capacity assembled from a guess reads exactly like one that is measured.
 */
export function cableCapacity(
  plantsPerSqM: number | undefined,
  size: BasketSize | undefined
): number | null {
  const density = positive(plantsPerSqM);
  const area = basketAreaSqM(size);
  const perCable = positive(size?.basketsPerCable);
  if (density === undefined || area === null || perCable === undefined) return null;
  return Math.round(density * area * perCable);
}

/** What one basket of this size holds for this variety. */
export function basketCapacity(
  plantsPerSqM: number | undefined,
  size: BasketSize | undefined
): number | null {
  const density = positive(plantsPerSqM);
  const area = basketAreaSqM(size);
  if (density === undefined || area === null) return null;
  return Math.round(density * area);
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
export function capacityByField(plant: PlantDensity | undefined): FieldCapacity[] {
  return plotConfigs.map((plot) => {
    const perRow = groundCapacity(plant, plot.id);
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
