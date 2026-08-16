/* Smoke test QUOTESMITH: setup -> quiz -> risposta -> fine.
   Uso: node smoke-quotesmith.js <port>  (server avviato dalla cartella quotesmith) */
'use strict';
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = process.argv[2] || 8123;
const URL = `http://127.0.0.1:${PORT}/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(name, ok, extra) {
  console.log((ok ? '  \u2714' : '  \u2718'), name, extra || '');
  if (!ok) process.exitCode = 1;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  log('titolo', (await page.title()).includes('QUOTESMITH'));
  log('setup attivo', await page.$eval('#screen-setup', (e) => e.classList.contains('active')));

  const cats = await page.$$eval('.cat-card', (els) => els.length);
  log('8 categorie', cats === 8);

  log('start disabilitato all\'inizio', await page.$eval('#btnStart', (e) => e.disabled));

  await page.$$eval('.cat-card', (els) => els[0].click());
  log('start abilitato dopo scelta categoria', await page.$eval('#btnStart', (e) => !e.disabled));
  await page.click('#btnStart');
  await sleep(200);
  log('schermo gioco attivo', await page.$eval('#screen-game', (e) => e.classList.contains('active')));

  const q1 = await page.$eval('#quoteText', (e) => e.textContent.trim());
  log('domanda con testo non vuoto', q1.length > 3);

  const opts = await page.$$eval('#options .opt', (els) => els.map((e) => e.textContent));
  log('4 opzioni', opts.length === 4 && new Set(opts).size === 4);

  // 10 domande: rispondi sempre correttamente via hook
  for (let i = 0; i < 10; i++) {
    const c = await page.evaluate(() => window.__qsmState.round[window.__qsmState.idx].correct);
    await page.click('#options .opt:nth-child(' + (c + 1) + ')');
    await sleep(120);
    const fbVisible = await page.$eval('#feedback', (e) => !e.hidden);
    const nextVisible = await page.$eval('#btnNext', (e) => !e.hidden);
    if (i === 0) {
      log('feedback visibile dopo risposta', fbVisible);
      log('bottone continua visibile', nextVisible);
      log('opzione giusta marcata', await page.$eval('#options .opt.correct', (e) => !!e));
    }
    await page.click('#btnNext');
    await sleep(120);
  }

  const endActive = await page.$eval('#screen-end', (e) => e.classList.contains('active'));
  log('schermo fine dopo 10 domande', endActive);

  if (endActive) {
    const score = parseInt((await page.$eval('#endScore', (e) => e.textContent)), 10);
    log('punteggio 10/10', score === 10);
    const stars = await page.$eval('#endStars', (e) => e.textContent.trim());
    log('stelle 3', stars === '⭐⭐⭐');
    const items = await page.$$eval('#endList .end-item', (els) => els.length);
    log('elenco fine con 10 voci', items === 10);
    const allOk = await page.$$eval('#endList .end-item.ok', (els) => els.length);
    log('10 voci corrette', allOk === 10);
  }

  const manifest = await page.evaluate(async () => {
    const res = await fetch('manifest.webmanifest');
    return (await res.json()).name || '';
  });
  log('manifest servito', manifest.includes('QUOTESMITH'));

  const swActive = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && reg.active);
  });
  log('service worker attivo', swActive);

  await page.click('#btnMenu');
  await sleep(150);
  log('ritorno al setup dal menu', await page.$eval('#screen-setup', (e) => e.classList.contains('active')));

  if (errors.length) log('zero errori console', false, JSON.stringify(errors));
  else log('zero errori console', true);

  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
