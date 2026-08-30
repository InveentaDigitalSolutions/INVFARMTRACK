/**
 * The model must agree with the survey. Run: npm run test:geometry
 *
 * Every dimension in shadehouseLayout used to be measured off a photograph,
 * and bed length was wrong by more than half. These assertions tie the
 * constants to the topographic survey (Topografía CAPAZ, July 2025, 1:830) so
 * that changing one without the other fails rather than drifts.
 */
import {
  plotConfigs, POST_SPACING_M, BLOCK_ACROSS_M, BLOCK_ALONG_M,
} from '../../src/services/shadehouseLayout.ts'
import { computeRoads, placeBeds } from '../../src/components/ShadehouseScene.tsx'

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

const byId = Object.fromEntries(plotConfigs.map((p) => [p.id, p]))
eq('four fields', plotConfigs.map((p) => p.id), ['E3', 'C3', 'E1', 'C1'])
eq('E fields carry 33 beds', [byId.E3.bedCount, byId.E1.bedCount], [33, 33])
eq('C fields carry 27 beds', [byId.C3.bedCount, byId.C1.bedCount], [27, 27])

const eWidth = byId.E3.bedCount * byId.E3.bedWidth
const cWidth = byId.C3.bedCount * byId.C3.bedWidth
near('E field is 33 x 1.20 m', eWidth, 39.6)
near('C field is 27 x 1.80 m', cWidth, 48.6)

const roads = computeRoads()
near('the logistics road is what the survey leaves', roads.vertical.width, 16.08)
near('block across matches the survey', eWidth + roads.vertical.width + cWidth, BLOCK_ACROSS_M)
near('block along matches the survey', byId.E3.bedLength * 2 + roads.horizontal.width, BLOCK_ALONG_M)
near('the surveyed values themselves', BLOCK_ACROSS_M * 1, 104.28)
near('and along', BLOCK_ALONG_M * 1, 174.20)
near('the post bay is the surveyed one', POST_SPACING_M, 9.72)

// The bed length the survey forces, against the 37.20 m read off a photo.
near('bed length comes from the survey, not a photograph', byId.E3.bedLength, 79.06)

// And the placement actually spans it.
const beds = plotConfigs.flatMap((f) =>
  Array.from({ length: f.bedCount }, (_, i) => ({
    bedId: `${f.id}-${String(i + 1).padStart(2, '0')}`,
    fieldId: f.id, bedNumber: i + 1, level: 0 as const, type: 'ground' as const,
    widthM: f.bedWidth, lengthM: f.bedLength,
    state: 'empty' as const, variety: '', plantedDate: '', expectedHarvest: '', notes: '',
  }))
)
const placed = placeBeds(beds)
eq('every bed is placed', placed.length, 120)
const xs = placed.map((p) => p.x)
const zs = placed.map((p) => p.z)
near('placed width spans the block',
  (Math.max(...xs) - Math.min(...xs)) + byId.C3.bedWidth, BLOCK_ACROSS_M, 0.6)
near('placed depth spans the block',
  (Math.max(...zs) - Math.min(...zs)) + byId.E3.bedLength, BLOCK_ALONG_M, 0.6)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
