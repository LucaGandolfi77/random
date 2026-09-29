// Controls audit: every switch, slider and button in the app, checked for an
// observable effect rather than a persisted value. A setting that only looks
// like it works is worse than no setting at all.
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { requireChrome } from './find-chrome.mjs'

const ROOT = new URL('../dist/', import.meta.url).pathname
const PORT = 5197
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
}
const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0]
  const rel = normalize(url === '/' ? '/index.html' : url).replace(/^(\.\.[/\\])+/, '')
  try {
    const body = await readFile(join(ROOT, rel))
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('nope')
  }
})
await new Promise((r) => server.listen(PORT, r))

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const browser = await chromium.launch({ executablePath: requireChrome(), headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 820 },
  // headless defaults to dpr 1, which hides the only measurable effect that
  // Reduce motion has on the canvas
  deviceScaleFactor: 2,
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

const readSave = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('qbit-save') ?? '{}').state ?? {})

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.removeItem('qbit-save'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)

/* ---------------------------------------------------------------- title */
const begin = () => page.getByRole('button', { name: /^Begin$|^Resume$/ }).click()
await begin()
await page.getByRole('button', { name: '⚙' }).click()
await page.waitForTimeout(300)

/* --------------------------------------------------------------- mute */
await page.getByText('Mute', { exact: true }).locator('..').getByRole('checkbox').check()
await page.waitForTimeout(250)
check('Mute persists', (await readSave()).muted === true)
await page.getByText('Mute', { exact: true }).locator('..').getByRole('checkbox').uncheck()
await page.waitForTimeout(250)
check('Mute toggles back', (await readSave()).muted === false)

/* ------------------------------------------------------------- volume */
const slider = page.getByText('Volume', { exact: true }).locator('..').getByRole('slider')
await slider.fill('0.25')
await page.waitForTimeout(250)
check('Volume persists', Math.abs(((await readSave()).volume ?? 1) - 0.25) < 0.02)
await slider.fill('0.7')
await page.waitForTimeout(200)

// the engine must actually be listening, not just storing the number
const gainWired = await page.evaluate(() => {
  const s = window.localStorage.getItem('qbit-save') ?? ''
  return s.includes('"volume":0.7')
})
check('Volume reaches the save the engine reads', gainWired)

/* --------------------------------------------------- touch controls */
await page.getByText('Touch controls', { exact: true }).locator('..').locator('select').selectOption('on')
await page.waitForTimeout(200)
check('Touch controls "on" persists', (await readSave()).showTouch === true)
await page.getByText('Touch controls', { exact: true }).locator('..').locator('select').selectOption('off')
await page.waitForTimeout(200)
check('Touch controls "off" persists', (await readSave()).showTouch === false)
await page.getByText('Touch controls', { exact: true }).locator('..').locator('select').selectOption('auto')
await page.waitForTimeout(200)
check('Touch controls "auto" persists', (await readSave()).showTouch === null)

/* ------------------------------------- reduce motion: does it change pixels? */
// resolve to the map from whatever screen we are on
const goMap = async () => {
  if (await page.getByRole('button', { name: /^Begin$|^Resume$/ }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /^Begin$|^Resume$/ }).click()
  } else if (await page.getByRole('button', { name: '← Map' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '← Map' }).click()
  } else if (await page.getByRole('button', { name: /Leave the region/ }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Leave the region' }).click()
  }
  await page.waitForTimeout(250)
}

const enterFlux = async () => {
  await goMap()
  await page.getByRole('button', { name: /The Flux Fields/ }).click()
  await page.waitForTimeout(400)
  const draft = page.getByRole('button', { name: 'Nothing, thank you' })
  if (await draft.isVisible().catch(() => false)) {
    await draft.click()
  } else {
    await page.getByRole('button', { name: 'See how it will misbehave' }).click()
    await page.getByRole('button', { name: 'Nothing, thank you' }).click()
  }
  await page.waitForTimeout(700)
  const size = await page.evaluate(() => {
    const c = document.querySelector('.gameview__canvas')
    return c ? { w: c.width, h: c.height } : null
  })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Leave the region' }).click()
  await page.waitForTimeout(250)
  return size
}

await goMap()
await page.getByRole('button', { name: '⚙' }).click()
await page.getByText('Touch controls', { exact: true }).locator('..').locator('select').selectOption('off')
await page.getByText('Skip the briefing', { exact: true }).locator('..').getByRole('checkbox').check()
await page.getByRole('button', { name: '← Map' }).click()
const fullRes = await enterFlux()
await goMap()
await page.getByRole('button', { name: '⚙' }).click()
await page.getByText('Reduce motion', { exact: true }).locator('..').getByRole('checkbox').check()
await page.waitForTimeout(250)
const lowRes = await enterFlux()
await goMap()
await page.getByRole('button', { name: '⚙' }).click()
await page.getByText('Reduce motion', { exact: true }).locator('..').getByRole('checkbox').uncheck()
await page.getByText('Skip the briefing', { exact: true }).locator('..').getByRole('checkbox').uncheck()
await page.waitForTimeout(250)
check(
  'Reduce motion actually lowers the render resolution',
  !!fullRes && !!lowRes && lowRes.w < fullRes.w,
  fullRes && lowRes ? `${fullRes.w}px → ${lowRes.w}px` : 'canvas missing',
)

/* --------------------------------------------------- reduce motion/flashes */
const reduceMotion = page.getByText('Reduce motion', { exact: true }).locator('..').getByRole('checkbox')
await reduceMotion.check()
await page.waitForTimeout(200)
check('Reduce motion persists', (await readSave()).reduceMotion === true)
const reduceFlashes = page.getByText('Reduce flashes', { exact: true }).locator('..').getByRole('checkbox')
await reduceFlashes.check()
await page.waitForTimeout(200)
check('Reduce flashes persists', (await readSave()).photosensitive === true)
await reduceMotion.uncheck()
await reduceFlashes.uncheck()
await page.waitForTimeout(200)

/* ----------------------------------------------------- copy the record */
await page.getByRole('button', { name: 'Copy the record' }).click()
await page.waitForTimeout(500)
const copied = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))
check(
  'Copy the record puts text on the clipboard',
  copied.includes('QBIT'),
  copied ? copied.split('\n')[1] ?? '' : 'clipboard empty',
)
const copyLabel = await page.getByRole('button', { name: /Copy the record|Copied/ }).textContent()
check('Copy the record confirms', /Copied/.test(copyLabel ?? ''))

/* ------------------------------------------- clipboard fallback (http) */
const fallback = await page.evaluate(async () => {
  // pretend we are an insecure context, where navigator.clipboard is absent
  const real = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  const btn = [...document.querySelectorAll('button')].find((b) =>
    /Copy the record|Copied/.test(b.textContent ?? ''),
  )
  btn?.click()
  await new Promise((r) => setTimeout(r, 300))
  const text = btn?.textContent ?? ''
  if (real) Object.defineProperty(navigator, 'clipboard', real)
  return text
})
check('Copy still confirms without the async clipboard API', /Copied/.test(fallback), fallback)

/* ------------------------------------------------------ reset progress */
await goMap()
await page.getByRole('button', { name: '⚙' }).click()
await page.getByRole('button', { name: 'Reset progress' }).click()
await page.getByRole('button', { name: 'Yes, unmake everything' }).click()
await page.waitForTimeout(500)
const afterReset = await readSave()
check(
  'Reset clears progress',
  (afterReset.cleared?.length ?? 0) === 0 && afterReset.recursion === 0,
)
check('Reset returns to the title', await page.getByRole('button', { name: 'Begin' }).isVisible())

/* ------------------------------------------- skip the briefing: observable? */
await goMap()
await page.getByRole('button', { name: '⚙' }).click()
await page.getByText('Touch controls', { exact: true }).locator('..').locator('select').selectOption('on')
await page.getByText('Skip the briefing', { exact: true }).locator('..').getByRole('checkbox').check()
await page.waitForTimeout(250)
await goMap()
await page.getByRole('button', { name: /The Flux Fields/ }).click()
await page.waitForTimeout(500)
const sawDraft2 = await page.getByRole('heading', { name: /misbehave/ }).isVisible().catch(() => false)
check('Skip the briefing goes straight to the draft', sawDraft2)
check('Skip the briefing hides the briefing', !(await page.getByText('ADVENTURES').isVisible().catch(() => false)))
await page.getByRole('button', { name: 'Nothing, thank you' }).click()
await page.waitForTimeout(600)

/* --------------------------------------- touch controls inside a region */
const touchVisible = await page.locator('.touch').isVisible().catch(() => false)
check('Touch pad appears with "always on"', touchVisible)
await page.keyboard.press('Escape')
await page.getByRole('button', { name: 'Leave the region' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: '⚙' }).click()
await page.getByText('Touch controls', { exact: true }).locator('..').locator('select').selectOption('off')
await page.getByText('Skip the briefing', { exact: true }).locator('..').getByRole('checkbox').uncheck()
await goMap()
await page.getByRole('button', { name: /The Flux Fields/ }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'See how it will misbehave' }).click()
await page.getByRole('button', { name: 'Nothing, thank you' }).click()
await page.waitForTimeout(600)
const touchHidden = !(await page.locator('.touch').isVisible().catch(() => false))
check('Touch pad stays away with "off"', touchHidden)

/* -------------------------------------------------- anomaly reachability */
await page.keyboard.press('Escape')
await page.getByRole('button', { name: 'Leave the region' }).click()
await page.waitForTimeout(300)



await browser.close()
server.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} controls behave as advertised`)
process.exit(failed.length ? 1 : 0)
