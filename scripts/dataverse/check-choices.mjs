/**
 * Checks every choice value the app can send against what Dataverse accepts.
 *
 * A choice column only takes its own option values. When a form offers a label
 * Dataverse does not have — "Drench" where the option set says "Soil Drench" —
 * the store logs and drops it, so the record saves with that column empty and
 * nobody notices until someone asks why the method is blank.
 *
 * The check is driven by tableMap.ts rather than by guesswork: for every app
 * field mapped to a choice column, it collects the values the page's forms and
 * seed rows use and compares them with the generated option map.
 *
 * Run: npm run dataverse:check
 * Exits non-zero when something would be rejected, so it can gate a build.
 */

import { readFileSync, readdirSync } from 'node:fs'

const CHOICE = JSON.parse(
  readFileSync('src/services/choiceMap.generated.ts', 'utf8').match(
    /CHOICE_MAP[^=]*=\s*(\{[\s\S]*?\n\});/
  )[1]
)

const ENTITY_SETS = new Set(
  JSON.parse(
    readFileSync('src/services/choiceMap.generated.ts', 'utf8').match(
      /ENTITY_SETS[^=]*=\s*(\[[\s\S]*?\]);/
    )[1]
  )
)

const tableMap = readFileSync('src/services/tableMap.ts', 'utf8')
const enabled = new Set(
  [...tableMap.slice(tableMap.indexOf('ENABLED_TABLES')).matchAll(/"(\w+)"/g)].map((m) => m[1])
)

const pages = Object.fromEntries(
  readdirSync('src/pages')
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => [f, readFileSync(`src/pages/${f}`, 'utf8')])
)

/** Which page owns a table key — the one whose useRecords names it. */
function ownerOf(key) {
  for (const [file, src] of Object.entries(pages))
    if (new RegExp(`useRecords[^(]*\\(\\s*"${key}"`).test(src)) return [file, src]
  return [null, '']
}

/**
 * The form definition for a table key. Forms are named `<entity>Fields`, with
 * the entity usually the singular of the table key ("treatments" ->
 * treatmentFields), so both spellings are tried.
 */
function formFor(key, src) {
  const singular = key.replace(/ies$/, 'y').replace(/s$/, '')
  for (const name of [key, singular]) {
    const m = src.match(new RegExp(`const ${name}Fields[^=]*=\\s*\\[([\\s\\S]*?)\\n\\];`))
    if (m) return m[1]
  }
  return null
}

let problems = 0

// A dataSource that is not a real entity set fails every read as a 404, which
// the screen shows as "no records" rather than an error.
for (const [, key, dataSource] of tableMap.matchAll(
  /^ {2}(\w+): \{\s*\n?\s*dataSource: "(\w+)"/gm
)) {
  if (!ENTITY_SETS.has(dataSource)) {
    problems++
    const near = [...ENTITY_SETS].filter((e) => e.slice(0, 9) === dataSource.slice(0, 9))
    console.log(`\n  ${key}: dataSource "${dataSource}" is not an entity set in this environment`)
    if (near.length) console.log(`     did you mean: ${near.join(', ')}`)
  }
}

for (const [, key, dataSource, body] of tableMap.matchAll(
  /^ {2}(\w+): \{\s*\n\s*dataSource: "(\w+)",([\s\S]*?)\n {2}\},/gm
)) {
  if (!enabled.has(key)) continue
  const columns = CHOICE[dataSource]
  if (!columns) continue

  const [file, src] = ownerOf(key)
  if (!file) continue

  for (const [, appField, column] of body.matchAll(/(\w+): "(bv_\w+)"/g)) {
    const options = columns[column]
    if (!options) continue

    // Scope to this table's own form. Pages hold several forms and most use
    // the same field names ("status", "method"), so searching the whole file
    // would union unrelated option lists and invent mismatches.
    const form = formFor(key, src)
    if (form === null) continue

    const used = new Set()
    for (const block of form.matchAll(
      new RegExp(`key: "${appField}"[\\s\\S]{0,140}?options: \\[([\\s\\S]{0,700}?)\\]`, 'g')
    ))
      for (const opt of block[1].matchAll(/value: "([^"]+)"/g)) used.add(opt[1])

    if (used.size === 0) continue

    const rejected = [...used].filter((v) => !(v in options))
    if (rejected.length === 0) continue

    problems++
    console.log(`\n  ${key}.${appField}  ->  ${dataSource}.${column}   (${file})`)
    console.log(`     app offers : ${[...used].join(', ')}`)
    console.log(`     Dataverse  : ${Object.keys(options).join(', ')}`)
    console.log(`     REJECTED   : ${rejected.join(', ')}`)
  }
}

if (problems === 0) {
  console.log('Bindings resolve and every choice value the app can send is one Dataverse accepts.')
} else {
  console.log(`\n${problems} problem(s) found — each would present as an empty screen or a silently empty column.`)
  process.exit(1)
}
