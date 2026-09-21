const CACHE = 'enchanted-clash-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './js/game.js',
  './js/card-engine.js',
  './js/ai-controller.js',
  './js/arena.js',
  './js/particles.js',
  './js/audio.js',
  './js/save.js',
  './js/utils.js',
  './data/cards.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.startsWith('http') && !e.request.url.includes(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
