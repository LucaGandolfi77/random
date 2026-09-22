const CACHE_SHELL = 'radice-shell-v2';
const CACHE_DATA = 'radice-data-v1';
const SHELL = [
  '/', '/index.html', '/style.css', '/manifest.json',
  '/data/books.js', '/data/rooms.js', '/data/chapters.js', '/data/owl.js',
  '/js/helpers.js', '/js/state.js', '/js/save.js', '/js/audio.js',
  '/js/gacha.js', '/js/reader.js', '/js/tree.js', '/js/owl.js', '/js/pwa.js', '/js/main.js',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_SHELL).then(c => c.addAll(SHELL))
      .catch(err => console.warn('Cache install failed:', err))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(
        ks.filter(k => k !== CACHE_SHELL && k !== CACHE_DATA)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (e.request.destination === 'document' || url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(networkFirst(e.request));
    return;
  }

  if (e.request.destination === 'script' || e.request.destination === 'style') {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  if (e.request.destination === 'image' || e.request.destination === 'font') {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  e.respondWith(staleWhileRevalidate(e.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_SHELL);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_SHELL);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/index.html');
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response && response.status === 200) {
      const cache = caches.open(CACHE_DATA);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);
  return cached || fetchPromise || new Response('Offline', { status: 503 });
}

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'SYNC_SAVE') {
    e.waitUntil(syncSaveData());
  }
});

async function syncSaveData() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
  } catch (e) { console.warn('Sync failed:', e); }
}
