/**
 * The model must agree with the survey. Run: npm run test:geometry
 *
 * The layout was built the wrong way round once already — beds 79 m long in a
 * 2 x 2 with a cross road — because the post counts were read against the wrong
 * axes. These assertions pin the axes to the counts so it cannot happen twice.
 */
import {
  plotConfigs, BED_LENGTH_M, BLOCK_WIDTH_M, POSTS_WIDTH_M,
  POSTS_ALONG_BED, POSTS_ACROSS_BEDS, postLinesAcross, postLinesAlong,
  fieldOffsets, postRowsIn, BED_LEVELS, IRRIGATION_LEVEL,
} from '../../src/services/shadehouseLayout.ts'
import { placeBeds } from '../../src/components/ShadehouseScene.tsx'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}
const near = (label: string, got: number, want: number, tol = 0.05) => {
  const pass = Math.abs(got - want) <= tol
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${got.toFixed(2)}${pass ? '' : ` want ${want} +/-${tol}`}`)
}

// Santiago counts 12 posts along a bed and 19 perpendicular to them. The survey
// spreads 12 lines over 104.28 m and 19 over 174.20 m. Together those fix which
// axis is which, and nothing else does.
eq('twelve posts along a bed', POSTS_ALONG_BED, 12)
eq('nineteen across the house', POSTS_ACROSS_BEDS, 19)
near('a bed is as long as the posts that run along it', BED_LENGTH_M, 104.28)
near('the posts reach this far across', POSTS_WIDTH_M, 174.20)
near('spacing along a bed', BED_LENGTH_M / (POSTS_ALONG_BED - 1), 9.48)
near('spacing across the house', POSTS_WIDTH_M / (POSTS_ACROSS_BEDS - 1), 9.68)
eq('post lines along a bed', postLinesAlong().length, 12)
eq('post lines across the house', postLinesAcross().length, 19)

// All 120 beds side by side. 66 x 1.20 + 54 x 1.80 = 176.40 m, which is the
// 174.20 m of posts plus an edge either side.
const beds = plotConfigs.reduce((n, f) => n + f.bedCount, 0)
eq('a hundred and twenty beds', beds, 120)
near('and they span this far', plotConfigs.reduce((w, f) => w + f.bedCount * f.bedWidth, 0), BLOCK_WIDTH_M)
near('a little wider than the posts reach', BLOCK_WIDTH_M - POSTS_WIDTH_M, 2.20, 0.01)
eq('every field runs the full length',
   [...new Set(plotConfigs.map((f) => f.bedLength))], [BED_LENGTH_M])

// Fields sit end to end across the house, no gaps and no overlaps.
const seats = fieldOffsets()
const order = plotConfigs.map((f) => f.id)
let cursor = -BLOCK_WIDTH_M / 2
for (const id of order) {
  near(`${id} starts where the last one ended`, seats[id].start, cursor)
  cursor += seats[id].width
}
near('and the last one ends at the far edge', cursor, BLOCK_WIDTH_M / 2)

// A cable hangs between posts, so only some rows can carry an air bed.
const postRows = order.flatMap((id) => postRowsIn(id))
eq('nineteen post lines land somewhere in the beds', postRows.length, 19)
eq('air beds go to two levels; the third is the irrigation line',
   [BED_LEVELS, IRRIGATION_LEVEL], [[0, 1, 2], 3])

// And the placement actually spans it.
const placed = placeBeds(plotConfigs.flatMap((f) =>
  Array.from({ length: f.bedCount }, (_, i) => ({
    bedId: `${f.id}-${String(i + 1).padStart(2, '0')}`,
    fieldId: f.id, bedNumber: i + 1, level: 0 as const, type: 'ground' as const,
    widthM: f.bedWidth, lengthM: f.bedLength,
    state: 'empty' as const, variety: '', plantedDate: '', expectedHarvest: '', notes: '',
  }))
))
eq('every bed is placed', placed.length, 120)
const xs = placed.map((p) => p.x)
near('placed beds span the house', Math.max(...xs) - Math.min(...xs) + 1.8, BLOCK_WIDTH_M, 0.6)
eq('and all lie on one row', [...new Set(placed.map((p) => p.z))], [0])

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
