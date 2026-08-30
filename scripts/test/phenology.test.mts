/** Checks the seasonal growth figures. Run: npm run test:phenology */
import { seasonOf, growthWeeks, harvestInterval, pruningRecovery } from '../../src/services/phenology.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// Straight off Santiago's product table: a single-shade Pothos.
const hawaiian = {
  growthWeeksMinMarAug: 8,  growthWeeksMaxMarAug: 10,
  harvestWeeksMarAug: 4,    pruningWeeksMarAug: 4,
  growthWeeksMinSepFeb: 10, growthWeeksMaxSepFeb: 12,
  harvestWeeksSepFeb: 4,    pruningWeeksSepFeb: 4,
}

// The season boundary. March is bright, September is dark, and the two months
// either side of each edge are the ones worth pinning.
eq('March is the bright half', seasonOf('2026-03-01'), 'Mar-Aug')
eq('August still is', seasonOf('2026-08-31'), 'Mar-Aug')
eq('September is the dark half', seasonOf('2026-09-01'), 'Sep-Feb')
eq('February still is', seasonOf('2026-02-28'), 'Sep-Feb')
eq('and so is December', seasonOf('2026-12-15'), 'Sep-Feb')
eq('a Date works as well as a string', seasonOf(new Date('2026-06-15T12:00:00Z')), 'Mar-Aug')

// The figure that replaced "weeks to first cut".
const bright = growthWeeks(hawaiian, '2026-04-10')!
const dark = growthWeeks(hawaiian, '2026-11-10')!
eq('seeded in April it takes 8-10 weeks', [bright.min, bright.max], [8, 10])
eq('seeded in November, 10-12', [dark.min, dark.max], [10, 12])
eq('the expected figure is the middle of the range', bright.expected, 9)
eq('and in the dark half', dark.expected, 11)
eq('the season comes back with it', [bright.season, dark.season], ['Mar-Aug', 'Sep-Feb'])
// This is the whole reason the flat field went: one number was wrong for half
// the year, by two weeks.
eq('the dark half genuinely takes longer', dark.expected > bright.expected, true)

// A variety with nothing recorded must not be guessed at: a bed whose cycle is
// unknown can only be called growing, or the nursery goes out to cut it.
eq('no plant gives nothing', growthWeeks(undefined, '2026-04-10'), null)
eq('an empty plant gives nothing', growthWeeks({}, '2026-04-10'), null)
eq('zero is treated as not recorded, not as instant',
  growthWeeks({ growthWeeksMinMarAug: 0, growthWeeksMaxMarAug: 0 }, '2026-04-10'), null)

// Half a range is still usable — refusing to schedule on it helps nobody.
const onlyMin = growthWeeks({ growthWeeksMinMarAug: 9 }, '2026-04-10')!
eq('a range with only a low end still works', [onlyMin.min, onlyMin.max, onlyMin.expected], [9, 9, 9])
const onlyMax = growthWeeks({ growthWeeksMaxSepFeb: 13 }, '2026-11-10')!
eq('and one with only a high end', [onlyMax.min, onlyMax.max], [13, 13])

// A variety recorded for one season only must not borrow the other's figures.
eq('bright figures do not stand in for the dark half',
  growthWeeks({ growthWeeksMinMarAug: 8, growthWeeksMaxMarAug: 10 }, '2026-11-10'), null)

// The other two figures follow the same season.
eq('harvest interval, bright half', harvestInterval(hawaiian, '2026-04-10'), 4)
eq('harvest interval, dark half', harvestInterval(hawaiian, '2026-11-10'), 4)
eq('pruning recovery follows the season', pruningRecovery(hawaiian, '2026-11-10'), 4)
eq('and is null when unrecorded', pruningRecovery({}, '2026-11-10'), null)

// A double-shade variety, which the table gives different figures entirely.
const marbleQueen = {
  growthWeeksMinMarAug: 10, growthWeeksMaxMarAug: 12,
  harvestWeeksMarAug: 5,    pruningWeeksMarAug: 5,
  growthWeeksMinSepFeb: 12, growthWeeksMaxSepFeb: 14,
  harvestWeeksSepFeb: 7,    pruningWeeksSepFeb: 7,
}
eq('a double-shade variety takes longer than a single one',
  growthWeeks(marbleQueen, '2026-04-10')!.expected > bright.expected, true)
eq('and its harvest interval stretches in the dark half',
  harvestInterval(marbleQueen, '2026-11-10')! > harvestInterval(marbleQueen, '2026-04-10')!, true)

console.log(failures ? `\n  ${failures} failed` : '\n  The seasons are told apart.')
process.exit(failures ? 1 : 0)
