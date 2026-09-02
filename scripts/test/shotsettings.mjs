import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const PORT = 4188
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd() })
const stop = () => { try { server.kill('SIGKILL') } catch {} }
process.on('exit', stop)
for (let i = 0; ; i++) { try { await fetch(`http://localhost:${PORT}/`); break } catch { if (i > 40) throw new Error('no server'); await new Promise(r => setTimeout(r, 400)) } }
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Settings' }).first().click()
await page.waitForTimeout(1500)
await page.screenshot({ path: process.argv[2] })
await browser.close(); stop()
console.log('ok')
