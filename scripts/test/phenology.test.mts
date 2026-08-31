/** Checks the seasonal growth figures. Run: npm run test:phenology */
import { seasonOf, growthWeeks, harvestInterval, pruningRecovery, rowFor, stageLabel } from '../../src/services/phenology.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// Straight off Santiago's product table, now as rows: one per variety per
// season, with the stage as a figure. Most varieties are grown to eight leaves;
// some are grown to three, which is why the stage cannot be a column heading.
const rows = [
  { plant: 'Hawaiian', targetLeaves: 8,
    growthWeeksMin: 8, growthWeeksMax: 10, harvestWeeks: 4, pruneToLeaves: 2, pruningWeeks: 4 },
  // A variety cut at three leaves — the case the old columns could not hold.
  { plant: 'Superba', targetLeaves: 3,
    growthWeeksMin: 5, growthWeeksMax: 6, harvestWeeks: 3, pruneToLeaves: 1, pruningWeeks: 2 },
]

// seasonOf is still used by the light model, so it is still pinned here.
eq('March is the bright half', seasonOf('2026-03-01'), 'Mar-Aug')
eq('August still is', seasonOf('2026-08-31'), 'Mar-Aug')
eq('September is the dark half', seasonOf('2026-09-01'), 'Sep-Feb')
eq('February still is', seasonOf('2026-02-28'), 'Sep-Feb')
eq('a Date works as well as a string', seasonOf(new Date('2026-06-15T12:00:00Z')), 'Mar-Aug')

// One row per variety. The seasonal difference is not here on purpose — it is
// measured, and growthProgress.ts turns these weeks into a date from the light
// that actually fell. Two typed rows would win over the measurement, which is
// backwards.
const hawaiian = growthWeeks(rows, 'Hawaiian')!
eq('the weeks come back as a range', [hawaiian.min, hawaiian.max], [8, 10])
eq('the expected figure is the middle', hawaiian.expected, 9)

// The whole point of the change: the stage is data.
eq('Hawaiian is grown to 8 leaves', hawaiian.targetLeaves, 8)
eq('Superba is grown to 3', growthWeeks(rows, 'Superba')!.targetLeaves, 3)
eq('and it is said in words for a screen',
  stageLabel(rowFor(rows, 'Superba')), '3 leaves')
eq('one leaf is not "1 leaves"',
  stageLabel({ targetLeaves: 1 }), '1 leaf')
eq('an unrecorded stage says nothing rather than guessing eight',
  stageLabel({ growthWeeksMin: 8 }), null)

// Nothing recorded is null, never a guess: a bed whose cycle is unknown can
// only be called growing, or someone goes out and cuts it.
eq('an unknown variety gives nothing', growthWeeks(rows, 'Marble Queen'), null)
eq('no variety at all', growthWeeks(rows, undefined), null)
eq('no rows at all', growthWeeks([], 'Hawaiian'), null)

eq('zero weeks is treated as unrecorded',
  growthWeeks([{ plant: 'X', growthWeeksMin: 0, growthWeeksMax: 0 }], 'X'), null)

// Half a range still schedules — refusing on it helps nobody.
const half = growthWeeks([{ plant: 'X', growthWeeksMin: 9 }], 'X')!
eq('a range with only a low end works', [half.min, half.max, half.expected], [9, 9, 9])

eq('the harvest interval comes back', harvestInterval(rows, 'Hawaiian'), 4)
eq('and Superba is cut more often', harvestInterval(rows, 'Superba'), 3)
eq('pruning recovery too', pruningRecovery(rows, 'Superba'), 2)
eq('and is null when unrecorded', pruningRecovery(rows, 'Marble Queen'), null)

console.log(failures ? `\n  ${failures} failed` : '\n  Phenology reads per variety, stage and all.')
process.exit(failures ? 1 : 0)
