/**
 * Checks that what the screens display actually exists in the data.
 *
 * Four columns have already been found rendering blank for every row —
 * Season on fields, Material on beds, Position on fields, Invoice Name on
 * plants — each one a leftover from removing a Dataverse column and updating
 * the form but not the table. They are invisible in code review and obvious
 * to whoever opens the screen, which is the wrong way round.
 *
 * Run: npm run dataverse:check-columns
 */
import { readFileSync, readdirSync } from 'node:fs'

const tableMap = readFileSync('src/services/tableMap.ts', 'utf8')

/** app table key -> the fields its binding maps */
const bindings = {}
for (const m of tableMap.matchAll(/^ {2}(\w+): \{\s*\n\s*dataSource: "(\w+)",([\s\S]*?)\n {2}\},/gm)) {
  const [, key, , body] = m
  // Bindings put several pairs on one line, so this cannot anchor to the
  // start of a line — doing so missed every pair but the first and reported
  // real columns as missing.
  const fields = [...body.matchAll(/(\w+): "(?:bv_|_bv_)/g)].map((f) => f[1])
  bindings[key] = new Set([...fields, 'id'])
}

// Fields the app computes rather than stores are legitimately absent from a
// binding; listing them keeps the check honest rather than noisy.
//
// `status` used to be on this list, and that is how a Status control on the
// seeding form shipped bound to no column at all: it was written on every save
// and dropped, so "Active Seedings" read zero for every real record. Status is
// a genuine column on invoices, orders and shipments — allowlisting the name
// everywhere hid the one place it was a fiction.
const DERIVED = new Set(['actions', 'total', 'count', 'items', 'progress'])

let problems = 0
for (const file of readdirSync('src/pages').filter((f) => f.endsWith('.tsx'))) {
  const src = readFileSync(`src/pages/${file}`, 'utf8')

  // Each DataTable's columns, paired with the records it renders.
  for (const table of src.matchAll(/<DataTable\b([\s\S]{0,2000}?)\/>/g)) {
    const body = table.group ?? table[1]
    const rows = /data=\{(\w+)\}/.exec(body)?.[1]
    if (!rows) continue

    // Which binding those records came from.
    const bound = new RegExp(`useRecords[^(]*\\(\\s*"(\\w+)"\\s*,\\s*\\w*${rows}|const \\[${rows}\\b[^=]*=\\s*useRecords[^(]*\\(\\s*"(\\w+)"`)
      .exec(src)
    const key = bound?.[1] ?? bound?.[2]
    if (!key || !bindings[key]) continue

    for (const col of body.matchAll(/\{\s*key: "(\w+)"/g)) {
      const field = col[1]
      if (bindings[key].has(field) || DERIVED.has(field)) continue
      problems++
      const line = src.slice(0, table.index + col.index).split('\n').length
      console.log(`\n  ${file}:${line}`)
      console.log(`     shows "${field}" from ${key}, which its binding does not map`)
      console.log(`     mapped: ${[...bindings[key]].join(', ')}`)
    }
  }
}

console.log(problems === 0
  ? '\nEvery displayed column exists in its table binding.'
  : `\n${problems} column(s) would render blank for every row.`)
process.exit(problems ? 1 : 0)
