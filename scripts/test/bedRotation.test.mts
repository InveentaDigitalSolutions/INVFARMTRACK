/** Checks the bed rotation maths. Run: npm run test:rotation */
import { occupancies, rotationSummary, spanFraction } from '../../src/services/bedRotation.ts'
import { bedStatuses } from '../../src/services/bedState.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(50)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}
const END = new Date('2026-08-28T00:00:00Z')

// one bed turned over three times; another planted once and left
const plantings = [
  { bed: 'E3-01', plant: 'Pothos / Hawaiian', date: '2026-01-10', qty: 400 },
  { bed: 'E3-01', plant: 'Pothos / Jade',     date: '2026-04-10', qty: 380 },
  { bed: 'E3-01', plant: 'Pothos / Hawaiian', date: '2026-07-10', qty: 410 },
  { bed: 'C1-05', plant: 'Sansevieria',       date: '2026-02-01', qty: 300 },
]

const spans = occupancies(plantings, END)
eq('every planting becomes a span', spans.length, 4)
eq('a span runs until the next planting on that bed',
  spans.filter(s => s.bed === 'E3-01').map(s => [s.from, s.to]),
  [['2026-01-10','2026-04-10'],['2026-04-10','2026-07-10'],['2026-07-10','2026-08-28']])
eq('only the last is current', spans.filter(s => s.current).map(s => s.bed).sort(), ['C1-05','E3-01'])
eq('days are counted', spans.find(s => s.from === '2026-01-10')?.days, 90)

// an inactive planting is not an occupancy
eq('a cleared planting is ignored',
  occupancies([...plantings, { bed:'E3-02', plant:'X', date:'2026-03-01', current:false }], END)
    .some(s => s.bed === 'E3-02'), false)

const summary = rotationSummary(plantings, END)
eq('turnover is per bed', summary.map(s => [s.bed, s.turns]), [['C1-05',1],['E3-01',3]])
eq('the point of the view: same occupancy, different turnover',
  summary.map(s => s.turns), [1, 3])
eq('current crop is named', summary.find(s => s.bed === 'E3-01')?.currentPlant, 'Pothos / Hawaiian')
eq('average days per turn', summary.find(s => s.bed === 'E3-01')?.averageDays, 77)

// drawing
const START = new Date('2026-01-01T00:00:00Z')
const half = spanFraction({ from:'2026-01-01', to:'2026-05-01' }, START, new Date('2026-09-01T00:00:00Z'))
eq('a span starting at the window edge begins at 0', half?.left, 0)
eq('a span before the window is clipped, not dropped',
  spanFraction({ from:'2025-06-01', to:'2026-03-01' }, START, END)?.left, 0)
eq('a span entirely before the window disappears',
  spanFraction({ from:'2025-01-01', to:'2025-06-01' }, START, END), null)
eq('a zero-length span disappears',
  spanFraction({ from:'2026-03-01', to:'2026-03-01' }, START, END), null)

// --- cleared beds -----------------------------------------------------------
// A planting is standing until the day it comes off. The end date replaced a
// yes/no, which said whether a bed was clear now and never when it was cleared.
{
  const plants = [{ name: 'Pothos', variety: 'Jade',
    growthWeeksMinMarAug: 8, growthWeeksMaxMarAug: 10,
    growthWeeksMinSepFeb: 10, growthWeeksMaxSepFeb: 12 }]
  const today = new Date('2026-06-01T12:00:00Z')
  const at = (p: Record<string, unknown>) =>
    bedStatuses({ plantings: [{ bed: 'E3-01', plant: 'Jade', date: '2026-03-01', ...p }], plants, today })

  eq('no end date means still standing', at({}).has('E3-01'), true)
  eq('cleared in the past is gone', at({ endDate: '2026-05-01' }).has('E3-01'), false)
  eq('cleared today is gone today', at({ endDate: '2026-06-01' }).has('E3-01'), false)
  // The case a boolean cannot express at all: a bed booked to be cleared next
  // month is still carrying a crop right now.
  eq('an end date in the future is still standing', at({ endDate: '2026-08-01' }).has('E3-01'), true)
  eq('a blank end date is not read as cleared', at({ endDate: '' }).has('E3-01'), true)
}

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
