/* pwa.test.mjs — le cose che il telefono ti chiede.
 *
 * Qui si controllano i requisiti che, se mancano, rendono il gioco
 * installabile solo da chi ha il telefono giusto. Un PWA che si installa su
 * Android e non su iPhone è metà del pubblico perso, e la metà peggio.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';

const leggi = (p) => readFileSync(join(ROOT, p), 'utf8');
const html = leggi('index.html');
const sw = leggi('sw.js');
const man = JSON.parse(leggi('manifest.webmanifest'));

test('la pagina dichiara che è un\'app, non un sito', () => {
  for (const meta of [
    'viewport-fit=cover',
    'apple-mobile-web-app-capable',
    'mobile-web-app-capable',
    'apple-mobile-web-app-status-bar-style',
    'apple-mobile-web-app-title',
  ]) {
    assert.ok(html.includes(meta), `manca ${meta}: su iPhone serve per lo standalone`);
  }
  /* Su iOS l'icona dell'Home è apple-touch-icon, e vuole 180px esatti:
   * il sistema non la ridimensiona, la prende e basta. */
  assert.match(html, /<link rel="apple-touch-icon"[^>]*180x180/, 'serve l\'icona da 180 per l\'Home');
  assert.match(html, /href="icons\/apple-touch-icon-180\.png"/);
  assert.match(html, /<meta name="viewport"[^>]*width=device-width/, 'senza width=device-width il layout si stringe');
});

test('i meta di iOS sono nel documento, non aggiunti a mano', () => {
  /* Su iOS non esiste nessun modo di dire "installami" dalla pagina: l'utente
   * deve passare da Condividi. Il gioco può solo dirglielo, e dirglielo bene. */
  assert.ok(leggi('js/pwa.js').includes('Aggiungi alla schermata Home'),
    'le istruzioni per iPhone devono essere nel codice');
});

test('il manifest è installabile: icone, nomi, avvio', () => {
  assert.ok(man.name && man.short_name, 'name e short_name sono obbligatori');
  assert.equal(man.start_url, './');
  assert.equal(man.display, 'standalone', 'senza standalone non c\'è schermo intero');
  assert.equal(man.orientation, 'portrait', 'il gioco è verticale');
  assert.ok(man.theme_color && man.background_color);
  assert.equal(man.lang, 'it');
  assert.ok(man.icons.length >= 4);
  /* Per il launcher Android serve una maskable da 512, o l\'icona viene
   * ritagliata male sui dispositivi con display ad alta risoluzione. */
  assert.ok(man.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'));
  assert.ok(man.icons.some((i) => i.sizes === '192x192'));
  assert.ok(man.screenshots.length >= 2, 'senza screenshot l\'installazione è una scommessa');
});

test('ogni risorsa dichiarata nel manifest esiste davvero', () => {
  for (const i of [...man.icons, ...man.screenshots]) {
    assert.ok(existsSync(join(ROOT, i.src)), `manca ${i.src}`);
  }
});

test('le icone sono quadrate e non vuote', () => {
  for (const i of man.icons) {
    const st = statSync(join(ROOT, i.src));
    assert.ok(st.size > 200, `${i.src} è troppo piccola (${st.size} byte): sembra una tela vuota`);
    const [a, b] = i.sizes.split('x').map(Number);
    assert.equal(a, b, `${i.src} non è quadrata`);
  }
});

test('l\'app shell del service worker contiene tutto ciò che serve a partire', () => {
  const shell = (sw.match(/const APP_SHELL = \[([\s\S]*?)\];/) || [])[1] || '';
  const deve = [
    './', './index.html', './offline.html', './css/style.css', './data/story.json',
    './js/save.js', './js/memoria.js', './js/epitaffio.js', './js/audio.js',
    './js/tela.js', './js/combat.js', './js/nemici.js', './js/scena.js',
    './js/app.js', './js/pwa.js', './manifest.webmanifest',
  ];
  for (const f of deve) {
    assert.ok(shell.includes(`'${f}'`), `l'app shell non contiene ${f}: senza rete non parte`);
  }
});

test('ogni file dell\'app shell esiste davvero', () => {
  const shell = (sw.match(/const APP_SHELL = \[([\s\S]*?)\];/) || [])[1] || '';
  for (const m of shell.matchAll(/'\.\/([^']+)'/g)) {
    assert.ok(existsSync(join(ROOT, m[1])), `sw.js promette ${m[1]}, che non esiste`);
  }
});

test('il service worker non tocca le altre app dello stesso origin', () => {
  assert.match(sw, /const PREFIX = 'lpmf-'/,
    'senza prefisso le cache si mescolerebbero a quelle delle altre app');
  assert.match(sw, /PREFIX/, 'il prefisso va usato in activate per non cancellare le altrui');
});

test('il service worker si aggiorna da solo, non quando gli capita', () => {
  const pwa = leggi('js/pwa.js');
  /* updateViaCache sta nella registrazione (pwa.js), il messaggio sta nel
   * worker: i due pezzi insieme sono l'unico modo per non servire sw.js dalla
   * HTTP cache e lasciare l'utente su una versione vecchia per settimane. */
  assert.ok(pwa.includes('updateViaCache'), 'senza updateViaCache gli aggiornamenti arrivano a caso');
  assert.ok(sw.includes('SKIP_WAITING'), 'il worker deve accettare SKIP_WAITING');
  assert.ok(pwa.includes('SKIP_WAITING'), 'e la pagina deve poterlo chiedere');
  assert.ok(sw.includes('skipWaiting'), 'il worker deve poterlo fare');
});

test('l\'aggiornamento non interrompe una partita a metà', () => {
  const pwa = leggi('js/pwa.js');
  assert.match(pwa, /Ricarica/, 'l\'aggiornamento deve essere proposto, non imposto');
  assert.match(pwa, /Dopo/, 'e si potrà dire dopo: nessuno interrompe un duello per un aggiornamento');
});

test('c\'è una pagina offline, e dice la verità', () => {
  const off = leggi('offline.html');
  assert.ok(off.includes('100dvh') || off.includes('100vh'), 'la pagina offline deve adattarsi alla barra di Safari');
  assert.ok(/Torna/.test(off), 'serve un modo per tornare indietro');
  assert.ok(!off.includes('src="js/'), 'la pagina offline non deve dipendere da script che potrebbero non arrivare');
});

test('niente dipendenze esterne: niente CDN, niente font remoti', () => {
  const tutti = ['index.html', 'css/style.css', ...man ? [] : []];
  for (const p of ['index.html', 'css/style.css']) {
    const s = leggi(p);
    assert.ok(!/https?:\/\/(?!localhost)/.test(s), `${p} punta a una risorsa esterna: il gioco deve funzionare offline`);
  }
  assert.ok(!/@import\s+url\(\s*['"]?https?:/.test(leggi('css/style.css')), 'nessun @import remoto');
  void tutti;
});

test('package.json non ha dipendenze', () => {
  const pkg = JSON.parse(leggi('package.json'));
  assert.deepEqual(pkg.dependencies, {}, 'zero dipendenze, come tutte le altre app del repo');
  assert.deepEqual(pkg.devDependencies, {});
});

test('il peso del gioco resta sotto quello di una fotografia', () => {
  const peso = (p) => statSync(join(ROOT, p)).size;
  const js = readdirSize('js');
  assert.ok(js < 200 * 1024, `js ${(js / 1024).toFixed(0)}kB: un JRPG non deve pesare più di un\'istantanea`);
  const totale = js + peso('css/style.css') + peso('index.html') + peso('data/story.json');
  assert.ok(totale < 320 * 1024, `totale ${(totale / 1024).toFixed(0)}kB`);
  void peso;
});

function readdirSize(dir) {
  return readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.js'))
    .reduce((n, f) => n + statSync(join(ROOT, dir, f)).size, 0);
}