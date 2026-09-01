/**
 * Refuse to ship a build that talks to nobody.
 *
 * `hostingMode()` reads VITE_DATAVERSE_URL at build time. Unset, the app falls
 * back to LocalStore — every screen renders perfectly and every table is
 * empty, because it is reading a browser's local storage instead of the
 * nursery's records.
 *
 * That is not hypothetical. The screenshot harnesses build in demo mode on
 * purpose (`VITE_DATAVERSE_URL= vite build`), and one of them ran last before
 * a deploy. The push succeeded, the app opened, and every season, plant, field
 * and bed had vanished — with nothing on screen to say why.
 *
 * Run: npm run check-build   (after npm run build, before pushing)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist/assets'

/**
 * Vite reads .env.local; node does not. Reading it here rather than relying on
 * the environment is the point — the whole check is about what the build was
 * given, and an unset variable in this process says nothing about that.
 */
function configured() {
  if (process.env.VITE_DATAVERSE_URL) return process.env.VITE_DATAVERSE_URL
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue
    const m = /^\s*VITE_DATAVERSE_URL\s*=\s*(.+)\s*$/m.exec(readFileSync(file, 'utf8'))
    if (m && m[1].trim()) return m[1].trim()
  }
  return ''
}

const expected = configured().replace(/\/+$/, '')

if (!expected) {
  console.error('\n  No VITE_DATAVERSE_URL anywhere — .env.local is where it lives.\n')
  process.exit(1)
}

let files
try {
  files = readdirSync(DIST).filter((f) => f.endsWith('.js'))
} catch {
  console.error(`\n  No ${DIST}. Run npm run build first.\n`)
  process.exit(1)
}

// The URL itself is never in the bundle: it is only tested for truth, so the
// compiler folds it away. services/tableMap.ts stamps the outcome instead.
const contents = files.map((f) => readFileSync(join(DIST, f), 'utf8'))
const dataverse = contents.some((c) => c.includes('BUILD_TARGET:dataverse'))
const localstore = contents.some((c) => c.includes('BUILD_TARGET:localstore'))

if (!dataverse) {
  console.error(`\n  This build talks to ${localstore ? 'the browser\'s local storage' : 'nothing recognisable'}, not ${expected}.`)
  console.error('  Every screen would render and every table would be empty.')
  console.error('  Rebuild with npm run build — the screenshot harnesses build in demo mode.\n')
  process.exit(1)
}

console.log(`\n  Build talks to Dataverse (${expected}).\n`)
