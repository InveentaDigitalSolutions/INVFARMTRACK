/**
 * dev-token.mjs — mint a Dataverse access token for local development.
 *
 * In the Power Apps host the SDK gets its session from the platform. Running
 * `npm run dev` locally there is no host, so the token is fetched here and
 * written to .env.local for Vite to expose to the app.
 *
 * Reuses scripts/dataverse/auth.mjs, so it resolves a token the same way the
 * schema tooling does: DATAVERSE_TOKEN, then Azure CLI, then device code.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveToken } from './dataverse/auth.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = join(REPO_ROOT, '.env.local')

const DV_URL = (process.env.DATAVERSE_URL || 'https://enterprisedev.crm16.dynamics.com').replace(/\/+$/, '')

/** Rewrite only the keys we own, so any other local settings survive. */
function upsertEnv(values) {
  const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8').split('\n') : []
  const owned = new Set(Object.keys(values))
  const kept = existing.filter((line) => {
    const key = line.split('=')[0]?.trim()
    return line.trim() && !owned.has(key)
  })
  const next = [...kept, ...Object.entries(values).map(([k, v]) => `${k}=${v}`)]
  writeFileSync(ENV_FILE, next.join('\n') + '\n', 'utf8')
}

const token = await resolveToken(DV_URL)
if (!token) {
  console.error('Could not acquire a Dataverse token.')
  console.error('Run `az login --tenant 47176c00-abb5-4125-8ce3-a795dffd8b87` or set DATAVERSE_TOKEN.')
  process.exit(1)
}

// Tokens are short-lived; record when this one was minted so a stale session
// is obvious rather than showing up as mystery 401s.
upsertEnv({
  VITE_DATAVERSE_URL: DV_URL,
  VITE_DATAVERSE_TOKEN: token,
  VITE_DATAVERSE_TOKEN_MINTED: new Date().toISOString(),
})

console.log(`Token written to .env.local for ${DV_URL}`)
console.log('Valid roughly one hour — re-run this script when requests start returning 401.')
