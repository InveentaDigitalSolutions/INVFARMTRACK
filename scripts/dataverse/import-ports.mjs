/**
 * import-ports.mjs — the places the nursery can ship to.
 *
 * A price is keyed on the destination, and now on how the goods travel, so
 * both lists have to exist and have to be kept apart: nothing flies into
 * Rotterdam's harbour, and no ship calls at Amsterdam Schiphol.
 *
 * Typing them by hand was never going to happen, so they come from public
 * reference data:
 *
 *   Airports — OurAirports (public domain, https://ourairports.com/data/).
 *              Kept: an IATA code, scheduled service, and large or medium.
 *              That drops 82,000 airstrips, heliports and closed fields that
 *              no freight forwarder would ever name.
 *   Seaports — NGA World Port Index (a work of the US Government, public
 *              domain). Kept: harbours carrying a UN/LOCODE, which is what
 *              makes a place a recognised trade location.
 *
 * The index's own "harbor size" was the obvious filter and it is the wrong
 * one: it measures the water, not the trade. Puerto Cortes — the port
 * Honduras exports through — is rated Small, and PortMiami's size, use and
 * container columns are all "Unknown". A code, on the other hand, is only
 * issued to somewhere goods actually move through.
 *
 * The download is not part of the import. `--refresh` rebuilds
 * dataverse/reference/ports.json from the sources; the import reads that file,
 * so it is repeatable, reviewable in a diff, and does not depend on either
 * host still answering.
 *
 * Usage:
 *   node scripts/dataverse/import-ports.mjs --refresh   # rebuild the file
 *   node scripts/dataverse/import-ports.mjs --dry-run   # say what would happen
 *   node scripts/dataverse/import-ports.mjs             # load into Dataverse
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BASE, headers } from './dv.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const FILE = join(REPO_ROOT, 'dataverse', 'reference', 'ports.json')

const SOURCES = {
  airports: 'https://davidmegginson.github.io/ourairports-data/airports.csv',
  countries: 'https://davidmegginson.github.io/ourairports-data/countries.csv',
  seaports: 'https://msi.nga.mil/api/publications/download?type=view&key=16920959/SFH00000/UpdatedPub150.csv',
}

const KIND = { Airport: 187500200, Seaport: 187500201 }
/** bv_PortName is 100 characters; the label is built to fit inside it. */
const NAME_MAX = 100

// ── csv ────────────────────────────────────────────────────────────────────

/** Small hand-rolled reader: the sources quote fields and embed commas. */
function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const head = rows.shift().map((h) => h.replace(/^﻿/, '').trim())
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])))
}

const title = (s) =>
  s.toLowerCase().replace(/(^|[\s\-/'])([a-z])/g, (_, p, c) => p + c.toUpperCase())

/** "MIA · Miami International Airport, United States", inside 100 characters. */
function label(code, name, country) {
  const full = `${code} · ${name}, ${country}`
  if (full.length <= NAME_MAX) return full
  const room = NAME_MAX - `${code} · , ${country}`.length
  return `${code} · ${name.slice(0, Math.max(3, room)).trim()}, ${country}`
}

// ── build ──────────────────────────────────────────────────────────────────

async function refresh() {
  const get = async (url) => {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`${url} answered ${r.status}`)
    return r.text()
  }

  console.log('  fetching OurAirports…')
  const countries = new Map(parseCsv(await get(SOURCES.countries)).map((c) => [c.code, c.name]))
  const airports = parseCsv(await get(SOURCES.airports))
    .filter((a) => a.iata_code && a.scheduled_service === 'yes' &&
      (a.type === 'large_airport' || a.type === 'medium_airport'))
    .map((a) => ({
      code: a.iata_code,
      kind: 'Airport',
      name: label(a.iata_code, a.name, countries.get(a.iso_country) ?? a.iso_country),
      country: countries.get(a.iso_country) ?? a.iso_country,
    }))

  console.log('  fetching the World Port Index…')
  const seaports = parseCsv(await get(SOURCES.seaports))
    .filter((p) => (p['UN/LOCODE'] || '').trim())
    .map((p) => {
      const code = p['UN/LOCODE'].replace(/\s+/g, '')
      const name = title(p['Main Port Name'])
      const country = title(p['Country Code'] || '')
      return { code, kind: 'Seaport', name: label(code, name, country), country }
    })

  // Two harbours can share a LOCODE-less name; the label is what a person
  // picks by, so it has to identify one row.
  const seen = new Map()
  const all = [...airports, ...seaports]
  const unique = []
  for (const p of all) {
    const n = seen.get(p.name) ?? 0
    seen.set(p.name, n + 1)
    unique.push(n === 0 ? p : { ...p, name: `${p.name} (${n + 1})`.slice(0, NAME_MAX) })
  }
  unique.sort((a, b) => a.name.localeCompare(b.name))

  writeFileSync(FILE, JSON.stringify({
    source: SOURCES,
    note: 'Rebuild with: node scripts/dataverse/import-ports.mjs --refresh',
    airports: airports.length,
    seaports: seaports.length,
    ports: unique,
  }, null, 1) + '\n')
  console.log(`  wrote ${unique.length} places (${airports.length} airports, ${seaports.length} seaports)`)
}

// ── import ─────────────────────────────────────────────────────────────────

/** 100 creates per round trip; one at a time takes the better part of an hour. */
async function createBatch(h, rows) {
  const id = `batch_${rows[0].code}_${rows.length}`
  const body = rows.map((p, i) => [
    `--${id}`,
    'Content-Type: application/http',
    'Content-Transfer-Encoding: binary',
    `Content-ID: ${i + 1}`,
    '',
    `POST ${BASE}/bv_ports HTTP/1.1`,
    'Content-Type: application/json',
    '',
    JSON.stringify({
      bv_portname: p.name,
      bv_code: p.code,
      bv_kind: KIND[p.kind],
      bv_country: p.country,
      // Everywhere is offered until someone says otherwise: the nursery marks
      // the handful it actually ships to, rather than us guessing.
      bv_isactive: true,
    }),
    '',
  ].join('\r\n')).join('') + `--${id}--\r\n`

  const r = await fetch(`${BASE}/$batch`, {
    method: 'POST',
    headers: { ...h, 'Content-Type': `multipart/mixed;boundary=${id}` },
    body,
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`batch failed ${r.status}: ${text.slice(0, 400)}`)
  const failures = [...text.matchAll(/HTTP\/1\.1 (4\d\d|5\d\d)/g)].map((m) => m[1])
  if (failures.length) throw new Error(`${failures.length} rows rejected: ${text.slice(0, 600)}`)
}

async function main() {
  if (process.argv.includes('--refresh')) { await refresh(); return }

  const file = JSON.parse(readFileSync(FILE, 'utf8'))
  const h = { ...(await headers()), 'Content-Type': 'application/json' }

  // $top and paging are mutually exclusive in Dataverse: asking for the first
  // 5,000 rows returns exactly that and no next link, which reads as "the
  // whole table" and would have re-created 1,591 ports it already held. The
  // page size goes in a header instead, and the link is followed to the end.
  const existing = new Set()
  let url = `${BASE}/bv_ports?$select=bv_portname`
  const paged = { ...h, Prefer: 'odata.maxpagesize=5000' }
  while (url) {
    const page = await (await fetch(url, { headers: paged })).json()
    for (const row of page.value ?? []) existing.add(row.bv_portname)
    url = page['@odata.nextLink']
  }

  const missing = file.ports.filter((p) => !existing.has(p.name))
  console.log(`  ${file.ports.length} in the file, ${existing.size} already in Dataverse, ${missing.length} to add`)
  if (process.argv.includes('--dry-run') || missing.length === 0) return

  for (let i = 0; i < missing.length; i += 100) {
    const slice = missing.slice(i, i + 100)
    await createBatch(h, slice)
    console.log(`  ${Math.min(i + 100, missing.length)}/${missing.length}`)
  }
}

await main()
