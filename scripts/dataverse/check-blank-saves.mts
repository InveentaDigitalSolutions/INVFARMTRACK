/**
 * Proves a half-filled form still saves, on every table.
 *
 * This is the shape of the bug that lost every record: Dataverse 400s on ""
 * for a date, a number, a choice or a boolean, and the 400 rejects the whole
 * row — so leaving one date untouched threw away the entire form. It failed
 * silently, and verify-writes did not catch it because that script sends only
 * the columns it fills.
 *
 * Here every mapped column is sent blank, exactly as a form submits it, run
 * through the app's own payload builder.
 *
 * Run: npm run dataverse:check-blank-saves
 */
import { readFileSync } from 'node:fs'
import { headers, entitySets, BASE } from './dv.mjs'
import { buildPayload } from '../../src/services/payload.ts'
import { COLUMN_KIND } from '../../src/services/columnKinds.generated.ts'
import { CHOICE_MAP, LABEL_COLUMN } from '../../src/services/choiceMap.generated.ts'

const tableMap = readFileSync('src/services/tableMap.ts', 'utf8')

interface Binding { key: string; dataSource: string; primaryKey: string; fields: Record<string, string> }
const bindings: Binding[] = []
for (const m of tableMap.matchAll(
  /^ {2}(\w+): \{\s*\n\s*dataSource: "(\w+)",\s*\n\s*primaryKey: "(\w+)",([\s\S]*?)\n {2}\},/gm
)) {
  const [, key, dataSource, primaryKey, body] = m
  const fields: Record<string, string> = {}
  for (const f of body.matchAll(/(\w+): "((?:bv_|_bv_)[\w]+)"/g)) fields[f[1]] = f[2]
  bindings.push({ key, dataSource, primaryKey, fields })
}

const h = await headers()
const sets = await entitySets(h)

let failed = 0
let checked = 0

for (const b of bindings) {
  const meta = sets.get(b.dataSource)
  if (!meta) continue
  checked++

  // A form submits every field it renders; the ones nobody typed into are "".
  const asTyped: Record<string, unknown> = {}
  for (const field of Object.keys(b.fields)) asTyped[field] = ''

  const payload = buildPayload(asTyped, {
    toColumn: b.fields,
    kinds: COLUMN_KIND[b.dataSource] ?? {},
    primaryKey: b.primaryKey,
    choices: CHOICE_MAP[b.dataSource] ?? {},
  })

  // The primary name is the one thing a record genuinely needs.
  const nameColumn = LABEL_COLUMN[b.dataSource]
  const isAutoNumber = /code$/.test(nameColumn ?? '')
  if (nameColumn && !isAutoNumber) payload[nameColumn] = 'BLANK-SAVE PROBE'

  const res = await fetch(`${BASE}/${meta.EntitySetName}`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    failed++
    const text = await res.text()
    const inner = /InnerException\s*:\s*([\s\S]{0,180})/.exec(text)
    console.log(`  ${b.key.padEnd(20)} FAILED ${res.status}`)
    console.log(`     ${(inner ? inner[1] : text.slice(0, 180)).replace(/\s+/g, ' ')}`)
    continue
  }

  const id = (await res.json())[meta.PrimaryIdAttribute]
  await fetch(`${BASE}/${meta.EntitySetName}(${id})`, { method: 'DELETE', headers: h })
  console.log(`  ${b.key.padEnd(20)} a half-filled form saves`)
}

console.log(failed === 0
  ? `\n  ${checked} tables accept a form with every optional field left blank.\n`
  : `\n  ${failed} of ${checked} tables reject a half-filled form.\n`)
process.exit(failed === 0 ? 0 : 1)
