/** Checks fulfilment per variety. Run: npm run test:variety */
import { varietiesByBed, soleVarietyOf, varietyCoverage, coverageVerdict } from '../../src/services/varietySupply.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const plantings = [
  { bed: 'E3-01', plant: 'Hawaiian', date: '2026-01-10' },
  { bed: 'E3-02', plant: 'Hawaiian', date: '2026-01-10' },
  { bed: 'C1-01', plant: 'Jade',     date: '2026-02-01' },
  // A second variety alongside the first — 4,000 of one and 200 of another is
  // an ordinary planting, not a replant.
  { bed: 'E3-01', plant: 'Marble Queen', date: '2026-06-01' },
]
eq('a bed carries every variety standing on it',
  varietiesByBed(plantings).get('E3-01'), ['Hawaiian', 'Marble Queen'])
eq('a bed with one carries one', varietiesByBed(plantings).get('E3-02'), ['Hawaiian'])
eq('a cleared planting is not standing',
  varietiesByBed([...plantings, { bed:'C1-02', plant:'X', date:'2026-07-01', current:false }]).get('C1-02'),
  undefined)
eq('the same variety planted twice is still one variety',
  varietiesByBed([{ bed:'A-01', plant:'Jade', date:'2026-01-01' },
                  { bed:'A-01', plant:'Jade', date:'2026-03-01' }]).get('A-01'), ['Jade'])

const byBed = varietiesByBed(plantings)
eq('a bed with one variety speaks for its records', soleVarietyOf('E3-02', byBed), 'Hawaiian')
eq('a mixed bed does not — undefined, never a guess', soleVarietyOf('E3-01', byBed), undefined)
eq('an unknown bed is undefined', soleVarietyOf('Z-99', byBed), undefined)
eq('no bed is undefined', soleVarietyOf(undefined, byBed), undefined)

const rows = varietyCoverage({
  plantings,
  pruning: [{ bed:'E3-02', week:34, value:1000 }, { bed:'C1-01', week:34, value:800 }],
  counts:  [{ bed:'E3-02', week:34, value:900 }],
  demand:  [{ plant:'Hawaiian', week:34, requested:1200 },
            { plant:'Jade',     week:34, requested:500 }],
  week: 34,
})

const hawaiian = rows.find(r => r.variety === 'Hawaiian')!
const jade = rows.find(r => r.variety === 'Jade')!

eq('supply reaches a variety through its beds', hawaiian.forecast, 1000)
eq('a count beats the forecast', hawaiian.supply, 900)
eq('and is not an assumption', hawaiian.assumed, false)
eq('an uncounted variety falls back to the forecast', jade.supply, 800)
eq('and says it is assumed', jade.assumed, true)
eq('shortfall is signed', hawaiian.balance, -300)
eq('coverage as a percentage', hawaiian.coverage, 75)
eq('a covered variety caps at 100', jade.coverage, 100)
eq('worst coverage first', rows.map(r => r.variety), ['Hawaiian', 'Jade'])

// an uncounted variety is unknown, not zero
eq('no count anywhere means the forecast carries it',
  varietyCoverage({ plantings, pruning:[{bed:'E3-02',week:1,value:50}], counts:[],
    demand:[{plant:'Hawaiian',week:1,requested:10}], week:1 })[0].counted, undefined)

// demand for something not planted still shows, so it cannot be missed
eq('demand with no beds still appears',
  varietyCoverage({ plantings:[], pruning:[], counts:[],
    demand:[{plant:'Neon',requested:400}] }).map(r => [r.variety, r.supply, r.coverage]),
  [['Neon', 0, 0]])

// verdicts
eq('a shortfall names the worst', coverageVerdict(rows).headline, 'Hawaiian covers 75% of demand')
eq('one short variety warns', coverageVerdict([hawaiian]).tone, 'warn')
eq('nothing asked for is said plainly',
  coverageVerdict([{ ...jade, demand: 0 }]).headline, 'Nothing asked for yet')
eq('fully covered and counted reads good',
  coverageVerdict([{ ...hawaiian, demand: 500, balance: 400, coverage: 100, assumed: false }]).tone, 'good')


// ── interplanting on the header ─────────────────────────────────────────────
// The header carries the main crop AND a second variety raised for stock. They
// overlap: neither excludes the other, and only one of them is sellable.
const header = [
  { bed: 'E3-05', plant: 'Hawaiian',      position: 'Whole bed', purpose: 'Production' },
  { bed: 'E3-05', plant: 'Dieffenbachia', position: 'Header',    purpose: 'Propagation' },
]
eq('a bed carries both the crop and the interplanted stock',
   varietiesByBed(header).get('E3-05'), ['Dieffenbachia', 'Hawaiian'])
eq('but only the crop is sellable',
   varietiesByBed(header, { sellableOnly: true }).get('E3-05'), ['Hawaiian'])
eq('and with the stock excluded the bed speaks for its records',
   soleVarietyOf('E3-05', varietiesByBed(header, { sellableOnly: true })), 'Hawaiian')

// A count on that bed must not be credited to the mother material.
const headerRows = varietyCoverage({
  plantings: header,
  pruning: [],
  counts: [{ bed: 'E3-05', week: 40, value: 3000 }],
  demand: [{ plant: 'Hawaiian', week: 40, requested: 2000 },
           { plant: 'Dieffenbachia', week: 40, requested: 500 }],
  week: 40,
})
const byName = Object.fromEntries(headerRows.map((r) => [r.variety, r]))
eq('the count goes to the crop', byName['Hawaiian'].supply, 3000)
eq('the mother material offers nothing', byName['Dieffenbachia'].supply, 0)
eq('so demand for it reads as a shortfall, not a promise',
   byName['Dieffenbachia'].balance, -500)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
