/* Matcha Heart SW — app shell offline, stale-while-revalidate
 *
 * Strategia:
 *  - navigazioni   : network-first (HTML fresco) → cache dell'app shell → offline.html
 *  - JS/CSS/JSON   : stale-while-revalidate (prima l'istantanea, poi si aggiorna)
 *  - icone & font  : cache-first (immutabili per versione)
 *  - altro         : stale-while-revalidate in cache runtime
 *
 * Perché non cache-first secco: il vecchio SW serviva js/css dalla cache per
 * sempre e si aggiornava solo se qualcuno ricordava di cambiare VERSION a mano.
 * Qui la copia in cache viene rimpiazzata a ogni fetch riuscito, quindi la
 * finestra di staleness è di una sola visita e non richiede bump manuali.
 */
'use strict';

const VERSION = '1.7.1';
const SHELL_CACHE = 'matcha-heart-shell-' + VERSION;
const RUNTIME_CACHE = 'matcha-heart-runtime-' + VERSION;
const PREFIX = 'matcha-heart-';   // B14: non toccare le cache di altre app sullo stesso origin

/* L'app shell: tutto ciò che serve a far partire l'app senza rete.
 * Le icone e gli screenshot sono nel precache perché il launcher li legge al
 * momento dell'installazione — se mancassero dalla cache, la scheda di
 * installazione mostrerebbe icone vuote. */
const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './css/style.css',
  './js/save.js',
  './js/tiles.js',
  './js/audio.js',
  './js/board.js',
  './js/story.js',
  './js/universes.js',
  './js/quaderno.js',
  './js/minigames.js',
  './js/tama.js',
  './js/eggs.js',
  './js/app.js',
  './js/pwa.js',
  './manifest.webmanifest',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/apple-touch-icon-180.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/screenshot-narrow.png',
  './icons/screenshot-wide.png',
];

const isIcon = (url) => /\.(?:png|svg|webp|jpg|jpeg|woff2?)$/.test(url.pathname);

/* B16: caches.addAll è atomico — un solo 404 faceva fallire l'installazione del
   SW e l'app non andava più offline. Qui ogni put è indipendente e tollerato. */
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const settled = await Promise.allSettled(
      APP_SHELL.map(async (path) => {
        const res = await fetch(new Request(path, { cache: 'reload' }));
        if (!res || !res.ok) throw new Error(path + ' → ' + (res && res.status));
        await cache.put(path, res);
      })
    );
    const failed = settled.map((r, i) => (r.status === 'rejected' ? APP_SHELL[i] : null)).filter(Boolean);
    if (failed.length) console.warn('[sw] precache parziale, mancano:', failed.join(', '));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith(PREFIX) && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
    );
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

/* B15: il put era fire-and-forget → QuotaExceededError rejection non gestita. */
async function putSafe(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    return true;
  } catch (err) {
    console.warn('[sw] cache put fallito:', err && err.name);
    return false;
  }
}

async function staleWhileRevalidate(request, targetCache) {
  const shell = await caches.open(SHELL_CACHE);
  const runtime = await caches.open(RUNTIME_CACHE);
  const cached = (await shell.match(request)) || (await runtime.match(request));
  const refreshing = fetch(request)
    .then(async (res) => {
      if (res && res.ok && res.type !== 'opaque') {
        const isShell = APP_SHELL.includes('./' + new URL(request.url).pathname.split('/').pop());
        await putSafe(targetCache || (isShell ? SHELL_CACHE : RUNTIME_CACHE), request, res.clone());
      }
      return res;
    })
    .catch(() => null);
  return cached || (await refreshing) || Response.error();
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) await putSafe(RUNTIME_CACHE, request, res.clone());
  return res;
}

async function networkFirstNavigation(event) {
  const req = event.request;
  const shell = await caches.open(SHELL_CACHE);
  try {
    const preloaded = event.preloadResponse ? await event.preloadResponse : null;
    const res = preloaded || await fetch(req);
    if (res && res.ok) await putSafe(SHELL_CACHE, './index.html', res.clone());
    return res;
  } catch {
    return (await shell.match('./index.html'))
        || (await shell.match('./offline.html'))
        || new Response('Offline e nessuna copia in cache 🍵', {
             status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
           });
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') { e.respondWith(networkFirstNavigation(e)); return; }
  if (isIcon(url)) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(staleWhileRevalidate(req));
});

/* pwa.js chiede SKIP_WAITING quando l'utente conferma l'aggiornamento. */
self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'CACHE_INFO' && e.source) {
    e.source.postMessage({ type: 'CACHE_INFO', version: VERSION, precache: APP_SHELL.length });
  }
});
