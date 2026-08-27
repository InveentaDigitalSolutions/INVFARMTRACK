/**
 * set-autonumber-seed.mjs — start every autonumber column at 1.
 *
 * Dataverse seeds new autonumber columns at 1000, so the first record reads
 * SH-1000. Setting the seed to 1 gives SH-0001, which is what the numbering
 * scheme is meant to look like. Affects only records created afterwards.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveToken } from './auth.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DV_URL = (process.env.DATAVERSE_URL || 'https://enterprisedev.crm16.dynamics.com').replace(/\/+$/, '')
const SEED = Number(process.env.SEED_VALUE || 1)

const schema = JSON.parse(readFileSync(join(REPO_ROOT, 'dataverse', 'farmtrack.dataverse.schema.json'), 'utf8'))
const token = await resolveToken(DV_URL)
if (!token) { console.error('No token.'); process.exit(1) }

let ok = 0, failed = 0
for (const table of schema.tables) {
  const primary = table.columns.find((c) => c.isPrimaryName && c.autoNumberFormat)
  if (!primary) continue
  const body = {
    EntityName: table.schemaName.toLowerCase(),
    AttributeName: primary.schemaName.toLowerCase(),
    Value: SEED,
  }
  try {
    const res = await fetch(`${DV_URL}/api/data/v9.2/SetAutoNumberSeed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
      body: JSON.stringify(body),
    })
    if (res.ok) { ok++ } else { failed++; console.log(`  ! ${body.EntityName}: ${res.status} ${(await res.text()).slice(0, 120)}`) }
  } catch (err) {
    failed++
    console.log(`  ! ${body.EntityName}: ${err.message}`)
  }
}
console.log(`autonumber seed set to ${SEED} on ${ok} tables (${failed} failed)`)
