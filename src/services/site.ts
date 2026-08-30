/**
 * Where the nursery is, and which way it faces.
 *
 * Both are read off the topographic survey rather than typed from memory, and
 * both matter for the same reason: the sun. Light per bed depends on where the
 * sun is, and where the sun is depends on the site's latitude, longitude and
 * the compass bearing the beds run along.
 *
 * Derivation, so it can be checked rather than trusted:
 *
 * **Position.** The survey plots one control monument and prints its
 * coordinates beside it — NORTE 1656178.8321, ESTE 397522.0134, ELEV 563.899.
 * Those are UTM zone 16N metres, converted here to degrees. The app previously
 * used -87.85, about 11 km east of the nursery, which was a guess.
 *
 * **Bearing.** The sheet's compass needle is drawn exactly along the page axis,
 * so north on the sheet is unambiguous. The bed grid inside "Viveros
 * Existentes" resolves into two perpendicular families — 70 lines run one way
 * and 139 the other — and the 70 are the bed runs. They sit 18° off north.
 *
 * So the beds do **not** run true north-south. They run N17.8°W, and at this
 * latitude that is enough to move the morning and afternoon shade pattern.
 *
 * This says nothing about the layout, which comes from the nursery's own plan
 * (`shadehouseLayout.ts`). Orientation is not layout.
 */

/** Degrees north, from the survey's control monument. */
export const SITE_LAT = 14.9786;
/** Degrees east — negative, so west. */
export const SITE_LON = -87.9531;
/** Metres above sea level at that monument. */
export const SITE_ELEV_M = 563.899;

/** Honduras keeps UTC-6 all year; there is no summer time. */
export const SITE_UTC_OFFSET_H = -6;

/**
 * The compass bearing a bed's length runs along, in degrees clockwise from
 * true north. 342.25° is N17.75°W; the far end of the same bed is 162.25°.
 *
 * Grid north on the survey is 0.25° west of true north at this longitude
 * (the UTM convergence), which is already applied.
 */
export const BED_AXIS_BEARING_DEG = 342.25;

/** The across-beds direction, perpendicular to the runs. */
export const CROSS_AXIS_BEARING_DEG = 72.25;

/**
 * How far the whole block is rotated from true north, signed the way a compass
 * turns. Negative because the beds lean west of north.
 */
export const BLOCK_ROTATION_DEG = BED_AXIS_BEARING_DEG - 360;

/**
 * A bearing in the real world, expressed in the 3D model's own frame.
 *
 * The model draws beds along its Z axis and calls that north, which is 17.75°
 * out. Anything that has to point at the real sun — or at real north — goes
 * through here.
 */
export function bearingToModel(bearingDeg: number): number {
  return ((bearingDeg - BED_AXIS_BEARING_DEG) % 360 + 360) % 360;
}
