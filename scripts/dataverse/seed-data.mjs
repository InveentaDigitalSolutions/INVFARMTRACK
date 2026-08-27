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
 * Seed plan, in dependency order.
 *
 * `rows` may be an array or a function, so the large generated sets (120 beds)
 * do not have to be written out. A `_ref` entry names a parent by its
 * descriptive value; the parent's GUID is resolved after that table is seeded
 * and bound via @odata.bind, which is how Dataverse sets a lookup.
 */
const PLOTS = [
  { code: 'E3', beds: 33, width: 1.2 },
  { code: 'C3', beds: 27, width: 1.8 },
  { code: 'E1', beds: 33, width: 1.2 },
  { code: 'C1', beds: 27, width: 1.8 },
]

const SEED_PLAN = [
  { table: 'bv_shadehouse', nameField: 'bv_shadehousename', rows: [
    { bv_shadehousename: 'Shadehouse 1', bv_location: 'El Olvido, Santa Cruz de Yojoa', bv_coordinates: '14.97,-87.85', bv_length: 80, bv_width: 75, bv_capacity: 120, bv_isactive: true },
  ]},
  { table: 'bv_season', nameField: 'bv_seasonname', rows: [
    { bv_seasonname: '2026-S1', bv_startdate: '2026-01-05', bv_enddate: '2026-06-28', bv_isactive: true },
  ]},
  { table: 'bv_plant', nameField: 'bv_variety', rows: [
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: 'Hawaiian' },
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: 'Marble Queen' },
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: 'Jade' },
    { bv_plantname: 'Pothos', bv_latinname: 'Epipremnum aureum', bv_variety: "N'Joy" },
    { bv_plantname: 'Sansevieria', bv_latinname: 'Dracaena trifasciata', bv_variety: 'Sansevieria' },
  ]},
  { table: 'bv_component', nameField: 'bv_componentname', rows: [
    { bv_componentname: 'Nitrogen', bv_symbol: 'N', bv_elementsymbol: 'N', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Phosphorus pentoxide', bv_symbol: 'P2O5', bv_elementsymbol: 'P', bv_elementalfactor: 0.4364, bv_isnutrient: true },
    { bv_componentname: 'Potassium oxide', bv_symbol: 'K2O', bv_elementsymbol: 'K', bv_elementalfactor: 0.8301, bv_isnutrient: true },
    { bv_componentname: 'Calcium', bv_symbol: 'Ca', bv_elementsymbol: 'Ca', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Magnesium', bv_symbol: 'Mg', bv_elementsymbol: 'Mg', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Iron', bv_symbol: 'Fe', bv_elementsymbol: 'Fe', bv_elementalfactor: 1, bv_isnutrient: true },
    { bv_componentname: 'Azadirachtin', bv_symbol: 'AZA', bv_isnutrient: false },
  ]},
  { table: 'bv_input', nameField: 'bv_inputname', rows: [
    { bv_inputname: 'NPK 20-20-20', bv_brand: 'NutriMax', bv_composition: '20% N, 20% P2O5, 20% K2O' },
    { bv_inputname: 'Neem Oil', bv_brand: 'BioGrow', bv_composition: 'Azadirachtin 0.3%' },
    { bv_inputname: 'Copper Fungicide', bv_brand: 'CupraSol', bv_composition: 'Copper hydroxide 77%' },
  ]},
  { table: 'bv_worker', nameField: 'bv_workername', rows: [
    { bv_workername: 'Carlos Martinez', bv_hourlyrate: 45, bv_isactive: true },
    { bv_workername: 'Maria Lopez', bv_hourlyrate: 42, bv_isactive: true },
    { bv_workername: 'Juan Perez', bv_hourlyrate: 40, bv_isactive: true },
    { bv_workername: 'Ana Rodriguez', bv_hourlyrate: 42, bv_isactive: true },
    { bv_workername: 'Pedro Hernandez', bv_hourlyrate: 40, bv_isactive: true },
  ]},
  { table: 'bv_supplier', nameField: 'bv_suppliername', rows: [
    { bv_suppliername: 'AgroSupply HN', bv_isactive: true },
    { bv_suppliername: 'DHL Express', bv_isactive: true },
    { bv_suppliername: 'TecniAgua', bv_isactive: true },
  ]},
  { table: 'bv_customer', nameField: 'bv_customername', rows: [
    { bv_customername: 'The Plant Company' },
    { bv_customername: 'Green Gardens Inc.' },
  ]},

  // Plots. Each belongs to the single shadehouse and the current season.
  { table: 'bv_field', nameField: 'bv_fieldname', rows: () =>
    PLOTS.map((p) => ({
      bv_fieldname: `Plot ${p.code}`,
      bv_fieldcode: undefined,
      _ref: {
        bv_ShadehouseId: ['bv_shadehouse', 'Shadehouse 1'],
        bv_SeasonId: ['bv_season', '2026-S1'],
      },
    })),
  },

  // 120 ground beds, PLOT-NN, matching the layout and the 3D view.
  { table: 'bv_bed', nameField: 'bv_bedname', rows: () =>
    PLOTS.flatMap((p) =>
      Array.from({ length: p.beds }, (_, i) => ({
        bv_bedname: `${p.code}-${String(i + 1).padStart(2, '0')}`,
        bv_capacity: Math.round(37.2 / 0.45),
        bv_isactive: true,
        _ref: { bv_FieldId: ['bv_field', `Plot ${p.code}`] },
      }))
    ),
  },
]

/** entitySetName for a table, taken from power.config.json. */
const entitySets = (() => {
  const cfg = JSON.parse(readFileSync(join(REPO_ROOT, 'power.config.json'), 'utf8'))
  const sources = cfg.databaseReferences?.['default.cds']?.dataSources ?? {}
  const map = {}
  for (const v of Object.values(sources)) map[v.logicalName] = v.entitySetName
  return map
})()

/** Cache of seeded records per table: descriptive value -> GUID. */
const idIndex = new Map()

/** Dataverse names its key after the table: bv_bed -> bv_bedid. */
const keyOf = (logicalName) => `${logicalName}id`

async function indexTable(logicalName, nameField) {
  const set = entitySets[logicalName]
  const key = keyOf(logicalName)
  const found = await api('GET', `${set}?$select=${nameField},${key}`)
  const map = new Map()
  for (const r of found.value ?? []) map.set(String(r[nameField]), r[key])
  idIndex.set(logicalName, map)
  return map
}

/** Turn a row's `_ref` entries into @odata.bind bindings. */
function bindRefs(row, plannedTable) {
  const { _ref, ...rest } = row
  if (!_ref) return rest
  for (const [lookupColumn, [parentTable, parentName]] of Object.entries(_ref)) {
    const parents = idIndex.get(parentTable)
    const guid = parents?.get(parentName)
    if (!guid) {
      throw new Error(
        `${plannedTable}: cannot resolve ${lookupColumn} -> ${parentTable} "${parentName}". ` +
        `Seed ${parentTable} first.`
      )
    }
    rest[`${lookupColumn}@odata.bind`] = `/${entitySets[parentTable]}(${guid})`
  }
  return rest
}

async function seedTable(plan) {
  const { table, nameField } = plan
  const rows = typeof plan.rows === 'function' ? plan.rows() : plan.rows
  const set = entitySets[table]
  if (!set) {
    console.log(`  ${table}: not in power.config.json — skipped`)
    return 0
  }

  // The primary column is an autonumber, so de-duplication uses the
  // descriptive field instead — re-running tops up rather than duplicating.
  const existing = await indexTable(table, nameField)

  let created = 0
  let skipped = 0
  for (const row of rows) {
    const name = String(row[nameField])
    if (existing.has(name)) { skipped++; continue }
    if (DRY_RUN) { created++; continue }
    const body = bindRefs({ ...row }, table)
    for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k]
    const saved = await api('POST', set, body)
    if (saved?.[keyOf(table)]) existing.set(name, saved[keyOf(table)])
    created++
    if (created % 25 === 0) console.log(`    … ${created} of ${rows.length}`)
  }
  console.log(`  ${table}: +${created} created, ${skipped} already present`)
  return created
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
  // Order matters: a table's parents must be indexed before its refs resolve.
  for (const plan of SEED_PLAN) created += await seedTable(plan)

  console.log(`\nTotal records ${DRY_RUN ? 'that would be created' : 'created'}: ${created}`)
  if (!DRY_RUN) console.log('Autonumber IDs (SH-0001, PLT-0001 …) are assigned by Dataverse.')
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`)
  process.exit(1)
})
