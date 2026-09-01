/**
 * Freight mode decides which destinations can be named at all.
 * Run: npm run test:ports
 */
import { portOptions, portLabel, kindFor, mismatchedPort } from '../../src/services/portPicker.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const rows = [
  { name: 'MIA · Miami International Airport, United States', kind: 'Airport', country: 'United States' },
  { name: 'AMS · Amsterdam Airport Schiphol, Netherlands', kind: 'Airport', country: 'Netherlands' },
  { name: 'NLRTM · Rotterdam, Netherlands', kind: 'Seaport', country: 'Netherlands' },
  { name: 'HNPCR · Puerto Cortes, Honduras', kind: 'Seaport', country: 'Honduras' },
  { name: 'XXX · Closed, Nowhere', kind: 'Airport', active: false },
]

eq('by air offers airports only',
  portOptions(rows, 'Air').map((o) => o.value.slice(0, 3)), ['AMS', 'MIA'])
eq('by sea offers seaports only',
  portOptions(rows, 'Sea').map((o) => o.value.slice(0, 5)), ['HNPCR', 'NLRTM'])
// A price with no mode applies to either, so it must be able to name either.
eq('no mode offers everywhere', portOptions(rows).length, 4)
eq('a place no longer served is never offered',
  portOptions(rows).some((o) => o.value.startsWith('XXX')), false)

eq('the field is named for what it will hold', [portLabel('Air'), portLabel('Sea'), portLabel('')],
  ['Airport', 'Seaport', 'Port or airport'])
eq('mode words are read loosely', [kindFor('air'), kindFor(' Sea '), kindFor('Rail')],
  ['Airport', 'Seaport', null])

// Switching a saved row from sea to air leaves the seaport in the field.
// Clearing it silently would lose a deliberate choice, so it is named instead.
eq('a seaport under air freight is called out',
  mismatchedPort(rows, { port: 'NLRTM · Rotterdam, Netherlands', freightMode: 'Air' }),
  'NLRTM · Rotterdam, Netherlands is a seaport — freight by air needs an airport.')
eq('and the matching case is not',
  mismatchedPort(rows, { port: 'MIA · Miami International Airport, United States', freightMode: 'Air' }), null)
eq('nothing chosen is not a mismatch',
  mismatchedPort(rows, { freightMode: 'Air' }), null)
eq('no mode is not a mismatch either',
  mismatchedPort(rows, { port: 'NLRTM · Rotterdam, Netherlands' }), null)

console.log(failures ? `\n  ${failures} failed` : '\n  A destination the freight can reach.')
process.exit(failures ? 1 : 0)
