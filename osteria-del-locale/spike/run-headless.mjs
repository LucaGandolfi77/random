import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const BASE = '/osteria-del-locale';
const ROOT = new URL('../dist/', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

function argOf(flag, fallback) {
  const index = process.argv.indexOf(`--${flag}`);
  return index >= 0 && process.argv[index + 1] !== undefined ? process.argv[index + 1] : fallback;
}

function resolveFile(urlPath) {
  const pathOnly = decodeURIComponent(urlPath.split('?')[0]);
  const withoutBase = pathOnly.startsWith(BASE) ? pathOnly.slice(BASE.length) : pathOnly;
  const clean = normalize(withoutBase)
    .replace(/^[/\\]+/, '')
    .replace(/^(\.\.[/\\])+/, '');
  return join(ROOT, clean);
}

const backends = argOf('backends', 'template').split(',').filter(Boolean);
const caseSelection = argOf('cases', 'all');
const paramsLabel = argOf('params', 'sampled (temperature 0.85, top_p 0.9, repetition_penalty 1.1)');
const outFile = argOf('out', '../spike/RESULTS.md');
const loadTimeout = Number(argOf('load-timeout', '1800000'));
const crossOriginIsolated = !process.argv.includes('--no-coi');

const server = createServer(async (req, res) => {
  const filePath = resolveFile(req.url);
  if (!existsSync(filePath)) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  const body = await readFile(filePath);
  res.setHeader('Content-Type', MIME[extname(filePath)] ?? 'application/octet-stream');
  if (crossOriginIsolated) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  }
  res.end(body);
});

await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-features=SharedArrayBuffer'],
});
const page = await browser.newPage();

page.on('console', (message) => {
  const type = message.type();
  if (type === 'error' || type === 'warning') console.log(`[browser:${type}] ${message.text()}`);
});
page.on('pageerror', (error) => console.log(`[pageerror] ${error.message}`));

await page.goto(`http://127.0.0.1:${port}${BASE}/spike/bench.html`, { waitUntil: 'load' });
await page.waitForFunction(() => globalThis.__spike !== undefined, { timeout: 30_000 });

if (caseSelection !== 'all') {
  const ids = caseSelection.split(',').filter(Boolean);
  await page.evaluate((selected) => globalThis.__spike.selectCases(selected), ids);
  console.log(`cases: ${ids.join(', ')}`);
}

const environment = await page.evaluate(() => globalThis.__spike.readEnvironment());
console.log('environment:', JSON.stringify(environment));

for (const backendId of backends) {
  if (backendId !== 'template') {
    console.log(`\n--- loading ${backendId} (timeout ${loadTimeout}ms) ---`);
    const loaded = await Promise.race([
      page.evaluate((id) => globalThis.__spike.loadBackend(id).then(() => true, (error) => String(error)), backendId),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), loadTimeout)),
    ]);
    if (loaded !== true) {
      console.error(`  ${backendId}: load -> ${loaded}`);
      continue;
    }
  }
  console.log(`running ${backendId}...`);
  await page.evaluate((ids) => globalThis.__spike.runBench(ids), [backendId]);
}

const report = await page.evaluate(async (params) => globalThis.__spike.report(params), paramsLabel);
await writeFile(new URL(outFile, import.meta.url), report);

const summaryStart = report.indexOf('## Summary');
console.log(`\nwrote ${outFile}`);
console.log(report.slice(summaryStart, report.indexOf('## Transcript')));

await browser.close();
server.close();