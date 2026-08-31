/** Checks capacity from density. Run: npm run test:capacity */
import { geometryOf, groundCapacity, cableCapacity, basketCapacity, basketAreaSqM, capacityByField } from '../../src/services/bedCapacity.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// The measured rows: E is 1.20 x 37.20, C is 1.80 x 37.20.
eq('an E row is 1.20 m wide', geometryOf('E3'), { widthM: 1.2, lengthM: 37.2 })
eq('a C row is 1.80 m wide', geometryOf('C1'), { widthM: 1.8, lengthM: 37.2 })
eq('an unknown field has no geometry', geometryOf('Z9'), null)

// This is the whole reason density replaced a count. 44.64 m² against 66.96.
const dense = { plantsPerSqM: 12 }
eq('an E row at 12/m² holds 536', groundCapacity(dense, 'E3'), 536)
eq('a C row at the same density holds 804', groundCapacity(dense, 'C1'), 804)
eq('which is exactly half as much again',
  groundCapacity(dense, 'C1')! / groundCapacity(dense, 'E3')! > 1.49, true)

// Null, never zero. Zero is a claim that the bed holds nothing, and an
// availability figure built on it would be a confident lie.
eq('no density gives null, not zero', groundCapacity({}, 'E3'), null)
eq('no plant at all gives null', groundCapacity(undefined, 'E3'), null)
eq('a zero density is treated as unrecorded', groundCapacity({ plantsPerSqM: 0 }, 'E3'), null)
eq('a negative density too', groundCapacity({ plantsPerSqM: -3 }, 'E3'), null)
eq('an unknown field gives null', groundCapacity(dense, 'Z9'), null)

// --- baskets -----------------------------------------------------------------
// A cable is a series of small areas. Every part comes from a recorded figure:
// the density for that basket size, the basket's area, and how many hang on
// the cable — which the nursery counts rather than deriving from a spacing.
const round25 = { name: 'Small', widthCm: 25, shape: 'Round', basketsPerCable: 60 }
const square20 = { name: 'Square', widthCm: 20, shape: 'Square', basketsPerCable: 70 }

// A 25 cm round basket is pi*0.125^2 = 0.0491 m². A 20 cm square is 0.04.
eq('a round basket uses the circle inside its width',
  Math.round(basketAreaSqM(round25)! * 10000) / 10000, 0.0491)
eq('a square one uses the whole square',
  Math.round(basketAreaSqM(square20)! * 10000) / 10000, 0.04)
eq('the shape genuinely matters — round is a fifth smaller',
  basketAreaSqM({ widthCm: 20, shape: 'Round' })! < basketAreaSqM(square20)!, true)

eq('one small basket at 40/m² holds 2', basketCapacity(40, round25), 2)
eq('and a cable of 60 of them holds 118', cableCapacity(40, round25), 118)
eq('a different size gives a different answer', cableCapacity(40, square20), 112)

// Null wherever a figure is missing: a capacity assembled from a guess reads
// exactly like one that was measured.
eq('no density, no capacity', cableCapacity(undefined, round25), null)
eq('no width, no capacity', cableCapacity(40, { basketsPerCable: 60 }), null)
eq('no count per cable, no capacity', cableCapacity(40, { widthCm: 25, shape: 'Round' }), null)
eq('no basket at all', cableCapacity(40, undefined), null)
eq('an unmeasured basket has no area', basketAreaSqM({ name: 'Small' }), null)

// The per-field table shown beside the density on the form.
const table = capacityByField(dense)
eq('one row per field', table.map((f) => f.fieldId), ['E3', 'C3', 'E1', 'C1'])
eq('area is carried so the figure can be checked', table[0].areaSqM, 44.64)
eq('a whole E field is 33 rows of 536', table[0].perField, 536 * 33)
eq('a whole C field is 27 rows of 804', table[1].perField, 804 * 27)
eq('an unrecorded density leaves the field blank too',
  capacityByField({}).every((f) => f.perRow === null && f.perField === null), true)


console.log(failures ? `\n  ${failures} failed` : '\n  Capacity follows the bed it is in.')
process.exit(failures ? 1 : 0)
