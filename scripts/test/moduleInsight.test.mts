/** Checks the per-module KPI services. Run: npm run test:modules */
import { laborSummary, workerPerformance } from '../../src/services/laborInsight.ts'
import { accountingSummary } from '../../src/services/accountingInsight.ts'
import { salesSummary } from '../../src/services/salesInsight.ts'
import { supplierSummary } from '../../src/services/supplierInsight.ts'
import { nutritionSummary } from '../../src/services/nutritionInsight.ts'
import { infrastructureSummary } from '../../src/services/infrastructureInsight.ts'
import { bedStatuses, bedHistory } from '../../src/services/bedState.ts'
import { changePct, isoWeek, daysFrom } from '../../src/services/period.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// A fixed Wednesday, so "this week" and "last week" are not the test's mood.
const TODAY = new Date('2026-08-26T12:00:00Z')
const thisWeek = '2026-08-24'   // Monday of the same ISO week
const lastWeek = '2026-08-17'

console.log('\n— period —')
eq('no baseline means no percentage', changePct(10, 0), undefined)
eq('a rise is positive', changePct(120, 100), 20)
eq('a fall is negative', changePct(80, 100), -20)
eq('ISO week of a known date', isoWeek(new Date('2026-01-05T00:00:00Z')), 2)
eq('a due date in the past is negative', daysFrom('2026-08-20', TODAY), -6)
eq('no date is not zero days', daysFrom(undefined, TODAY), null)

console.log('\n— labour —')
const sheets = [
  { worker: 'Ana',  date: thisWeek, activity: 'Pruning', hours: 8, pieces: 4000, boxes: 0, cost: 360 },
  { worker: 'Ana',  date: thisWeek, activity: 'Packing', hours: 2, pieces: 0,    boxes: 6, cost: 90 },
  { worker: 'Beto', date: thisWeek, activity: 'Pruning', hours: 6, pieces: 2000, boxes: 0, cost: 240 },
  { worker: 'Ana',  date: lastWeek, activity: 'Pruning', hours: 10, pieces: 5000, boxes: 0, cost: 450 },
]
const crew = [{ name: 'Ana', active: true }, { name: 'Beto', active: true }, { name: 'Cira', active: false }]
const lab = laborSummary(sheets, crew, TODAY)
eq('hours are this week only', lab.hours, 16)
eq('last week is kept for the comparison', lab.lastHours, 10)
eq('cost per thousand cuttings', lab.costPerThousand, 115)
eq('cuttings per hour', lab.perHour, 375)
eq('an inactive worker is not on the crew', lab.activeWorkers, 2)
eq('who logged time this week', lab.loggedThisWeek, 2)
eq('cost ranked by worker', lab.byWorker, [{ name: 'Ana', value: 450 }, { name: 'Beto', value: 240 }])
eq('hours by activity', lab.byActivity, [{ name: 'Pruning', value: 14 }, { name: 'Packing', value: 2 }])
eq('no timesheets means no rate rather than zero', laborSummary([], crew, TODAY).perHour, undefined)

const perf = workerPerformance(sheets, crew)
eq('two entries on one day is one day worked', perf[0].daysWorked, 2)
eq('output ranks the crew', perf.map((p) => p.name), ['Ana', 'Beto'])

console.log('\n— accounting —')
const acc = accountingSummary({
  invoices: [
    { customer: 'Verde', dueDate: '2026-07-01', total: 1000, balance: 1000, currency: 'HNL' },
    { customer: 'Verde', dueDate: '2026-09-30', total: 500,  balance: 500,  currency: 'HNL' },
    { customer: 'Otro',  dueDate: '2026-08-01', total: 100,  balance: 0,    currency: 'HNL' },
  ],
  bills: [{ supplier: 'AgroX', dueDate: '2026-09-01', total: 400, balance: 400, currency: 'HNL' }],
  expenses: [
    { date: '2026-08-05', category: 'Fuel',   amount: 200, currency: 'HNL' },
    { date: '2026-07-05', category: 'Fuel',   amount: 100, currency: 'HNL' },
    { date: '2026-08-09', category: 'Labour', amount: 900, currency: 'HNL' },
  ],
  payments: [{ type: 'Receipt', bankAccount: 'Main', amount: 300, currency: 'HNL', status: 'Cleared' }],
  accounts: [{ name: 'Main', currency: 'HNL', openingBalance: 1000, active: true }],
  rate: 25,
  today: TODAY,
})
eq('a settled invoice is not receivable', acc.receivable, 1500)
eq('what is owed out', acc.payable, 400)
eq('net position', acc.net, 1100)
eq('only the past-due part is overdue', acc.overdue, 1000)
eq('as a share of the receivable', acc.overdueShare, 67)
eq('the oldest unpaid, in days', acc.oldestDays, 56)
eq('cash is opening plus what cleared', acc.cash, 1300)
eq('this month against last', [acc.expensesThisMonth, acc.expensesLastMonth], [1100, 100])
eq('ageing reads oldest last', acc.ageing.map((b) => b.name), ['Current', '31-60'])
eq('spend ranked by category', acc.byCategory, [{ name: 'Labour', value: 900 }, { name: 'Fuel', value: 300 }])
eq('an empty ledger is not a crash', accountingSummary({
  invoices: [], bills: [], expenses: [], payments: [], accounts: [], rate: 25, today: TODAY,
}).receivable, 0)

console.log('\n— sales —')
const sal = salesSummary({
  orders: [
    { number: 'SO-1', customer: 'Verde', date: '2026-08-02', delivery: '2026-08-20', status: 'Confirmed', total: 800 },
    { number: 'SO-2', customer: 'Otro',  date: '2026-08-03', delivery: '2026-09-20', status: 'Confirmed', total: 200 },
    { number: 'SO-3', customer: 'Verde', date: '2026-08-04', status: 'Shipped',   total: 600 },
    { number: 'SO-4', customer: 'Verde', date: '2026-07-04', status: 'Delivered', total: 400 },
  ],
  shipments: [{ code: 'SHP-1', status: 'Shipped', etd: '2026-08-28' }],
  today: TODAY,
})
eq('open is what has not shipped', [sal.openOrders, sal.openValue], [2, 1000])
eq('a delivery date gone by is late', sal.lateOrders, 1)
eq('shipped value, month on month', [sal.shippedThisMonth, sal.shippedLastMonth], [600, 400])
eq('the average order spans every order with a value', sal.averageOrder, 500)
eq('concentration in the open book', [sal.topCustomer, sal.topShare], ['Verde', 80])
eq('a shipment still moving is in flight', sal.inFlight.length, 1)

console.log('\n— suppliers —')
const sup = supplierSummary({
  suppliers: [
    { name: 'AgroX', category: 'Inputs', active: true },
    { name: 'Plasti', category: 'Packaging', active: true },
    { name: 'Vieja', category: 'Inputs', active: false },
  ],
  orders: [
    { supplier: 'AgroX',  date: '2026-06-01', delivery: '2026-07-01', amount: 8000, status: 'Sent' },
    { supplier: 'Plasti', date: '2026-08-01', delivery: '2026-09-30', amount: 2000, status: 'Confirmed' },
    { supplier: 'AgroX',  date: '2025-05-01', amount: 9999, status: 'Received' },
  ],
  today: TODAY,
})
eq('inactive suppliers are not counted', [sup.activeSuppliers, sup.totalSuppliers], [2, 3])
eq('open orders and their value', [sup.openOrders, sup.openValue], [2, 10000])
eq('last year is not this year\'s spend', sup.spendThisYear, 10000)
eq('a PO past its delivery date', sup.lateOrders, 1)
eq('the oldest open PO, in days', sup.oldestDays, 86)
eq('single-sourcing shows as a share', [sup.topSupplier, sup.topShare], ['AgroX', 80])
eq('categories with one supplier each', sup.byCategory, [{ name: 'Inputs', value: 1 }, { name: 'Packaging', value: 1 }])

console.log('\n— nutrition —')
const nut = nutritionSummary({
  balances: [
    { bed: 'E3-01', nApplied: 10, nExtracted: 12, pApplied: 4, pExtracted: 2, kApplied: 8, kExtracted: 8, caApplied: 3, caExtracted: 1 },
    { bed: 'E3-02', nApplied: 5,  nExtracted: 4 },
  ],
  soil: [
    { bed: 'E3-01', sampleDate: '2026-01-10', ph: 4.9, organicMatter: 3, alSaturation: 40 },
    { bed: 'E3-01', sampleDate: '2026-06-10', ph: 6.2, organicMatter: 4, alSaturation: 10 },
    { bed: 'E3-02', sampleDate: '2026-06-10', ph: 5.0, organicMatter: 2, alSaturation: 35 },
  ],
  foliar: [{ bed: 'E3-03', sampleDate: '2026-06-11', n: 3 }],
  weights: [{ date: '2026-08-01', avgLeafWeight: 12, netWeight: 5, dryMatterPct: 20 }],
  today: TODAY,
})
eq('nitrogen is being mined', nut.elements[0].balance, -1)
eq('phosphorus is in surplus', nut.elements[1].balance, 2)
eq('only the deficits are named', nut.depleted, ['N'])
eq('an older sample does not outvote a newer one', nut.meanPh, 5.6)
eq('beds below the uptake threshold', nut.acidBeds, 1)
eq('beds with toxic aluminium', nut.aluminiumBeds, 1)
eq('every bed with any analysis', nut.bedsAnalysed, 3)
eq('days since the newest soil sample', nut.daysSinceSoil, 77)

console.log('\n— infrastructure —')
const infra = infrastructureSummary({
  shadehouses: [{ name: 'SH1', capacity: 10, active: true }],
  fields: [{ name: 'E3', rows: 3 }],
  beds: [
    { name: 'E3-01', field: 'E3' },
    { name: 'E3-01-1', field: 'E3' },
    { name: 'E3-02', field: 'E3' },
    { name: 'E3-03', field: 'E3', active: false },
  ],
  plantings: [{ bed: 'E3-01', plant: 'Hawaiian' }],
})
eq('an basket above a ground bed is one position', infra.positions, 3)
eq('positions against capacity, not records', infra.utilisation, 30)
eq('ground and air split', [infra.ground, infra.air], [3, 1])
eq('beds carrying a crop', [infra.planted, infra.idle], [1, 3])
eq('levels read ground first', infra.byLevel.map((l) => l.name), ['Ground', 'Air 1'])

console.log('\n— bed state —')
const status = bedStatuses({
  plantings: [
    { bed: 'E3-01', plant: 'Pothos / Hawaiian', date: '2026-01-05' },
    { bed: 'E3-02', plant: 'Pothos / Jade', date: '2026-08-20' },
    { bed: 'E3-03', plant: 'Pothos / Neon', date: '2026-03-01' },
    { bed: 'E3-04', plant: 'Pothos / Jade', date: '2026-01-01', current: false },
  ],
  plants: [
    { name: 'Pothos', variety: 'Hawaiian', weeksToFirstHarvest: 12 },
    { name: 'Pothos', variety: 'Jade', weeksToFirstHarvest: 12 },
  ],
  treatments: [{ bed: 'E3-01', date: '2026-08-20', type: 'Pest control' }],
  today: TODAY,
})
eq('a bed treated for pests is flagged', status.get('E3-01')?.state, 'issue')
eq('freshly planted reads as planted', status.get('E3-02')?.state, 'planted')
eq('no cycle on file means growing, never ready', status.get('E3-03')?.state, 'growing')
eq('a cleared seeding leaves the bed out', status.has('E3-04'), false)
eq('the first cut is dated from the cycle', status.get('E3-02')?.expectedHarvest, '2026-11-12')

const hist = bedHistory('E3-01', {
  plantings: [{ bed: 'E3-01', plant: 'Hawaiian', date: '2026-01-05', qty: 500 }],
  harvest: [{ bed: 'E3-01', date: '2026-05-05', qty: 900, quality: 'Export' }],
  irrigation: [{ bed: 'E3-02', date: '2026-05-06', liters: 200 }],
})
eq('only this bed', hist.length, 2)
eq('newest first', hist[0].date, '2026-05-05')
eq('a bed with nothing recorded has no history', bedHistory('E9-99', {}).length, 0)


console.log('\n— mixed beds —')
// 4,000 of one variety and 200 of another on the same bed is an ordinary
// seeding here, and every figure attributed through that bed has to cope.
const mixed = bedStatuses({
  plantings: [
    { bed: 'E3-01', plant: 'Pothos / Hawaiian', date: '2026-05-01', qty: 4000 },
    { bed: 'E3-01', plant: 'Pothos / Jade', date: '2026-05-20', qty: 200 },
    { bed: 'E3-02', plant: 'Pothos / Jade', date: '2026-05-01', qty: 3000 },
  ],
  plants: [{ name: 'Pothos', variety: 'Hawaiian', weeksToFirstHarvest: 12 },
           { name: 'Pothos', variety: 'Jade', weeksToFirstHarvest: 12 }],
  today: TODAY,
})
eq('a mixed bed lists both varieties',
   mixed.get('E3-01')?.varieties, ['Pothos / Hawaiian', 'Pothos / Jade'])
eq('and reads as both', mixed.get('E3-01')?.variety, 'Pothos / Hawaiian + Pothos / Jade')
eq('a single-variety bed is unchanged', mixed.get('E3-02')?.varieties, ['Pothos / Jade'])
eq('readiness follows the oldest seeding, the one nearest cutting',
   mixed.get('E3-01')?.plantedDate, '2026-05-01')

console.log(failures === 0 ? '\n  all passed\n' : `\n  ${failures} FAILED\n`)
process.exit(failures === 0 ? 0 : 1)
