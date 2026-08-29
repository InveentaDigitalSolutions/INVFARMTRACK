/** Checks the stock ledger. Run: npm run test:stock */
import { stockLevels, lowStock, direction, describe } from '../../src/services/stock.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

eq('receiving adds', direction('Received'), 1)
eq('issuing takes away', direction('Issued'), -1)
eq('a write-off takes away', direction('Written off'), -1)
eq('a return puts back', direction('Returned'), 1)
eq('adjustments go both ways', [direction('Adjustment up'), direction('Adjustment down')], [1, -1])
eq('an unknown type moves nothing rather than guessing', direction('Whatever'), 0)

const moves = [
  { material: 'Drip line 16mm', date: '2026-08-01', type: 'Received', quantity: 500, unitCost: 1.2 },
  { material: 'Drip line 16mm', date: '2026-08-10', type: 'Issued',   quantity: 120 },
  { material: 'Drip line 16mm', date: '2026-08-15', type: 'Issued',   quantity: 80 },
  { material: 'Drip line 16mm', date: '2026-08-20', type: 'Returned', quantity: 20 },
  { material: 'Plastic basket', date: '2026-08-05', type: 'Received', quantity: 300, unitCost: 0.9 },
  { input:    'NPK 20-20-20',   date: '2026-08-06', type: 'Received', quantity: 40,  unitCost: 25 },
  { input:    'NPK 20-20-20',   date: '2026-08-18', type: 'Issued',   quantity: 12 },
]
const levels = stockLevels(moves)

eq('one row per item', levels.map(l => l.item), ['Drip line 16mm', 'NPK 20-20-20', 'Plastic basket'])
eq('on hand is the sum of movements', levels[0].onHand, 320)
eq('received and issued kept apart', [levels[0].received, levels[0].issued], [520, 200])
eq('inputs are stock too', levels.find(l => l.item === 'NPK 20-20-20')?.onHand, 28)
eq('the last movement is remembered', levels[0].lastMoved, '2026-08-20')
eq('value uses the latest price paid', levels[0].value, 384)
eq('no price means no value, not zero', stockLevels([
  { material: 'Twine', type: 'Received', quantity: 10 },
]) [0].value, undefined)

// a negative quantity must not flip a movement's meaning
eq('a negative quantity on an issue still removes',
  stockLevels([
    { material: 'X', type: 'Received', quantity: 100 },
    { material: 'X', type: 'Issued', quantity: -30 },
  ])[0].onHand, 70)

// going below zero is reported, not hidden — it means something is unrecorded
eq('stock can go negative and says so',
  stockLevels([{ material: 'Y', type: 'Issued', quantity: 5 }])[0].onHand, -5)

// low stock
const reorder = new Map([['Drip line 16mm', 400], ['Plastic basket', 100], ['NPK 20-20-20', undefined]])
const low = lowStock(levels, reorder)
eq('only what is at or below its level', low.map(l => l.item), ['Drip line 16mm'])
eq('and by how much', low[0].short, 80)
eq('no reorder level means never flagged', low.some(l => l.item === 'NPK 20-20-20'), false)
eq('a zero level is not a threshold', lowStock(levels, new Map([['Plastic basket', 0]])), [])

eq('a movement reads as a sentence',
  describe({ material: 'Drip line 16mm', type: 'Received', quantity: 500 }),
  'Drip line 16mm · received · 500')

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
