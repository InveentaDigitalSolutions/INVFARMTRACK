/**
 * The nursery floor, read off the topographic survey.
 *
 * The survey (Topografía CAPAZ, July 2025) contours the ground at 0.50 m from
 * 564.50 m to 568.79 m — the shadehouse floor falls about 3.5 m from its high
 * corner to its low one, which is real and worth seeing on the plan.
 *
 * This module is the arithmetic only: sample a height anywhere on the block,
 * and trace the contours at a given interval. Drawing them is
 * `terrainTexture.ts`.
 *
 * **The layout does not come from here.** The survey is reference for detail;
 * `shadehouseLayout.ts` is the layout. See `dataverse/reference/SURVEY.md`.
 */

import {
  TERRAIN_ACROSS, TERRAIN_ALONG, TERRAIN_M,
  TERRAIN_LOW_M, TERRAIN_HIGH_M,
} from "./terrain.generated";

export { TERRAIN_LOW_M, TERRAIN_HIGH_M };

/** A point on the block in normalised coordinates: 0..1 across, 0..1 along. */
export interface UV { u: number; v: number }

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Height in metres above sea level at a normalised point, bilinearly
 * interpolated between the four surrounding samples. Outside the block the
 * nearest edge is returned rather than an extrapolation, which would invent
 * ground the survey never measured.
 */
export function elevationAt(u: number, v: number): number {
  const x = clamp01(u) * (TERRAIN_ACROSS - 1);
  const y = clamp01(v) * (TERRAIN_ALONG - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, TERRAIN_ACROSS - 1);
  const y1 = Math.min(y0 + 1, TERRAIN_ALONG - 1);
  const fx = x - x0, fy = y - y0;

  const top = TERRAIN_M[y0][x0] * (1 - fx) + TERRAIN_M[y0][x1] * fx;
  const bottom = TERRAIN_M[y1][x0] * (1 - fx) + TERRAIN_M[y1][x1] * fx;
  return top * (1 - fy) + bottom * fy;
}

/** 0 at the lowest surveyed point, 1 at the highest. */
export function relativeHeight(metres: number): number {
  const span = TERRAIN_HIGH_M - TERRAIN_LOW_M;
  return span > 0 ? clamp01((metres - TERRAIN_LOW_M) / span) : 0;
}

/** A straight run of a contour, in normalised block coordinates. */
export interface Segment { u0: number; v0: number; u1: number; v1: number }

export interface Contour {
  /** Metres above sea level. */
  level: number;
  segments: Segment[];
}

/**
 * Trace the contours by marching squares.
 *
 * Each cell of the grid is four corner heights. Which corners sit above the
 * level gives sixteen cases, and the line crosses the cell edges wherever one
 * corner is above and its neighbour below — linearly interpolated, so a level
 * just above a corner produces a crossing right next to it.
 *
 * The two saddle cases (5 and 10, opposite corners above) are genuinely
 * ambiguous: the contour can join either pair. They are resolved by the
 * average of the four corners, which is the standard reading and keeps a
 * ridge from being drawn as a valley.
 */
export function contourSegments(interval = 0.5): Contour[] {
  // Strictly above the floor. A contour drawn at exactly the lowest elevation
  // hugs the single lowest sample and traces a sliver, not a line.
  const first = (Math.floor(TERRAIN_LOW_M / interval) + 1) * interval;
  const out: Contour[] = [];

  for (let level = first; level < TERRAIN_HIGH_M; level += interval) {
    const segments: Segment[] = [];

    for (let y = 0; y < TERRAIN_ALONG - 1; y++) {
      for (let x = 0; x < TERRAIN_ACROSS - 1; x++) {
        // Corners, anticlockwise from top-left, as marching squares numbers them.
        const tl = TERRAIN_M[y][x], tr = TERRAIN_M[y][x + 1];
        const br = TERRAIN_M[y + 1][x + 1], bl = TERRAIN_M[y + 1][x];

        const code =
          (tl > level ? 8 : 0) | (tr > level ? 4 : 0) |
          (br > level ? 2 : 0) | (bl > level ? 1 : 0);
        if (code === 0 || code === 15) continue;

        // Where the level crosses each edge, as a fraction along it.
        const at = (a: number, b: number) => (level - a) / (b - a);
        const top    = { u: x + at(tl, tr), v: y };
        const right  = { u: x + 1, v: y + at(tr, br) };
        const bottom = { u: x + at(bl, br), v: y + 1 };
        const left   = { u: x, v: y + at(tl, bl) };

        // Where a level falls exactly on a corner, two edge crossings land on
        // the same point and the segment between them has no length. It draws
        // nothing, so it is dropped rather than carried through the geometry.
        const push = (a: UV, b: UV) => {
          if (Math.abs(a.u - b.u) < 1e-9 && Math.abs(a.v - b.v) < 1e-9) return;
          segments.push({
            u0: a.u / (TERRAIN_ACROSS - 1), v0: a.v / (TERRAIN_ALONG - 1),
            u1: b.u / (TERRAIN_ACROSS - 1), v1: b.v / (TERRAIN_ALONG - 1),
          });
        };

        switch (code) {
          case 1: case 14: push(left, bottom); break;
          case 2: case 13: push(bottom, right); break;
          case 3: case 12: push(left, right); break;
          case 4: case 11: push(top, right); break;
          case 6: case 9:  push(top, bottom); break;
          case 7: case 8:  push(left, top); break;
          case 5: case 10: {
            // Saddle: the centre decides which way the two lines run.
            const centreAbove = (tl + tr + br + bl) / 4 > level;
            if ((code === 5) === centreAbove) { push(left, top); push(bottom, right); }
            else { push(left, bottom); push(top, right); }
            break;
          }
        }
      }
    }

    if (segments.length) out.push({ level: Number(level.toFixed(2)), segments });
  }

  return out;
}

/** The fall across the block, for saying so on screen. */
export function terrainFall(): { low: number; high: number; fall: number } {
  return {
    low: TERRAIN_LOW_M,
    high: TERRAIN_HIGH_M,
    fall: Number((TERRAIN_HIGH_M - TERRAIN_LOW_M).toFixed(2)),
  };
}
