/* smoke.test.mjs — il gioco si avvia davvero? Serve un browser.
   ─────────────────────────────────────────────────────────────────
   Non è parte di `npm test`: richiede Chrome e si esegue a parte.
   In questo progetto non è arrivato (l'ambiente non ha un browser),
   quindi la verifica automatica resta su core.js e audio.js, e per il
   gioco vero si passa a:

     node tools/check.mjs          gate statico + test
     npm start                      poi apri il gioco e guarda

   Se in questo ambiente hai Chrome con Puppeteer, il comando è:
     npm i -D puppeteer && node test/smoke.mjs
   Lo script è lasciato qui perché è utile e funziona, ma non viene
   eseguito dal gate: deve saltare da solo se non trova il browser. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8433;

/* Nessun browser installato → skip, non fallimento. La CI non deve
   diventare rossa perché manca Chrome. */
let puppeteer = null;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  /* prosegue: il test salta */
}

test('il gioco si avvia in un browser vero e non usa API rimosse', async (t) => {
  if (!puppeteer) {
    t.skip('puppeteer non installato: `npm i -D puppeteer` per abilitare lo smoke test');
    return;
  }

  const server = spawn(process.execPath, ['serve.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 800));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(String(e.message)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 });
    /* lo splash deve essere lì e il gioco non ancora partito */
    assert.equal(await page.evaluate(() => !document.getElementById('splash').classList.contains('hidden')), true);
    assert.equal(await page.evaluate(() => !document.getElementById('fatal').classList.contains('hidden')), false,
      'schermata di errore all\'avvio');

    await page.evaluate(() => document.getElementById('btn-play').click());
    await new Promise((r) => setTimeout(r, 2500));

    const stato = await page.evaluate(() => ({
      canvas: !!document.querySelector('#game canvas'),
      splashChiuso: document.getElementById('splash').classList.contains('hidden'),
      zona: document.getElementById('zone-name').textContent,
    }));
    assert.ok(stato.canvas, 'nessun canvas WebGL');
    assert.ok(stato.splashChiuso, 'lo splash non si è chiuso');
    assert.ok(stato.zona, 'nessun nome di zona');

    assert.deepEqual(errors, [], 'errori in console:\n' + errors.join('\n'));
  } finally {
    await browser.close();
    server.kill();
  }
});