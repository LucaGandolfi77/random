// Records a short demo clip of a real playthrough: drives the production build
// in a browser, screenshots each turn, and assembles the frames into a GIF and
// an APNG fallback with Playwright's bundled ffmpeg.
//
//   npm run build && npm run demo
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';
import { encodeGif } from './gif.mjs';
const BASE = '/osteria-del-locale';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const OUT = new URL('../demo/', import.meta.url).pathname;

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
  res.end(body);
});

const SCRIPT = [
  ['look around', 2000],
  ['ask about the dog', 2000],
  ['offer the innkeeper two silver', 2200],
  ['attack the dog', 2000],
  ['go down', 1800],
];

const mobile = { width: 430, height: 820 };
const scale = 1.5;

await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const context = await browser.newContext({
  viewport: { width: mobile.width, height: mobile.height },
  deviceScaleFactor: scale,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});
const page = await context.newPage();

await page.goto(`http://localhost:${port}${BASE}/`, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

const input = page.getByLabel(/what do you do/i);
await input.waitFor({ timeout: 20_000 });

const frames = [];
const capture = async (label) => {
  frames.push({ label, data: await page.screenshot({ type: 'png', clip: { x: 0, y: 0, ...mobile } }) });
};

await capture('opening');
await page.waitForTimeout(900);
await capture('opening settled');

for (const [command, wait] of SCRIPT) {
  await input.fill(command);
  await input.press('Enter');
  await page.waitForTimeout(700);
  await capture(`start of: ${command}`);
  await page.waitForTimeout(wait - 700);
  await capture(`end of: ${command}`);
}

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await capture('final');

await browser.close();
server.close();

const gif = encodeGif(
  frames.map((frame) => frame.data),
  { delayCentiseconds: 25 },
);
await writeFile(join(OUT, 'drowned-ox.gif'), gif);

const legend = [
  '# Demo frames',
  '',
  ...frames.map((frame, index) => `${index + 1}. ${frame.label}`),
  '',
  `Assembled into \`demo/drowned-ox.gif\`: ${frames.length} frames at 4 fps.`,
  '',
].join('\n');
await writeFile(join(OUT, 'demo.md'), legend);

await browser.close();

console.log(`demo/drowned-ox.gif written, ${(gif.length / 1024).toFixed(0)} KB, ${frames.length} frames`);
