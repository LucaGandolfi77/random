const CACHE = 'soc-atelier-v4';
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './offline.html',
  './js/app.js',
  './js/config.js',
  './js/i18n.js',
  './js/utils.js',
  './js/sim.js',
  './js/model.js',
  './js/view.js',
  './js/controller.js',
  './js/services/storage.js',
  './js/services/audio.js',
  './js/services/pwa.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/maskable-512.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {
      PRECACHE.forEach((u) => fetch(u).then((r) => { if (r.ok) cache.put(u, r); }).catch(() => {}));
    }))
  ).then(() => self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE && k.startsWith('soc-atelier')).map((k) => caches.delete(k))
    ))
  ).then(() => self.clients.claim());
});

function tolerantMatch(request) {
  return caches.match(request).then((hit) => {
    if (hit) return hit;
    return fetch(request).then((r) => {
      if (r && r.ok && r.type !== 'opaque') {
        const cp = r.clone();
        caches.open(CACHE).then((cache) => cache.put(request, cp)).catch(() => {});
      }
      return r;
    }).catch(() => caches.match('./offline.html'));
  });
}

function isNavigation(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('http://localhost') || e.request.url.startsWith('http://127.0.0.1')) {
    return fetch(e.request).catch(() => caches.match('./offline.html'));
  }
  if (isNavigation(e.request)) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./offline.html')).then((r) => r || caches.match('./offline.html'))
    );
    return;
  }
  e.respondWith(tolerantMatch(e.request));
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'SHARE_TARGET') {
    const form = new FormData(e.data.body);
    e.waitUntil(
      (async () => {
        const text = form.get('text') || '';
        const cl = e.currentTarget.clients;
        const c = await cl.matchAll({ type: 'window', includeUncontrolled: true });
        const target = c[0] || await cl.openWindow('./');
        if (target && target.postMessage) target.postMessage({ type: 'SHARE_TARGET', payload: text });
      })()
    );
  }
});
