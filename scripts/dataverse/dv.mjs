/**
 * Shared Dataverse plumbing for the maintenance scripts.
 *
 * Every script here needs the same four things: a token, the base URL, the
 * app's table bindings, and the entity set behind each one. The entity set
 * cannot be guessed — Dataverse pluralises bv_soilanalysis to
 * bv_soilanalysises — so it comes from metadata, once, and is cached.
 */
import { readFileSync } from 'node:fs'
import { resolveToken } from './auth.mjs'

export const DV_URL = (process.env.DATAVERSE_URL || 'https://enterprisedev.crm16.dynamics.com')
  .replace(/\/+$/, '')
export const BASE = `${DV_URL}/api/data/v9.2`

export async function headers() {
  const token = await resolveToken(DV_URL)
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  }
}

/** app table key -> { dataSource, primaryKey } straight from tableMap.ts. */
export function bindings() {
  const src = readFileSync('src/services/tableMap.ts', 'utf8')
  const out = {}
  for (const m of src.matchAll(
    /^ {2}(\w+): \{\s*\n\s*dataSource: "(\w+)",\s*\n\s*primaryKey: "(\w+)"/gm
  )) {
    out[m[1]] = { dataSource: m[2], primaryKey: m[3] }
  }
  return out
}

/** The keys the app actually reads from Dataverse. */
export function enabledTables() {
  const src = readFileSync('src/services/tableMap.ts', 'utf8')
  const block = /export const ENABLED_TABLES = new Set<string>\(\[([\s\S]*?)\]\)/.exec(src)
  if (!block) throw new Error('ENABLED_TABLES not found in tableMap.ts')
  return [...block[1].matchAll(/"(\w+)"/g)].map((m) => m[1])
}

let setCache = null
/**
 * Table metadata keyed by BOTH its logical name and its entity set name.
 *
 * tableMap's `dataSource` is the entity set the Power Apps SDK binds to
 * (bv_soilanalysises), not the logical name (bv_soilanalysis) — keying on one
 * of the two reported every table as missing.
 */
export async function entitySets(h) {
  if (setCache) return setCache
  const res = await fetch(
    // Metadata entities reject startswith(), so this pulls the lot and
    // filters here. It is one request either way.
    `${BASE}/EntityDefinitions?$select=LogicalName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute`,
    { headers: h }
  )
  if (!res.ok) throw new Error(`metadata read failed: ${res.status} ${await res.text()}`)
  const { value } = await res.json()
  setCache = new Map()
  for (const t of value) {
    if (!t.LogicalName?.startsWith('bv_')) continue
    setCache.set(t.LogicalName, t)
    if (t.EntitySetName) setCache.set(t.EntitySetName, t)
  }
  return setCache
}

/** Every row's id, paged. Returns [] for a table that does not exist. */
export async function allIds(h, entitySet, primaryKey) {
  const ids = []
  let url = `${BASE}/${entitySet}?$select=${primaryKey}&$top=5000`
  while (url) {
    const res = await fetch(url, { headers: { ...h, Prefer: 'odata.maxpagesize=5000' } })
    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error(`${entitySet}: ${res.status} ${await res.text()}`)
    }
    const body = await res.json()
    ids.push(...body.value.map((r) => r[primaryKey]))
    url = body['@odata.nextLink'] ?? null
  }
  return ids
}
