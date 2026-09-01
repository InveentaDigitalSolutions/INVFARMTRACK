/**
 * import-holidays.mjs — the days nobody is working, here and at the far end.
 *
 * Two different problems wearing one name. On a Honduran holiday nothing is
 * cut, packed or driven to the airport. On the destination's holiday the
 * flight may go but customs is shut, and a box of unrooted cuttings spends the
 * long weekend on a ramp. Both are knowable months ahead.
 *
 * Source: Nager.Date (https://date.nager.at), public-domain data, no key.
 *
 * Countries are not hard-coded: Honduras, plus wherever the nursery's own
 * customers are. Adding a customer in Belgium and re-running is the whole
 * procedure.
 *
 * Usage:
 *   node scripts/dataverse/import-holidays.mjs --dry-run
 *   node scripts/dataverse/import-holidays.mjs [--years 3]
 *   node scripts/dataverse/import-holidays.mjs --countries US,NL   # a market
 *                                                                  # before its
 *                                                                  # first customer
 */
import { BASE, headers } from './dv.mjs'
import { COUNTRIES } from '../lib/countries.mjs'

const API = 'https://date.nager.at/api/v3/PublicHolidays'
/** Where the nursery is: its own holidays stop the packing, whatever the order says. */
const HOME = 'HN'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

/** The country a typed name refers to, or null rather than a near miss. */
function countryFor(name) {
  const q = String(name ?? '').trim().toLowerCase()
  if (!q) return null
  return (
    COUNTRIES.find((c) => c.name.toLowerCase() === q) ??
    COUNTRIES.find((c) => c.code.toLowerCase() === q || c.code3.toLowerCase() === q) ??
    COUNTRIES.find((c) => c.aliases.some((a) => a.toLowerCase() === q)) ??
    null
  )
}

/**
 * Every page of a query, and an error rather than an empty list.
 *
 * A wrong entity set answers 404 with a JSON body, and `page.value ?? []` read
 * that as "nothing there yet" — so the script cheerfully reported 0 existing
 * rows and tried to create 22 duplicates. A failed read is not an empty table.
 */
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

async function main() {
  const h = { ...(await headers()), 'Content-Type': 'application/json' }
  const years = Number(arg('years', 2))
  const dryRun = process.argv.includes('--dry-run')

  // Where the customers are. A country nobody trades with is 15 rows a year
  // of noise, and there are 204 of them.
  const customers = (await readAll(h, `${BASE}/bv_customers?$select=bv_country`))
  const wanted = new Map([[HOME, 'Honduras']])
  const unmatched = new Set()
  for (const c of customers) {
    const found = countryFor(c.bv_country)
    if (found) wanted.set(found.code, found.name)
    else if (c.bv_country) unmatched.add(c.bv_country)
  }
  // A market the nursery is opening has no customer row yet, and its holidays
  // matter from the first quotation.
  for (const code of String(arg('countries', '')).split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)) {
    const found = countryFor(code)
    if (found) wanted.set(found.code, found.name)
    else console.log(`  --countries ${code}: no such ISO code`)
  }

  if (unmatched.size) {
    // Said out loud: a country nobody could match is a customer whose
    // holidays quietly will not be loaded.
    console.log(`  no ISO match, so no holidays: ${[...unmatched].join(', ')}`)
  }

  const thisYear = new Date().getUTCFullYear()
  const seasons = Array.from({ length: years }, (_, i) => thisYear + i)
  console.log(`  ${wanted.size} countries × ${years} years: ${[...wanted.keys()].join(', ')}`)

  const existing = new Set(
    (await readAll(h, `${BASE}/bv_holidays?$select=bv_date,bv_countrycode`))
      .map((row) => `${String(row.bv_date).slice(0, 10)}:${row.bv_countrycode}`)
  )

  const rows = []
  for (const [code, name] of wanted) {
    for (const year of seasons) {
      const res = await fetch(`${API}/${year}/${code}`)
      if (!res.ok) { console.log(`  ${code} ${year}: ${res.status}, skipped`); continue }
      for (const day of await res.json()) {
        // Regional holidays are not a shut country: a day off in one Dutch
        // province does not close Schiphol's customs hall.
        if (day.global === false) continue
        if (existing.has(`${day.date}:${code}`)) continue
        rows.push({
          bv_date: day.date,
          bv_holidayname: (day.localName || day.name || '').slice(0, 120),
          bv_countrycode: code,
          bv_country: name,
        })
      }
    }
  }

  console.log(`  ${existing.size} already there, ${rows.length} to add`)
  if (dryRun || rows.length === 0) return

  for (let i = 0; i < rows.length; i += 100) {
    const slice = rows.slice(i, i + 100)
    const id = `batch_holidays_${i}`
    const body = slice.map((r, n) => [
      `--${id}`,
      'Content-Type: application/http',
      'Content-Transfer-Encoding: binary',
      `Content-ID: ${n + 1}`,
      '',
      `POST ${BASE}/bv_holidays HTTP/1.1`,
      'Content-Type: application/json',
      '',
      JSON.stringify(r),
      '',
    ].join('\r\n')).join('') + `--${id}--\r\n`
    const res = await fetch(`${BASE}/$batch`, {
      method: 'POST', headers: { ...h, 'Content-Type': `multipart/mixed;boundary=${id}` }, body,
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`batch failed ${res.status}: ${text.slice(0, 400)}`)
    const failures = [...text.matchAll(/HTTP\/1\.1 (4\d\d|5\d\d)/g)]
    if (failures.length) throw new Error(`${failures.length} rejected: ${text.slice(0, 500)}`)
    console.log(`  added ${Math.min(i + 100, rows.length)}/${rows.length}`)
  }
}

await main()
