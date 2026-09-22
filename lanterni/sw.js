const CACHE_NAME = 'lanterni-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './js/renderer.js',
  './js/data.js',
  './js/net.js',
  './js/lantern.js',
  './js/city.js',
  './js/sky.js',
  './js/particles.js',
  './js/inhabitants.js',
  './js/audio.js',
  './js/ui.js',
  './js/save.js',
  './js/lilyPad.js',
  './js/seasons.js',
  './js/weather.js',
  './js/skyEffects.js',
  './js/lanternTrails.js',
  './js/ambientMode.js',
  './js/notifications.js',
  './js/lanternEditor.js',
  './js/leaderboard.js',
  './js/marketplace.js',
  './js/collaborative.js',
  './js/gestureRecognition.js',
  './js/arMode.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for JS/CSS, cache-first for static assets
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // JS/CSS: stale-while-revalidate
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(response => {
            if (response.ok) cache.put(e.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Everything else: cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Background Sync stub — queues saves when offline
self.addEventListener('sync', e => {
  if (e.tag === 'lanterni-save') {
    e.waitUntil(replaySyncQueue());
  }
});

async function replaySyncQueue() {
  const cache = await caches.open('lanterni-sync-queue');
  const requests = await cache.keys();
  for (const req of requests) {
    const body = await req.blob();
    try {
      await fetch(req, { method: 'POST', body });
      await cache.delete(req);
    } catch (_) {
      // Keep in queue for next sync
    }
  }
}

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'QUEUE_SAVE') {
    e.waitUntil(queueSave(e.data.key, e.data.value));
  }
});

async function queueSave(key, value) {
  const cache = await caches.open('lanterni-sync-queue');
  const req = new Request(`sync://lanterni-save/${key}`, {
    method: 'POST',
    body: JSON.stringify(value)
  });
  await cache.put(req, new Response(''));
  if ('sync' in self.registration) {
    self.registration.sync.register('lanterni-save');
  }
}
