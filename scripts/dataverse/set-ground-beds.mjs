/**
 * Marks the beds created from each field's row count as ground beds.
 *
 * This is not the inference that had to be undone. A field's rows are its
 * ground beds by definition — E3 has 33 rows, so it has 33 ground beds, all at
 * level 0. Baskets hang above some of those rows and are separate records
 * named E3-01-1 and so on; none exist yet, and which rows carry them has to
 * come from the nursery rather than from a rule.
 *
 * Only beds whose name has no level suffix are touched, so re-running after
 * baskets exist leaves them alone.
 *
 * Usage: node scripts/dataverse/set-ground-beds.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs'
import { resolveToken } from './auth.mjs'

const ORG = 'https://enterprisedev.crm16.dynamics.com'
const DRY = process.argv.includes('--dry-run')

const CHOICE = JSON.parse(
  readFileSync('src/services/choiceMap.generated.ts', 'utf8')
    .match(/CHOICE_MAP[^=]*=\s*(\{[\s\S]*?\n\});/)[1]
)
const GROUND = CHOICE.bv_beds.bv_type.Ground
const LEVEL_0 = CHOICE.bv_beds.bv_level['0']

const token = await resolveToken(ORG)
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }

const beds = (await (await fetch(
  `${ORG}/api/data/v9.2/bv_beds?$select=bv_bedname,bv_type,bv_level`, { headers: H }
)).json()).value

// "E3-01" is a ground bed; "E3-01-1" hangs above it.
const isGround = (name) => /^.+-\d{2}$/.test(String(name ?? '').trim())

let set = 0, skipped = 0
for (const bed of beds) {
  if (!isGround(bed.bv_bedname)) { skipped++; continue }
  if (bed.bv_type != null && bed.bv_level != null) { skipped++; continue }
  if (!DRY) {
    const r = await fetch(`${ORG}/api/data/v9.2/bv_beds(${bed.bv_bedid})`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ bv_type: GROUND, bv_level: LEVEL_0 }),
    })
    if (!r.ok) { console.error(`  ${bed.bv_bedname} failed ${r.status}`); continue }
  }
  set++
}
console.log(`${DRY ? 'Would mark' : 'Marked'} ${set} beds as Ground at level 0.`)
if (skipped) console.log(`${skipped} left alone (baskets, or already set).`)
