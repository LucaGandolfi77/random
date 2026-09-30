/* pwa.test.mjs — service worker e manifest: le invarianti che tengono su l'offline.
   Ogni qui sotto è un bug che è effettivamente successo a questo progetto. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';

const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const man = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

/* l'app shell dichiarata nel SW */
const shell = [...sw.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]);

test('ogni file precacato esiste davvero', () => {
  for (const p of shell) {
    if (p === './') continue;
    assert.ok(existsSync(join(ROOT, p.replace(/^\.\//, ''))), `precache "${p}": file assente`);
  }
});

test('il precache copre tutto ciò che serve a partire senza rete', () => {
  for (const p of ['./index.html', './offline.html', './css/style.css', './manifest.webmanifest',
    './js/save.js', './js/tiles.js', './js/audio.js', './js/board.js', './js/story.js',
    './js/universes.js', './js/quaderno.js', './js/minigames.js', './js/tama.js', './js/eggs.js', './js/app.js', './js/pwa.js']) {
    assert.ok(shell.includes(p), `manca "${p}" nel precache`);
  }
  for (const i of man.icons) {
    assert.ok(shell.includes('./' + i.src), `icona "${i.src}" nel manifest ma non in precache`);
  }
});

test('B16: il precache è tollerante, non atomico', () => {
  assert.match(sw, /Promise\.allSettled/, 'serve allSettled: un 404 con addAll fa fallire l\'installazione');
  assert.ok(!/addAll\(/.test(sw), 'addAll è atomico: basta un 404 e l\'app non va più offline');
  assert.match(sw, /console\.warn\(\'\[sw\] precache parziale/, 'un precache parziale deve essere visibile in console');
});

test('B14: activate cancella solo le cache della propria app', () => {
  assert.match(sw, /startsWith\(PREFIX\)/, 'il filtro deve basarsi sul prefisso dell\'app');
  const del = sw.slice(sw.indexOf("keys.filter"), sw.indexOf('keys.filter') + 220);
  assert.ok(!/k\s*!==\s*CACHE\s*(\)|,)/.test(del), 'non deve cancellare ogni cache dell\'origin');
  assert.match(sw, /matcha-heart-/, 'il prefisso delle cache deve essere namespaced');
});

test('B13: gli asset usano stale-while-revalidate, non cache-first secco', () => {
  const fn = sw.slice(sw.indexOf('staleWhileRevalidate'), sw.indexOf('async function cacheFirst'));
  assert.match(fn, /caches\.match|shell\.match/, 'deve leggere dalla cache');
  assert.match(fn, /fetch\(/, 'deve anche rinfrescare dalla rete');
  assert.match(sw, /req\.mode === 'navigate'/, 'le navigazioni vanno trattate a parte');
  assert.match(sw, /networkFirstNavigation/, 'manca il network-first sul document');
});

test('B15: le scritture in cache sono awaitate e gestite', () => {
  assert.match(sw, /async function putSafe/);
  const body = sw.slice(sw.indexOf('async function putSafe'), sw.indexOf('async function staleWhileRevalidate'));
  assert.match(body, /await cache\.put/, 'cache.put non deve essere fire-and-forget');
  assert.match(body, /catch/, 'QuotaExceededError va gestito');
  /* NB: /re/ è un oggetto sempre truthy — senza .test() l'asserzione sarebbe falsa sempre */
  assert.ok(!/caches\.open\([^)]*\)\.then\(\(c\) => c\.put/.test(sw), 'residuo del put non awaitato');
});

test('c\'è un fallback offline con priorità esplicita', () => {
  const fn = sw.slice(sw.indexOf('async function networkFirstNavigation'));
  assert.match(fn, /index\.html/, 'prima l\'app shell');
  assert.match(fn, /offline\.html/, 'poi offline.html');
  assert.ok(fn.indexOf('index.html') < fn.indexOf('offline.html'), 'l\'ordine di fallback è invertito');
});

test('navigationPreload viene abilitato se disponibile', () => {
  assert.match(sw, /navigationPreload/);
  assert.match(sw, /event\.preloadResponse|preloadResponse/, 'il preload va consumato, non solo abilitato');
});

test('lo SW accetta il messaggio SKIP_WAITING dal flusso di aggiornamento', () => {
  assert.match(sw, /addEventListener\('message'/);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(sw, /skipWaiting\(\)/);
});

test('B17: la registrazione usa updateViaCache none e ha il flusso update', () => {
  const pwa = readFileSync(join(ROOT, 'js/pwa.js'), 'utf8');
  assert.match(pwa, /updateViaCache:\s*'none'/, 'senza questo lo script del SW resta in HTTP cache');
  assert.match(pwa, /updatefound/, 'manca il rilevamento di una nuova versione');
  assert.match(pwa, /reg\.waiting/, 'manca la gestione del SW in attesa');
  assert.match(pwa, /controllerchange/);
});

test('registrazione tolerant: un SW non installabile non deve rompere la pagina', () => {
  const pwa = readFileSync(join(ROOT, 'js/pwa.js'), 'utf8');
  const fn = pwa.slice(pwa.indexOf('async function registerSW'));
  assert.match(fn, /catch/, 'register().catch(() => {}) deve registrare il motivo');
});

test('manifest: id, scope e start_url coerenti con la root dell\'app', () => {
  assert.equal(man.scope, './');
  assert.equal(man.start_url, './', 'start_url "./index.html" non ottiene il 100 Lighthouse');
  assert.ok(man.id, 'manca id (l\'identità dell\'installazione)');
  assert.equal(man.display, 'standalone');
  assert.ok(man.display_override?.length, 'manca display_override');
  assert.equal(man.orientation, 'portrait');
  assert.equal(man.lang, 'it');
  assert.ok(Array.isArray(man.categories) && man.categories.length);
  assert.ok(man.icons.length >= 8, `solo ${man.icons.length} icone`);
});

test('manifest: set di icone completo, maskable incluso e coerente', () => {
  const any = man.icons.filter((i) => (i.purpose || 'any').includes('any'));
  const mask = man.icons.filter((i) => (i.purpose || '').includes('maskable'));
  assert.ok(mask.length >= 1, 'manca una icona maskable');
  for (const size of ['192x192', '512x512']) {
    assert.ok(any.some((i) => i.sizes === size), `manca icona ${size}`);
    assert.ok(mask.some((i) => i.sizes === size), `manca maskable ${size}`);
  }
  /* il maskable deve essere un file diverso: lo stesso file "any" non ha
     la safe zone e viene ritagliato male dai launcher */
  const any512 = any.find((i) => i.sizes === '512x512').src;
  const mask512 = mask.find((i) => i.sizes === '512x512').src;
  assert.notEqual(any512, mask512, 'maskable e any non possono essere lo stesso file');
  assert.ok(html.includes('apple-touch-icon-180.png'), 'manca apple-touch-icon-180 per iOS');
});

test('manifest: screenshots per install UI e label descrittive', () => {
  const ss = man.screenshots || [];
  assert.ok(ss.length >= 2, 'servono screenshot narrow e wide');
  const forms = ss.map((s) => s.form_factor);
  assert.ok(forms.includes('narrow') && forms.includes('wide'));
  for (const s of ss) {
    assert.ok(s.label && s.label.length > 10, 'label mancante o troppo breve');
    assert.match(s.sizes, /^\d+x\d+$/);
  }
});

test('manifest: shortcut con URL e icone utilizzabili', () => {
  assert.ok((man.shortcuts || []).length >= 2, 'mancano le shortcut');
  for (const s of man.shortcuts) {
    assert.ok(s.name && s.short_name, `${s.url}: nome mancante`);
    assert.ok(s.url.startsWith('./?'), `${s.url}: le shortcut devono stare nella root dell'app`);
    assert.ok((s.icons || []).length >= 1, `${s.url}: senza icona non appare nel menu`);
  }
  const urls = man.shortcuts.map((s) => s.url);
  assert.ok(new Set(urls).size === urls.length, 'URL di shortcut duplicati');
});

test('i parametri degli shortcut sono onorati da app.js', () => {
  const app = readFileSync(join(ROOT, 'js/app.js'), 'utf8');
  assert.match(app, /new URLSearchParams\(location\.search\)/, 'manca la lettura dei query param');
  assert.match(app, /get\('view'\)/);
  assert.match(app, /get\('mini'\)/);
});

test('B18: data/story.json non è un file morto', () => {
  assert.ok(existsSync(join(ROOT, 'data/story.json')));
  const idx = JSON.parse(readFileSync(join(ROOT, 'data/story.json'), 'utf8'));
  assert.equal(idx.total_levels, 100);
  assert.ok(idx.note, 'manca la nota che dichiara la fonte dei dati');
  /* la validazione è in test/load.test.mjs: qui basta che sia JSON valido */
});

test('i colori del manifest combaciano con il tema della pagina', () => {
  const css = readFileSync(join(ROOT, 'css/style.css'), 'utf8');
  const bg = (css.split(':root')[1] || '').match(/--paper:\s*(#[0-9a-f]{6})/i);
  assert.ok(bg, 'manca --paper in :root');
  const normalized = '#' + bg[1].slice(1).toLowerCase();
  assert.equal(man.background_color, normalized, 'background_color del manifest discostato da --paper');
  const theme = readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<meta name="theme-color" content="(#[0-9a-f]{6})"/i);
  assert.ok(theme, 'manca <meta name="theme-color">');
  assert.equal(theme[1].toLowerCase(), man.theme_color, 'theme-color HTML e manifest discostati');
});
