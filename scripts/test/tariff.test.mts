/**
 * The customs heading a shipment travels under. Run: npm run test:tariff
 */
import { hsCodeFor, tariffFor, countryFor } from '../../src/services/tariff.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const code = (q: Parameters<typeof hsCodeFor>[0]) => hsCodeFor(q)?.code ?? null

eq('unrooted cuttings', code({ productType: 'URC', cuttingType: 'L&E' }), '0602.10')
eq('rooted cuttings are a different heading', code({ productType: 'RC', cuttingType: 'L&E' }), '0602.90')
// Bulbs are not cuttings at all, whatever the rooting column says.
eq('bulbs are chapter 0601', code({ productType: 'URC', cuttingType: 'Bulbs' }), '0601.10')
eq('and stay 0601 when rooted', code({ productType: 'RC', cuttingType: 'Bulbs' }), '0601.10')
eq('tips are cut material', code({ cuttingType: 'Tips' }), '0602.10')
eq('eyes too', code({ cuttingType: 'E' }), '0602.10')

// 0602.10 covers most of what leaves the nursery, which is exactly why it must
// not be the default: printed by default it prints on the box of bulbs too.
eq('nothing said, nothing claimed', code({}), null)

eq('a broker overrules the derivation',
  tariffFor({ productType: 'URC', cuttingType: 'L&E', hsCode: '0602.90' })?.code, '0602.90')
eq('an unrecognised code is still printed, and marked as typed',
  tariffFor({ hsCode: '0603.11' }), { code: '0603.11', description: 'Entered by hand' })

eq('Honduras trades in lempira', countryFor('Honduras')?.currency, 'HNL')
eq('found by code as well', countryFor('NL')?.name, 'Netherlands')
eq('the long form of the United States is the same country',
  countryFor('United States of America')?.code, 'US')
eq('and an unknown name is not guessed at', countryFor('Freedonia'), null)
// The port lists say "United States", the ISO file says "United States of
// America". One country, two sources, and the app must not treat it as two.
eq('the port lists\' spelling matches too', countryFor('United States')?.currency, 'USD')

console.log(failures ? `\n  ${failures} failed` : '\n  A heading, or an honest blank.')
process.exit(failures ? 1 : 0)
