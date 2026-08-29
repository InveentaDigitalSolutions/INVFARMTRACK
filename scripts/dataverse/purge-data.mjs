/**
 * Clears the demo data out so real data can go in.
 *
 * Everything the app reads was written by seed-data.mjs. Five tables are
 * exempt because retyping them would be waste, not work:
 *
 *   exchangeRates  400 rows of real HNL/USD history from the central bank
 *   components     the chemistry the fertilisation maths runs on
 *   shadehouses    \
 *   fields          |  the physical nursery, kept by Santiago's decision
 *   beds           /
 *
 * Deletion order cannot be derived from the schema alone — a row that is
 * still the target of a lookup refuses to go — so this runs repeated passes
 * and stops when a pass deletes nothing. Anything still standing after that
 * is reported by name rather than swallowed.
 *
 * Run: npm run dataverse:purge -- --yes
 * Preview (default): npm run dataverse:purge
 */
import { headers, entitySets, allIds, bindings, enabledTables, BASE } from './dv.mjs'

const CONFIRMED = process.argv.includes('--yes')

/** App table keys whose rows survive. */
const KEEP = new Set(['exchangeRates', 'components', 'shadehouses', 'fields', 'beds'])

const h = await headers()
const sets = await entitySets(h)
const map = bindings()

const targets = []
for (const key of enabledTables().sort()) {
  if (KEEP.has(key)) continue
  const b = map[key]
  const meta = b && sets.get(b.dataSource)
  if (!meta) continue
  const ids = await allIds(h, meta.EntitySetName, meta.PrimaryIdAttribute)
  if (ids?.length) targets.push({ key, set: meta.EntitySetName, ids })
}

const total = targets.reduce((s, t) => s + t.ids.length, 0)
if (total === 0) { console.log('\n  Nothing to delete — every non-exempt table is already empty.\n'); process.exit(0) }

console.log(`\n  ${total} rows across ${targets.length} tables:\n`)
for (const t of targets) console.log(`    ${t.key.padEnd(20)} ${String(t.ids.length).padStart(5)}  ${t.set}`)
console.log(`\n  Kept: ${[...KEEP].join(', ')}`)

if (!CONFIRMED) {
  console.log('\n  Preview only. Re-run with --yes to delete.\n')
  process.exit(0)
}

/** One row. Returns true when it is gone, false when something still holds it. */
async function remove(set, id) {
  const res = await fetch(`${BASE}/${set}(${id})`, { method: 'DELETE', headers: h })
  if (res.ok || res.status === 404) return true
  const body = await res.text()
  // A lookup still pointing here is expected on the first passes.
  if (/cannot be deleted because it is referenced|dependent|Cascade/i.test(body)) return false
  throw new Error(`${set}(${id}): ${res.status} ${body.slice(0, 300)}`)
}

let outstanding = targets.map((t) => ({ ...t, ids: [...t.ids] }))
let pass = 0
while (outstanding.some((t) => t.ids.length)) {
  pass++
  let removed = 0
  for (const t of outstanding) {
    const left = []
    for (const id of t.ids) {
      if (await remove(t.set, id)) removed++
      else left.push(id)
    }
    t.ids = left
  }
  const remaining = outstanding.reduce((s, t) => s + t.ids.length, 0)
  console.log(`  pass ${pass}: deleted ${removed}, ${remaining} left`)
  if (removed === 0) break
  outstanding = outstanding.filter((t) => t.ids.length)
}

const stuck = outstanding.filter((t) => t.ids.length)
if (stuck.length) {
  console.log('\n  Still standing — something outside the app holds a reference:')
  for (const t of stuck) console.log(`    ${t.key.padEnd(20)} ${String(t.ids.length).padStart(5)}  ${t.set}`)
  process.exit(1)
}
console.log('\n  Clear. Run npm run dataverse:census to confirm.\n')
