/**
 * Take a picture of the 3D shadehouse so it can actually be looked at.
 *
 * Written after rebuilding the geometry blind against a reference document and
 * being told, correctly, that the result was a mess. The unit tests all passed
 * throughout. A layout is a visual thing; check it by looking at it.
 *
 *   VITE_DATAVERSE_URL= npx vite build --mode development
 *   node scripts/test/shot3d.mjs out.png
 *
 * The empty VITE_DATAVERSE_URL matters: built against Dataverse the preview has
 * no session, reads no beds, and draws an empty house.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { cwd: process.cwd() })
// Poll the port rather than parse the server's banner: vite does not always
// write it to stdout, and a missed line looked exactly like a dead server.
for (let i = 0; ; i++) {
  try { await fetch('http://localhost:4179/'); break } catch {
    if (i > 60) throw new Error('preview server did not start')
    await new Promise((r) => setTimeout(r, 500))
  }
}
// A failed run used to leave the preview server holding its port, so the next
// run could not start. Kill it however this process ends.
const stop = () => { try { server.kill('SIGKILL') } catch { /* already gone */ } }
process.on('exit', stop); process.on('SIGINT', () => { stop(); process.exit(1) })
process.on('uncaughtException', (e) => { stop(); console.error(e); process.exit(1) })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
const errs = []
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
// Seed the local store with the real 120 ground beds so the layout is visible.
await page.goto('http://localhost:4179/', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const fields = [['E3', 33], ['C3', 27], ['E1', 33], ['C1', 27]]
  const beds = []
  for (const [f, rows] of fields)
    for (let r = 1; r <= rows; r++)
      beds.push({ id: `${f}-${String(r).padStart(2, '0')}`, name: `${f}-${String(r).padStart(2, '0')}`,
                  field: f, fieldName: f, row: r, level: 0, type: 'Ground', status: 'Active' })
  localStorage.setItem('dni_beds', JSON.stringify(beds))
  localStorage.setItem('dni_fields', JSON.stringify(
    fields.map(([n, rows]) => ({ id: n, name: n, fieldName: n, rows, shadehouse: 'SH-0001' }))))
})
await page.goto('http://localhost:4179/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Infrastructure' }).first().click()
await page.waitForTimeout(800)
await page.getByRole('button', { name: '3D', exact: true }).click()
await page.waitForTimeout(2500)
if (process.env.TERRAIN) {
  await page.getByRole('button', { name: 'Terrain' }).click()
  await page.waitForTimeout(2000)
}
const out = process.argv[2]
const canvas = page.locator('canvas').first()
await canvas.screenshot({ path: out })
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none')
await browser.close(); server.kill('SIGTERM')
