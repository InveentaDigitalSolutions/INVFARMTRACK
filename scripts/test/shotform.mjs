/** Screenshot a catalogue form so the controls can be looked at. */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const PORT = 4193
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd() })
const stop = () => { try { server.kill('SIGKILL') } catch {} }
process.on('exit', stop); process.on('uncaughtException', e => { stop(); console.error(String(e).slice(0,300)); process.exit(1) })
for (let i = 0; ; i++) { try { await fetch(`http://localhost:${PORT}/`); break } catch { if (i>40) throw new Error('no server'); await new Promise(r=>setTimeout(r,400)) } }
// HARD TIMEOUT: a hung locator used to block the whole run with no output.
const bail = setTimeout(() => { console.error('TIMEOUT — giving up'); stop(); process.exit(1) }, 90_000)
bail.unref?.()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } })
page.setDefaultTimeout(10000)
const errs = []
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Production' }).first().click()
await page.waitForTimeout(700)
await page.getByRole('button', { name: 'Catalog', exact: true }).first().click()
await page.waitForTimeout(700)
if (process.env.SUB) { await page.getByRole('button', { name: process.env.SUB, exact: true }).first().click(); await page.waitForTimeout(600) }
await page.getByRole('button', { name: process.env.ADD ?? 'Add Plant' }).first().click()
await page.waitForTimeout(900)
// Optionally press some toggles first, so conditional fields can be seen.
for (const label of (process.env.CLICKS ?? '').split(',').filter(Boolean)) {
  await page.getByRole('button', { name: label, exact: true }).first().click()
  await page.waitForTimeout(350)
}
if (process.env.TYPE_INTO) {
  const [label, value] = process.env.TYPE_INTO.split('=')
  await page.getByLabel(label, { exact: false }).first().fill(value).catch(async () => {
    const idx = Number(process.env.TYPE_IDX ?? 0)
    await page.locator('input[type=number]').nth(idx).fill(value)
  })
  await page.waitForTimeout(500)
}
const dlg = page.locator('[role=dialog]').first()
await (await dlg.count() ? dlg : page).screenshot({ path: process.argv[2] })
console.log('errors:', errs.length ? errs.slice(0,3) : 'none')
await browser.close(); stop()
