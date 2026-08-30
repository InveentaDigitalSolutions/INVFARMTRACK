/** Checks that a multi-bed submission becomes real records. Run: npm run test:beds */
import { expandBeds, bedCount, expandPlantLines } from '../../src/services/expandBeds.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(54)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// the bug: an array bound to a single lookup resolved to nothing
const many = { date: '2026-08-28', bed: ['E3-01','E3-02','E3-03'], week: 35, cuttingsEstimated: 400 }
const out = expandBeds(many)
eq('three beds become three records', out.length, 3)
eq('each carries one bed', out.map(r => r.bed), ['E3-01','E3-02','E3-03'])
eq('and everything else is copied', out[1].cuttingsEstimated, 400)
eq('the date too', out[2].date, '2026-08-28')

// forms that are not about beds must pass through
eq('a single bed is untouched', expandBeds({ bed: 'E3-01', qty: 5 }), [{ bed: 'E3-01', qty: 5 }])
eq('no bed field at all is untouched', expandBeds({ name: 'Season 1' }), [{ name: 'Season 1' }])
eq('an empty selection yields one record with no bed',
  expandBeds({ bed: [], week: 3 }), [{ bed: undefined, week: 3 }])

// the count that used to be typed
eq('beds pruned is the selection size', bedCount(many), 3)
eq('one bed counts as one', bedCount({ bed: 'E3-01' }), 1)
eq('no bed counts as none', bedCount({}), 0)
eq('an empty array counts as none', bedCount({ bed: [] }), 0)


// ── expandPlantLines ────────────────────────────────────────────────────────
// A bed carries several varieties at once — 4,000 of one and 200 of another.
// The form collects them as lines; the table holds one variety per record.
const planting = { bed: 'E3-01', date: '2026-08-30', season: '2026-S2' }

eq('no lines passes straight through',
   expandPlantLines(planting), [planting])

const two = expandPlantLines({
  ...planting,
  lines: [{ plant: 'Hawaiian', qty: '4000' }, { plant: 'Jade', qty: '200' }],
})
eq('two varieties become two records', two.length, 2)
eq('each carries its own variety', two.map((r) => r.plant), ['Hawaiian', 'Jade'])
eq('and its own quantity, as a number', two.map((r) => r.qty), [4000, 200])
eq('the bed and date are on both',
   two.every((r) => r.bed === 'E3-01' && r.date === '2026-08-30'), true)
eq('the lines themselves never reach the record', 'lines' in two[0], false)

eq('a line with no plant is someone mid-thought, not data',
   expandPlantLines({ ...planting, lines: [{ plant: 'Jade', qty: '5' }, { plant: '', qty: '' }] }).length, 1)
eq('no filled line leaves the record alone',
   expandPlantLines({ ...planting, lines: [{ plant: '', qty: '' }] }), [planting])
eq('a blank quantity is not counted, not zero',
   expandPlantLines({ ...planting, lines: [{ plant: 'Jade', qty: '' }] })[0].qty, undefined)
eq('zero is a real answer where it is typed',
   expandPlantLines({ ...planting, lines: [{ plant: 'Jade', qty: '0' }] })[0].qty, 0)

// Several beds each planted with the same mix.
const spread = expandBeds({ bed: ['E3-01', 'E3-02'], date: '2026-08-30' })
  .flatMap((r) => expandPlantLines({ ...r, lines: [{ plant: 'Hawaiian', qty: '100' }, { plant: 'Jade', qty: '20' }] }))
eq('two beds and two varieties make four records', spread.length, 4)
eq('one of each pairing',
   spread.map((r) => `${r.bed}:${r.plant}`),
   ['E3-01:Hawaiian', 'E3-01:Jade', 'E3-02:Hawaiian', 'E3-02:Jade'])

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
