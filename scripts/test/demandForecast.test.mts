/** Checks the forecast grid/record transform. Run: npm run test:forecast */
import { toRecords, toGrid, weeksIn, weekTotals } from '../../src/services/demandForecast.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

const grid = [
  { variety: 'Pothos / Hawaiian', size: '9cm', type: 'Current Order', wk14: 10725, wk15: 0, wk16: 11500, total: 22225 },
  { variety: 'Pothos / Jade',     size: '9cm', type: 'Current Order', wk14: 12000, wk15: 0, wk16: 14750, total: 26750 },
]

eq('week columns found in order', weeksIn(grid), [14, 15, 16])

const records = toRecords(grid, { customer: 'The Plant Company', year: 2026, batch: 'apr-sheet' })
eq('one record per variety and week with a quantity', records.length, 4)
eq('a zero week produces no record', records.some(r => r.requested === 0), false)
eq('the context is carried', records[0].customer, 'The Plant Company')
eq('and the year', records[0].year, 2026)
eq('week is a number, not a column name', records[0].week, 14)
eq('status starts pending', records[0].status, 'Pending')

// round trip
const back = toGrid(records.map((r, i) => ({ ...r, id: String(i) })))
eq('two lines come back', back.length, 2)
eq('a week rebuilds into its column', back.find(r => r.variety === 'Pothos / Hawaiian')?.wk16, 11500)
eq('totals recomputed from the records', back.find(r => r.variety === 'Pothos / Jade')?.total, 26750)
eq('a zero week is absent rather than zero',
  back.find(r => r.variety === 'Pothos / Hawaiian')?.wk15, undefined)

// the same variety at two sizes must stay two lines
const twoSizes = toGrid([
  { id:'1', plant:'Pothos / Hawaiian', size:'9cm',  requestType:'Current Order', week:14, requested:100 },
  { id:'2', plant:'Pothos / Hawaiian', size:'12cm', requestType:'Current Order', week:14, requested:200 },
])
eq('one variety at two sizes stays two lines', twoSizes.length, 2)
eq('and their quantities are not merged', twoSizes.map(r => r.total).sort(), [100, 200])

// and one variety, one size, two request types
const twoTypes = toGrid([
  { id:'1', plant:'Jade', size:'9cm', requestType:'Current Order',      week:14, requested:50 },
  { id:'2', plant:'Jade', size:'9cm', requestType:'Additional Request', week:14, requested:75 },
])
eq('request types stay separate lines', twoTypes.length, 2)

eq('column totals across lines', weekTotals(grid), { 14: 22725, 15: 0, 16: 26250 })

// filtering by customer
const mixed = [
  { id:'1', customer:'A', plant:'Jade', size:'9cm', requestType:'Current Order', week:14, requested:10 },
  { id:'2', customer:'B', plant:'Jade', size:'9cm', requestType:'Current Order', week:14, requested:20 },
]
eq('one customer at a time', toGrid(mixed, 'A')[0].total, 10)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
