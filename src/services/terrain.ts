/**
 * The nursery floor, as a surface rather than a plane.
 *
 * The block falls 4 m from one end to the other — 565.0 m at the low corner to
 * 569.0 m at the high one — and the 3D view has been standing it on flat
 * ground. On a nursery that matters: it is the difference between knowing where
 * water leaves a bed and guessing.
 *
 * Heights come off the survey's contours (see terrain.generated.ts). Between
 * samples they are interpolated bilinearly, which is honest for a surface built
 * from 0.50 m contours — it will not invent a dip the survey does not show.
 */

import {
  TERRAIN_M, TERRAIN_ACROSS, TERRAIN_ALONG, TERRAIN_MEAN_M,
  TERRAIN_LOW_M, TERRAIN_HIGH_M,
} from "./terrain.generated";
import { BLOCK_ACROSS_M, BLOCK_ALONG_M } from "./shadehouseLayout";

export { TERRAIN_MEAN_M, TERRAIN_LOW_M, TERRAIN_HIGH_M };

/**
 * Which way round the survey's axes sit against the model's.
 *
 * The survey does not name the fields, so which end carries E3/E1 is Santiago's
 * to confirm. These two flips are the whole of that decision: get them wrong
 * and the slope is mirrored, everything else is unchanged.
 */
const FLIP_ACROSS = false;
const FLIP_ALONG = false;

/** Height above sea level at a point in the model's own coordinates. */
export function elevationAt(x: number, z: number): number {
  // Model space is centred on the block, so shift to 0..1 across each axis.
  let fx = (x + BLOCK_ACROSS_M / 2) / BLOCK_ACROSS_M;
  let fz = (z + BLOCK_ALONG_M / 2) / BLOCK_ALONG_M;
  if (FLIP_ACROSS) fx = 1 - fx;
  if (FLIP_ALONG) fz = 1 - fz;

  // Outside the block the nearest edge is the honest answer: the survey covers
  // the site, but this grid only covers the shadehouse.
  const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const gx = clamp(fx) * (TERRAIN_ACROSS - 1);
  const gz = clamp(fz) * (TERRAIN_ALONG - 1);

  const x0 = Math.floor(gx), z0 = Math.floor(gz);
  const x1 = Math.min(x0 + 1, TERRAIN_ACROSS - 1);
  const z1 = Math.min(z0 + 1, TERRAIN_ALONG - 1);
  const tx = gx - x0, tz = gz - z0;

  const h00 = TERRAIN_M[z0][x0], h10 = TERRAIN_M[z0][x1];
  const h01 = TERRAIN_M[z1][x0], h11 = TERRAIN_M[z1][x1];
  return (
    h00 * (1 - tx) * (1 - tz) +
    h10 * tx * (1 - tz) +
    h01 * (1 - tx) * tz +
    h11 * tx * tz
  );
}

/**
 * Height in the model, where 0 is the mean floor level.
 *
 * The scene is built around a ground plane at y = 0, so the terrain is drawn
 * as a departure from the average rather than 565 m in the air.
 */
export function groundAt(x: number, z: number): number {
  return elevationAt(x, z) - TERRAIN_MEAN_M;
}

/** The fall across the block, for anything that wants to state it. */
export const TERRAIN_FALL_M = Math.round((TERRAIN_HIGH_M - TERRAIN_LOW_M) * 100) / 100;

/** 0 at the lowest point, 1 at the highest — for colouring by height. */
export function elevationFraction(elevation: number): number {
  const span = TERRAIN_HIGH_M - TERRAIN_LOW_M;
  if (span <= 0) return 0.5;
  const t = (elevation - TERRAIN_LOW_M) / span;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
