/** Checks the moon. Run: npm run test:moon */
import { moonPhase, phaseName, moonPosition, moonDay, nextPhase, SYNODIC_MONTH } from '../../src/services/moon.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}
const near = (label: string, got: number, want: number, tol: number) => {
  const pass = Math.abs(got - want) <= tol
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${got.toFixed(4)}${pass ? '' : ` want ${want}±${tol}`}`)
}

// --- Against dates the almanac fixes independently --------------------------
// Full moons of 2026. If the model drifts these are the first to show it.
for (const iso of ['2026-01-03', '2026-03-03', '2026-08-28']) {
  const p = moonPhase(new Date(`${iso}T12:00:00Z`))
  eq(`${iso} is a full moon`, p.name, 'Full moon')
  eq(`${iso} is fully lit`, p.illumination > 0.99, true)
}
// New moons of 2026.
for (const iso of ['2026-01-18', '2026-09-11']) {
  const p = moonPhase(new Date(`${iso}T12:00:00Z`))
  eq(`${iso} is a new moon`, p.name, 'New moon')
  eq(`${iso} is barely lit`, p.illumination < 0.03, true)
}

// --- The cycle itself --------------------------------------------------------
near('a synodic month is 29.53 days', SYNODIC_MONTH, 29.5306, 0.001)
const start = new Date('2026-03-03T12:00:00Z')
const later = new Date(start.getTime() + SYNODIC_MONTH * 86_400_000)
near('one synodic month on, the phase repeats',
  Math.abs(moonPhase(later).fraction - moonPhase(start).fraction) % 1, 0, 0.02)

const full = moonPhase(new Date('2026-03-03T12:00:00Z'))
const newm = moonPhase(new Date('2026-01-18T12:00:00Z'))
eq('the moon waxes before full', moonPhase(new Date('2026-02-25T12:00:00Z')).waxing, true)
eq('and wanes after it', moonPhase(new Date('2026-03-08T12:00:00Z')).waxing, false)
eq('full moon is half way through the cycle', Math.abs(full.fraction - 0.5) < 0.02, true)
eq('new moon sits at the ends', newm.fraction < 0.02 || newm.fraction > 0.98, true)
near('age follows the fraction', full.age, 0.5 * SYNODIC_MONTH, 0.6)

// --- Phase names -------------------------------------------------------------
eq('0 is new', phaseName(0), 'New moon')
eq('a quarter in is first quarter', phaseName(0.25), 'First quarter')
eq('half way is full', phaseName(0.5), 'Full moon')
eq('three quarters is last quarter', phaseName(0.75), 'Last quarter')
eq('between new and first quarter it is a waxing crescent', phaseName(0.14), 'Waxing crescent')
eq('between first quarter and full, waxing gibbous', phaseName(0.38), 'Waxing gibbous')
eq('after full, waning gibbous', phaseName(0.62), 'Waning gibbous')
eq('before new, waning crescent', phaseName(0.9), 'Waning crescent')
eq('the cycle wraps rather than falling off the end', phaseName(1.25), 'First quarter')
eq('and wraps backwards too', phaseName(-0.5), 'Full moon')

// --- Position ----------------------------------------------------------------
// A full moon is opposite the sun, so it is highest around local midnight.
const midnight = moonPosition(new Date('2026-03-03T06:00:00Z'))   // 00:00 in Honduras
const noon = moonPosition(new Date('2026-03-03T18:00:00Z'))
eq('a full moon is up at midnight and down at midday', midnight.altitude > noon.altitude, true)
eq('altitude stays inside the sky', Math.abs(midnight.altitude) <= 90, true)
eq('azimuth is a compass bearing', midnight.azimuth >= 0 && midnight.azimuth < 360, true)

// --- Rise and set ------------------------------------------------------------
const day = moonDay('2026-08-30')
eq('a rise is a real hour', day.rise === null || (day.rise >= 0 && day.rise <= 24), true)
eq('a set is a real hour', day.set === null || (day.set >= 0 && day.set <= 24), true)
eq('the phase comes with it', day.phase.name.length > 0, true)

// The moon rises about 50 minutes later each day, so roughly once a month a
// calendar day has no rise at all. Null must mean that, not midnight.
let missing = 0
for (let i = 0; i < 31; i++) {
  const d = new Date(Date.UTC(2026, 7, 1) + i * 86_400_000).toISOString().slice(0, 10)
  if (moonDay(d).rise === null) missing++
}
eq('across a month, at most a couple of days have no moonrise', missing <= 2, true)

// --- Looking ahead -----------------------------------------------------------
const nf = nextPhase('2026-08-30', 'Full moon')
eq('the next full moon is found', typeof nf === 'string', true)
eq('and it is in the future', (nf ?? '') >= '2026-08-30', true)
eq('asking on the day itself returns that day',
  nextPhase('2026-03-03', 'Full moon'), '2026-03-03')
eq('a nonsense date returns nothing rather than looping',
  nextPhase('not-a-date', 'Full moon'), null)

console.log(failures ? `\n  ${failures} failed` : '\n  The moon is where the almanac puts it.')
process.exit(failures ? 1 : 0)
