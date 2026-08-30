/**
 * Loads measured daily shortwave radiation into bv_SolarRadiation.
 *
 * The weather flow offers a rolling 92-day window. A planting older than that
 * would accumulate its early life on clear-sky assumptions, which flatters a
 * rainy month badly. Storing each day fixes that permanently.
 *
 * Open-Meteo's archive reaches back years; the forecast endpoint only 92 days,
 * so the archive is used here and the flow keeps it current from today.
 *
 * Run once to seed history, and safe to re-run: a date already stored is left
 * alone.
 *
 * Usage: node scripts/dataverse/backfill-radiation.mjs [days]
 */
import { resolveToken } from './auth.mjs'

const ORG = 'https://enterprisedev.crm16.dynamics.com'
const LAT = 14.9786
const LON = -87.9531
const DAYS = Number(process.argv[2] ?? 730)
const SOURCE_OPEN_METEO = 187470000

const end = new Date(Date.now() - 86_400_000)          // the archive lags a day
const start = new Date(end.getTime() - DAYS * 86_400_000)
const iso = (d) => d.toISOString().slice(0, 10)

const url =
  `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}` +
  `&start_date=${iso(start)}&end_date=${iso(end)}` +
  `&daily=shortwave_radiation_sum&timezone=America%2FTegucigalpa`

const res = await fetch(url)
if (!res.ok) throw new Error(`Open-Meteo archive returned ${res.status}`)
const daily = (await res.json()).daily ?? {}

const wanted = []
for (let i = 0; i < (daily.time?.length ?? 0); i++) {
  const value = daily.shortwave_radiation_sum?.[i]
  // A null is a day with no reading. Number(null) is 0 and passes isFinite, so
  // storing it would record a day of total darkness — check the raw value.
  if (value === null || value === undefined) continue
  const mj = Number(value)
  if (!Number.isFinite(mj)) continue
  wanted.push([String(daily.time[i]).slice(0, 10), mj])
}
console.log(`Archive returned ${wanted.length} days with a reading, ${iso(start)} to ${iso(end)}`)

const token = await resolveToken(ORG)
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }

/** Every date already stored, paged — a couple of years is past one page. */
const existing = new Set()
let next = `${ORG}/api/data/v9.2/bv_solarradiations?$select=bv_radiationdate&$top=5000`
while (next) {
  const page = await (await fetch(next, { headers: H })).json()
  if (page.error) throw new Error(page.error.message)
  for (const r of page.value ?? []) existing.add(String(r.bv_radiationdate).slice(0, 10))
  next = page['@odata.nextLink'] ?? null
}
console.log(`${existing.size} days already stored`)

let created = 0, failed = 0
for (const [date, mj] of wanted) {
  if (existing.has(date)) continue
  const r = await fetch(`${ORG}/api/data/v9.2/bv_solarradiations`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      bv_radiationdate: date,
      bv_shortwavesum: mj,
      bv_radiationsource: SOURCE_OPEN_METEO,
    }),
  })
  if (!r.ok) {
    failed++
    if (failed <= 3) console.error(`  ${date} failed ${r.status}: ${(await r.text()).slice(0, 160)}`)
    continue
  }
  created++
  if (created % 100 === 0) console.log(`  … ${created}`)
}
console.log(`\n  ${created} days stored, ${failed} failed, ${wanted.length - created - failed} already present`)
