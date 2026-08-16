/* Smoke test SHOTMIND: percorso sconfitta + PWA.
   Uso: node smoke-shotmind-lose.js <port> */
'use strict';
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
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.setViewport({ width: 390, height: 844, isMobile: true });

  // modalità app: parola casuale (per testare giocatore singolo funziona)
  await page.click('#modeApp');
  log('modalità app', await page.$eval('#modeApp', (e) => e.classList.contains('active')));
  log('cantiniere nascosto', await page.$eval('#makerLabel', (e) => e.style.display === 'none'));
  log('start abilitato con 2 giocatori', await page.$eval('#btnStart', (e) => !e.disabled));

  await page.click('#btnStart');
  log('partita avviata (app)', await page.$eval('#screen-game', (e) => e.classList.contains('active')));
  log('cantiniere = l\'App', (await page.$eval('#makerName', (e) => e.textContent)).includes('App'));

  // 6 tentativi sbagliati: digito 'AAAA' (nessuna parola 4+ lettere composta solo di A è nel pack? rischio: 'amaro'? no 5 lettere. Uso lettere impossibili: 'ZZZZ' su parola con... potrebbero esserci z.
  // Strategia robusta: leggi la lunghezza e inserisci una parola sicuramente assente: ripeti 'X' (nessuna parola contiene X nei pack).
  const len = await page.$$eval('.board .row .tile', (tiles) => tiles.length / 6);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.type('X'.repeat(len), { delay: 8 });
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 1000));
  }
  log('schermo fine (sconfitta)', await page.$eval('#screen-end', (e) => e.classList.contains('active')));
  log('titolo sconfitta', (await page.$eval('#endTitle', (e) => e.className)).includes('lose'));
  log('box vittima visibile', await page.$eval('#victimBox', (e) => !e.hidden));

  // scegli la vittima (primo chip) e verifica il +3 sorsi dello SHOT
  const sipsBefore = await page.$$eval('#scoreStrip .sips', (els) => els.map((e) => parseInt((e.textContent.match(/\d+/) || ['0'])[0], 10)));
  await page.click('#victimList .chip');
  await new Promise((r) => setTimeout(r, 400));
  log('victim box nascosto dopo scelta', await page.$eval('#victimBox', (e) => e.hidden));
  const sipsAfter = await page.$$eval('#scoreStrip .sips', (els) => els.map((e) => parseInt((e.textContent.match(/\d+/) || ['0'])[0], 10)));
  log('scoreboard aggiornata (+sorsi)', sipsAfter.length === sipsBefore.length && sipsAfter[0] - sipsBefore[0] === 3);

  // modalità maker con 1 solo giocatore: start disabilitato
  await page.click('#btnMenu');
  await page.evaluate(() => {
    // svuota giocatori
    document.querySelectorAll('#playerChips .chip button').forEach((b) => b.click());
  });
  await page.click('#modeMaker');
  log('start disabilitato con 1 giocatore (maker)', await page.$eval('#btnStart', (e) => e.disabled));

  // PWA: manifest + service worker
  const manifest = await page.evaluate(async () => {
    const res = await fetch('manifest.webmanifest');
    return (await res.json()).name || '';
  });
  log('manifest servito', manifest.includes('SHOTMIND'));

  const swActive = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && reg.active);
  });
  log('service worker attivo', swActive);

  // modale regole
  await page.click('#btnRules');
  log('modale regole', await page.$eval('#modalRules', (e) => !e.hidden));
  await page.click('#btnCloseRules');
  log('modale chiusa', await page.$eval('#modalRules', (e) => e.hidden));

  console.log('errori pagina:', errors.length ? errors : 'nessuno');
  if (errors.length) log('zero errori console', false, JSON.stringify(errors));
  else log('zero errori console', true);

  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
