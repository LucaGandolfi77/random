/* pwa.test.mjs — installabilità, risorse e peso.
 *
 * Qui non si prova nessuna regola: si controlla che le cose che servono a
 * far funzionare il gioco ci siano davvero. Un id sparito da index.html, una
 * risorsa non nel precache, un meta di iOS mancante: sono bug che non si
 * vedono giocando, e che vengono fuori solo sul telefono di qualcun altro.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';

const leggi = (p) => readFileSync(join(ROOT, p), 'utf8');
const esiste = (p) => existsSync(join(ROOT, p));

/* ── index.html ──────────────────────────────────────────── */

test('i meta di iOS ci sono tutti', () => {
  const h = leggi('index.html');
  for (const meta of [
    'viewport-fit=cover',
    'apple-mobile-web-app-capable',
    'mobile-web-app-capable',
    'apple-mobile-web-app-status-bar-style',
    'apple-mobile-web-app-title',
  ]) assert.ok(h.includes(meta), `manca il meta ${meta}`);
  assert.match(h, /<meta name="viewport"[^>]*width=device-width/);
  assert.match(h, /<link rel="apple-touch-icon"[^>]*180x180/);
  assert.match(h, /href="icons\/apple-touch-icon-180\.png"/);
  assert.match(h, /<link rel="manifest"/);
  assert.match(h, /<html lang="it">/, 'la pagina è in italiano, e lo dichiara');
});

test('la pagina non chiama niente di esterno', () => {
  for (const f of ['index.html', 'css/style.css']) {
    const s = leggi(f);
    const esterni = [...s.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) => m[0])
      .filter((u) => !/localhost|127\.0\.0\.1|w3\.org/.test(u));
    assert.equal(esterni.length, 0, `${f}: chiede ${esterni.join(', ')}`);
  }
  assert.equal(/@import/.test(leggi('css/style.css')), false, 'niente import remoti nel CSS');
});

test('gli id sono unici', () => {
  const h = leggi('index.html');
  const id = [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = id.filter((x, i) => id.indexOf(x) !== i);
  assert.equal(dup.length, 0, `id duplicati: ${[...new Set(dup)].join(', ')}`);
  assert.ok(id.length > 60, `solo ${id.length} id: ne mancano`);
});

test('i dieci moduli sono caricati, e nell\'ordine in cui si dipendono', () => {
  const h = leggi('index.html');
  const ordine = ['save.js', 'memoria.js', 'epitaffio.js', 'audio.js', 'orto.js',
    'dono.js', 'vasi.js', 'scena.js', 'app.js', 'pwa.js'];
  let prev = -1;
  for (const f of ordine) {
    const i = h.indexOf(`src="js/${f}"`);
    assert.ok(i > 0, `${f} non è incluso in index.html`);
    assert.ok(i > prev, `${f} è caricato troppo tardi: memoria.js deve precedere dono.js`);
    prev = i;
  }
});

/* ── il manifest ─────────────────────────────────────────── */

const MAN = JSON.parse(leggi('manifest.webmanifest'));

test('il manifest si può installare', () => {
  assert.ok(MAN.name, 'nome');
  assert.ok(MAN.short_name, 'nome breve');
  assert.equal(MAN.start_url, './');
  assert.equal(MAN.display, 'standalone');
  assert.equal(MAN.orientation, 'portrait', 'il gioco è verticale e su un telefono');
  assert.ok(MAN.theme_color, 'colore della barra');
  assert.ok(MAN.background_color);
  assert.equal(MAN.lang, 'it');
});

test('il manifest non porta a una cartella fuori dal gioco', () => {
  /* Su GitHub Pages ogni cartella è un'app: se `id` punta alla radice, due
     giochi diversi si rubano l'icona quando li installi dallo stesso sito. */
  assert.equal(MAN.id, '/fiori-sulle-tombe', 'l\'id deve essere la cartella di questa app');
  assert.notEqual(MAN.id, '/');
});

test('le icone dichiarate esistono davvero e sono quadrate', () => {
  assert.ok(MAN.icons.length >= 4);
  let maskable512 = false;
  for (const ic of MAN.icons) {
    assert.ok(esiste(ic.src), `icona dichiarata e assente: ${ic.src}`);
    assert.ok(statSync(join(ROOT, ic.src)).size > 200, `icona vuota: ${ic.src}`);
    const [a, b] = ic.sizes.split('x');
    assert.equal(a, b, `icona non quadrata: ${ic.src} (${ic.sizes})`);
    if (ic.purpose === 'maskable' && ic.sizes === '512x512') maskable512 = true;
  }
  assert.ok(maskable512, 'manca l\'icona mascherabile 512, e su Android serve per l\'installazione');
});

test('ci sono screenshot per le due forme, e i file esistono', () => {
  assert.ok(MAN.screenshots.length >= 2);
  const forme = MAN.screenshots.map((s) => s.form_factor);
  assert.ok(forme.includes('narrow'));
  assert.ok(forme.includes('wide'));
  for (const s of MAN.screenshots) {
    assert.ok(esiste(s.src), `screenshot dichiarato e assente: ${s.src}`);
    assert.ok(s.label, 'e con la sua didascalia: uno screenshot muto non dice niente');
  }
});

/* ── il service worker ───────────────────────────────────── */

const SW = leggi('sw.js');

test('sw.js ha un prefisso suo, per non mescolare le cache', () => {
  assert.ok(SW.includes("const PREFIX = 'fst-'"), 'senza PREFIX le cache si confonderebbero con quelle delle altre app');
  assert.ok(SW.includes('PREFIX'), 'e il prefisso va usato');
});

test('tutto quello che serve a giocare offline è precacato', () => {
  const blocco = (SW.match(/const APP_SHELL = \[([\s\S]*?)\];/) || [])[1] || '';
  const precacati = [...blocco.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]);
  for (const f of [
    'index.html', 'offline.html', 'css/style.css', 'data/story.json',
    'js/save.js', 'js/memoria.js', 'js/epitaffio.js', 'js/audio.js', 'js/orto.js',
    'js/dono.js', 'js/vasi.js', 'js/scena.js', 'js/app.js', 'js/pwa.js',
    'manifest.webmanifest',
  ]) {
    assert.ok(precacati.includes(f), `${f} non è nell'app shell: senza rete il gioco non parte`);
  }
  assert.ok(/'\.\/'/.test(blocco), 'e la radice, che è quello che si apre se qualcuno digita il dominio');
});

test('ogni file precacato esiste sul disco', () => {
  const blocco = (SW.match(/const APP_SHELL = \[([\s\S]*?)\];/) || [])[1] || '';
  for (const m of blocco.matchAll(/'\.\/([^']+)'/g)) {
    assert.ok(esiste(m[1]), `sw precaca un file che non esiste: ${m[1]}`);
  }
});

test('sw.js aggiorna senza scaricare, e lo dice al giocatore', () => {
  assert.ok(SW.includes('SKIP_WAITING'));
  assert.ok(SW.includes('skipWaiting'));
  const pwa = leggi('js/pwa.js');
  assert.ok(pwa.includes('updateViaCache'), 'senza updateViaCache:none il browser serve sw.js dalla cache HTTP');
  assert.ok(pwa.includes('SKIP_WAITING'));
  assert.ok(pwa.includes('Ricarica'), 'e il giocatore deve poter scegliere quando');
  assert.ok(pwa.includes('Dopo'), 'perché ricaricare mentre si gioca è perdere la partita');
});

test('su iPhone il pulsante dice esattamente cosa fare', () => {
  const pwa = leggi('js/pwa.js');
  assert.ok(pwa.includes('Aggiungi alla schermata Home'),
    'su iPhone non esiste beforeinstallprompt: senza questa frase il pulsante è inutile');
  assert.ok(pwa.includes('beforeinstallprompt'), 'e su Chrome il prompt va intercettato');
  assert.ok(pwa.includes('navigator.storage.persist'), 'i dati locali vanno difesi dallo sfratto');
});

/* ── offline.html ────────────────────────────────────────── */

test('la pagina offline è autonoma e dice dove tornare', () => {
  const o = leggi('offline.html');
  assert.equal(/src="js\//.test(o), false, 'se usa moduli non funziona offline: è proprio la pagina dell\'offline');
  assert.ok(/100dvh|100vh/.test(o), 'e deve occupare lo schermo anche con la barra di Safari');
  assert.ok(o.includes('Torna'), 'con un modo per tornare indietro');
  assert.ok(o.includes('Fiori'), 'e il nome del gioco, altrimenti non sai che pagina hai aperto');
});

/* ── il peso ─────────────────────────────────────────────── */

test('zero dipendenze, e il gioco resta sotto i limiti', () => {
  const pkg = JSON.parse(leggi('package.json'));
  assert.deepEqual(pkg.dependencies, {}, 'una dipendenza runtime e il gioco smette di essere suo');
  assert.deepEqual(pkg.devDependencies, {}, 'e una di sviluppo richiederebbe un install');

  const js = ['js/save.js', 'js/memoria.js', 'js/epitaffio.js', 'js/audio.js', 'js/orto.js',
    'js/dono.js', 'js/vasi.js', 'js/scena.js', 'js/app.js', 'js/pwa.js']
    .reduce((n, f) => n + statSync(join(ROOT, f)).size, 0);
  const totale = js + statSync(join(ROOT, 'css/style.css')).size
    + statSync(join(ROOT, 'index.html')).size
    + statSync(join(ROOT, 'data/story.json')).size;

  assert.ok(js < 200 * 1024, `i moduli sono ${(js / 1024).toFixed(0)}kB, e il tetto è 200`);
  assert.ok(totale < 340 * 1024, `il gioco è ${(totale / 1024).toFixed(0)}kB, e il tetto è 340`);
});

test('package.json ha gli script che il README promette', () => {
  const pkg = JSON.parse(leggi('package.json'));
  for (const s of ['start', 'dev', 'test', 'check', 'icons', 'contrast']) {
    assert.ok(pkg.scripts[s], `manca lo script «${s}»`);
  }
  assert.equal(pkg.name, 'fiori-sulle-tombe');
  assert.equal(pkg.private, true, 'è un gioco, non una libreria');
});
