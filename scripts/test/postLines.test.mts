/**
 * The house has two grids: 120 bed rows and 19 lines of posts. A basket hangs
 * on a post line, never on a bed row, and this checks the two never get mixed
 * up. Run: npm run test:postlines
 */
import {
  postLineXs, plotConfigs, POSTS_ACROSS_BEDS, ROAD_M,
} from '../../src/services/shadehouseLayout.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(52)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}
const near = (label: string, got: number, want: number, tol = 0.01) => {
  const pass = Math.abs(got - want) <= tol
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(52)} ${got.toFixed(2)}${pass ? '' : ` want ${want.toFixed(2)}`}`)
}

const lines = postLineXs()

eq('nineteen lines across the house', lines.length, POSTS_ACROSS_BEDS)
eq('nine over the E fields', lines.filter((l) => l.fieldId === 'E').length, 9)
eq('ten over the C fields', lines.filter((l) => l.fieldId === 'C').length, 10)

// The line numbers a basket row is named after start at 1 in each field, not
// once across the house: E1-05-01 is the fifth line of the E column.
eq('each field numbers its own lines from 1',
  [lines[0].line, lines[8].line, lines[9].line, lines[18].line], [1, 9, 1, 10])

// A cable spans several beds. If it ever came out near a bed width, baskets
// would have been placed on the bed grid again.
const west = lines.filter((l) => l.fieldId === 'E')
const bay = west[1].x - west[0].x
near('an E bay is 4.95 m, not a 1.2 m bed', bay, 4.95)
const east = lines.filter((l) => l.fieldId === 'C')
near('a C bay is 5.40 m, not a 1.8 m bed', east[1].x - east[0].x, 5.4)

// The road falls between the two columns — line 9 of E and line 1 of C.
near('the road sits between the two columns', east[0].x - west[8].x, ROAD_M)

// Every line is inside the house.
const total = 33 * 1.2 + ROAD_M + 27 * 1.8
eq('no line falls outside the house',
  lines.every((l) => Math.abs(l.x) <= total / 2 + 0.01), true)

// The grids are genuinely different sizes: 76 basket rows against 120 beds.
const basketRows = plotConfigs.reduce((n, p) => n + p.postLines * 2, 0)
const groundBeds = plotConfigs.reduce((n, p) => n + p.bedCount, 0)
eq('76 basket rows over two levels', basketRows, 76)
eq('120 ground beds', groundBeds, 120)

console.log(failures ? `\n${failures} failed` : '\nall passed')
process.exit(failures ? 1 : 0)
