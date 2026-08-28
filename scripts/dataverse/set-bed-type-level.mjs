/**
 * Fills in Type and Level on beds that have neither.
 *
 * The 120 seeded beds were created without either, so every screen fell back
 * to whatever it invented — the bed picker and the 3D view each guessed
 * separately, which is why the air/ground split looked plausible while being
 * entirely synthetic.
 *
 * The mapping below is INFERRED, not told to us. Two things point the same
 * way: the E fields are 1.2 m wide and the C fields 1.8 m, and the app has
 * always drawn E as air and C as ground. If that is wrong at the nursery, fix
 * it here and re-run — nothing else depends on the guess.
 *
 * Levels are all set to 1 for air beds rather than spread across 1-3. A
 * distribution nobody has told us would be fiction; a uniform default is at
 * least visibly a default.
 *
 * Usage: node scripts/dataverse/set-bed-type-level.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs'
import { resolveToken } from './auth.mjs'

const ORG = 'https://enterprisedev.crm16.dynamics.com'
const DRY = process.argv.includes('--dry-run')
// Read the option values rather than assuming them: these columns sit in a
// different publisher range (121320000) from most of the schema (187460000),
// and hardcoding the wrong one fails every write with a validation error.
const CHOICE = JSON.parse(
  readFileSync('src/services/choiceMap.generated.ts', 'utf8')
    .match(/CHOICE_MAP[^=]*=\s*(\{[\s\S]*?\n\});/)[1]
)
const TYPE = CHOICE.bv_beds.bv_type
const LEVEL = CHOICE.bv_beds.bv_level

const token = await resolveToken(ORG)
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }
const get = async (u) => (await (await fetch(`${ORG}/api/data/v9.2/${u}`, { headers: H })).json()).value

const fields = Object.fromEntries((await get('bv_fields?$select=bv_fieldname')).map((f) => [f.bv_fieldid, f.bv_fieldname]))
const beds = await get('bv_beds?$select=bv_bedname,bv_type,bv_level,_bv_fieldid_value')

let air = 0, ground = 0, skipped = 0
for (const bed of beds) {
  if (bed.bv_type != null && bed.bv_level != null) { skipped++; continue }
  const field = String(fields[bed._bv_fieldid_value] ?? '')
  const isAir = field.toUpperCase().startsWith('E')
  const body = {
    bv_type: isAir ? TYPE.Air : TYPE.Ground,
    bv_level: isAir ? LEVEL['1'] : LEVEL['0'],
  }
  if (!DRY) {
    const r = await fetch(`${ORG}/api/data/v9.2/bv_beds(${bed.bv_bedid})`, {
      method: 'PATCH', headers: H, body: JSON.stringify(body),
    })
    if (!r.ok) { console.error(`  ${bed.bv_bedname} failed ${r.status}`); continue }
  }
  isAir ? air++ : ground++
}
console.log(`${DRY ? 'Would set' : 'Set'} ${air} air beds (level 1) and ${ground} ground beds (level 0).`)
if (skipped) console.log(`${skipped} already had both and were left alone.`)
