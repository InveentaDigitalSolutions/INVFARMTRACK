/** Checks fulfilment per variety. Run: npm run test:variety */
import { varietyByBed, varietyCoverage, coverageVerdict } from '../../src/services/varietySupply.ts'

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
  // replanted later: the bed now carries a different variety
  { bed: 'E3-01', plant: 'Marble Queen', date: '2026-06-01' },
]
eq('a bed carries its latest planting', varietyByBed(plantings).get('E3-01'), 'Marble Queen')
eq('an untouched bed keeps its own', varietyByBed(plantings).get('E3-02'), 'Hawaiian')
eq('an inactive planting does not count',
  varietyByBed([...plantings, { bed:'C1-02', plant:'X', date:'2026-07-01', status:'Inactive' }]).get('C1-02'),
  undefined)

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

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
