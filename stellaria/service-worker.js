const CACHE = 'stellaria-v4';
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './offline.html',
  './js/app.js',
  './js/core/config.js',
  './js/core/i18n.js',
  './js/core/utils.js',
  './js/core/state.js',
  './js/core/bus.js',
  './js/core/qr.js',
  './js/domain/world.js',
  './js/domain/scoring.js',
  './js/domain/model.js',
  './js/ui/view.js',
  './js/ui/controller.js',
  './js/features/index.js',
  './js/ui/avatar.js',
  './js/services/storage.js',
  './js/services/audio.js',
  './js/services/pwa.js',
  './js/services/share.js',
  './js/services/backup.js',
  './js/services/ambient.js',
  './js/services/auth.js',
  './js/services/oracle.js',
  './js/domain/data/tagMeta.js',
  './js/domain/data/citizens.js',
  './js/domain/data/rooms.js',
  './js/domain/data/items.js',
  './js/domain/data/market.js',
  './js/domain/data/achievements.js',
  './js/domain/data/unlockables.js',
  './js/domain/data/events.js',
  './js/domain/data/tutorial.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/maskable-512.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon-180.png',
];

async function precacheAll(cache) {
  await Promise.all(PRECACHE.map(async (u) => {
    try {
      const r = await fetch(u, { cache: 'reload' });
      if (r && r.ok) await cache.put(u, r);
    } catch { /* skip missing */ }
  }));
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await precacheAll(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k.startsWith('stellaria')).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isNavigation(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

async function shareTargetHandler(request) {
  try {
    const form = await request.formData();
    const text = (form.get('text') || '').toString();
    if (text) {
      const clients = self.clients;
      const c = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const target = c[0] || await clients.openWindow('./');
      if (target) {
        target.postMessage({ type: 'share-target', text });
        if (c[0] && typeof c[0].focus === 'function') c[0].focus();
      }
      return new Response('OK', { status: 200 });
    }
  } catch {}
  return new Response('Bad Request', { status: 400 });
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') {
    if (e.request.method === 'POST' && e.request.url.endsWith('/share-target')) {
      e.respondWith(shareTargetHandler(e.request));
    }
    return;
  }
  const url = new URL(e.request.url);
  if (url.pathname === '/share-target') {
    if (e.request.method === 'GET') {
      e.respondWith((async () => {
        try {
          const params = new URL(e.request.url).searchParams;
          const text = params.get('text') || params.get('title') || '';
          if (text) {
            const cache = await caches.open('share-target');
            await cache.put('/pending', new Response(text));
          }
        } catch {}
        return Response.redirect('./', 303);
      })());
      return;
    }
    e.respondWith(shareTargetHandler(e.request)); return;
  }

  if (isNavigation(e.request)) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  if (e.request.url.startsWith('http://localhost') || e.request.url.startsWith('http://127.0.0.1')) {
    return;
  }
  // Stale-While-Revalidate per asset statici
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) {
        fetch(e.request).then((r) => {
          if (r && r.ok && r.type !== 'opaque') {
            const cp = r.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, cp)).catch(() => {});
          }
          return r;
        }).catch(() => {});
        return hit;
      }
      return fetch(e.request).then((r) => {
        if (r && r.ok && r.type !== 'opaque') {
          const cp = r.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, cp)).catch(() => {});
        }
        return r;
      }).catch(() => caches.match('./offline.html'));
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
