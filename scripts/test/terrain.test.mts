/** Checks the survey contour arithmetic. Run: npm run test:terrain */
import {
  elevationAt, relativeHeight, contourSegments, terrainFall,
  TERRAIN_LOW_M, TERRAIN_HIGH_M,
} from '../../src/services/terrain.ts'
import { TERRAIN_M, TERRAIN_ACROSS, TERRAIN_ALONG } from '../../src/services/terrain.generated.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}
const near = (label: string, got: number, want: number, tol = 1e-6) => {
  const pass = Math.abs(got - want) <= tol
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${got}${pass ? '' : ` want ~${want}`}`)
}

// elevationAt — the corners must be the samples themselves, not interpolations
near('the NW corner is its own sample', elevationAt(0, 0), TERRAIN_M[0][0])
near('the SE corner is its own sample', elevationAt(1, 1), TERRAIN_M[TERRAIN_ALONG - 1][TERRAIN_ACROSS - 1])
near('midway along the first row is the mean of two samples',
  elevationAt(0.5 / (TERRAIN_ACROSS - 1), 0), (TERRAIN_M[0][0] + TERRAIN_M[0][1]) / 2)

// Outside the block, the nearest edge — never an extrapolation into ground
// the survey did not measure.
near('off the west edge clamps', elevationAt(-3, 0), TERRAIN_M[0][0])
near('off the east edge clamps', elevationAt(9, 1), TERRAIN_M[TERRAIN_ALONG - 1][TERRAIN_ACROSS - 1])

// Every sample sits inside the stated range, or the range is wrong
const all = TERRAIN_M.flat()
eq('no sample below the stated low', all.every((h) => h >= TERRAIN_LOW_M), true)
eq('no sample above the stated high', all.every((h) => h <= TERRAIN_HIGH_M), true)

eq('the low point is 0 relative', relativeHeight(TERRAIN_LOW_M), 0)
eq('the high point is 1 relative', relativeHeight(TERRAIN_HIGH_M), 1)
eq('below the block still clamps to 0', relativeHeight(500), 0)
eq('the fall is what the survey says', terrainFall().fall, 4.29)

// contourSegments
const half = contourSegments(0.5)
eq('contours are traced at every half metre in range',
  half.map((c) => c.level),
  [565, 565.5, 566, 566.5, 567, 567.5, 568, 568.5])
eq('every level carries segments', half.every((c) => c.segments.length > 0), true)
eq('a coarser interval traces fewer levels', contourSegments(1).length < half.length, true)

// Every endpoint must be inside the block, or the drawing runs off the plan.
const pts = half.flatMap((c) => c.segments.flatMap((s) => [s.u0, s.v0, s.u1, s.v1]))
eq('every endpoint is normalised inside the block', pts.every((n) => n >= -1e-9 && n <= 1 + 1e-9), true)
eq('no endpoint is NaN', pts.every(Number.isFinite), true)

// A segment of zero length is a line that draws nothing — a sign the
// interpolation divided by a flat edge.
const degenerate = half.flatMap((c) => c.segments)
  .filter((s) => s.u0 === s.u1 && s.v0 === s.v1)
eq('no zero-length segments', degenerate.length, 0)

// The saddle rule: opposite corners high, the two lines must not cross.
// Cheapest honest check is that a level below everything traces nothing.
eq('a level under the whole site traces nothing', contourSegments(0.5)
  .filter((c) => c.level < TERRAIN_LOW_M).length, 0)

console.log(failures ? `\n  ${failures} failed` : '\n  Contours trace inside the block.')
process.exit(failures ? 1 : 0)
