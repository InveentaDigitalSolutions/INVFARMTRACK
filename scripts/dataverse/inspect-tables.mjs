/**
 * inspect-tables.mjs
 * Connects to the INVFARMTRACK Dataverse environment and prints
 * all agr_ tables + their column definitions.
 *
 * Usage:
 *   DATAVERSE_URL=https://enterprisedev.crm16.dynamics.com node scripts/dataverse/inspect-tables.mjs
 *   node scripts/dataverse/inspect-tables.mjs --prefix agr_
 */
import { resolveToken } from './auth.mjs'

const DV_URL = process.env.DATAVERSE_URL || 'https://enterprisedev.crm16.dynamics.com'
const PREFIX = process.argv.includes('--prefix')
  ? process.argv[process.argv.indexOf('--prefix') + 1]
  : 'agr_'

const token = await resolveToken(DV_URL)
const base = `${DV_URL.replace(/\/+$/, '')}/api/data/v9.2`
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
}

// ── 1. List tables ──────────────────────────────────────────────────────────
const tablesRes = await fetch(
  `${base}/EntityDefinitions?$filter=startswith(SchemaName,'${PREFIX}')` +
  `&$select=LogicalName,SchemaName,DisplayName,PrimaryIdAttribute,PrimaryNameAttribute`,
  { headers }
)
const tablesData = await tablesRes.json()
const tables = tablesData.value ?? []

console.log(`\n=== Tables with prefix "${PREFIX}" (${tables.length} found) ===\n`)

for (const t of tables) {
  const displayName = t.DisplayName?.UserLocalizedLabel?.Label ?? t.SchemaName
  console.log(`\n── ${displayName}`)
  console.log(`   LogicalName : ${t.LogicalName}`)
  console.log(`   SchemaName  : ${t.SchemaName}`)
  console.log(`   PrimaryKey  : ${t.PrimaryIdAttribute}`)
  console.log(`   PrimaryName : ${t.PrimaryNameAttribute}`)

  // ── 2. Columns per table ───────────────────────────────────────────────────
  const colRes = await fetch(
    `${base}/EntityDefinitions(LogicalName='${t.LogicalName}')/Attributes` +
    `?$select=LogicalName,SchemaName,AttributeType,DisplayName,RequiredLevel,MaxLength,OptionSet` +
    `&$filter=startswith(SchemaName,'${PREFIX}')`,
    { headers }
  )
  const colData = await colRes.json()
  const cols = colData.value ?? []
  for (const c of cols) {
    const label = c.DisplayName?.UserLocalizedLabel?.Label ?? c.SchemaName
    const req = c.RequiredLevel?.Value ?? ''
    const max = c.MaxLength ? ` maxLen=${c.MaxLength}` : ''
    console.log(`     ${c.AttributeType.padEnd(20)} ${c.LogicalName.padEnd(40)} "${label}"${max}  [${req}]`)
  }
}
