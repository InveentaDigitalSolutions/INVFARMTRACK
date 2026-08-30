/** Screenshot the Moon tab in Production. */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const PORT = 4191
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd() })
const stop = () => { try { server.kill('SIGKILL') } catch {} }
process.on('exit', stop); process.on('uncaughtException', e => { stop(); console.error(String(e).slice(0,300)); process.exit(1) })
for (let i = 0; ; i++) { try { await fetch(`http://localhost:${PORT}/`); break } catch { if (i>40) throw new Error('no server'); await new Promise(r=>setTimeout(r,500)) } }
// HARD TIMEOUT: a hung locator used to block the whole run with no output.
const bail = setTimeout(() => { console.error('TIMEOUT — giving up'); stop(); process.exit(1) }, 90_000)
bail.unref?.()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
const errs = []
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Production' }).first().click()
await page.waitForTimeout(800)
await page.waitForTimeout(1200)
await page.screenshot({ path: process.argv[2], fullPage: true })
console.log('errors:', errs.length ? errs.slice(0,3) : 'none')
await browser.close(); stop()
