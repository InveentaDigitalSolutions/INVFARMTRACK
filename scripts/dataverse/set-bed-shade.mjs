/**
 * Sets the shade level over runs of beds.
 *
 * Shade is recorded per bed but strung over whole runs, so it is described the
 * way the nursery talks about it — a field, a row range, and how many layers
 * are over it — rather than a hundred and twenty separate edits.
 *
 * The spec is a JSON file or an inline argument, each entry:
 *
 *   { "field": "E3", "from": 1, "to": 12, "shade": "Double" }
 *   { "field": "C1", "shade": "Triple" }            // the whole field
 *   { "field": "E1", "from": 5, "to": 5, "level": 0, "shade": "Single" }
 *
 * `level` is optional: without it every bed over those rows is set, ground and
 * air alike. Rows are inclusive.
 *
 * Run:  npm run dataverse:bed-shade -- shade.json
 *       npm run dataverse:bed-shade -- shade.json --yes
 * Without --yes it prints what it would change and stops.
 */
import { readFileSync } from 'node:fs'
import { headers, entitySets, BASE } from './dv.mjs'

const SHADE = { Single: 121320000, Double: 121320001, Triple: 121320002 }

const args = process.argv.slice(2)
const confirmed = args.includes('--yes')
const specPath = args.find((a) => !a.startsWith('--'))
if (!specPath) {
  console.log('\n  Give a spec file: npm run dataverse:bed-shade -- shade.json\n')
  process.exit(1)
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'))
const runs = Array.isArray(spec) ? spec : [spec]

for (const r of runs) {
  if (!r.field) throw new Error(`Every run needs a field: ${JSON.stringify(r)}`)
  if (!(r.shade in SHADE)) {
    throw new Error(`"${r.shade}" is not one of Single, Double, Triple — in ${JSON.stringify(r)}`)
  }
}

const h = await headers()
const sets = await entitySets(h)
const meta = sets.get('bv_beds')
if (!meta) throw new Error('bv_beds not found in this environment')

// Every bed once, with its name parsed the way the app parses it.
const beds = []
let url = `${BASE}/${meta.EntitySetName}?$select=${meta.PrimaryIdAttribute},bv_bedname,bv_shadelevel&$top=5000`
while (url) {
  const res = await fetch(url, { headers: { ...h, Prefer: 'odata.maxpagesize=5000' } })
  if (!res.ok) throw new Error(`read failed: ${res.status} ${await res.text()}`)
  const body = await res.json()
  beds.push(...body.value)
  url = body['@odata.nextLink'] ?? null
}

/** "E3-01" -> {field:"E3", row:1, level:0}; "E3-01-2" -> level 2. */
const parse = (name) => {
  const m = /^(.+?)-(\d{2,})(?:-([1-3]))?$/.exec(String(name ?? ''))
  return m ? { field: m[1], row: Number(m[2]), level: m[3] ? Number(m[3]) : 0 } : null
}

const planned = new Map() // bed id -> { name, shade }
for (const run of runs) {
  const from = run.from ?? 1
  const to = run.to ?? Number.MAX_SAFE_INTEGER
  for (const bed of beds) {
    const at = parse(bed.bv_bedname)
    if (!at || at.field !== run.field) continue
    if (at.row < from || at.row > to) continue
    if (run.level !== undefined && at.level !== run.level) continue
    // A later run wins, so overlapping specs read top to bottom.
    planned.set(bed[meta.PrimaryIdAttribute], { name: bed.bv_bedname, shade: run.shade })
  }
}

if (planned.size === 0) {
  console.log('\n  No bed matched that spec. Nothing to do.\n')
  process.exit(1)
}

const byShade = new Map()
for (const { shade } of planned.values()) byShade.set(shade, (byShade.get(shade) ?? 0) + 1)

console.log(`\n  ${planned.size} of ${beds.length} beds would be set:\n`)
for (const [shade, count] of byShade) console.log(`    ${shade.padEnd(8)} ${String(count).padStart(4)}`)

const untouched = beds.length - planned.size
if (untouched > 0) console.log(`\n  ${untouched} beds are not in the spec and keep whatever they have.`)

if (!confirmed) {
  console.log('\n  Preview only. Re-run with --yes to write.\n')
  process.exit(0)
}

let done = 0
let failed = 0
for (const [id, { name, shade }] of planned) {
  const res = await fetch(`${BASE}/${meta.EntitySetName}(${id})`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ bv_shadelevel: SHADE[shade] }),
  })
  if (res.ok) { done++; continue }
  failed++
  console.log(`  ${name}: ${res.status} ${(await res.text()).slice(0, 140)}`)
}

console.log(failed === 0
  ? `\n  ${done} beds set.\n`
  : `\n  ${done} set, ${failed} failed.\n`)
process.exit(failed === 0 ? 0 : 1)
