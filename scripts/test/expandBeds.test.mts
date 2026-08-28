/** Checks that a multi-bed submission becomes real records. Run: npm run test:beds */
import { expandBeds, bedCount } from '../../src/services/expandBeds.ts'

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

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
