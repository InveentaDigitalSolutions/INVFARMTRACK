/**
 * How healthy a feed is. Run: npm run test:feeds
 */
import { feedState } from '../../src/services/feedState.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const NOW = Date.parse('2026-09-02T12:00:00Z')
const state = (input: Parameters<typeof feedState>[0]) => feedState({ now: NOW, ...input })

eq('fresh weather is live',
  state({ lastAt: NOW - 20 * 60_000, staleAfterHours: 2 }).status, 'live')
eq('and an hour later it still is',
  state({ lastAt: NOW - 90 * 60_000, staleAfterHours: 2 }).status, 'live')
eq('past its window it is stale, not broken',
  state({ lastAt: NOW - 5 * 3_600_000, staleAfterHours: 2 }).status, 'stale')

// The exchange rate that started all this: three days old and indistinguishable
// from this morning's until you read the date.
eq('a three-day-old rate says so',
  state({ lastAt: '2026-08-30', staleAfterHours: 48 }).detail, '3 days old')

// A failure with data behind it is a retry; with nothing behind it, somebody
// has to go and look.
eq('a failure over known data is a retry',
  state({ error: 'Weather unavailable', lastAt: NOW - 3_600_000, staleAfterHours: 2 }).status, 'retrying')
eq('and it still says what it is showing',
  state({ error: 'Weather unavailable', lastAt: NOW - 3_600_000, staleAfterHours: 2 }).detail,
  'Weather unavailable · showing data 1 h old')
eq('a failure with nothing behind it is down',
  state({ error: 'Weather unavailable', staleAfterHours: 2 }).status, 'down')

// Not configured is not a fault.
eq('an unconfigured feed is off, not down',
  state({ configured: false, staleAfterHours: 2 }).status, 'off')
eq('even while it would otherwise be loading',
  state({ configured: false, loading: true, staleAfterHours: 2 }).status, 'off')

eq('a first read in flight is connecting',
  state({ loading: true, staleAfterHours: 2 }).status, 'connecting')
eq('and an empty table is idle, not broken',
  state({ staleAfterHours: 2 }).status, 'idle')

// A date is a day, not an instant: today's rate must not read as 12 h old
// before lunch, nor as fresh at midnight.
eq('a bare date is read as midday',
  Math.round(state({ lastAt: '2026-09-02', staleAfterHours: 48 }).ageHours ?? -1), 0)

eq('only live is shown without a caveat',
  ['live', 'stale', 'down', 'off'].map((s) =>
    state(s === 'live' ? { lastAt: NOW, staleAfterHours: 2 }
      : s === 'stale' ? { lastAt: NOW - 99 * 3_600_000, staleAfterHours: 2 }
      : s === 'down' ? { error: 'x', staleAfterHours: 2 }
      : { configured: false, staleAfterHours: 2 }).trustworthy),
  [true, false, false, false])

console.log(failures ? `\n  ${failures} failed` : '\n  Every feed says how it is doing.')
process.exit(failures ? 1 : 0)
