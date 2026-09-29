// Smoke test: boots the built app in Chrome, walks every screen and scene,
// and fails on any console error or page exception.
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { requireChrome } from './find-chrome.mjs'

const ROOT = new URL('../dist/', import.meta.url).pathname
const PORT = 5199
const CHROME = requireChrome()

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
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

const problems = []
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))

const shot = (name) => page.screenshot({ path: `shots/${name}.png` })

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await shot('01-title')

// title -> map
await page.getByRole('button', { name: /^Begin$|^Resume$/ }).click()
await page.waitForTimeout(600)
await shot('02-map')

// the region briefing, before we skip dialogue
await page.getByRole('button', { name: /The Flux Fields/ }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: '→', exact: true }).click()
await page.waitForTimeout(200)
await shot('05-intro')
await page.getByRole('button', { name: 'See how it will misbehave' }).click()
await page.waitForTimeout(300)
await shot('06-draft')
await page.getByRole('button', { name: '← Back' }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: 'Not yet' }).click()
await page.waitForTimeout(400)

// codex
await page.getByRole('button', { name: 'Codex' }).click()
await page.waitForTimeout(400)
await shot('03-codex')
await page.getByRole('button', { name: '← Map' }).click()
await page.waitForTimeout(300)

// settings
await page.getByRole('button', { name: '⚙' }).click()
await page.waitForTimeout(300)
await page.getByRole('checkbox').first().waitFor({ timeout: 4000 }).catch(() => undefined)
await shot('04-settings')
await page.getByRole('button', { name: '← Map' }).click()
await page.waitForTimeout(300)

// unlock everything, then visit each scene and play it with synthetic input
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('qbit-save') ?? '{}')
  localStorage.setItem(
    'qbit-save',
    JSON.stringify({
      ...raw,
      state: {
        ...(raw.state ?? {}),
        cleared: ['flux', 'tunnel', 'interference', 'entanglement', 'uncertainty', 'collapser'],
        laws: ['duality', 'tunnelling', 'interference', 'entanglement', 'uncertainty', 'measurement'],
        showTouch: true,
        skipIntro: true,
        // run the whole smoke test at Recursion 2: every clock in the game is
        // scaled, which is the harshest setting a player can reach
        recursion: 2,
        stats: { clears: 14, collapses: 6, anomalies: 9, motes: 0 },
      },
      version: 1,
    }),
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.getByRole('button', { name: /^Begin$|^Resume$/ }).click()
await page.waitForTimeout(500)
await shot('02b-map-recursion')

// a second codex pass, now that the laws exist
await page.getByRole('button', { name: 'Codex' }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Wave–Particle Duality/ }).click()
await page.waitForTimeout(400)
await shot('03b-codex-open')
await page.getByRole('button', { name: '← Map' }).click()
await page.waitForTimeout(300)

const scenes = [
  'The Flux Fields',
  'The Barrier Reef',
  'The Interference Marsh',
  'The Entanglement Vines',
  'The Uncertainty Bazaar',
  'The Collapser',
]

for (let i = 0; i < scenes.length; i++) {
  await page.getByRole('button', { name: new RegExp(scenes[i]) }).click()
  await page.waitForTimeout(700)
  // take the first anomaly, so the smoke test exercises a modified region
  await page.getByRole('button', { name: /\d\.\d\d score/ }).first().click()
  await page.waitForTimeout(700)
  if (i === 0) {
    // resize stress: attach() used to stack a fresh listener set every time
    for (const size of [
      { width: 900, height: 600 },
      { width: 420, height: 880 },
      { width: 1400, height: 700 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(size)
      await page.waitForTimeout(220)
    }
    await page.keyboard.down('ArrowRight')
    await page.waitForTimeout(500)
    await page.keyboard.up('ArrowRight')
  }
  // mash inputs for a while so every branch of the scene runs
  for (let k = 0; k < 26; k++) {
    await page.keyboard.down(k % 3 === 0 ? 'ShiftLeft' : 'ArrowRight')
    if (k % 2 === 0) await page.keyboard.press('Space')
    if (k % 4 === 0) await page.keyboard.press('ArrowUp')
    if (k % 5 === 0) await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(110)
    await page.keyboard.up(k % 3 === 0 ? 'ShiftLeft' : 'ArrowRight')
  }
  await shot(`1${i}-scene-${i + 1}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(350)
  if (i === 0) {
    // the pause overlay, and the fact that leaving is a decision not an accident
    await shot('09-pause')
    await page.getByRole('button', { name: 'Leave the region' }).click()
  } else {
    await page.getByRole('button', { name: 'Leave the region' }).click()
  }
  await page.waitForTimeout(400)
}

// a11y sanity: how many buttons are unlabelled
const unlabelled = await page.evaluate(() =>
  [...document.querySelectorAll('button')].filter(
    (b) => !b.textContent?.trim() && !b.getAttribute('aria-label'),
  ).length,
)
if (unlabelled) problems.push(`${unlabelled} unlabelled buttons`)

await browser.close()
server.close()

if (problems.length) {
  console.error('FAIL')
  for (const p of problems) console.error(' -', p)
  process.exit(1)
}
console.log('OK — all screens and scenes ran clean')
