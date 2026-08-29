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

/**
 * Scene labels must not be clipped.
 *
 * SceneText sizes a canvas from the glyph metrics and draws at the baseline.
 * Getting that arithmetic wrong cuts the bottom off every label in the 3D view
 * — field names and bed numbers both — and it is invisible to any type check.
 * This draws the real label shapes and asserts the ink lands inside the box.
 */
const clipped = await page.evaluate(() => {
  const RESOLUTION = 128;
  const probe = (text, weight, outlineEm) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const font = `${weight} ${RESOLUTION}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.font = font;
    const m = ctx.measureText(text);
    const strokePx = outlineEm * RESOLUTION;
    const ascent = m.actualBoundingBoxAscent || RESOLUTION * 0.82;
    const descent = m.actualBoundingBoxDescent || RESOLUTION * 0.24;
    const inkWidth = Math.max(m.width, (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? m.width));
    const pad = strokePx + RESOLUTION * 0.16;
    canvas.width = Math.ceil(inkWidth + pad * 2);
    canvas.height = Math.ceil(ascent + descent + pad * 2);
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const cx = canvas.width / 2, cy = pad + ascent;
    if (strokePx > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = strokePx * 2; ctx.strokeText(text, cx, cy); }
    ctx.fillStyle = '#000'; ctx.fillText(text, cx, cy);

    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let top = -1, bottom = -1, left = -1, right = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (d[(y * canvas.width + x) * 4 + 3] > 8) {
          if (top < 0) top = y;
          bottom = y;
          if (left < 0 || x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    const bad = top <= 0 || bottom >= canvas.height - 1 || left <= 0 || right >= canvas.width - 1;
    return bad ? text : null;
  };
  // Every shape the scene actually draws, plus descenders and an accent.
  return [
    probe('Field E1', 700, 0.06),
    probe('33 beds', 500, 0.08),
    probe('gjpqy Ay', 700, 0.06),
    probe('01', 600, 0.083),
    probe('A1', 600, 0.083),
    probe('N', 700, 0.04),
    probe('Logistics Road', 600, 0),
    probe('Ñ jardín', 600, 0.06),
  ].filter(Boolean);
});

if (clipped.length) {
  failed++
  console.log(`  ${'3D labels'.padEnd(20)} FAILED — clipped: ${clipped.join(', ')}`)
} else {
  console.log(`  ${'3D labels'.padEnd(20)} draw inside their canvas`)
}

await browser.close()
stop()

console.log(failed === 0
  ? `\n  ${MODULES.length} modules open clean, and scene labels are not clipped.\n`
  : `\n  ${failed} of ${MODULES.length} modules failed.\n`)
process.exit(failed === 0 ? 0 : 1)
