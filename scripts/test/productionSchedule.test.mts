/** Checks the schedule cohorts. Run: npm run test:schedule */
import { cohorts, weekStart, isoWeek, missingCycles } from '../../src/services/productionSchedule.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(54)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

eq('a Wednesday belongs to its Monday', weekStart('2026-01-07'), '2026-01-05')
eq('a Monday is its own week start', weekStart('2026-01-05'), '2026-01-05')
eq('iso week of 2026-01-05', isoWeek('2026-01-05'), 2)

// the point Santiago made: same variety, planted in waves
const plantings = [
  { bed:'E3-01', plant:'Hawaiian', date:'2026-01-05', qty:400 },
  { bed:'E3-02', plant:'Hawaiian', date:'2026-01-07', qty:420 },   // same wave
  { bed:'E3-09', plant:'Hawaiian', date:'2026-03-02', qty:380 },   // a later wave
  { bed:'C1-01', plant:'Jade',     date:'2026-01-05', qty:300 },   // different variety, same week
]
const cycles = [{ plant:'Hawaiian', growthWeeksMinMarAug:12, growthWeeksMaxMarAug:14, growthWeeksMinSepFeb:14, growthWeeksMaxSepFeb:16 }]
const list = cohorts(plantings, cycles)

eq('beds planted days apart are one wave', list.filter(c => c.plant==='Hawaiian').length, 2)
eq('and their beds are collected', list[0].beds.length, 2)
eq('quantities add up across the wave', list.find(c => c.plant==='Hawaiian')?.qty, 820)
eq('two varieties in the same week stay separate', list.filter(c => c.weekStart==='2026-01-05').length, 2)
eq('a later wave is its own cohort', list.filter(c => c.plant==='Hawaiian').map(c => c.weekStart),
  ['2026-01-05','2026-03-02'])

// projection only where a cycle time exists
const hawaiian = list.find(c => c.plant==='Hawaiian')!
// Planted 5 January, so the dark half: 14-16 weeks, not the 12-14 of the bright
// one. The window is the two ends of the growth range — "productive weeks" was
// retired because these are cut and pruned in cycles, not finished after a span.
eq('first cut is the near end of the range', hawaiian.harvestFrom, '2026-04-13')
eq('and the window closes at the far end', hawaiian.harvestTo, '2026-04-27')
eq('and it is scheduled', hawaiian.unscheduled, false)

const jade = list.find(c => c.plant==='Jade')!
eq('a variety with no cycle time projects nothing', jade.harvestFrom, undefined)
eq('and says so rather than guessing', jade.unscheduled, true)
eq('the screen can name what is missing', missingCycles(list), ['Jade'])

eq('inactive plantings are excluded',
  cohorts([...plantings, {bed:'C1-09',plant:'Neon',date:'2026-01-05',current:false}], cycles)
    .some(c => c.plant==='Neon'), false)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
