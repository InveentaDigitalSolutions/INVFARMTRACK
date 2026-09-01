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
page.on('console', m => { const t = m.text(); if (t.includes('SHADOWDBG')) console.log(t); if (m.type() === 'error') errs.push(t) })
// Seed the local store with the real 120 ground beds so the layout is visible.
await page.goto('http://localhost:4179/', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const fields = [['E3', 33], ['C3', 27], ['E1', 33], ['C1', 27]]
  const beds = []
  for (const [f, rows] of fields)
    for (let r = 1; r <= rows; r++)
      beds.push({ id: `${f}-${String(r).padStart(2, '0')}`, name: `${f}-${String(r).padStart(2, '0')}`,
                  field: f, fieldName: f, row: r, level: 0, type: 'Ground', status: 'Active',
                  // Exactly as Dataverse holds it: E fields banded into eight
                  // runs, C fields uniform — which is one panel spanning 49 m.
                  shade: f.startsWith('C') ? 'Single'
                    : ([1,2,3,4,9,10,11,12,17,18,19,20,21,26,27,28,29].includes(r) ? 'Double' : 'Single') })
  // Basket rows are a different grid: one per post line per level, numbered by
  // the post line, so E1-05-01 is the fifth cable of E1 and sits nowhere near
  // bed E1-05. Seeded here because a cable that is never drawn is never checked.
  const postLines = { E3: 9, C3: 10, E1: 9, C1: 10 }
  for (const [f] of fields)
    for (let line = 1; line <= postLines[f]; line++)
      for (const level of [1, 2])
        beds.push({ id: `${f}-${String(line).padStart(2, '0')}-${String(level).padStart(2, '0')}`,
                    name: `${f}-${String(line).padStart(2, '0')}-${String(level).padStart(2, '0')}`,
                    field: f, fieldName: f, row: line, level, type: 'Basket', status: 'Active',
                    shade: 'Single' })
  localStorage.setItem('dni_beds', JSON.stringify(beds))
  localStorage.setItem('dni_fields', JSON.stringify(
    fields.map(([n, rows]) => ({ id: n, name: n, fieldName: n, rows, postLines: postLines[n], shadehouse: 'SH-0001' }))))
})
await page.goto('http://localhost:4179/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Infrastructure' }).first().click()
await page.waitForTimeout(800)
if (process.env.PLAN) {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.waitForTimeout(1200)
  await page.locator('svg.shadehouse-svg').first().screenshot({ path: process.argv[2] })
  console.log('errors:', errs.length ? errs.slice(0, 5) : 'none')
  await browser.close(); server.kill('SIGTERM'); process.exit(0)
}
await page.getByRole('button', { name: '3D', exact: true }).click()
await page.waitForTimeout(2500)
if (process.env.NOSHADE) {
  await page.getByRole('button', { name: 'Shade', exact: true }).first().click()
  await page.waitForTimeout(600)
}
if (process.env.LENS) {
  await page.getByRole('button', { name: process.env.LENS, exact: true }).click()
  await page.waitForTimeout(900)
}
if (process.env.SUN) {
  await page.getByRole('button', { name: 'Sun', exact: true }).click()
  await page.waitForTimeout(800)
  if (process.env.SUNDATE) await page.locator('input[type=date]').fill(process.env.SUNDATE)
  if (process.env.SUNHOUR) {
    await page.locator('input[type=range][aria-label="Time of day"]')
      .fill(process.env.SUNHOUR)
    await page.locator('input[type=range][aria-label="Time of day"]').dispatchEvent('input')
  }
  await page.waitForTimeout(1500)
}
if (process.env.TERRAIN) {
  await page.getByRole('button', { name: 'Terrain' }).click()
  await page.waitForTimeout(2000)
}
const out = process.argv[2]
const canvas = page.locator('canvas').first()
// The scene sits well down the page. Mouse coordinates are window
// coordinates, so with the canvas below the fold every drag and wheel landed
// outside the window and did nothing — three "different" camera angles came
// back byte-identical before this.
await canvas.scrollIntoViewIfNeeded()
await page.waitForTimeout(300)
if (process.env.ORBIT) {
  const box = await canvas.boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  await page.mouse.move(cx, cy); await page.mouse.down()
  await page.mouse.move(cx + Number(process.env.ORBIT), cy, { steps: 20 })
  await page.mouse.up(); await page.waitForTimeout(1200)
}
// Straight down is where coplanar surfaces fight worst, so it has to be
// reachable from the harness.
if (process.env.TILT) {
  const box = await canvas.boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  // OrbitControls only starts turning after it has seen movement while the
  // button is held; one jump from A to B is not movement it can integrate.
  const tilt = Number(process.env.TILT)
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(cx, cy - (tilt * i) / 20)
    await page.waitForTimeout(20)
  }
  await page.mouse.up(); await page.waitForTimeout(1200)
}
if (process.env.ZOOMOUT) {
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < Number(process.env.ZOOMOUT); i++) {
    await page.mouse.wheel(0, 240); await page.waitForTimeout(120)
  }
  await page.waitForTimeout(1200)
}
if (process.env.ZOOM) {
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < Number(process.env.ZOOM); i++) {
    await page.mouse.wheel(0, -240); await page.waitForTimeout(120)
  }
  await page.waitForTimeout(1200)
}
const target = process.env.FULL ? page
  : process.env.CLIP ? page.locator('canvas').first().locator('xpath=..')
  : canvas
await target.screenshot({ path: out })
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none')
await browser.close(); server.kill('SIGTERM')
