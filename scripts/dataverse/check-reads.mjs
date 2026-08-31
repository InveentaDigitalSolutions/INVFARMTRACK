/**
 * Every table the app reads must actually reach Dataverse.
 *
 * Three things have to line up or a screen silently shows nothing: the table
 * must be mapped in tableMap, listed in ENABLED_TABLES, and registered with the
 * code app in power.config.json. Miss any one and `useRecords` quietly falls
 * back to the empty LocalStore — no error, no banner, just a screen that looks
 * like the nursery has no records.
 *
 * Run: npm run dataverse:check-reads
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : [p]
})

const src = walk('src').filter((f) => /\.tsx?$/.test(f) && !f.includes('generated'))
const used = new Map()                              // table -> files reading it
for (const file of src) {
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(/useRecords<[^>]*>\(\s*"([^"]+)"|useRecords\(\s*"([^"]+)"/g)) {
    const t = m[1] ?? m[2]
    if (!used.has(t)) used.set(t, [])
    used.get(t).push(file.replace('src/', ''))
  }
}

const map = readFileSync('src/services/tableMap.ts', 'utf8')
const mapped = new Set([...map.matchAll(/^\s{2}(\w+):\s*\{$/gm)].map((m) => m[1]))
const enabledBlock = map.slice(map.indexOf('ENABLED_TABLES'))
const enabled = new Set([...enabledBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]))

const cfg = JSON.parse(readFileSync('power.config.json', 'utf8'))
const registered = new Set(
  Object.values(cfg.databaseReferences?.['default.cds']?.dataSources ?? {}).map((d) => d.entitySetName)
)

let bad = 0
console.log(`${used.size} tables are read by the app\n`)
for (const [table, files] of [...used].sort()) {
  const problems = []
  if (!mapped.has(table)) problems.push('not in tableMap')
  if (!enabled.has(table)) problems.push('not in ENABLED_TABLES')
  const ds = map.match(new RegExp(`\\n  ${table}: \\{[^}]*?dataSource: "([^"]+)"`, 's'))?.[1]
  if (ds && !registered.has(ds)) problems.push(`${ds} not registered with the code app`)
  if (problems.length) {
    bad++
    console.log(`  FAIL ${table.padEnd(22)} ${problems.join(' · ')}`)
    console.log(`       read by ${files.join(', ')}`)
  }
}
// The build itself decides whether ANY of this runs: hostingMode() reads
// VITE_DATAVERSE_URL at build time, and without it the whole app quietly uses
// the empty LocalStore. A dist built for a screenshot looks identical.
const env = readFileSync('.env.local', 'utf8')
if (!/^VITE_DATAVERSE_URL=\S/m.test(env)) {
  bad++
  console.log('  FAIL .env.local has no VITE_DATAVERSE_URL — every screen would be empty')
}

console.log(bad ? `\n  ${bad} problem(s) would silently show nothing.` : '\n  Every table the app reads reaches Dataverse.')
process.exit(bad ? 1 : 0)
