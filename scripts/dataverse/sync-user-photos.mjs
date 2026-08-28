/**
 * Copies Microsoft 365 profile photos from Entra onto Dataverse user records.
 *
 * The app shows the photo on a user's Dataverse record, because that arrives
 * through the connection it already holds. The photo people actually
 * recognise lives in Entra, and the Power Apps player sets connect-src 'none'
 * — the browser cannot call graph.microsoft.com at all. Copying the image
 * across once bridges the two without a new connector.
 *
 * Needs a Graph token. Reading other people's photos needs User.Read.All, so
 * without it only the signed-in user's own photo is copied — which is still
 * enough to prove the wiring.
 *
 * Usage: node scripts/dataverse/sync-user-photos.mjs [--dry-run]
 */
import { execFileSync } from 'node:child_process'
import { resolveToken } from './auth.mjs'

const ORG = 'https://enterprisedev.crm16.dynamics.com'
const DRY = process.argv.includes('--dry-run')

function graphToken() {
  try {
    return execFileSync('az', [
      'account', 'get-access-token',
      '--resource', 'https://graph.microsoft.com',
      '--query', 'accessToken', '-o', 'tsv',
    ], { encoding: 'utf8' }).trim()
  } catch {
    throw new Error('No Graph token. Run `az login` first.')
  }
}

const graph = graphToken()
const dv = await resolveToken(ORG)
const G = { Authorization: `Bearer ${graph}` }
const H = { Authorization: `Bearer ${dv}`, 'Content-Type': 'application/json', Accept: 'application/json' }

// Only real, enabled people: Dataverse carries a number of system accounts
// that will never have a photo and would just produce noise.
const users = (await (await fetch(
  `${ORG}/api/data/v9.2/systemusers?$select=fullname,domainname,entityimageid` +
  `&$filter=isdisabled eq false and accessmode eq 0`, { headers: H }
)).json()).value

console.log(`${users.length} enabled users in Dataverse\n`)

let copied = 0, none = 0, failed = 0
for (const user of users) {
  const upn = user.domainname
  if (!upn) { none++; continue }

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/photo/$value`, { headers: G })
  if (res.status === 404) {
    console.log(`  ${String(user.fullname).padEnd(28)} no photo in Entra`)
    none++
    continue
  }
  if (!res.ok) {
    console.log(`  ${String(user.fullname).padEnd(28)} Graph ${res.status}${res.status === 403 ? ' (needs User.Read.All)' : ''}`)
    failed++
    continue
  }

  const base64 = Buffer.from(await res.arrayBuffer()).toString('base64')
  if (!DRY) {
    const put = await fetch(`${ORG}/api/data/v9.2/systemusers(${user.systemuserid})`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ entityimage: base64 }),
    })
    if (!put.ok) {
      console.log(`  ${String(user.fullname).padEnd(28)} Dataverse ${put.status}: ${(await put.text()).match(/"message":"([^"]{0,90})/)?.[1] ?? ''}`)
      failed++
      continue
    }
  }
  console.log(`  ${String(user.fullname).padEnd(28)} ${Math.round(base64.length / 1024)} KB ${DRY ? 'would be copied' : 'copied'}`)
  copied++
}

console.log(`\n  ${copied} copied, ${none} without a photo, ${failed} failed`)
