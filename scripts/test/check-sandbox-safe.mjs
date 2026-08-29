/**
 * Nothing in the bundle may reach the network at render time.
 *
 * The Power Apps player sets `connect-src 'none'`. drei's <Text> is
 * troika-three-text, which fetches a unicode font index from cdn.jsdelivr.net
 * to decide which font covers which codepoints. Under the player that fetch is
 * refused, the rejection lands inside typesetting, and the entire 3D scene
 * fails to render — not just the labels. The tab was blank for weeks and the
 * cause was one transitive import.
 *
 * A build is the only place to check this: the import is transitive, so
 * grepping src/ would miss it.
 *
 * Run: npm run test:sandbox   (build first)
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist/assets'

/** Hosts a render-time fetch must never name. */
const FORBIDDEN = [
  { needle: 'cdn.jsdelivr.net', why: 'troika-three-text fetches its font index from here' },
  { needle: 'unpkg.com', why: 'a CDN fetch the player refuses' },
  { needle: 'fonts.googleapis.com', why: 'external stylesheet; the player sets style-src \'self\'' },
  { needle: 'fonts.gstatic.com', why: 'external font; must be inlined instead' },
]

let files
try {
  files = readdirSync(DIST).filter((f) => f.endsWith('.js') || f.endsWith('.css'))
} catch {
  console.log('  No dist/ — run npm run build first.')
  process.exit(1)
}

let problems = 0
for (const file of files) {
  const src = readFileSync(join(DIST, file), 'utf8')
  for (const { needle, why } of FORBIDDEN) {
    if (!src.includes(needle)) continue
    problems++
    console.log(`\n  ${file}`)
    console.log(`     references ${needle}`)
    console.log(`     ${why}`)
  }
}

console.log(problems === 0
  ? `\n  ${files.length} built files, none reach an external host.\n`
  : `\n  ${problems} external references the player would refuse.\n`)
process.exit(problems === 0 ? 0 : 1)
