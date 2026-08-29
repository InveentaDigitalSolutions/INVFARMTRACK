/** Checks what a save actually writes. Run: npm run test:sync */
import { planWrites, differs } from '../../src/services/syncPlan.ts'

let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(58)} ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

eq('the id is not part of the comparison', differs({ id: 'a', n: 1 }, { id: 'b', n: 1 }), false)
eq('a changed cell is a change', differs({ n: 1 }, { n: 2 }), true)
eq('a cell that appears is a change', differs({ n: 1 }, { n: 1, m: 3 }), true)

const current = [
  { id: 'g1', name: 'Ana', hours: 8 },
  { id: 'g2', name: 'Beto', hours: 4 },
]

eq('nothing changed writes nothing', planWrites(current, current), { create: [], update: [], remove: [] })

eq('a row with no id is created',
  planWrites(current, [...current, { name: 'Cira' } as never]).create.length, 1)

// The shipments bug: the page named the row itself, so it carried an id the
// store had never issued and was treated as an update to a missing record.
const minted = planWrites(current, [...current, { id: 'SHP-2026-001', name: 'Cira' }])
eq('an id the store never issued is a create', minted.create.map((r) => r.id), ['SHP-2026-001'])
eq('and not an update', minted.update.length, 0)

const edited = planWrites(current, [{ id: 'g1', name: 'Ana', hours: 9 }, current[1]])
eq('an edited row updates', edited.update.map((u) => u.id), ['g1'])
eq('and nothing else moves', [edited.create.length, edited.remove.length], [0, 0])

const dropped = planWrites(current, [current[0]])
eq('a removed row deletes', dropped.remove, ['g2'])

const replaced = planWrites(current, [{ id: 'g3', name: 'Dani' }])
eq('a wholesale swap deletes both and creates one',
  [replaced.remove, replaced.create.map((r) => r.id)], [['g1', 'g2'], ['g3']])

eq('an empty page clears the table', planWrites(current, []).remove, ['g1', 'g2'])
eq('a first row into an empty table is a create', planWrites([], [{ name: 'Ana' }]).create.length, 1)

console.log(failures === 0 ? '\n  all passed\n' : `\n  ${failures} FAILED\n`)
process.exit(failures === 0 ? 0 : 1)
