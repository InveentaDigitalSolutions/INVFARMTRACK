/** Checks capacity from density. Run: npm run test:capacity */
import { geometryOf, groundCapacity, cableCapacity, basketsPerCable, capacityByField } from '../../src/services/bedCapacity.ts'

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

// A cable is a series of small areas — the baskets — so the same density
// applies inside them. Until the baskets are measured there is no area to
// multiply by, and the honest answer is null rather than a guess.
eq('an unmeasured basket gives no capacity', cableCapacity(dense, 'E3'), null)
eq('nor a count of baskets on the cable', basketsPerCable('E3'), null)

// The per-field table shown beside the density on the form.
const table = capacityByField(dense)
eq('one row per field', table.map((f) => f.fieldId), ['E3', 'C3', 'E1', 'C1'])
eq('area is carried so the figure can be checked', table[0].areaSqM, 44.64)
eq('a whole E field is 33 rows of 536', table[0].perField, 536 * 33)
eq('a whole C field is 27 rows of 804', table[1].perField, 804 * 27)
eq('an unrecorded density leaves the field blank too',
  capacityByField({}).every((f) => f.perRow === null && f.perField === null), true)
eq('and the per-field table says so too',
  capacityByField(dense, 'basket').every((f) => f.perRow === null), true)

console.log(failures ? `\n  ${failures} failed` : '\n  Capacity follows the bed it is in.')
process.exit(failures ? 1 : 0)
