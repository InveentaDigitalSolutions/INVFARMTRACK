/**
 * Opens every module in a real browser and fails on any console error.
 *
 * A render-time exception unmounts React and leaves a white page. `npm run
 * build` cannot see it — the code type-checks perfectly — and no unit test
 * mounts the app. That is how a crash on every screen with a form shipped:
 * emptying the demo seeds left `initRows[0]` undefined and useFormModal threw
 * inside a useState initialiser.
 *
 * Run: npm run test:smoke   (builds first; needs Playwright's chromium)
 */
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const MODULES = [
  'Dashboard', 'Production', 'Inventory', 'Infrastructure', 'Availability',
  'Nutrition', 'Sales & Shipping', 'Accounting', 'Suppliers', 'Labor', 'Settings',
]

const server = spawn('npx', ['vite', 'preview', '--port', '4178', '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
const stop = () => { try { server.kill('SIGTERM') } catch { /* already gone */ } }
process.on('exit', stop)

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('preview server did not start')), 30_000)
  server.stdout.on('data', (d) => {
    if (String(d).includes('localhost:4178')) { clearTimeout(timer); resolve() }
  })
  server.on('error', reject)
})

const browser = await chromium.launch()
const page = await browser.newPage()

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:4178/', { waitUntil: 'networkidle' })

let failed = 0
for (const name of MODULES) {
  const before = errors.length
  try {
    // Two buttons can carry the same words ("Add Worker" appears twice); the
    // sidebar one is the first.
    await page.locator(`aside button:has-text("${name}")`).first().click({ timeout: 10_000 })
    await page.waitForTimeout(600)
  } catch (err) {
    failed++
    console.log(`  ${name.padEnd(20)} could not be opened — ${String(err).split('\n')[0]}`)
    continue
  }

  const fresh = errors.slice(before)
  // A crash unmounts the tree, so an empty main area is the tell even when
  // nothing reached the console.
  const body = (await page.locator('main').innerText().catch(() => '')).trim()

  if (fresh.length > 0) {
    failed++
    console.log(`  ${name.padEnd(20)} FAILED`)
    for (const e of fresh.slice(0, 2)) console.log(`     ${e.split('\n')[0].slice(0, 160)}`)
  } else if (body.length < 20) {
    failed++
    console.log(`  ${name.padEnd(20)} FAILED — the screen rendered nothing`)
  } else {
    console.log(`  ${name.padEnd(20)} opens clean`)
  }
}

await browser.close()
stop()

console.log(failed === 0
  ? `\n  ${MODULES.length} modules open with no console error.\n`
  : `\n  ${failed} of ${MODULES.length} modules failed.\n`)
process.exit(failed === 0 ? 0 : 1)
