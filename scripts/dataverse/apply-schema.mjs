/**
 * apply-schema.mjs — Provisions the FarmTrack schema into Dataverse.
 *
 * Reads dataverse/farmtrack.dataverse.schema.json and creates the publisher,
 * solution, tables, columns and lookup relationships via the Dataverse Web API.
 *
 * Idempotent: anything that already exists is skipped, so it is safe to re-run
 * after a partial failure.
 *
 * Usage:
 *   node scripts/dataverse/apply-schema.mjs --dry-run
 *   DATAVERSE_URL=https://enterprisedev.crm16.dynamics.com node scripts/dataverse/apply-schema.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { resolveToken } from './auth.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

const DV_URL = (process.env.DATAVERSE_URL || 'https://enterprisedev.crm16.dynamics.com').replace(/\/+$/, '')
const DRY_RUN = process.argv.includes('--dry-run')
const LCID = 1033

const PUBLISHER = {
  uniqueName: 'BrotonVerde',
  friendlyName: 'BrotonVerde',
  prefix: 'bv',
  optionValuePrefix: 12132,
}

const schema = JSON.parse(readFileSync(join(REPO_ROOT, 'dataverse', 'farmtrack.dataverse.schema.json'), 'utf8'))

// ── helpers ────────────────────────────────────────────────────────────────

const label = (text) => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.Label',
  LocalizedLabels: [{
    '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel',
    Label: text,
    LanguageCode: LCID,
  }],
})

const required = (isRequired) => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.AttributeRequiredLevelManagedProperty',
  Value: isRequired ? 'ApplicationRequired' : 'None',
})

/** Dataverse lowercases schema names into logical names. */
const logical = (schemaName) => schemaName.toLowerCase()

let token = ''
const stats = { tables: 0, columns: 0, relationships: 0, skipped: 0 }

/** Transient network faults to this host are common; retry before giving up. */
async function fetchWithRetry(url, init, attempts = 9) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(url, init)
    } catch (err) {
      lastError = err
      const transient = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT']
        .includes(err?.cause?.code) || /fetch failed/i.test(err?.message ?? '')
      if (!transient || attempt === attempts) break
      // Outages here have lasted minutes, so be patient rather than fail fast.
      const waitMs = Math.min(45_000, 1_500 * 2 ** (attempt - 1))
      console.log(`    … network hiccup (${err?.cause?.code ?? 'unknown'}), retry ${attempt}/${attempts - 1} in ${waitMs / 1000}s`)
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }
  throw lastError
}

async function api(method, path, body, extraHeaders = {}) {
  const res = await fetchWithRetry(`${DV_URL}/api/data/v9.2/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let payload = null
  if (text) {
    try { payload = JSON.parse(text) } catch { payload = text }
  }

  if (!res.ok) {
    const message = payload?.error?.message || (typeof payload === 'string' ? payload : res.statusText)
    const err = new Error(`${res.status} ${message}`)
    err.status = res.status
    throw err
  }
  return payload
}

/** GET that treats 404 as "does not exist" rather than an error. */
async function exists(path) {
  try {
    await api('GET', path)
    return true
  } catch (err) {
    if (err.status === 404) return false
    throw err
  }
}

const solutionHeader = () => ({ 'MSCRM.SolutionUniqueName': schema.solutionName })

// ── column payload builders ────────────────────────────────────────────────

function buildAttribute(col) {
  const base = {
    SchemaName: col.schemaName,
    DisplayName: label(col.displayName),
    RequiredLevel: required(col.required),
  }
  if (col.description) base.Description = label(col.description)

  switch (col.type) {
    case 'string':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
        MaxLength: col.maxLength || 100,
        FormatName: { Value: 'Text' },
      }

    // Autonumber: a string attribute carrying AutoNumberFormat. Dataverse
    // populates it on create and the value is never user-supplied.
    case 'autonumber':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
        MaxLength: col.maxLength || 40,
        FormatName: { Value: 'Text' },
        AutoNumberFormat: col.autoNumberFormat,
      }

    case 'memo':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata',
        MaxLength: col.maxLength || 2000,
        Format: 'TextArea',
      }

    case 'integer':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata',
        Format: 'None',
        MinValue: col.minValue ?? -2147483648,
        MaxValue: col.maxValue ?? 2147483647,
      }

    case 'decimal':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.DecimalAttributeMetadata',
        Precision: col.precision ?? 2,
        MinValue: col.minValue ?? -100000000000,
        MaxValue: col.maxValue ?? 100000000000,
      }

    case 'currency':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.MoneyAttributeMetadata',
        Precision: col.precision ?? 2,
        PrecisionSource: 2,
        MinValue: col.minValue ?? 0,
        MaxValue: col.maxValue ?? 1000000000000,
      }

    case 'boolean':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata',
        DefaultValue: col.defaultValue ?? false,
        OptionSet: {
          '@odata.type': 'Microsoft.Dynamics.CRM.BooleanOptionSetMetadata',
          TrueOption: { Value: 1, Label: label(col.trueLabel || 'Yes') },
          FalseOption: { Value: 0, Label: label(col.falseLabel || 'No') },
        },
      }

    // DateOnly behavior — NOT UserLocal. UserLocal on a date-only column stores
    // 22:00Z and renders the previous day for downstream consumers.
    case 'date':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata',
        Format: 'DateOnly',
        DateTimeBehavior: { Value: 'DateOnly' },
      }

    case 'datetime':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata',
        Format: 'DateAndTime',
        DateTimeBehavior: { Value: 'UserLocal' },
      }

    case 'choice':
      return {
        ...base,
        '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
        OptionSet: {
          '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
          IsGlobal: false,
          OptionSetType: 'Picklist',
          Options: col.options.map((o) => ({ Value: o.value, Label: label(o.label) })),
        },
      }

    default:
      throw new Error(`Unsupported column type "${col.type}" on ${col.schemaName}`)
  }
}

// ── provisioning steps ─────────────────────────────────────────────────────

async function ensurePublisher() {
  const found = await api('GET', `publishers?$select=publisherid&$filter=uniquename eq '${PUBLISHER.uniqueName}'`)
  if (found.value?.length) {
    console.log(`  publisher "${PUBLISHER.uniqueName}" already exists`)
    return found.value[0].publisherid
  }
  if (DRY_RUN) { console.log(`  + would create publisher "${PUBLISHER.uniqueName}"`); return null }

  const created = await api('POST', 'publishers', {
    uniquename: PUBLISHER.uniqueName,
    friendlyname: PUBLISHER.friendlyName,
    customizationprefix: PUBLISHER.prefix,
    customizationoptionvalueprefix: PUBLISHER.optionValuePrefix,
  }, { Prefer: 'return=representation' })
  console.log(`  + created publisher "${PUBLISHER.uniqueName}"`)
  return created.publisherid
}

async function ensureSolution(publisherId) {
  const found = await api('GET', `solutions?$select=solutionid&$filter=uniquename eq '${schema.solutionName}'`)
  if (found.value?.length) {
    console.log(`  solution "${schema.solutionName}" already exists`)
    return found.value[0].solutionid
  }
  if (DRY_RUN) { console.log(`  + would create solution "${schema.solutionName}"`); return null }

  const created = await api('POST', 'solutions', {
    uniquename: schema.solutionName,
    friendlyname: schema.solutionName,
    version: schema.version,
    'publisherid@odata.bind': `/publishers(${publisherId})`,
  }, { Prefer: 'return=representation' })
  console.log(`  + created solution "${schema.solutionName}"`)
  return created.solutionid
}

async function ensureTable(table) {
  const logicalName = logical(table.schemaName)
  if (await exists(`EntityDefinitions(LogicalName='${logicalName}')?$select=LogicalName`)) {
    stats.skipped++
    return false
  }

  const primary = table.columns.find((c) => c.isPrimaryName)
  if (!primary) throw new Error(`${table.schemaName} has no isPrimaryName column`)

  const payload = {
    '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
    SchemaName: table.schemaName,
    DisplayName: label(table.displayName),
    DisplayCollectionName: label(table.displayCollectionName),
    OwnershipType: table.ownershipType || 'UserOwned',
    IsActivity: false,
    HasActivities: false,
    HasNotes: false,
    Attributes: [{
      '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
      SchemaName: primary.schemaName,
      DisplayName: label(primary.displayName),
      RequiredLevel: required(true),
      MaxLength: primary.maxLength || 100,
      FormatName: { Value: 'Text' },
      IsPrimaryName: true,
      // Present when the primary column is auto-numbered (SH-0001 etc.).
      ...(primary.autoNumberFormat ? { AutoNumberFormat: primary.autoNumberFormat } : {}),
    }],
  }
  if (table.description) payload.Description = label(table.description)

  if (DRY_RUN) { console.log(`  + would create table ${table.schemaName}`); stats.tables++; return true }

  await api('POST', 'EntityDefinitions', payload, solutionHeader())
  console.log(`  + created table ${table.schemaName}`)
  stats.tables++
  return true
}

/**
 * Adds option values present in the schema but missing from the environment.
 * Additive only — removing a value would break rows already holding it.
 */
async function syncOptions(entityLogicalName, col) {
  const attribute = logical(col.schemaName)
  let live
  try {
    live = await api(
      'GET',
      `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attribute}')/` +
        `Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)`
    )
  } catch {
    return // not a picklist, or not readable — nothing to sync
  }

  const present = new Set(
    (live.OptionSet?.Options ?? []).map((o) => o.Label?.UserLocalizedLabel?.Label)
  )
  for (const option of col.options) {
    if (present.has(option.label)) continue
    await api('POST', 'InsertOptionValue', {
      AttributeLogicalName: attribute,
      EntityLogicalName: entityLogicalName,
      Value: option.value,
      Label: label(option.label),
      SolutionUniqueName: schema.solutionName,
    })
    console.log(`      + ${col.schemaName}: option "${option.label}" (${option.value})`)
    stats.columns++
  }
}

async function ensureColumns(table) {
  const logicalName = logical(table.schemaName)

  // Lookups are created as relationships in a later pass; primary name comes
  // with the table itself.
  const pending = table.columns.filter((c) => !c.isPrimaryName && c.type !== 'lookup')
  if (!pending.length) return

  let existing = new Set()
  if (!DRY_RUN || await exists(`EntityDefinitions(LogicalName='${logicalName}')?$select=LogicalName`)) {
    try {
      const attrs = await api('GET', `EntityDefinitions(LogicalName='${logicalName}')/Attributes?$select=LogicalName`)
      existing = new Set(attrs.value.map((a) => a.LogicalName))
    } catch { /* table not created yet in dry-run */ }
  }

  for (const col of pending) {
    if (existing.has(logical(col.schemaName))) {
      // The column is there, but its option set may have grown since. A choice
      // the app offers and Dataverse does not know is rejected on write, so
      // new labels are added here; nothing is ever removed, because that would
      // orphan whatever rows already use it.
      if (col.type === 'choice' && col.options?.length && !DRY_RUN) {
        await syncOptions(logicalName, col)
      }
      stats.skipped++
      continue
    }

    if (DRY_RUN) { console.log(`      + would add ${col.schemaName} (${col.type})`); stats.columns++; continue }

    try {
      await api('POST', `EntityDefinitions(LogicalName='${logicalName}')/Attributes`, buildAttribute(col), solutionHeader())
      stats.columns++
    } catch (err) {
      console.error(`      ! ${table.schemaName}.${col.schemaName} — ${err.message}`)
      throw err
    }
  }
  console.log(`      ${table.schemaName}: ${pending.length} columns processed`)
}

async function ensureRelationship(table, col) {
  const child = logical(table.schemaName)
  const parent = logical(col.relatedTable)
  // Derive from the schema's own publisher prefix — hardcoding it produced
  // names like inv_bv_Field_bv_ShadehouseId once the prefix changed.
  const strip = (n) => n.replace(new RegExp(`^${schema.publisherPrefix}_`, 'i'), '')
  const relName = `${schema.publisherPrefix}_${strip(table.schemaName)}_${strip(col.schemaName)}`

  const found = await api('GET', `RelationshipDefinitions?$select=SchemaName&$filter=SchemaName eq '${relName}'`)
  if (found.value?.length) { stats.skipped++; return }

  if (DRY_RUN) {
    console.log(`  + would link ${table.schemaName}.${col.schemaName} -> ${col.relatedTable}`)
    stats.relationships++
    return
  }

  const payload = {
    '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
    SchemaName: relName,
    ReferencedEntity: parent,
    ReferencingEntity: child,
    Lookup: {
      '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata',
      SchemaName: col.schemaName,
      DisplayName: label(col.displayName),
      RequiredLevel: required(col.required),
    },
    AssociatedMenuConfiguration: {
      Behavior: 'UseCollectionName',
      Group: 'Details',
      Order: 10000,
    },
    CascadeConfiguration: {
      Assign: 'NoCascade',
      // Referential, never parental. Cascade delete makes a relationship
      // parental and Dataverse allows a child only ONE parent — bv_Planting
      // has required lookups to Plant, Bed and Season. Cascade is also wrong
      // on the merits: deleting a Plant must not delete every Planting.
      Delete: col.required ? 'Restrict' : 'RemoveLink',
      Merge: 'NoCascade',
      Reparent: 'NoCascade',
      Share: 'NoCascade',
      Unshare: 'NoCascade',
    },
  }
  try {
    await api('POST', 'RelationshipDefinitions', payload, solutionHeader())
    console.log(`  + linked ${table.schemaName}.${col.schemaName} -> ${col.relatedTable}`)
    stats.relationships++
  } catch (err) {
    console.error(`  ! ${table.schemaName}.${col.schemaName} -> ${col.relatedTable} — ${err.message}`)
    throw err
  }
}

async function publishCustomizations() {
  if (DRY_RUN) return
  console.log('\nPublishing customizations…')
  await api('POST', 'PublishAllXml', {})
  console.log('  published')
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`FarmTrack schema → ${DV_URL}`)
  console.log(`Solution: ${schema.solutionName} v${schema.version} | prefix: ${schema.publisherPrefix}`)
  console.log(DRY_RUN ? 'MODE: dry run — nothing will be written\n' : 'MODE: APPLY — this writes to Dataverse\n')

  token = await resolveToken(DV_URL)
  if (!token) {
    console.error('Could not acquire a Dataverse token. Run `az login` or set DATAVERSE_TOKEN.')
    process.exit(1)
  }

  const who = await api('GET', 'WhoAmI')
  console.log(`Connected — UserId ${who.UserId}\n`)

  console.log('Step 1/4 — publisher & solution')
  const publisherId = await ensurePublisher()
  await ensureSolution(publisherId)

  console.log(`\nStep 2/4 — tables (${schema.tables.length})`)
  for (const table of schema.tables) await ensureTable(table)

  console.log('\nStep 3/4 — columns')
  for (const table of schema.tables) await ensureColumns(table)

  const lookups = schema.tables.flatMap((t) => t.columns.filter((c) => c.type === 'lookup').map((c) => [t, c]))
  console.log(`\nStep 4/4 — lookup relationships (${lookups.length})`)
  for (const [table, col] of lookups) await ensureRelationship(table, col)

  await publishCustomizations()

  console.log('\n── Summary ──')
  console.log(`  tables:        ${stats.tables}`)
  console.log(`  columns:       ${stats.columns}`)
  console.log(`  relationships: ${stats.relationships}`)
  console.log(`  skipped:       ${stats.skipped} (already existed)`)
  if (DRY_RUN) console.log('\nDry run only — re-run without --dry-run to apply.')
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`)
  if (err.cause) console.error(`CAUSE: ${err.cause.code || err.cause.message} — transient network errors are common here; re-run, it is idempotent.`)
  process.exit(1)
})
