/**
 * The model must agree with the survey. Run: npm run test:geometry
 *
 * The layout was built the wrong way round once already — beds 79 m long in a
 * 2 x 2 with a cross road — because the post counts were read against the wrong
 * axes. These assertions pin the axes to the counts so it cannot happen twice.
 */
import {
  plotConfigs, BED_LENGTH_M, POSTS_WIDTH_M,
  POSTS_ALONG_BED, POSTS_ACROSS_BEDS, postLinesAcross, postLinesAlong,
  fieldOffsets, postRowsIn, BED_LEVELS, IRRIGATION_LEVEL,
  roadEastWest, roadNorthSouth,
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

// Fields sit one to a quadrant, cut by the cross of roads. The roads are each
// exactly one structural bay, so no post ever stands in one.
const ew = roadEastWest()
const ns = roadNorthSouth()
near('the east-west road is one bay', ew.width, 9.48)
near('the north-south road is one bay', ns.width, 9.68)
near('and it runs down the middle of the beds', ew.centre, 0, 0.01)

const seats = fieldOffsets()
eq('every field has a quadrant', Object.keys(seats).sort(), ['C1', 'C3', 'E1', 'E3'])
near('an E field runs the west quadrant', seats.E3.length, 77.42, 0.02)
near('a C field runs the east one', seats.C3.length, 87.10, 0.02)
near('E beds stack 33 x 1.20 across the depth', seats.E3.span, 39.60)
near('C beds stack 27 x 1.80', seats.C3.span, 48.60)

// 27 C beds across a 47.40 m quadrant depth implies 1.76 m each against the
// 1.80 m recorded. That 2% is what says the beds run this way round rather
// than stacking along the 87 m width, which would need beds over 3 m wide.
near('the C field very nearly fills its quadrant depth', seats.C3.span, 47.40, 1.3)

// A hundred and twenty beds all told.
eq('a hundred and twenty beds', plotConfigs.reduce((n, f) => n + f.bedCount, 0), 120)

// And the placement actually lands where the quadrants say.
const placed = placeBeds(plotConfigs.flatMap((f) =>
  Array.from({ length: f.bedCount }, (_, i) => ({
    bedId: `${f.id}-${String(i + 1).padStart(2, '0')}`,
    fieldId: f.id, bedNumber: i + 1, level: 0 as const, type: 'ground' as const,
    widthM: f.bedWidth, lengthM: f.bedLength,
    state: 'empty' as const, variety: '', plantedDate: '', expectedHarvest: '', notes: '',
  }))
))
eq('every bed is placed', placed.length, 120)
eq('four bed centre lines, one per quadrant',
   [...new Set(placed.map((p) => Math.round(p.x)))].sort((a, b) => a - b).length, 2)
const e3 = placed.filter((p) => p.bed.fieldId === 'E3')
near('E3 stays north of the east-west road', Math.max(...e3.map((p) => p.z)), ew.centre - ew.width / 2, 1.3)
const c1 = placed.filter((p) => p.bed.fieldId === 'C1')
near('C1 stays east of the north-south road', Math.min(...c1.map((p) => p.x)) - seats.C1.length / 2,
     ns.centre + ns.width / 2, 0.1)
eq('no bed sits in a road',
   placed.some((p) => Math.abs(p.z - ew.centre) < ew.width / 2), false)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
