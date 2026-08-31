/** Checks capacity from density. Run: npm run test:capacity */
import { geometryOf, groundCapacity, cableCapacity, capacityByField } from '../../src/services/bedCapacity.ts'

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

// A cable is a line: length only, and the width plays no part. So the same
// density gives the same answer in E as in C, where the ground does not.
const hanging = { plantsPerCableM: 4 }
eq('a cable at 4/m holds 149', cableCapacity(hanging, 'E3'), 149)
eq('and the same in a wider field', cableCapacity(hanging, 'C1'), 149)
eq('ground density does not fill a cable', cableCapacity(dense, 'E3'), null)
eq('cable density does not fill the ground', groundCapacity(hanging, 'E3'), null)

// The per-field table shown beside the density on the form.
const table = capacityByField(dense)
eq('one row per field', table.map((f) => f.fieldId), ['E3', 'C3', 'E1', 'C1'])
eq('area is carried so the figure can be checked', table[0].areaSqM, 44.64)
eq('a whole E field is 33 rows of 536', table[0].perField, 536 * 33)
eq('a whole C field is 27 rows of 804', table[1].perField, 804 * 27)
eq('an unrecorded density leaves the field blank too',
  capacityByField({}).every((f) => f.perRow === null && f.perField === null), true)
eq('asking for baskets uses the cable density',
  capacityByField(hanging, 'basket')[0].perRow, 149)

console.log(failures ? `\n  ${failures} failed` : '\n  Capacity follows the bed it is in.')
process.exit(failures ? 1 : 0)
