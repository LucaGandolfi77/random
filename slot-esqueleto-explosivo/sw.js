/* ===================================================
   💀 Esqueleto Explosivo Clone — Service Worker
   - Navigazione: network-first (index.html sempre
     aggiornato, fallback cache se offline).
   - Asset statici: cache-first (offline), aggiornati
     a ogni install nuova con fetch cache:reload.
   - IMPORTANTE: quando cambi i file, BUMPA la versione
     di CACHE sotto, altrimenti i giocatori restano
     bloccati sulla vecchia versione.
   Via file:// il gioco funziona comunque, senza SW.
   =================================================== */
const CACHE = 'esqueleto-explosivo-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './engine.js',
  './symbols.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
