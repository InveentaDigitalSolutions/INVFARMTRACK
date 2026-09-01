/** Checks the solar geometry over the nursery. Run: npm run test:solar */
import { sunPosition, sunVector, dayArc, atLocal, localHours, localHours, nurseryToday } from '../../src/services/solar.ts'
import { SITE_LAT, SITE_LON, BED_AXIS_BEARING_DEG, bearingToModel } from '../../src/services/site.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}
const near = (label: string, got: number, want: number, tol: number) => {
  const pass = Math.abs(got - want) <= tol
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${got.toFixed(3)}${pass ? '' : ` want ${want}±${tol}`}`)
}

// --- Checked against places where the answer is known independently ----------
// SOLAR noon at Greenwich, not 12:00 UTC. Around 20 March the sun runs about
// 7.4 minutes slow — the equation of time — so it crosses the meridian at
// 12:07:24. Testing at 12:00 instead puts it 1.9° east of south, which is
// exactly the "failure" this test first reported: the clock was wrong, not the
// arithmetic.
const SOLAR_NOON_20_MAR = '2026-03-20T12:07:24Z'

const greenwich = sunPosition(new Date(SOLAR_NOON_20_MAR), 51.4778, 0)
near('Greenwich, solar noon: sun due south', greenwich.azimuth, 180, 0.5)
near('Greenwich, solar noon: altitude is 90 minus the latitude', greenwich.altitude, 90 - 51.4778, 0.5)

// On the equator within a day of an equinox the sun passes overhead.
const equator = sunPosition(new Date(SOLAR_NOON_20_MAR), 0, 0)
near('equator at the equinox: sun overhead', equator.altitude, 90, 0.5)

// 12:00 UTC is NOT solar noon, and the gap must be the equation of time.
const atClockNoon = sunPosition(new Date('2026-03-20T12:00:00Z'), 51.4778, 0)
eq('at clock noon the sun has not reached south yet', atClockNoon.azimuth < 179, true)

// The poles: midnight sun in their own summer, and dark in their own winter.
eq('north pole has sun in June', sunPosition(new Date('2026-06-21T00:00:00Z'), 90, 0).altitude > 0, true)
eq('north pole is dark in December', sunPosition(new Date('2026-12-21T00:00:00Z'), 90, 0).altitude < 0, true)
eq('south pole is the other way round in June', sunPosition(new Date('2026-06-21T00:00:00Z'), -90, 0).altitude < 0, true)

// --- The nursery itself ------------------------------------------------------
eq('the site is where the survey puts it', [SITE_LAT, SITE_LON], [14.9786, -87.9531])

const mar = dayArc('2026-03-21'), jun = dayArc('2026-06-21')
const sep = dayArc('2026-09-23'), dec = dayArc('2026-12-21')

near('equinox noon sun stands at 75.5°', mar.noonAltitude, 75.5, 0.4)
near('June noon sun stands at 81.5°', jun.noonAltitude, 81.5, 0.4)
near('December noon sun only reaches 51.6°', dec.noonAltitude, 51.6, 0.4)

// Inside the tropics the noon sun crosses to the north in the local summer.
// This is the fact that swings every shadow, so it is pinned rather than assumed.
eq('June noon sun is NORTH of overhead', jun.noonAzimuth < 90 || jun.noonAzimuth > 270, true)
eq('December noon sun is SOUTH of overhead', dec.noonAzimuth > 90 && dec.noonAzimuth < 270, true)
eq('and so is the September sun', sep.noonAzimuth > 90 && sep.noonAzimuth < 270, true)

near('equinox day is 12 hours', mar.daylight, 12.0, 0.1)
near('longest day is under 13 hours', jun.daylight, 12.88, 0.1)
near('shortest day is over 11 hours', dec.daylight, 11.10, 0.1)
eq('the year swings by barely 1.8 h of daylight', Math.round((jun.daylight - dec.daylight) * 10) / 10, 1.8)

// Sunrise in the east, sunset in the west, every day of the year.
for (const date of ['2026-01-15', '2026-05-01', '2026-08-11', '2026-11-20']) {
  const arc = dayArc(date)
  const rise = sunPosition(atLocal(date, arc.sunrise!)).azimuth
  const set = sunPosition(atLocal(date, arc.sunset!)).azimuth
  eq(`${date}: rises in the east`, rise > 45 && rise < 135, true)
  eq(`${date}: sets in the west`, set > 225 && set < 315, true)
}

// --- The model frame ---------------------------------------------------------
eq('the bed axis is 17.75° west of north', Math.round((360 - BED_AXIS_BEARING_DEG) * 100) / 100, 17.75)
eq('true north sits 17.75° right of the model’s own north',
  Math.round(bearingToModel(0) * 100) / 100, 17.75)
eq('the bed axis is straight ahead in model terms', bearingToModel(BED_AXIS_BEARING_DEG), 0)

// A sun below the horizon has no direction. Returning a vector anyway would
// light the beds from underneath, which is exactly the bug that looks plausible.
eq('midnight gives no sun vector', sunVector(atLocal('2026-03-21', 0), 342.25), null)
const noonVec = sunVector(atLocal('2026-03-21', 12), 342.25)!
eq('midday gives one', noonVec !== null, true)
near('and it is a unit vector', Math.hypot(...noonVec), 1, 1e-9)
eq('pointing upward', noonVec[1] > 0, true)

// At the equinox the noon sun is due south, so in a frame whose north is 17.75°
// to the right of the beds, it must fall on the beds' left-hand side.
eq('equinox noon sun is behind-left of the bed axis', noonVec[0] < 0, true)

// --- Local time --------------------------------------------------------------
eq('Honduras noon is 18:00 UTC', atLocal('2026-03-21', 12).toISOString(), '2026-03-21T18:00:00.000Z')
eq('and reads back as noon', localHours(atLocal('2026-03-21', 12)), 12)
eq('an hour before midnight reads 23', localHours(atLocal('2026-03-21', 23)), 23)

console.log(failures ? `\n  ${failures} failed` : '\n  The sun is where the almanac puts it.')


// The sun layer opens on the nursery's date, not the browser's. Honduras is
// UTC-6, so between midnight and 06:00 UTC it is still yesterday there.
{
  const eq2 = (label: string, got: unknown, want: unknown) => {
    const pass = JSON.stringify(got) === JSON.stringify(want)
    if (!pass) failures++
    console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(52)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
  }
  eq2('03:00 UTC is still the previous day at the nursery',
    nurseryToday(new Date('2026-09-02T03:00:00Z')), '2026-09-01')
  eq2('and 07:00 UTC is the new one',
    nurseryToday(new Date('2026-09-02T07:00:00Z')), '2026-09-02')
  eq2('local hours run six behind UTC',
    Number(localHours(new Date('2026-09-01T18:00:00Z')).toFixed(2)), 12)
}

console.log(failures ? `\n  ${failures} failed` : '\n  The sun is where it is.')
process.exit(failures ? 1 : 0)
