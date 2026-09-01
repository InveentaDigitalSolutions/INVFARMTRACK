/**
 * check-plant-names.mjs — does the catalogue's botany hold up?
 *
 * The Latin names are typed, and it shows: "Scindapsus Picta" for what is
 * really Scindapsus pictus, "Sansevieria Trifasciata" with a capital epithet
 * that no botanical name has. None of it stops the nursery working, but it is
 * printed on export paperwork and phytosanitary certificates, where a name
 * that does not resolve is a question at the border.
 *
 * Checked against the GBIF backbone (https://www.gbif.org, CC-BY, no key).
 * GBIF is case-sensitive about the epithet, which is why the capitalisation is
 * normalised before asking.
 *
 * It reports; it does not rewrite. Two reasons:
 *   - The trade name and the accepted name have diverged for half this
 *     catalogue — Sansevieria trifasciata is now Dracaena trifasciata, and
 *     nobody in the cut-foliage business says Dracaena. That is the nursery's
 *     call, not a script's.
 *   - --fix-case exists for the one safe change: the same name, spelled the
 *     way a botanist would.
 *
 * Usage:
 *   node scripts/dataverse/check-plant-names.mjs
 *   node scripts/dataverse/check-plant-names.mjs --fix-case
 */
import { BASE, headers } from './dv.mjs'

const MATCH = 'https://api.gbif.org/v1/species/match'
const SUGGEST = 'https://api.gbif.org/v1/species/suggest'

/** "Scindapsus Picta" -> "Scindapsus picta": genus capitalised, epithets not. */
function normalise(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const genus = words[0][0].toUpperCase() + words[0].slice(1).toLowerCase()
  return [genus, ...words.slice(1).map((w) => w.toLowerCase())].join(' ')
}

const cache = new Map()
async function lookup(name) {
  if (cache.has(name)) return cache.get(name)
  const res = await fetch(`${MATCH}?name=${encodeURIComponent(name)}`)
  if (!res.ok) throw new Error(`GBIF answered ${res.status} for "${name}"`)
  const found = await res.json()
  cache.set(name, found)
  return found
}

async function suggest(name) {
  const res = await fetch(`${SUGGEST}?q=${encodeURIComponent(name)}&rank=SPECIES`)
  if (!res.ok) return []
  return (await res.json()).slice(0, 3).map((s) => s.scientificName)
}

const h = await headers()
const res = await fetch(`${BASE}/bv_plants?$select=bv_plantname,bv_latinname,bv_variety`, { headers: h })
const body = await res.json()
if (!res.ok) throw new Error(`reading plants: ${res.status} ${JSON.stringify(body).slice(0, 200)}`)

const plants = (body.value ?? []).filter((p) => p.bv_latinname)
const verdicts = []

for (const plant of plants) {
  const typed = String(plant.bv_latinname).trim()
  const tidy = normalise(typed)
  const found = await lookup(tidy)

  if (found.matchType === 'EXACT') {
    verdicts.push({
      plant, typed, tidy,
      verdict: typed === tidy ? 'ok' : 'case',
      accepted: found.status === 'SYNONYM' ? found.species : null,
    })
  } else if (found.matchType === 'FUZZY' && found.confidence >= 90) {
    verdicts.push({ plant, typed, tidy, verdict: 'spelling', suggestion: found.canonicalName })
  } else {
    verdicts.push({ plant, typed, tidy, verdict: 'unknown', suggestions: await suggest(tidy) })
  }
}

const counts = { ok: 0, case: 0, spelling: 0, unknown: 0 }
for (const v of verdicts) {
  counts[v.verdict]++
  const who = `${v.plant.bv_plantname} / ${v.plant.bv_variety ?? ''}`.trim()
  if (v.verdict === 'ok') {
    if (v.accepted) console.log(`  note     ${who}: ${v.typed} is now ${v.accepted} — the trade still says the old name`)
  } else if (v.verdict === 'case') {
    console.log(`  case     ${who}: "${v.typed}" -> "${v.tidy}"${v.accepted ? ` (accepted name: ${v.accepted})` : ''}`)
  } else if (v.verdict === 'spelling') {
    console.log(`  spelling ${who}: "${v.typed}" -> GBIF's nearest is "${v.suggestion}"`)
  } else {
    console.log(`  unknown  ${who}: "${v.typed}" matches nothing${v.suggestions?.length ? `; did you mean ${v.suggestions.join(', ')}?` : ''}`)
  }
}
console.log(`\n  ${plants.length} named plants: ${counts.ok} clean, ${counts.case} miscapitalised, ${counts.spelling} misspelt, ${counts.unknown} unrecognised`)

if (!process.argv.includes('--fix-case')) {
  if (counts.case) console.log('  Re-run with --fix-case to correct the capitalisation (nothing else is touched).')
  process.exit(0)
}

const fixes = verdicts.filter((v) => v.verdict === 'case')
for (const fix of fixes) {
  const r = await fetch(`${BASE}/bv_plants(${fix.plant.bv_plantid})`, {
    method: 'PATCH',
    headers: { ...h, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bv_latinname: fix.tidy }),
  })
  if (!r.ok) throw new Error(`${fix.tidy}: ${r.status} ${(await r.text()).slice(0, 200)}`)
}
console.log(`  ${fixes.length} names recapitalised`)
