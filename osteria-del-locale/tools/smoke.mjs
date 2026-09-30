// Smoke test: serves the production build in a real browser, checks the game
// boots, plays a few turns with the template narrator, installs the service
// worker, and survives going offline.
//
//   npm run build && npm run smoke
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const BASE = '/osteria-del-locale';
const ROOT = new URL('../dist/', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const failures = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

function resolveFile(urlPath) {
  const pathOnly = decodeURIComponent(urlPath.split('?')[0]);
  const withoutBase = pathOnly.startsWith(BASE) ? pathOnly.slice(BASE.length) : pathOnly;
  return join(ROOT, normalize(withoutBase).replace(/^[/\\]+/, '').replace(/^(\.\.[/\\])+/, ''));
}

const server = createServer(async (req, res) => {
  let wanted = decodeURIComponent(req.url.split('?')[0]);
  if (wanted.endsWith('/')) wanted += 'index.html';
  const filePath = resolveFile(wanted);
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  const body = await readFile(filePath);
  res.setHeader('Content-Type', MIME[extname(filePath)] ?? 'application/octet-stream');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Service-Worker-Allowed', `${BASE}/`);
  res.end(body);
});

await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const origin = `http://localhost:${port}`;

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

await page.goto(`${origin}${BASE}/`, { waitUntil: 'networkidle' });

check('title renders', (await page.title()).length > 0, await page.title());
check('heading renders', (await page.locator('h1').first().innerText()) === 'The Drowned Ox');
check(
  'cross-origin isolated',
  await page.evaluate(() => globalThis.crossOriginIsolated === true),
);
const manifestHref = await page.locator('link[rel=manifest]').first().getAttribute('href');
check('manifest linked', manifestHref !== null, manifestHref ?? '');
if (manifestHref !== null) {
  const manifestResponse = await page.request.get(new URL(manifestHref, `${origin}${BASE}/`).toString());
  check('manifest served', manifestResponse.status() === 200);
  const manifest = await manifestResponse.json().catch(() => null);
  check('manifest has icons', Array.isArray(manifest?.icons) && manifest.icons.length >= 2);
  check('manifest is standalone', manifest?.display === 'standalone');
}
check(
  'icons served',
  (await page.request.get(`${origin}${BASE}/icons/icon-192.png`)).status() === 200,
);

await page.waitForFunction(() => globalThis.__tierLoaded === true, { timeout: 60_000 }).catch(() => {});
const zeroTier = await page.locator('input[name=tier][value=template]');
if ((await zeroTier.count()) > 0) {
  await zeroTier.check();
  await page.getByRole('button', { name: /ready|narrat/i }).first().waitFor({ timeout: 10_000 }).catch(() => {});
}

const input = page.getByLabel(/what do you do/i);
await input.waitFor({ timeout: 15_000 });

for (const command of ['look around', 'ask about the dog', 'go down', 'go out', 'go up', 'inventory']) {
  await input.fill(command);
  await input.press('Enter');
  await page.waitForTimeout(400);
}

const transcript = await page.locator('.transcript').innerText();
const engineLines = await page.locator('.line.engine').allInnerTexts();
const refusals = engineLines.filter((line) => /^(Nothing here|There is nothing|There is no way|You cannot reach)/i.test(line.trim()));
check('every turn resolved to a real outcome', refusals.length === 0, refusals.join(' | '));
const askedTheDog = /asked the regular about dog/i.test(transcript);
const learnedLegal = /called Legal/i.test(transcript);
check('engine parsed the ask', askedTheDog);
check('engine fact reached the transcript', learnedLegal, transcript.slice(-110).replace(/\n/g, ' '));
check('narration was produced', (await page.locator('.line.narrator').count()) > 0);

const turnCount = await page.evaluate(() => Number(localStorage.getItem('drowned-ox-save') !== null));
check('save written', turnCount === 1);

const swReady = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const registration = await navigator.serviceWorker.getRegistration();
  return registration === undefined ? 'none' : 'registered';
});
check('service worker registered', swReady === 'registered', swReady);

await page.waitForTimeout(1500);
await context.setOffline(true);

const offline = await page.goto(`${origin}${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => null);
check('offline reload still boots', offline !== null);
if (offline !== null) {
  await page.locator('h1').first().waitFor({ timeout: 15_000 }).catch(() => {});
  check('offline shell renders', (await page.locator('h1').count()) > 0);
  check(
    'offline keeps isolation',
    await page.evaluate(() => globalThis.crossOriginIsolated === true),
  );
}

await context.setOffline(false);

const benign = consoleErrors.filter((line) => !line.includes('favicon'));
check('no console errors', benign.length === 0, benign.slice(0, 3).join(' | '));

await context.setOffline(false);
await page.goto(`${origin}${BASE}/`, { waitUntil: 'networkidle' });
const transcriptInput = page.getByLabel(/what do you do/i);
await transcriptInput.waitFor({ timeout: 15_000 });
for (const command of ['look around', 'ask about the dog', 'ask about the price', 'attack the dog']) {
  await transcriptInput.fill(command);
  await transcriptInput.press('Enter');
  await page.waitForTimeout(400);
}
await page.screenshot({ path: new URL('../spike/SMOKE.png', import.meta.url).pathname, fullPage: true });

// The demo encoder reads this file, so a broken PNG would surface as a broken GIF.
const { encodeGif, decodePng } = await import('./gif.mjs');
const pngBytes = await readFile(new URL('../spike/SMOKE.png', import.meta.url));
const decodedShot = decodePng(pngBytes);
check('smoke screenshot decodes', decodedShot.width > 0 && decodedShot.height > 0, `${decodedShot.width}x${decodedShot.height}`);
check('gif encoder accepts it', encodeGif([pngBytes]).length > 0);
await writeFile(new URL('../spike/SMOKE.md', import.meta.url), `# Smoke\n\n${failures.length === 0 ? 'All checks passed.' : `Failed: ${failures.join(', ')}`}\n\nConsole errors: ${benign.length}\n`);

await browser.close();
server.close();

console.log(`\n${failures.length === 0 ? 'smoke passed' : `smoke failed (${failures.length}): ${failures.join(', ')}`}`);
process.exit(failures.length === 0 ? 0 : 1);