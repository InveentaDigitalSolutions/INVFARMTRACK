/** Checks the per-bed light model. Run: npm run test:light */
import {
  clothTransmission, clearSkyIrradiance, dayLight, accumulatedLight,
  relativeLight, CLOTH_TRANSMISSION,
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

console.log(failures ? `\n  ${failures} failed` : '\n  Light per bed adds up.')
process.exit(failures ? 1 : 0)
