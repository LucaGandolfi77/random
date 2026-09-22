const CACHE = 'forno-fiamma-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './js/main.js',
  './js/state.js',
  './js/engine.js',
  './js/data.js',
  './js/ui.js',
  './js/audio.js',
  './js/village.js',
  './js/haptic.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(netRes => {
        caches.open(CACHE).then(c => c.put(e.request, netRes.clone()));
        return netRes;
      }).catch(() => caches.match(url))
    );
  } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetched = fetch(e.request).then(netRes => {
          if (netRes.ok) caches.open(CACHE).then(c => c.put(e.request, netRes.clone()));
          return netRes;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
