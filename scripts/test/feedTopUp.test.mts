/**
 * Which days of sunlight are missing from the store. Run: npm run test:topup
 */
import { missingDays } from '../../src/services/feedTopUp.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const live = new Map<string, number>([
  ['2026-08-29', 18.2],
  ['2026-08-30', 21.4],
  ['2026-08-31', 9.9],
  ['2026-09-01', 17.0],
  ['2026-09-02', 12.1],   // today — still being revised
  ['2026-09-03', 20.0],   // tomorrow — a forecast, not a measurement
])
const TODAY = '2026-09-02'

eq('everything before today that is not stored',
  missingDays([{ date: '2026-08-29' }], live, TODAY).map((d) => d.date),
  ['2026-08-30', '2026-08-31', '2026-09-01'])

eq('today waits, because its own total is not final yet',
  missingDays([], live, TODAY).some((d) => d.date === TODAY), false)
eq('and a forecast is never stored as a measurement',
  missingDays([], live, TODAY).some((d) => d.date > TODAY), false)

eq('a second launch writes nothing',
  missingDays(
    ['2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01'].map((date) => ({ date })),
    live, TODAY),
  [])

// Dataverse hands dates back with a time on them.
eq('a stored date with a time still counts as stored',
  missingDays([{ date: '2026-08-30T00:00:00Z' }], live, TODAY).map((d) => d.date),
  ['2026-08-29', '2026-08-31', '2026-09-01'])

console.log(failures ? `\n  ${failures} failed` : '\n  Only measured days, only once.')
process.exit(failures ? 1 : 0)
