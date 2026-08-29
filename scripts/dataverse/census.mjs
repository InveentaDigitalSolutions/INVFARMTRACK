/**
 * How many rows sit in each table the app reads.
 *
 * Before clearing demo data, and after entering real data, the first question
 * is always the same: what is actually in there. Printed in the app's own
 * table names so it lines up with the screens.
 *
 * Run: npm run dataverse:census
 */
import { headers, entitySets, allIds, bindings, enabledTables } from './dv.mjs'

const h = await headers()
const sets = await entitySets(h)
const map = bindings()

const rows = []
for (const key of enabledTables().sort()) {
  const b = map[key]
  if (!b) { rows.push([key, '(unmapped)', '—']); continue }
  const meta = sets.get(b.dataSource)
  if (!meta) { rows.push([key, b.dataSource, 'no such table']); continue }
  const ids = await allIds(h, meta.EntitySetName, meta.PrimaryIdAttribute)
  rows.push([key, b.dataSource, ids === null ? 'unreadable' : String(ids.length)])
}

const w = Math.max(...rows.map((r) => r[0].length))
let total = 0
for (const [key, table, count] of rows) {
  if (/^\d+$/.test(count)) total += Number(count)
  const bar = /^\d+$/.test(count) && Number(count) > 0 ? '  ●' : ''
  console.log(`  ${key.padEnd(w)}  ${count.padStart(6)}  ${table}${bar}`)
}
console.log(`\n  ${'total'.padEnd(w)}  ${String(total).padStart(6)} rows across ${rows.length} tables`)
