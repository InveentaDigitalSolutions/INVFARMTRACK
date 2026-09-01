/**
 * Days on which nothing moves. Run: npm run test:days
 */
import {
  holidayOn, isWeekend, isWorkingDay, closuresOn, nextWorkingDay, codeFor,
} from '../../src/services/workingDays.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const rows = [
  { date: '2026-10-03', name: 'Morazán Day', countryCode: 'HN', country: 'Honduras' },
  { date: '2026-09-15', name: 'Independence Day', countryCode: 'HN', country: 'Honduras' },
  { date: '2026-12-25', name: 'Eerste Kerstdag', countryCode: 'NL', country: 'Netherlands' },
  // Dataverse hands dates back with a time on them.
  { date: '2026-05-01T00:00:00Z', name: 'Labour Day', countryCode: 'HN', country: 'Honduras' },
]

eq('a holiday at home', holidayOn(rows, '2026-10-03', 'HN')?.name, 'Morazán Day')
eq('a date with a time on it is still that date', holidayOn(rows, '2026-05-01', 'HN')?.name, 'Labour Day')
eq('the same day is ordinary elsewhere', holidayOn(rows, '2026-10-03', 'NL'), null)
eq('a customer country is matched by name', holidayOn(rows, '2026-12-25', 'Netherlands')?.countryCode, 'NL')
eq('and by the long form of it', codeFor('United States of America'), 'US')
eq('an unknown country gets no holidays rather than the wrong ones', codeFor('Freedonia'), null)

// An ISO date is a day, not an instant: read locally, 2026-10-03 becomes the
// 2nd anywhere west of Greenwich, and a Saturday becomes a Friday.
eq('weekends are read as days, not instants',
  [isWeekend('2026-10-03'), isWeekend('2026-10-04'), isWeekend('2026-10-05')], [true, true, false])

eq('a holiday is not a working day', isWorkingDay(rows, '2026-09-15', 'HN'), false)
eq('nor is a Sunday', isWorkingDay(rows, '2026-10-04', 'HN'), false)
eq('an ordinary Tuesday is', isWorkingDay(rows, '2026-09-08', 'HN'), true)
eq('a blank date is not a working day', isWorkingDay(rows, '', 'HN'), false)

// Christmas Day 2026 is a Friday: the nursery works, Dutch customs does not.
const both = closuresOn(rows, '2026-12-25', 'Netherlands')
eq('the far end can be shut while the nursery is open',
  [both.home, both.away?.name, both.weekend], [null, 'Eerste Kerstdag', false])

eq('a working day is its own answer', nextWorkingDay(rows, '2026-09-08', 'HN'), '2026-09-08')
// 15 Sep 2026 is a Tuesday holiday, so the next working day is the Wednesday.
eq('a holiday moves to the next day', nextWorkingDay(rows, '2026-09-15', 'HN'), '2026-09-16')
// 3 Oct 2026 is a Saturday holiday: Sat, Sun, then Monday.
eq('a holiday on a weekend runs to Monday', nextWorkingDay(rows, '2026-10-03', 'HN'), '2026-10-05')

console.log(failures ? `\n  ${failures} failed` : '\n  The days work is possible on.')
process.exit(failures ? 1 : 0)
