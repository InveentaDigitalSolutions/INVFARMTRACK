/** Checks the moon KPIs and calendar. Run: npm run test:mooninsight */
import { moonKpis, moonCalendar } from '../../src/services/moonInsight.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const k = moonKpis('2026-08-30')
eq('a phase comes back', k.phase.name.length > 0, true)
eq('days to full is a whole number of days', Number.isInteger(k.daysToFull), true)
eq('and never negative', (k.daysToFull ?? 0) >= 0, true)
eq('days to new likewise', (k.daysToNew ?? 0) >= 0, true)
// The moon is up for something between a few hours and most of a day; a figure
// outside that means rise and set have been subtracted the wrong way round.
eq('hours up is plausible', k.hoursUp > 5 && k.hoursUp < 20, true)

// On a full moon itself the answer is today, not a month away — the trap in
// "next" is skipping the current day.
const full = moonKpis('2026-03-03')
eq('asked on a full moon, the next one is today', full.daysToFull, 0)
eq('and the next new moon is a fortnight off',
  (full.daysToNew ?? 0) >= 10 && (full.daysToNew ?? 0) <= 20, true)

// Hours up must be counted, not derived: the moon often sets before it rises
// within the same calendar day, which makes set-minus-rise negative.
let anyInverted = 0
for (let i = 0; i < 30; i++) {
  const d = new Date(Date.UTC(2026, 7, 1) + i * 86_400_000).toISOString().slice(0, 10)
  const m = moonKpis(d)
  if (m.moonrise !== null && m.moonset !== null && m.moonset < m.moonrise) anyInverted++
  if (!(m.hoursUp > 0 && m.hoursUp < 24)) { failures++; console.log(`  FAIL hours up on ${d}: ${m.hoursUp}`) }
}
eq('across a month some days do set before they rise', anyInverted > 0, true)
eq('and hours up stayed sane on every one of them', true, true)

// The calendar
const cal = moonCalendar('2026-08-30')
eq('the strip is 6 back plus today plus 29 forward', cal.length, 36)
eq('today is marked once', cal.filter((d) => d.isToday).length, 1)
eq('and it is the seventh entry', cal[6].dateISO, '2026-08-30')
eq('it starts six days earlier', cal[0].dateISO, '2026-08-24')
eq('every day carries a phase', cal.every((d) => d.phase.name.length > 0), true)
// A 36-day window spans more than one cycle, so it must contain each turning
// point at least once — if it contains none, the naming is broken.
const turns = cal.filter((d) => d.isTurning)
eq('turning points are marked', turns.length >= 4, true)
eq('a full moon is among them', turns.some((d) => d.phase.name === 'Full moon'), true)
eq('and a new moon', turns.some((d) => d.phase.name === 'New moon'), true)
eq('a nonsense date gives an empty strip, not a crash', moonCalendar('not-a-date'), [])

console.log(failures ? `\n  ${failures} failed` : '\n  The moon KPIs hold up.')
process.exit(failures ? 1 : 0)
