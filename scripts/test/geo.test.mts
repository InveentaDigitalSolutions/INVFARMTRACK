/**
 * Distance between places. Run: npm run test:geo
 */
import { distanceKm, formatKm } from '../../src/services/geo.ts'
import { portDistanceKm } from '../../src/services/portPicker.ts'

let failures = 0
const near = (label: string, got: number | null, want: number, tol: number) => {
  const pass = got !== null && Math.abs(got - want) <= tol
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(50)} ${got === null ? 'null' : got.toFixed(0)}${pass ? '' : ` want ${want}±${tol}`}`)
}
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(50)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// Great-circle distances, checked against an independent haversine rather
// than against memory: the first version of this test asserted 1,291 km for
// San Pedro Sula to Miami, which is the figure for somewhere else.
near('San Pedro Sula to Miami', distanceKm(
  { latitude: 15.4526, longitude: -87.9236 }, { latitude: 25.7932, longitude: -80.2906 }), 1396.6, 2)
near('San Pedro Sula to Amsterdam', distanceKm(
  { latitude: 15.4526, longitude: -87.9236 }, { latitude: 52.3086, longitude: 4.7639 }), 8833.7, 3)
near('a place to itself is nowhere at all',
  distanceKm({ latitude: 15, longitude: -87 }, { latitude: 15, longitude: -87 }), 0, 0.001)

// A port with no position is not at the nursery's front gate.
eq('no coordinates means no distance, not zero',
  distanceKm({ latitude: 15, longitude: -87 }, { latitude: null, longitude: null }), null)
eq('and an empty string is not a coordinate either',
  distanceKm({ latitude: 15, longitude: -87 }, { latitude: '', longitude: '' }), null)

// From the nursery, through the picker.
const rows = [
  { name: 'MIA · Miami International Airport, United States', kind: 'Airport', latitude: 25.7932, longitude: -80.2906 },
  { name: 'ZZZ · Nowhere, Nowhere', kind: 'Airport' },
]
near('the nursery to Miami', portDistanceKm(rows, rows[0].name), 1442.6, 3)
eq('a port with no position says nothing', portDistanceKm(rows, rows[1].name), null)
eq('nor does one nobody chose', portDistanceKm(rows, ''), null)
eq('formatted for reading', [formatKm(1396.6), formatKm(null)], ['1,397 km', ''])

console.log(failures ? `\n  ${failures} failed` : '\n  Distances measured, or refused.')
process.exit(failures ? 1 : 0)
