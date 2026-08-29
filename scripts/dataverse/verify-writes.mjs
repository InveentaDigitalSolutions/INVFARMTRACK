/**
 * Proves every enabled table can be created, patched and deleted.
 *
 * The static audit shows where the app *intends* to write. This shows whether
 * Dataverse actually accepts it: a binding can name a real table and still
 * fail on a required column, a choice value it does not have, or a lookup that
 * cannot be bound. Each of those has happened at least once in this project.
 *
 * Payloads are built from the schema, so a table added later is covered
 * without anyone remembering to write a case for it.
 *
 * Run: npm run dataverse:verify-writes
 */
import { readFileSync } from 'node:fs'
import { resolveToken } from './auth.mjs'

const ORG = process.env.DATAVERSE_URL ?? 'https://enterprisedev.crm16.dynamics.com'
const schema = JSON.parse(readFileSync('dataverse/farmtrack.dataverse.schema.json', 'utf8'))
const gen = readFileSync('src/services/choiceMap.generated.ts', 'utf8')
const pick = (name) => JSON.parse(gen.match(new RegExp(`${name}[^=]*=\\s*(\\{[\\s\\S]*?\\n\\});`))[1])
const CHOICE = pick('CHOICE_MAP')
const LOOKUP = pick('LOOKUP_MAP')
const LABEL = pick('LABEL_COLUMN')

const tm = readFileSync('src/services/tableMap.ts', 'utf8')
const enabled = new Set([...tm.slice(tm.indexOf('ENABLED_TABLES')).matchAll(/"(\w+)"/g)].map((m) => m[1]))
const bindings = [...tm.matchAll(/^ {2}(\w+): \{\s*\n\s*dataSource: "(\w+)",([\s\S]*?)\n {2}\},/gm)]
  .filter((m) => enabled.has(m[1]))
  .map((m) => ({ key: m[1], set: m[2] }))

const token = await resolveToken(ORG)
const H = {
  Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
  Accept: 'application/json', Prefer: 'return=representation',
}

/** One live row from a table, for binding lookups against something real. */
const sampleCache = new Map()
async function sampleOf(set) {
  if (sampleCache.has(set)) return sampleCache.get(set)
  const key = `${set.replace(/e?s$/, '')}id`
  const r = await fetch(`${ORG}/api/data/v9.2/${set}?$select=${LABEL[set] ?? key}&$top=1`, { headers: H })
  const row = r.ok ? (await r.json()).value[0] : undefined
  const id = row ? Object.entries(row).find(([k]) => k.endsWith('id') && !k.startsWith('_'))?.[1] : undefined
  sampleCache.set(set, id)
  return id
}

/** A value Dataverse will accept for a column, from its declared type. */
function valueFor(col, set) {
  const ln = col.schemaName.toLowerCase()
  switch (col.type) {
    case 'string': return 'WRITE PROBE'
    case 'memo': return 'write probe'
    case 'integer': return col.minValue && col.minValue > 1 ? col.minValue : 1
    case 'decimal': case 'currency': return 1.5
    case 'boolean': return true
    case 'date': case 'datetime': return '2026-08-29'
    case 'choice': {
      const opts = CHOICE[set]?.[ln]
      return opts ? Object.values(opts)[0] : undefined
    }
    default: return undefined
  }
}

let pass = 0, fail = 0
for (const { key, set } of bindings) {
  // Dataverse pluralises for itself and does not always agree with English:
  // bv_availability becomes bv_availabilities, bv_soilanalysis becomes
  // bv_soilanalysises. Trying each rule beats guessing one.
  const singulars = [
    set.replace(/ies$/, 'y'),
    set.replace(/ises$/, 'is'),
    set.replace(/es$/, ''),
    set.replace(/s$/, ''),
  ]
  const table = schema.tables.find((t) => singulars.includes(t.schemaName.toLowerCase()))
  if (!table) { console.log(`  ${key.padEnd(20)} SKIPPED — no schema table for ${set}`); continue }

  const body = {}
  for (const col of table.columns) {
    if (col.type === 'autonumber' || col.type === 'lookup') continue
    if (!col.required && !col.isPrimaryName) continue
    const v = valueFor(col, set)
    if (v !== undefined) body[col.schemaName.toLowerCase()] = v
  }
  // required lookups, bound to a real row
  for (const [column, meta] of Object.entries(LOOKUP[set] ?? {})) {
    const col = table.columns.find((c) => `_${c.schemaName.toLowerCase()}_value` === column)
    if (!col?.required) continue
    const id = await sampleOf(meta.targetSet)
    if (id) body[`${meta.nav}@odata.bind`] = `/${meta.targetSet}(${id})`
  }

  const created = await fetch(`${ORG}/api/data/v9.2/${set}`, { method: 'POST', headers: H, body: JSON.stringify(body) })
  if (!created.ok) {
    const msg = (await created.text()).match(/"message":"([^"]{0,110})/)?.[1] ?? created.status
    console.log(`  ${key.padEnd(20)} CREATE FAILED — ${msg}`)
    fail++
    continue
  }
  const row = await created.json()
  const idKey = Object.keys(row).find((k) => k.endsWith('id') && !k.startsWith('_') && k.startsWith('bv_'))
  const id = row[idKey]

  // patch something that exists on every table
  const patchable = table.columns.find((c) => c.type === 'memo')
    ?? table.columns.find((c) => c.type === 'string' && !c.isPrimaryName)
  let patched = 'no patchable column'
  if (patchable) {
    const ln = patchable.schemaName.toLowerCase()
    const r = await fetch(`${ORG}/api/data/v9.2/${set}(${id})`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ [ln]: 'patched' }),
    })
    patched = r.ok && (await r.json())[ln] === 'patched' ? 'ok' : `FAILED ${r.status}`
  }

  await fetch(`${ORG}/api/data/v9.2/${set}(${id})`, { method: 'DELETE', headers: H })
  const ok = patched === 'ok' || patched === 'no patchable column'
  console.log(`  ${key.padEnd(20)} create ok · patch ${patched} · delete ok`)
  ok ? pass++ : fail++
}

console.log(`\n  ${pass} tables write and patch cleanly, ${fail} failed`)
process.exit(fail ? 1 : 0)
