/* Smoke test SHOTMIND: setup -> scelta parola -> partita -> win.
   Uso: NODE_PATH=<tmp>/node_modules node smoke-shotmind.js <port> */
'use strict';
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = process.argv[2] || 8123;
const URL = `http://127.0.0.1:${PORT}/index.html`;

function log(name, ok, extra) {
  console.log((ok ? '  ✔' : '  ✘'), name, extra || '');
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

  log('titolo', (await page.title()).includes('SHOTMIND'));
  log('setup attivo', await page.$eval('#screen-setup', (e) => e.classList.contains('active')));

  // start enabled con 2 giocatori default
  const startEnabled = await page.$eval('#btnStart', (e) => !e.disabled);
  log('start abilitato (2 giocatori)', startEnabled);

  // scegli pacchetto bar
  await page.click('.pack-card');
  await page.click('#btnStart');
  log('schermo segreto (cantiniere)', await page.$eval('#screen-secret', (e) => e.classList.contains('active')));

  // prendi una parola dal pacchetto e selezionala
  const word = await page.$eval('.word-grid button', (b) => b.textContent);
  await page.click('.word-grid button');
  log('partita avviata, parola ' + word.toUpperCase(), await page.$eval('#screen-game', (e) => e.classList.contains('active')));

  const len = word.length;
  log('board con 6 righe × ' + len + ' colonne', await page.$$eval('.board .row', (r) => r.length) === 6 && await page.$$eval('.board .row .tile', (t) => t.length) === 6 * len);

  // tastiera fisica per digitare la parola (vincente)
  await page.keyboard.type(word.toUpperCase(), { delay: 15 });
  await page.keyboard.press('Enter');

  // attendi reveal + end
  await page.waitForFunction(() => document.getElementById('screen-end').classList.contains('active'), { timeout: 8000 });
  const won = await page.$eval('#endTitle', (e) => e.className.includes('win'));
  log('vittoria al primo colpo', won);
  log('parola rivelata', (await page.$eval('#endWord', (e) => e.textContent)) === word);

  // score: il cantiniere beve 1 sorso (tentativi usati)
  const makerSips = await page.$eval('.score-strip .chip', (e) => e.textContent.includes('1'));
  log('scoreboard: cantiniere +1 sorso', makerSips);

  // nuovo giro -> torna alla scelta parola (modalità cantiniere)
  await page.click('#btnAgain');
  log('altro giro -> schermo segreto', await page.$eval('#screen-secret', (e) => e.classList.contains('active')));

  await page.screenshot({ path: '/var/folders/zh/9r35nnw51s7b_csl4j2wv82r0000gn/T/opencode/shotmind-win.png' });
  console.log('errori pagina:', errors.length ? errors : 'nessuno');
  if (errors.length) log('zero errori console', false, JSON.stringify(errors));
  else log('zero errori console', true);

  await browser.close();
})();
