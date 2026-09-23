const CACHE_NAME = 'caffe-sospeso-v3';
const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png',
  './icons/maskable-512.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/maskable-512.svg',
  './js/app.js',
  './js/config.js',
  './js/i18n.js',
  './js/utils.js',
  './js/model.js',
  './js/view.js',
  './js/controller.js',
  './js/services/storage.js',
  './js/services/audio.js',
  './js/services/pwa.js',
];

async function tolerantCache(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(urls.map(async (u) => {
    try {
      const res = await fetch(u);
      if (res.ok) await cache.put(u, res);
    } catch { /* skip unreachable */ }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(tolerantCache(CACHE_NAME, PRECACHE).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname === '/share-target' || event.request.headers.get('content-type')?.includes('application/json')) {
    event.respondWith(
      (async () => {
        try {
          const body = await event.request.text();
          const c = await caches.open(CACHE_NAME);
          const stored = await c.match('./');
          await caches.open('cs-share').then(async (sc) => { await sc.put('/share-target', new Response(body)); });
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          clients.forEach((cl) => cl.postMessage({ type: 'CS_SHARE_TARGET', body }));
          return stored ?? await caches.match('./offline.html');
        } catch {
          return await caches.match('./offline.html');
        }
      })()
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match('./offline.html'));
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CS_SKIP_WAITING') self.skipWaiting();
});
