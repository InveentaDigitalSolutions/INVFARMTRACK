/**
 * Loads Banco Central de Honduras reference rates (TCR) into bv_ExchangeRate.
 *
 * Run once to seed history, and safe to re-run: a date already stored is left
 * alone. The daily flow keeps it current from here.
 *
 * Usage: BCH_API_KEY=… node scripts/dataverse/backfill-rates.mjs [days]
 */
import { readFileSync } from 'node:fs'
import { resolveToken } from './auth.mjs'

const ORG = 'https://enterprisedev.crm16.dynamics.com'
const DAYS = Number(process.argv[2] ?? 400)
const KEY = process.env.BCH_API_KEY
  ?? (readFileSync('.env', 'utf8').match(/BCH_API_KEY=(\S+)/)?.[1])
if (!KEY) throw new Error('No BCH API key. Set BCH_API_KEY.')

const bch = await fetch(
  'https://bchapi-am.azure-api.net/api/v1/indicadores/97/cifras?formato=Json',
  { headers: { clave: KEY } }
)
if (!bch.ok) throw new Error(`BCH returned ${bch.status}`)

// The feed repeats a date with the same value; one row per day is what we keep.
const byDate = new Map()
for (const fig of await bch.json()) {
  const date = String(fig.Fecha).slice(0, 10)
  if (!byDate.has(date)) byDate.set(date, Number(fig.Valor))
}
// Newest first to choose the window, then oldest first to insert, so the
// autonumber ascends with the date instead of running backwards.
const wanted = [...byDate.entries()]
  .sort((a, b) => (a[0] < b[0] ? 1 : -1))
  .slice(0, DAYS)
  .reverse()
console.log(`BCH returned ${byDate.size} distinct dates; taking the most recent ${wanted.length}`)

const token = await resolveToken(ORG)
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }

const existing = new Set(
  (await (await fetch(`${ORG}/api/data/v9.2/bv_exchangerates?$select=bv_ratedate`, { headers: H })).json())
    .value.map((r) => String(r.bv_ratedate).slice(0, 10))
)

let created = 0
for (const [date, value] of wanted) {
  if (existing.has(date)) continue
  const res = await fetch(`${ORG}/api/data/v9.2/bv_exchangerates`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ bv_ratedate: date, bv_value: value, bv_source: 187460000 }),
  })
  if (!res.ok) { console.error(`  ${date} failed ${res.status}`); continue }
  created++
  if (created % 100 === 0) console.log(`  … ${created}`)
}
console.log(`\n  ${created} rates stored, ${wanted.length - created} already present`)
