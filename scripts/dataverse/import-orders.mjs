/**
 * import-orders.mjs — what customers have actually asked for.
 *
 * Two workbooks, two shapes, one meaning: a variety, a week, and a number of
 * cuttings. They are the only record of demand this nursery has, and until now
 * they lived on a desktop.
 *
 *   Broton Verde Order 2027   — Green Legacy's order, by finished programme,
 *                               "Order Input: URC" so the quantities are
 *                               unrooted cuttings.
 *   Agrigentum 2026 Requests  — the same trade, laid out by pot programme,
 *                               with current orders and additional requests
 *                               kept apart.
 *
 * Both land in bv_DemandForecast: one row per customer, variety, size and
 * week, which is the grain the availability screens ask questions at.
 *
 * The hard part is not the spreadsheets, it is the names. A customer orders
 * "Epipremnum Golden Glen UF-Ea-0317"; the nursery grows "Pothos / Golden
 * Glen". Every match this script works out by stripping genus, trademark and
 * breeder code is written back as a bv_PlantAlias, so the next file — and the
 * app's own upload button — matches it outright instead of guessing again.
 *
 * Usage:
 *   node scripts/dataverse/import-orders.mjs --dry-run
 *   node scripts/dataverse/import-orders.mjs --create-missing
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import XLSX from 'xlsx'
import { BASE, headers } from './dv.mjs'

const DESKTOP = join(homedir(), 'Desktop')
const BOOKS = {
  greenLegacy: join(DESKTOP, 'Broton Verde Order 2027 REVISED 7.31.26.xlsx'),
  agrigentum: join(DESKTOP, 'REVISED Agrigentum 2026 Order Requests 3.20.26.xlsx'),
}

// Taken from the generated choice map rather than guessed: the option values
// are assigned by Dataverse at creation and the first version of this script
// invented a plausible-looking set that every row was rejected for.
const REQUEST_TYPE = { 'Current Order': 187460000, 'Additional Request': 187460001, 'Additional Order': 187460002 }
const STATUS_PENDING = 187460000

const dryRun = process.argv.includes('--dry-run')
const createMissing = process.argv.includes('--create-missing')

// ── reading ────────────────────────────────────────────────────────────────

const sheet = (file, name) => {
  const wb = XLSX.read(readFileSync(file), { type: 'buffer' })
  const ws = wb.Sheets[name]
  if (!ws) throw new Error(`${file} has no sheet "${name}" (has ${wb.SheetNames.join(', ')})`)
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false })
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[, ]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

/** Green Legacy: one row per variety and programme, a column per "2026 WK 33". */
function readGreenLegacy() {
  const rows = sheet(BOOKS.greenLegacy, 'Order With Programs')
  const head = rows[1]
  const weeks = head
    .map((h, i) => ({ i, m: /^(\d{4})\s*WK\s*(\d+)$/i.exec(String(h ?? '').trim()) }))
    .filter((w) => w.m)
    .map((w) => ({ column: w.i, year: Number(w.m[1]), week: Number(w.m[2]) }))

  const out = []
  for (const row of rows.slice(2)) {
    const customer = String(row[0] ?? '').trim()
    if (!customer || customer.startsWith('Grand Total')) continue
    for (const w of weeks) {
      const qty = num(row[w.column])
      if (qty === null) continue
      out.push({
        customer,
        // The trade name is what they order by; the old name is what the
        // nursery still calls it, and is the better bet for matching.
        raw: String(row[4] ?? '').trim(),
        fallback: String(row[5] ?? '').trim(),
        size: String(row[7] ?? '').trim(),
        type: 'Current Order',
        year: w.year,
        week: w.week,
        qty,
        source: 'Green Legacy 2027 order',
      })
    }
  }
  return out
}

/** Agrigentum: week numbers as bare column headings, all of one year. */
function readAgrigentum() {
  const rows = sheet(BOOKS.agrigentum, 'Sheet3')
  const head = rows[0]
  const weeks = head
    .map((h, i) => ({ i, n: Number(h) }))
    .filter((w) => Number.isInteger(w.n) && w.n >= 1 && w.n <= 53)
    .map((w) => ({ column: w.i, week: w.n }))
  // The file is the 2026 request book; its weeks carry no year of their own.
  const YEAR = 2026

  const out = []
  for (const row of rows.slice(1)) {
    const type = String(row[1] ?? '').trim()
    // Subtotal and commentary rows: "Total Hawaiian Request", "Estimate of…".
    if (!REQUEST_TYPE[type]) continue
    for (const w of weeks) {
      const qty = num(row[w.column])
      if (qty === null) continue
      out.push({
        customer: 'Agrigentum',
        raw: String(row[5] ?? '').trim(),
        fallback: '',
        size: String(row[3] ?? '').trim(),
        type,
        year: YEAR,
        week: w.week,
        qty,
        source: 'Agrigentum 2026 requests',
      })
    }
  }
  return out
}

// ── names ──────────────────────────────────────────────────────────────────

const GENUS = /^(pothos|epipremnum|philodendron|sansevieria|scindapsus|dieffenbachia|monstera|syngonium)\b/i

/**
 * A customer's name for a variety, reduced to something comparable.
 *
 * Trademarks, breeder codes and the genus are all noise for matching:
 * "Epipremnum Golden Glen UF-Ea-0317" and "Golden Glen" are the same plant.
 * Apostrophes go too — nobody agrees whether it is N'Joy, Njoy or NJoy.
 */
function key(name) {
  return String(name ?? '')
    .replace(/[™®©]/g, ' ')
    .replace(/\bUF-?[A-Za-z]{1,3}-?\d{3,4}\b/gi, ' ')
    .replace(/\bNO BUNDLES\b/gi, ' ')
    .replace(GENUS, ' ')
    .replace(/[''`.]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

// ── Dataverse ──────────────────────────────────────────────────────────────

async function readAll(h, url) {
  const rows = []
  const paged = { ...h, Prefer: 'odata.maxpagesize=5000' }
  while (url) {
    const res = await fetch(url, { headers: paged })
    const page = await res.json()
    if (!res.ok) throw new Error(`${url} answered ${res.status}: ${JSON.stringify(page).slice(0, 300)}`)
    rows.push(...(page.value ?? []))
    url = page['@odata.nextLink']
  }
  return rows
}

async function create(h, set, body) {
  const res = await fetch(`${BASE}/${set}`, {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  const row = await res.json()
  if (!res.ok) throw new Error(`${set}: ${res.status} ${JSON.stringify(row).slice(0, 300)}`)
  return row
}

async function batch(h, parts, what) {
  for (let i = 0; i < parts.length; i += 100) {
    const slice = parts.slice(i, i + 100)
    const id = `batch_orders_${i}`
    const body = slice.map((part, n) => [
      `--${id}`, 'Content-Type: application/http', 'Content-Transfer-Encoding: binary',
      `Content-ID: ${n + 1}`, '', `POST ${BASE}/${part.set} HTTP/1.1`, 'Content-Type: application/json',
      '', JSON.stringify(part.body), '',
    ].join('\r\n')).join('') + `--${id}--\r\n`
    const res = await fetch(`${BASE}/$batch`, {
      method: 'POST', headers: { ...h, 'Content-Type': `multipart/mixed;boundary=${id}` }, body,
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`batch failed ${res.status}: ${text.slice(0, 400)}`)
    const failed = [...text.matchAll(/HTTP\/1\.1 (4\d\d|5\d\d)/g)]
    if (failed.length) throw new Error(`${failed.length} rejected: ${text.slice(0, 600)}`)
    console.log(`  ${what} ${Math.min(i + 100, parts.length)}/${parts.length}`)
  }
}

async function main() {
  const h = await headers()
  const lines = [...readGreenLegacy(), ...readAgrigentum()]
  console.log(`  ${lines.length} order lines across both books`)

  const plants = await readAll(h, `${BASE}/bv_plants?$select=bv_plantname,bv_variety`)
  const aliases = await readAll(h, `${BASE}/bv_plantaliases?$select=bv_alias,_bv_plantid_value`)
  const customers = await readAll(h, `${BASE}/bv_customers?$select=bv_customername`)

  const byKey = new Map()
  for (const p of plants) {
    byKey.set(key(p.bv_variety), p)
    byKey.set(key(`${p.bv_plantname} ${p.bv_variety}`), p)
  }
  for (const a of aliases) {
    const plant = plants.find((p) => p.bv_plantid === a._bv_plantid_value)
    if (plant) byKey.set(key(a.bv_alias), plant)
  }

  const resolve = (line) => byKey.get(key(line.raw)) ?? (line.fallback ? byKey.get(key(line.fallback)) : undefined)

  const unmatched = new Map()
  for (const line of lines) if (!resolve(line)) unmatched.set(line.raw, (unmatched.get(line.raw) ?? 0) + 1)

  if (unmatched.size) {
    console.log('  no variety in the catalogue matches:')
    for (const [name, count] of unmatched) console.log(`    ${name} (${count} lines)`)
    if (createMissing) {
      // "Sea Storm™" and "Epipremnum Sea Storm™ UF-EA-0316" are one plant
      // written two ways; creating one per spelling would split the catalogue.
      const byNormalised = new Map()
      for (const name of unmatched.keys()) {
        if (!byNormalised.has(key(name))) byNormalised.set(key(name), name)
      }
      for (const name of byNormalised.values()) {
        const variety = key(name).replace(/\b\w/g, (c) => c.toUpperCase())
        const made = await create(h, 'bv_plants', {
          bv_plantname: 'Pothos',
          bv_variety: variety,
          bv_latinname: 'Epipremnum aureum',
          bv_isactive: true,
          bv_characteristics: `Added from a customer order file (${name}); the botanical details still need checking.`,
        })
        byKey.set(key(name), made)
        plants.push(made)
        console.log(`    + created Pothos / ${variety}`)
      }
    } else {
      console.log('  Re-run with --create-missing to add them to the catalogue.')
    }
  }

  // Every match worked out by stripping trademarks and codes becomes an alias,
  // so the next file matches it outright — and so does the app's own upload.
  const newAliases = []
  const seenAlias = new Set(aliases.map((a) => key(a.bv_alias)))
  for (const line of lines) {
    const plant = resolve(line)
    if (!plant || !line.raw) continue
    // Recorded whenever the customer's spelling differs at all, not only when
    // the normalisation was needed: the app's own upload matches on the name
    // as written, and "Pothos Hawaiian" is not "Hawaiian".
    if (line.raw === plant.bv_variety) continue
    if (seenAlias.has(key(line.raw))) continue
    seenAlias.add(key(line.raw))
    newAliases.push({
      set: 'bv_plantaliases',
      body: {
        bv_alias: line.raw.slice(0, 100),
        'bv_PlantId@odata.bind': `/bv_plants(${plant.bv_plantid})`,
        bv_notes: `Seen in ${line.source}.`,
      },
    })
  }

  // Customers are lookups, so they have to exist before the forecast rows do.
  const wantCustomers = [...new Set(lines.map((l) => l.customer))]
  const customerId = new Map(customers.map((c) => [c.bv_customername, c.bv_customerid]))
  for (const name of wantCustomers) {
    if (customerId.has(name)) continue
    if (dryRun) { console.log(`  would create customer ${name}`); continue }
    const made = await create(h, 'bv_customers', { bv_customername: name, bv_isactive: true,
      bv_notes: 'Created from an order file; country, terms and addresses still to fill in.' })
    customerId.set(name, made.bv_customerid)
    console.log(`  + created customer ${name}`)
  }

  const existing = new Set(
    (await readAll(h, `${BASE}/bv_demandforecasts?$select=bv_demandforecastname`))
      .map((r) => r.bv_demandforecastname)
  )

  const parts = []
  let skipped = 0
  for (const line of lines) {
    const plant = resolve(line)
    if (!plant) { skipped++; continue }
    // The name is the row's identity: re-running must not double the demand.
    const name = `${line.customer} · ${plant.bv_variety} · ${line.size} · ${line.year} WK${line.week} · ${line.type}`.slice(0, 100)
    if (existing.has(name)) { skipped++; continue }
    existing.add(name)
    parts.push({
      set: 'bv_demandforecasts',
      body: {
        bv_demandforecastname: name,
        'bv_CustomerId@odata.bind': `/bv_customers(${customerId.get(line.customer)})`,
        'bv_PlantId@odata.bind': `/bv_plants(${plant.bv_plantid})`,
        bv_size: line.size.slice(0, 100),
        bv_requesttype: REQUEST_TYPE[line.type],
        bv_weeknumber: line.week,
        bv_year: line.year,
        bv_requestedqty: line.qty,
        bv_status: STATUS_PENDING,
        bv_importbatch: line.source,
      },
    })
  }

  console.log(`  ${parts.length} forecast rows to add, ${skipped} skipped, ${newAliases.length} aliases to record`)
  if (dryRun) return
  if (newAliases.length) await batch(h, newAliases, 'aliases')
  if (parts.length) await batch(h, parts, 'forecast')
}

await main()
