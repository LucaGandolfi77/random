/* eslint-disable no-restricted-globals */
// Service Worker · strategia mista (v5):
//  - Network-First per le navigazioni (sempre contenuto fresco quando online)
//  - Stale-While-Revalidate per gli statici (immediati dalla cache, aggiornati in background)
//  - precache con Promise.allSettled (un file mancante non blocca l'install)
//  - cache.put sempre dentro event.waitUntil (B3)
//  - nessun skipWaiting automatico: l'utente accetta l'aggiornamento (B10)

const CACHE = 'lumina-v5';

const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './styles.css',
  './manifest.webmanifest',
  './content.json',
  './src/app.js',
  './src/controller.js',
  './src/view.js',
  './src/i18n.js',
  './src/config.js',
  './src/model/data.js',
  './src/model/content.js',
  './src/model/state.js',
  './src/model/actions.js',
  './src/services/storage.js',
  './src/services/idb.js',
  './src/services/audio.js',
  './src/services/pwa.js',
  './src/services/share.js',
  './src/services/zip.js',
  './src/services/mods.js',
  './src/services/multiplayer.js',
  './src/services/a11y.js',
  './icons/icon.svg',
  './icons/maskable.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
];

// Hash di path statici: niente cache per navigazioni HTML o API.
function isStatic(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.includes('/api/')) return false;
  const p = url.pathname;
  if (p.endsWith('.html') || p.endsWith('/') || p.endsWith('/index.html')) return false;
  return /\.(css|js|mjs|webmanifest|png|svg|json|woff2?|ico)$/.test(p)
    || p.includes('/src/')
    || p.includes('/icons/');
}

function isNavigation(request, url) {
  return request.mode === 'navigate'
    || request.destination === 'document'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(
        PRECACHE.map((url) => cache.add(url).catch(() => undefined)),
      ))
      .then(() => self.skipWaiting()) // install iniziale subito attivo; update non forzato qui
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// Aggiornamento esplicito richiesto dalla View (B10).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;

  // --- Navigazioni: Network-First con fallback offline ---
  if (isNavigation(request, url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            event.waitUntil(caches.open(CACHE).then((c) => c.put(request, copy)));
          }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('./offline.html'))),
    );
    return;
  }

  // --- Statici: Stale-While-Revalidate ---
  if (isStatic(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok && res.type === 'basic') {
              // clone dentro la stessa promise chain: waitUntil già collegato da respondWith
              return cache.put(request, res.clone()).then(() => res);
            }
            return res;
          })
          .catch(() => null);

        if (cached) {
          // riconvalida in background (best effort)
          event.waitUntil(network.catch(() => null));
          return cached;
        }
        const fresh = await network;
        if (fresh) return fresh;
        if (request.mode === 'navigate') return caches.match('./offline.html');
        return Response.error();
      }),
    );
    return;
  }

  // --- Resto: cache-first con fallback rete ---
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => {
        if (request.mode === 'navigate') return caches.match('./offline.html');
        return Response.error();
      });
    }),
  );
});
