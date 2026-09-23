// ===== Bar Blu — Service Worker v2 =====
const CACHE_NAME = 'barblu-v3';
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './controller.js',
  './model.js',
  './view.js',
  './storage.js',
  './audio.js',
  './cartolina.js',
  './app-utils.js',
  './manifest.webmanifest',
  './offline.html',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

// Install: precache critical assets (resilient to failures)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(PRECACHE.map(url => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: strategy per request type
self.addEventListener('fetch', event => {
  if (event.request.method === 'POST') {
    const url = new URL(event.request.url);
    if (url.searchParams.get('action') === 'share') {
      event.respondWith(
        event.request.formData().then(fd => {
          const title = (fd.get('name') || '') + '';
          const text = (fd.get('description') || '') + '';
          const clientPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            for (const client of clients) {
              client.postMessage({ type: 'SHARE_TARGET', title, text });
            }
          });
          return Response.redirect('./?action=share-received', 303);
        }).catch(() => Response.redirect('./', 303))
      );
      return;
    }
  }
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip cross-origin (except same-origin ports)
  if (url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    // Network-first, fallback to cache, then offline page
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => { try { cache.put(event.request, clone); } catch (_) {} });
        }
        return response;
      }).catch(() => caches.match('./offline.html'))
    );
    return;
  }

  // Stale-while-revalidate for assets (JS/CSS/SVG/manifest)
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => { try { cache.put(event.request, clone); } catch (_) {} });
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Message-based update flow
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
