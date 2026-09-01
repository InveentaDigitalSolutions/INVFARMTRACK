/**
 * Deleting a row deletes THAT row.
 *
 * The tables hand their action callbacks the position of the row on screen,
 * and the pages use it as a position in the data they hold. Those agree only
 * while nothing is searched, filtered, sorted or limited. Search a bed, press
 * delete, and it was the first bed in the table that went — the searched row
 * stayed put, which reads as the button doing nothing.
 *
 * A unit test cannot see this: the bug lives in the wiring between a table and
 * a page, and both are correct on their own.
 *
 * Run: npm run test:rows   (needs a dev-mode build; see shot3d.mjs)
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = 4181
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd() })
const stop = () => { try { server.kill('SIGKILL') } catch { /* already gone */ } }
process.on('exit', stop)
process.on('uncaughtException', (e) => { stop(); console.error(String(e).slice(0, 400)); process.exit(1) })
for (let i = 0; ; i++) {
  try { await fetch(`http://localhost:${PORT}/`); break } catch {
    if (i > 40) throw new Error('preview server did not start')
    await new Promise((r) => setTimeout(r, 400))
  }
}
const bail = setTimeout(() => { console.error('TIMEOUT — giving up'); stop(); process.exit(1) }, 90_000)
bail.unref?.()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
page.setDefaultTimeout(10_000)

let failures = 0
const ok = (label, pass, detail = '') => {
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
}

// Ground beds and cable rows, so the row deleted is neither first nor last.
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const beds = [
    { id: 'b1', name: 'E1-01', field: 'E1', type: 'Ground', level: 0, active: true },
    { id: 'b2', name: 'E1-02', field: 'E1', type: 'Ground', level: 0, active: true },
    { id: 'b3', name: 'E1-05-01', field: 'E1', type: 'Basket', level: 1, active: true },
    { id: 'b4', name: 'E1-05-02', field: 'E1', type: 'Basket', level: 2, active: true },
  ]
  localStorage.setItem('dni_beds', JSON.stringify(beds))
})
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Infrastructure' }).first().click()
await page.waitForTimeout(600)
await page.getByRole('button', { name: 'Beds', exact: true }).first().click()
await page.waitForTimeout(600)

// Narrow to one cable row — this is what makes the two indexes disagree.
await page.getByPlaceholder('Search beds...').fill('E1-05-02')
await page.waitForTimeout(400)
const rows = page.locator('tbody tr')
ok('the search leaves one row', (await rows.count()) === 1, `${await rows.count()} rows`)

await rows.first().locator('button').last().click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /delete|confirm|yes/i }).last().click()
await page.waitForTimeout(800)

await page.getByPlaceholder('Search beds...').fill('')
await page.waitForTimeout(500)
const names = await page.locator('tbody tr td:first-child').allInnerTexts()
ok('the row asked for is gone', !names.includes('E1-05-02'), names.join(', '))
ok('and the first row is untouched', names.includes('E1-01'), names.join(', '))
ok('nothing else was taken with it', names.length === 3, `${names.length} left`)

console.log(failures ? `\n  ${failures} failed` : '\n  The row deleted is the row asked for.')
await browser.close(); stop()
process.exit(failures ? 1 : 0)
