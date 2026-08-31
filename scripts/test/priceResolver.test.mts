/** Checks how a price is chosen. Run: npm run test:price */
import { resolvePrice, unpriced } from '../../src/services/priceResolver.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}
const priceOf = (rows: never[], q: never) => resolvePrice(rows, q)?.price ?? null

// A list priced the way a nursery actually prices: a general figure, then
// narrower overrides where they were negotiated.
const rows = [
  { plant: 'Hawaiian', priceEXT: 0.22 },                                        // anyone, anywhere
  { plant: 'Hawaiian', customer: 'Costa Farms', priceEXT: 0.20 },               // this customer
  { plant: 'Hawaiian', customer: 'Costa Farms', port: 'Miami', priceEXT: 0.19 },// and into Miami
  { plant: 'Hawaiian', port: 'Rotterdam', priceEXT: 0.27 },                     // anyone, into Rotterdam
  { plant: 'Hawaiian', product: 'Tips', priceEXT: 0.31 },                       // a different product
  { plant: 'Jade', customer: 'Costa Farms', priceEXT: 0.18 },
] as never[]

eq('the general price when nothing narrower fits',
  priceOf(rows, { plant: 'Hawaiian', customer: 'Someone Else', port: 'Miami', product: 'L&E' } as never), 0.22)
eq('a customer price beats the general one',
  priceOf(rows, { plant: 'Hawaiian', customer: 'Costa Farms', port: 'Amsterdam', product: 'L&E' } as never), 0.20)
eq('and customer-and-port beats customer alone',
  priceOf(rows, { plant: 'Hawaiian', customer: 'Costa Farms', port: 'Miami', product: 'L&E' } as never), 0.19)
eq('a port price applies to any customer',
  priceOf(rows, { plant: 'Hawaiian', customer: 'Someone Else', port: 'Rotterdam', product: 'L&E' } as never), 0.27)
eq('product is part of the key, not decoration',
  priceOf(rows, { plant: 'Hawaiian', customer: 'Someone Else', port: 'Miami', product: 'Tips' } as never), 0.31)
eq('a different variety is a different price',
  priceOf(rows, { plant: 'Jade', customer: 'Costa Farms', port: 'Miami', product: 'L&E' } as never), 0.18)

// The whole point. An invoice used to fall back to $0.020 a cutting when
// nothing matched — a price nobody agreed, on a fiscal document.
eq('an unpriced variety gives nothing, not a default',
  priceOf(rows, { plant: 'Marble Queen', customer: 'Costa Farms' } as never), null)
eq('and an unpriced customer for a variety with no general price',
  priceOf(rows, { plant: 'Jade', customer: 'Someone Else' } as never), null)
eq('no variety, no price', priceOf(rows, { plant: '' } as never), null)

// A row that pins down something the question does not mention cannot be used:
// a Miami price is not the answer to "what does this cost", unspecified.
eq('a port-specific row does not answer a question with no port',
  priceOf([{ plant: 'Hawaiian', port: 'Miami', priceEXT: 0.19 }] as never, { plant: 'Hawaiian' } as never), null)

// Dates
const dated = [
  { plant: 'Hawaiian', priceEXT: 0.20, effectiveFrom: '2026-01-01', effectiveTo: '2026-06-30' },
  { plant: 'Hawaiian', priceEXT: 0.24, effectiveFrom: '2026-07-01' },
] as never[]
eq('the price in force in March', priceOf(dated, { plant: 'Hawaiian', on: '2026-03-15' } as never), 0.20)
eq('and the one in force in August', priceOf(dated, { plant: 'Hawaiian', on: '2026-08-15' } as never), 0.24)
eq('before any of them, nothing', priceOf(dated, { plant: 'Hawaiian', on: '2025-12-01' } as never), null)

// Ties go to the most recent correction, not to whichever was entered first.
const corrected = [
  { plant: 'Hawaiian', customer: 'Costa Farms', priceEXT: 0.20, effectiveFrom: '2026-01-01' },
  { plant: 'Hawaiian', customer: 'Costa Farms', priceEXT: 0.21, effectiveFrom: '2026-05-01' },
] as never[]
eq('the later of two equally specific rows wins',
  priceOf(corrected, { plant: 'Hawaiian', customer: 'Costa Farms', on: '2026-08-01' } as never), 0.21)

// Rows that are not prices
eq('an inactive row is ignored',
  priceOf([{ plant: 'Hawaiian', priceEXT: 0.22, active: false }] as never, { plant: 'Hawaiian' } as never), null)
eq('a row with no export price is not a price',
  priceOf([{ plant: 'Hawaiian', priceINT: 0.1 }] as never, { plant: 'Hawaiian' } as never), null)
eq('nor is one priced at zero',
  priceOf([{ plant: 'Hawaiian', priceEXT: 0 }] as never, { plant: 'Hawaiian' } as never), null)

// What the packing screen shows: which lines cannot be priced, by name.
const missing = unpriced(rows, [
  { plant: 'Hawaiian', customer: 'Costa Farms', product: 'L&E' },
  { plant: 'Marble Queen', customer: 'Costa Farms', size: 'Regular', product: 'L&E' },
  { plant: 'Neon', customer: 'Costa Farms', product: 'L&E' },
] as never)
eq('only the ones that cannot be priced', missing.length, 2)
eq('and they are named', missing.map((m) => m.label),
  ['Marble Queen · Regular · L&E', 'Neon · L&E'])
eq('nothing to price is not a failure', unpriced(rows, []), [])

// Freight mode. Everything goes by air today, but air and sea into the same
// port are different money, and the list has to be able to hold both.
const freight = [
  { plant: 'Hawaiian', port: 'Miami', priceEXT: 0.30 },
  { plant: 'Hawaiian', port: 'Miami', freightMode: 'Sea', priceEXT: 0.22 },
] as never
eq('by air takes the row that does not name a mode',
  resolvePrice(freight, { plant: 'Hawaiian', port: 'Miami', freightMode: 'Air' })?.price, 0.30)
eq('by sea takes the mode-specific row',
  resolvePrice(freight, { plant: 'Hawaiian', port: 'Miami', freightMode: 'Sea' })?.price, 0.22)
eq('a mode-specific row is not used when no mode was asked',
  resolvePrice([{ plant: 'Hawaiian', freightMode: 'Sea', priceEXT: 0.22 }] as never,
    { plant: 'Hawaiian' }), null)
eq('freight beats nothing but loses to nothing either — port still counts',
  resolvePrice([
    { plant: 'Hawaiian', freightMode: 'Air', priceEXT: 0.31 },
    { plant: 'Hawaiian', port: 'Miami', freightMode: 'Air', priceEXT: 0.28 },
  ] as never, { plant: 'Hawaiian', port: 'Miami', freightMode: 'Air' })?.price, 0.28)

console.log(failures ? `\n  ${failures} failed` : '\n  A price is chosen, or refused.')
process.exit(failures ? 1 : 0)
