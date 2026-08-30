/** Checks the per-bed light model. Run: npm run test:light */
import {
  clothTransmission, clearSkyIrradiance, dayLight, accumulatedLight,
  relativeLight, CLOTH_TRANSMISSION, radiationToPar, radiationSeries,
  measuredDayLight, accumulatedMeasuredLight,
} from '../../src/services/bedLight.ts'

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

// The cloth. Santiago's own arithmetic: 65% netting, layers multiplying.
eq('one layer passes 35%', CLOTH_TRANSMISSION, 0.35)
near('single shade lets 35.00% through', clothTransmission('Single') * 100, 35.00, 0.01)
near('double shade lets 12.25% through', clothTransmission('Double') * 100, 12.25, 0.01)
near('triple shade lets 4.29% through', clothTransmission('Triple') * 100, 4.29, 0.01)
near('double blocks 87.75%', 100 - clothTransmission('Double') * 100, 87.75, 0.01)
eq('layers multiply, they do not add',
  Math.abs(clothTransmission('Double') - (1 - 0.65 * 2)) > 0.4, true)
eq('a bed with no shade recorded is not guessed at', clothTransmission(undefined), 1)
near('triple is eight times darker than single',
  clothTransmission('Single') / clothTransmission('Triple'), 8.16, 0.02)

// Irradiance
eq('no sun below the horizon', clearSkyIrradiance(-5), 0)
eq('none exactly at the horizon', clearSkyIrradiance(0), 0)
eq('a higher sun delivers more', clearSkyIrradiance(60) > clearSkyIrradiance(20), true)
// Overhead clear-sky on a horizontal surface is about 1000 W/m² — the figure
// solar panels are rated at, and an independent check on the whole chain.
near('overhead clear sky is about 1000 W/m²', clearSkyIrradiance(90), 1000, 90)
eq('never above the solar constant', clearSkyIrradiance(90) < 1361, true)

// A day's light. A clear tropical day in the open runs 45-65 mol/m²/day; this
// is the number horticulture quotes, so it catches an error anywhere in the
// chain from air mass through to micromoles.
const jun = dayLight('2026-06-21', undefined)
const dec = dayLight('2026-12-21', undefined)
eq('a clear June day is a plausible tropical DLI', jun.openSky > 45 && jun.openSky < 65, true)
eq('a clear December day too', dec.openSky > 35 && dec.openSky < 60, true)
eq('June beats December', jun.openSky > dec.openSky, true)
// Day length barely moves here, so the seasonal swing is modest — and much
// smaller than the eightfold spread the cloth creates between beds.
eq('the seasonal swing is under 40%', (jun.openSky - dec.openSky) / jun.openSky < 0.4, true)

const single = dayLight('2026-06-21', 'Single')
const triple = dayLight('2026-06-21', 'Triple')
near('a single-shade bed gets 35% of open sky', single.atBed / single.openSky, 0.35, 1e-9)
near('and a triple-shade bed 4.29%', triple.atBed / triple.openSky * 100, 4.29, 0.01)
eq('the cloth matters more than the season',
  single.atBed / triple.atBed > (jun.openSky / dec.openSky), true)
eq('daylight hours come from the same almanac', jun.daylightHours > dec.daylightHours, true)

// Accumulated light — what a growth model should count in.
const week = accumulatedLight('2026-06-01', '2026-06-07', 'Single')
near('a week is about seven days of it', week / 7, dayLight('2026-06-04', 'Single').atBed, 0.6)
eq('a single day is inclusive of both ends',
  accumulatedLight('2026-06-01', '2026-06-01', 'Single') > 0, true)
eq('backwards dates give nothing rather than a negative',
  accumulatedLight('2026-06-07', '2026-06-01', 'Single'), 0)
eq('a nonsense date gives nothing', accumulatedLight('not-a-date', '2026-06-01', 'Single'), 0)
eq('a shadier bed accumulates less over the same weeks',
  accumulatedLight('2026-06-01', '2026-06-30', 'Triple') <
  accumulatedLight('2026-06-01', '2026-06-30', 'Single'), true)

// Colour scale
eq('single is the bright end', relativeLight('Single'), 1)
eq('triple is the dark end', relativeLight('Triple'), 0)
eq('double sits between, not squashed against triple',
  relativeLight('Double') > 0.4 && relativeLight('Double') < 0.6, true)

// --- Measured radiation ------------------------------------------------------
// Open-Meteo returns MJ/m² per day. A real stretch at this site ran 11.4 to
// 26.4, and 26.4 must land near the clear-sky ceiling or the two are not on the
// same scale.
near('26.4 MJ is about 54 mol of PAR', radiationToPar(26.4), 54.3, 0.5)
near('a dull 11.4 MJ day is about 23 mol', radiationToPar(11.4), 23.4, 0.5)
eq('the brightest measured day is near the modelled ceiling',
  Math.abs(radiationToPar(26.4) - dayLight('2026-09-05', undefined).openSky) < 4, true)

const payload = {
  daily: { time: ['2026-09-01'], temperature_2m_max: [31] },
  radiation: {
    time: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'],
    shortwave_radiation_sum: [21.37, 25.25, null, 22.98],
  },
}
const series = radiationSeries(payload)
eq('three usable days out of four', series.size, 3)
eq('a null reading is dropped, not read as darkness', series.has('2026-09-03'), false)
eq('the values come through', series.get('2026-09-02'), 25.25)
eq('a payload with no radiation gives an empty series',
  radiationSeries({ daily: { time: ['2026-09-01'] } }).size, 0)
eq('rubbish in gives an empty series, not a crash', radiationSeries(null).size, 0)
eq('and so does a radiation block missing its sums',
  radiationSeries({ radiation: { time: ['2026-09-01'] } }).size, 0)

const dull = measuredDayLight('2026-09-01', 'Single', series)
eq('a measured day says so', dull.measured, true)
near('and uses the measurement', dull.openSky, radiationToPar(21.37), 1e-9)
near('through the cloth', dull.atBed, radiationToPar(21.37) * 0.35, 1e-9)
eq('a cloudy day falls short of clear sky', dull.clearSkyFraction < 1, true)

const unmeasured = measuredDayLight('2026-01-15', 'Single', series)
eq('a day with no reading falls back to clear sky', unmeasured.measured, false)
eq('and is not penalised for it', unmeasured.clearSkyFraction, 1)
near('matching the clear-sky figure exactly',
  unmeasured.atBed, dayLight('2026-01-15', 'Single').atBed, 1e-9)

const span = accumulatedMeasuredLight('2026-09-01', '2026-09-04', 'Single', series)
eq('four days counted', span.days, 4)
eq('three of them measured', span.measuredDays, 3)
eq('the total is real', span.total > 0, true)
eq('a shadier bed accumulates less over the same measured span',
  accumulatedMeasuredLight('2026-09-01', '2026-09-04', 'Triple', series).total < span.total, true)
eq('backwards dates give nothing here too',
  accumulatedMeasuredLight('2026-09-04', '2026-09-01', 'Single', series).days, 0)

console.log(failures ? `\n  ${failures} failed` : '\n  Light per bed adds up.')
process.exit(failures ? 1 : 0)
