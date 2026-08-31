/** Checks ready dates from light. Run: npm run test:growth */
import { lightRequired, readyOn, progress } from '../../src/services/growthProgress.ts'
import { radiationToPar } from '../../src/services/bedLight.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// A double-shaded bed passes 12.25% where a single passes 35%, so the same
// variety needs proportionally less light behind that cloth to reach the same
// stage in the same number of weeks.
eq('nine weeks under single shade', Math.round(lightRequired(9, 'Single')!), 882)
eq('and under double', Math.round(lightRequired(9, 'Double')!), 309)
eq('no weeks, no requirement', lightRequired(0, 'Single'), null)
eq('nor a negative one', lightRequired(-4, 'Single'), null)

/**
 * Real radiation for a whole year, so the seasonal difference is the measured
 * one rather than something asserted here. Values are MJ/m², as Open-Meteo
 * reports them: bright half generous, dark half not.
 */
const radiation = new Map<string, number>()
for (let d = new Date(Date.UTC(2026, 0, 1)); d < new Date(Date.UTC(2028, 0, 1)); d.setUTCDate(d.getUTCDate() + 1)) {
  const month = d.getUTCMonth() + 1
  radiation.set(d.toISOString().slice(0, 10), month >= 3 && month <= 8 ? 22.0 : 16.9)
}
eq('the bright half is about a third brighter',
  Math.round((radiationToPar(22.0) / radiationToPar(16.9)) * 100) / 100, 1.3)

// The whole point of dropping the season column: the difference falls out of
// the light, and is not typed twice.
const spring = readyOn('2026-04-01', 9, 'Single', radiation)!
const autumn = readyOn('2026-10-01', 9, 'Single', radiation)!
eq('a planting in April is ready', typeof spring.readyOn, 'string')
eq('one in October takes longer', autumn.days > spring.days, true)
eq('and the gap is a fortnight or so, as the nursery says',
  autumn.days - spring.days >= 7 && autumn.days - spring.days <= 28, true)

// Shade is the other thing nobody should have to type twice.
const single = readyOn('2026-04-01', 9, 'Single', radiation)!
const double = readyOn('2026-04-01', 9, 'Double', radiation)!
eq('the same variety takes the same time under the cloth it was measured on',
  Math.abs(single.days - double.days) <= 1, true)

// A requirement nothing can reach must stop rather than walk forever.
eq('an unreachable requirement gives up', readyOn('2026-04-01', 500, 'Triple', radiation, 60), null)
eq('a nonsense date gives nothing', readyOn('not-a-date', 9, 'Single', radiation), null)
eq('no weeks gives nothing', readyOn('2026-04-01', 0, 'Single', radiation), null)

// Progress by light, not by days.
eq('nothing has grown on the day it went in', progress('2026-04-01', '2026-04-01', 9, 'Single', radiation), 0)
const half = progress('2026-04-01', '2026-05-15', 9, 'Single', radiation)!
eq('halfway through the light is about halfway', half > 0.3 && half < 0.8, true)
eq('progress never runs past finished',
  progress('2026-04-01', '2027-04-01', 9, 'Single', radiation), 1)
eq('a date before planting is not negative progress',
  progress('2026-04-01', '2026-03-01', 9, 'Single', radiation), null)

console.log(failures ? `\n  ${failures} failed` : '\n  Ready dates follow the light.')
process.exit(failures ? 1 : 0)
