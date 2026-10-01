/* Fiori sulle Tombe — service worker.
 *
 * Strategia (stessa del resto del repo, e per le stesse ragioni):
 *  - navigazioni   : network-first → app shell in cache → offline.html
 *  - JS/CSS/JSON   : stale-while-revalidate (l'istantanea subito, poi si aggiorna)
 *  - icone         : cache-first (hanno il nome versionato, sono immutabili)
 *  - altro         : stale-while-revalidate in cache runtime
 *
 * Non cache-first secco: la copia in cache viene rimpiazzata a ogni fetch
 * riuscito, quindi la finestra di staleness è di una visita e non richiede
 * bump manuali di VERSION.
 *
 * Il prefisso PREFIX evita di toccare le cache delle altre app che stanno
 * nello stesso origin (in questo repo ce ne sono decine, una per cartella).
 */
'use strict';

const VERSION = '1.0.0';
const PREFIX = 'fst-';
const SHELL_CACHE = PREFIX + 'shell-' + VERSION;
const RUNTIME_CACHE = PREFIX + 'runtime-' + VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './css/style.css',
  './data/story.json',
  './js/save.js',
  './js/memoria.js',
  './js/epitaffio.js',
  './js/audio.js',
  './js/orto.js',
  './js/dono.js',
  './js/vasi.js',
  './js/scena.js',
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

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    /* addAll è atomico: se un file manca, l'installazione fallisce e la vecchia
     * versione resta attiva. Meglio un SW rotto che nessun SW. */
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k.startsWith(PREFIX) && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
      ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const isIcon = (url) => url.pathname.includes('/icons/');

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Navigazioni: la rete prima (così si aggiorna), la shell dopo (così si
   * gioca offline), offline.html come ultima riserva. */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html'))
          || (await caches.match('./offline.html'))
          || new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = isIcon(url) ? await caches.open(SHELL_CACHE) : await caches.open(RUNTIME_CACHE);
    const hit = await cache.match(req);

    if (isIcon(url) && hit) return hit;

    const net = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (hit) { net; return hit; }
    const fresh = await net;
    if (fresh) return fresh;
    if (hit) return hit;
    return new Response('', { status: 504, statusText: 'Offline e non in cache' });
  })());
});
