/**
 * seed-data.mjs — populate the Dataverse tables with the app's demo data.
 *
 * Reads the same seed arrays the app ships with, so a freshly provisioned
 * environment looks like the local demo rather than 36 empty tables.
 *
 * Idempotent by name: a record whose primary-name value already exists is
 * skipped, so re-running tops up rather than duplicating.
 *
 * Usage:
 *   node scripts/dataverse/seed-data.mjs --dry-run
 *   DATAVERSE_URL=https://enterprisedev.crm16.dynamics.com node scripts/dataverse/seed-data.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveToken } from './auth.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DV_URL = (process.env.DATAVERSE_URL || 'https://enterprisedev.crm16.dynamics.com').replace(/\/+$/, '')
const DRY_RUN = process.argv.includes('--dry-run')

const schema = JSON.parse(readFileSync(join(REPO_ROOT, 'dataverse', 'farmtrack.dataverse.schema.json'), 'utf8'))
let token = ''

async function api(method, path, body) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(`${DV_URL}/api/data/v9.2/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          Prefer: 'return=representation',
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      const payload = text ? JSON.parse(text) : null
      if (!res.ok) {
        const err = new Error(payload?.error?.message ?? res.statusText)
        err.status = res.status
        throw err
      }
      return payload
    } catch (err) {
      // Same flaky host as the schema apply; retry transient faults only.
      const transient = /fetch failed/i.test(err.message) || ['ETIMEDOUT', 'ECONNRESET'].includes(err?.cause?.code)
      if (!transient || attempt === 6) throw err
      await new Promise((r) => setTimeout(r, Math.min(30_000, 1_500 * 2 ** (attempt - 1))))
    }
  }
}

/**
 * Seed rows, keyed by table. Values use Dataverse logical names.
 * Deliberately small: enough to exercise every screen, not a data migration.
 */
const SEED = {
  bv_shadehouse: [
    { bv_shadehousename: 'Shadehouse 1', bv_location: 'El Olvido, Santa Cruz de Yojoa', bv_length: 80, bv_width: 75, bv_capacity: 120, bv_isactive: true },
  ],
  bv_season: [
    { bv_seasonname: '2026-S1', bv_startdate: '2026-01-05', bv_enddate: '2026-06-28', bv_isactive: true },
  ],
  bv_plant: [
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: 'Hawaiian' },
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: 'Marble Queen' },
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: 'Jade' },
    { bv_plantname: "Pothos", bv_latinname: 'Epipremnum aureum', bv_variety: "N'Joy" },
    { bv_plantname: 'Sansevieria', bv_latinname: 'Dracaena trifasciata', bv_variety: 'Sansevieria' },
  ],
  bv_component: [
    { bv_componentname: 'Nitrogen', bv_symbol: 'N', bv_elementsymbol: 'N', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Phosphorus pentoxide', bv_symbol: 'P2O5', bv_elementsymbol: 'P', bv_elementalfactor: 0.4364, bv_isnutrient: true },
    { bv_componentname: 'Potassium oxide', bv_symbol: 'K2O', bv_elementsymbol: 'K', bv_elementalfactor: 0.8301, bv_isnutrient: true },
    { bv_componentname: 'Calcium', bv_symbol: 'Ca', bv_elementsymbol: 'Ca', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Magnesium', bv_symbol: 'Mg', bv_elementsymbol: 'Mg', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Iron', bv_symbol: 'Fe', bv_elementsymbol: 'Fe', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Azadirachtin', bv_symbol: 'AZA', bv_isnutrient: false },
  ],
  bv_input: [
    { bv_inputname: 'NPK 20-20-20', bv_brand: 'NutriMax' },
    { bv_inputname: 'Neem Oil', bv_brand: 'BioGrow' },
    { bv_inputname: 'Copper Fungicide', bv_brand: 'CupraSol' },
  ],
  bv_worker: [
    { bv_workername: 'Carlos Martinez' },
    { bv_workername: 'Maria Lopez' },
    { bv_workername: 'Juan Perez' },
    { bv_workername: 'Ana Rodriguez' },
    { bv_workername: 'Pedro Hernandez' },
  ],
  bv_supplier: [
    { bv_suppliername: 'AgroSupply HN' },
    { bv_suppliername: 'DHL Express' },
    { bv_suppliername: 'TecniAgua' },
  ],
  bv_customer: [
    { bv_customername: 'The Plant Company' },
    { bv_customername: 'Green Gardens Inc.' },
  ],
}

/** entitySetName for a table, taken from power.config.json. */
const entitySets = (() => {
  const cfg = JSON.parse(readFileSync(join(REPO_ROOT, 'power.config.json'), 'utf8'))
  const sources = cfg.databaseReferences?.['default.cds']?.dataSources ?? {}
  const map = {}
  for (const v of Object.values(sources)) map[v.logicalName] = v.entitySetName
  return map
})()

function primaryNameOf(logicalName) {
  const table = schema.tables.find((t) => t.schemaName.toLowerCase() === logicalName)
  const primary = table?.columns.find((c) => c.isPrimaryName)
  return primary?.schemaName.toLowerCase()
}

async function seedTable(logicalName, rows) {
  const set = entitySets[logicalName]
  if (!set) {
    console.log(`  ${logicalName}: not in power.config.json — skipped`)
    return { created: 0, skipped: rows.length }
  }

  // The primary name is an autonumber, so identity for de-duplication comes
  // from the descriptive column instead.
  const nameField = Object.keys(rows[0]).find((k) => k.endsWith('name'))
  const existing = new Set()
  if (nameField) {
    const found = await api('GET', `${set}?$select=${nameField}`)
    for (const r of found.value ?? []) existing.add(String(r[nameField]))
  }

  let created = 0
  let skipped = 0
  for (const row of rows) {
    if (nameField && existing.has(String(row[nameField]))) { skipped++; continue }
    if (DRY_RUN) { created++; continue }
    await api('POST', set, row)
    created++
  }
  console.log(`  ${logicalName}: +${created} created, ${skipped} already present`)
  return { created, skipped }
}

async function main() {
  console.log(`Seeding ${DV_URL}`)
  console.log(DRY_RUN ? 'MODE: dry run\n' : 'MODE: WRITE\n')

  token = await resolveToken(DV_URL)
  if (!token) {
    console.error('No Dataverse token. Run `az login` or set DATAVERSE_TOKEN.')
    process.exit(1)
  }
  await api('GET', 'WhoAmI')

  let created = 0
  for (const [table, rows] of Object.entries(SEED)) {
    const result = await seedTable(table, rows)
    created += result.created
  }
  console.log(`\nTotal records ${DRY_RUN ? 'that would be created' : 'created'}: ${created}`)
  if (!DRY_RUN) console.log('Autonumber IDs (SH-0001, PLT-0001 …) are assigned by Dataverse.')
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`)
  process.exit(1)
})
