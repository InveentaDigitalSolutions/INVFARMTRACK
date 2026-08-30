/**
 * Screenshot the exchange-rate history popover.
 *
 * Seeds a year of working-day rates into the local store first: the demo seeds
 * are deliberately empty, so without this the chart correctly says there is no
 * history and there is nothing to look at.
 *
 *   VITE_DATAVERSE_URL= npx vite build --mode development
 *   RANGE=1Y HX=1150 HY=190 node scripts/test/shotrate.mjs out.png
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const server = spawn('npx', ['vite', 'preview', '--port', '4185', '--strictPort'], { cwd: process.cwd() })
// Poll the port rather than parse the server's banner: vite does not always
// write it to stdout, and a missed line looked exactly like a dead server.
for (let i = 0; ; i++) {
  try { await fetch('http://localhost:4185/'); break } catch {
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
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
const errs = []
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await page.goto('http://localhost:4185/', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  // A year of working-day rates, drifting the way the lempira actually does.
  const rows = []
  const d = new Date(Date.UTC(2025, 7, 30))
  let v = 25.9
  for (let i = 0; i < 365; i++) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue
    v += 0.0035 + Math.sin(i / 23) * 0.004
    rows.push({ id: `FX-${i}`, date: d.toISOString().slice(0, 10), value: Number(v.toFixed(4)), source: 'BCH' })
  }
  localStorage.setItem('dni_exchangeRates', JSON.stringify(rows))
})
await page.goto('http://localhost:4185/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.getByRole('button', { name: 'Exchange rate history' }).click()
await page.waitForTimeout(600)
if (process.env.RANGE) { await page.getByRole('button', { name: process.env.RANGE }).click(); await page.waitForTimeout(400) }
// Prove it can be dismissed. This is the bug the first version shipped: the
// click unpinned the chart and the pointer, still on the chip, reopened it.
const chip = page.getByRole('button', { name: 'Exchange rate history' })
const chart = page.getByRole('group', { name: 'Range' })
console.log('open after click        :', await chart.isVisible())
await page.getByRole('button', { name: 'Close' }).click()
await page.waitForTimeout(300)
console.log('closed by the X button  :', !(await chart.isVisible()))
await chip.click(); await page.waitForTimeout(300)
await chip.click(); await page.waitForTimeout(300)
console.log('closed by clicking chip :', !(await chart.isVisible()))
await chip.click(); await page.waitForTimeout(300)
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
console.log('closed by Escape        :', !(await chart.isVisible()))
await chip.click(); await page.waitForTimeout(300)
await page.mouse.click(300, 600); await page.waitForTimeout(300)
console.log('closed by clicking away :', !(await chart.isVisible()))
await chip.click(); await page.waitForTimeout(400)
await page.mouse.move(Number(process.env.HX ?? 1180), Number(process.env.HY ?? 300))
await page.waitForTimeout(400)
await page.screenshot({ path: process.argv[2], clip: { x: 900, y: 40, width: 560, height: 300 } })
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none')
await browser.close(); server.kill('SIGTERM')
