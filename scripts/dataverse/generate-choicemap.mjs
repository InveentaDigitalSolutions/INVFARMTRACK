/**
 * Generates src/services/choiceMap.generated.ts from live Dataverse metadata.
 *
 * The app carries choice values as the text a person reads ("Export", "Paid").
 * Dataverse stores them as integers, and the Web API rejects the string with a
 * 400 — so without a translation table every create and update touching a
 * choice column fails, and every read shows a bare number like 187460000.
 *
 * Metadata is read from the environment rather than from the schema JSON so
 * the map reflects what is actually deployed, including the EntitySetName
 * Dataverse pluralised for itself.
 *
 * Run: npm run dataverse:choices  (chained from dataverse:apply)
 */

import { writeFileSync } from 'node:fs'
import { resolveToken } from './auth.mjs'

const ORG = process.env.DATAVERSE_URL ?? 'https://enterprisedev.crm16.dynamics.com'
const PREFIX = 'bv_'
const OUT = 'src/services/choiceMap.generated.ts'

const token = await resolveToken(ORG)
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

async function api(path) {
  const res = await fetch(`${ORG}/api/data/v9.2/${path}`, { headers })
  if (!res.ok) throw new Error(`${res.status} on ${path.slice(0, 90)}`)
  return res.json()
}

console.log(`Reading choice metadata from ${ORG}`)

// $filter with startswith is not supported on EntityDefinitions (501), so
// the whole list comes back and is narrowed here.
const { value: allEntities } = await api('EntityDefinitions?$select=LogicalName,EntitySetName,PrimaryNameAttribute')
const entities = allEntities.filter((e) => e.LogicalName.startsWith(PREFIX))
console.log(`  ${entities.length} ${PREFIX}* tables of ${allEntities.length} total`)

const map = {}
const lookups = {}
const labelColumns = {}
let columnCount = 0
let lookupCount = 0

for (const entity of entities) {
  // Picklist and Status attributes both carry an OptionSet; State is system-owned.
  const { value: attrs } = await api(
    `EntityDefinitions(LogicalName='${entity.LogicalName}')/Attributes/` +
      `Microsoft.Dynamics.CRM.PicklistAttributeMetadata` +
      `?$select=LogicalName&$expand=OptionSet($select=Options)`
  ).catch(() => ({ value: [] }))

  const columns = {}
  for (const attr of attrs) {
    const options = attr.OptionSet?.Options ?? []
    if (options.length === 0) continue
    const byLabel = {}
    for (const opt of options) {
      const label = opt.Label?.UserLocalizedLabel?.Label
      if (label) byLabel[label] = opt.Value
    }
    if (Object.keys(byLabel).length === 0) continue
    columns[attr.LogicalName] = byLabel
    columnCount++
  }

  if (Object.keys(columns).length > 0) map[entity.EntitySetName] = columns

  // Lookup attributes: a write needs the navigation property and the target's
  // entity set, neither of which can be derived from the column name.
  const { value: lookupAttrs } = await api(
    `EntityDefinitions(LogicalName='${entity.LogicalName}')/Attributes/` +
      `Microsoft.Dynamics.CRM.LookupAttributeMetadata` +
      `?$select=LogicalName,SchemaName,Targets`
  ).catch(() => ({ value: [] }))

  const cols = {}
  for (const attr of lookupAttrs) {
    const target = (attr.Targets ?? []).find((t) => t.startsWith(PREFIX))
    if (!target) continue
    const targetEntity = allEntities.find((e) => e.LogicalName === target)
    if (!targetEntity) continue
    cols[`_${attr.LogicalName}_value`] = {
      nav: attr.SchemaName,
      targetSet: targetEntity.EntitySetName,
    }
    lookupCount++
  }
  if (Object.keys(cols).length > 0) lookups[entity.EntitySetName] = cols

  // The column a person would recognise the row by. The primary name is the
  // autonumber code (BED-0001), which is not what anyone picks a bed by, so
  // the descriptive column is found instead: bv_bedname for bv_bed.
  const { value: strings } = await api(
    `EntityDefinitions(LogicalName='${entity.LogicalName}')/Attributes/` +
      `Microsoft.Dynamics.CRM.StringAttributeMetadata?$select=LogicalName`
  ).catch(() => ({ value: [] }))
  // Dataverse creates a shadow string column beside every lookup
  // (_bv_bedid_value -> bv_bedidname). Those end in "name" but describe the
  // parent, not this row, so they must not be taken as the label.
  const shadow = new Set(lookupAttrs.map((a) => `${a.LogicalName}name`))
  const names = strings
    .map((a) => a.LogicalName)
    .filter((n) => n.startsWith(PREFIX) && !shadow.has(n))

  // bv_bed -> bv_bedname. Some tables abbreviate (bv_fiscalauthorization ->
  // bv_fiscalauthname), so a "…name" column also counts when its stem is a
  // prefix of the entity's own name — which rejects bv_notifypartyname on
  // bv_invoice, a column about somebody else entirely.
  const exact = names.find((n) => n === `${entity.LogicalName}name`)
  const abbreviated = names.find(
    (n) => n.endsWith('name') && entity.LogicalName.startsWith(n.slice(0, -4))
  )
  // Tables whose identity simply is their number (an order, an invoice) have
  // no descriptive column; the autonumber is the right label for them.
  labelColumns[entity.EntitySetName] = exact ?? abbreviated ?? entity.PrimaryNameAttribute
}

const body = `/*
 * Generated by scripts/dataverse/generate-choicemap.mjs — do not edit.
 *
 * Maps each choice column to its option labels and integer values, keyed by
 * Dataverse entity set name (the same string used as \`dataSource\` in
 * tableMap.ts). Regenerate with \`npm run dataverse:choices\` after any change
 * to a choice column.
 */

/**
 * Every ${PREFIX}* entity set in the environment. Dataverse pluralises names
 * itself and does not always agree with English — bv_soilanalysis becomes
 * bv_soilanalysises — so a hand-written dataSource is easy to get wrong, and
 * the failure looks like an empty screen rather than an error.
 */
export const ENTITY_SETS: readonly string[] = ${JSON.stringify(entities.map((e) => e.EntitySetName).sort(), null, 2)};

/**
 * Lookup columns: entity set -> _column_value -> how to write it.
 *
 * A lookup cannot be set by writing to _bv_bedid_value; Dataverse rejects it
 * with a 400. The write has to name the navigation property and point at the
 * target row: "bv_BedId@odata.bind": "/bv_beds(<guid>)". Neither the
 * navigation property nor the target entity set can be derived from the
 * column name, so both come from metadata.
 */
/**
 * The column that identifies a row to a person, per entity set. Used both to
 * show what a lookup points at and to resolve a chosen name back to its row.
 */
export const LABEL_COLUMN: Record<string, string> = ${JSON.stringify(labelColumns, null, 2)};

export const LOOKUP_MAP: Record<string, Record<string, { nav: string; targetSet: string }>> = ${JSON.stringify(lookups, null, 2)};

/** entity set -> column -> { label: optionValue } */
export const CHOICE_MAP: Record<string, Record<string, Record<string, number>>> = ${JSON.stringify(map, null, 2)};

/** Reverse lookup, built once: entity set -> column -> { optionValue: label }. */
export const CHOICE_LABELS: Record<string, Record<string, Record<number, string>>> =
  Object.fromEntries(
    Object.entries(CHOICE_MAP).map(([entitySet, columns]) => [
      entitySet,
      Object.fromEntries(
        Object.entries(columns).map(([column, byLabel]) => [
          column,
          Object.fromEntries(Object.entries(byLabel).map(([label, value]) => [value, label])),
        ])
      ),
    ])
  );
`

writeFileSync(OUT, body)
console.log(`\nWrote ${OUT}`)
console.log(`  ${Object.keys(map).length} tables, ${columnCount} choice columns`)
console.log(`  ${Object.keys(lookups).length} tables, ${lookupCount} lookup columns`)
