// Injects cross-origin isolation headers so ONNX Runtime can use SharedArrayBuffer
// and multi-threaded WASM. Only navigations are rewritten, which leaves model
// downloads from huggingface.co untouched. Falls back to the precached shell
// when the network is gone.
//
// The ONNX Runtime wasm binary is deliberately NOT precached by workbox
// (globPatterns plus a 28 MB ceiling would put it in the manifest, and it is
// 26.9 MB). It is fetched from the same origin at runtime and served by the
// cache-first rule below, so the first offline run needs the wasm to have been
// requested at least once online.
import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clientsClaim());
});

const SHELL_URL = new URL('index.html', self.location.origin).toString();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//, /\/spike\//],
  }),
);

registerRoute(
  ({ request, url }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'worker',
  new CacheFirst({ cacheName: 'ox-assets' }),
);

registerRoute(
  ({ url }) => url.pathname.endsWith('.wasm'),
  new CacheFirst({
    cacheName: 'ox-wasm',
    expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
  }),
);

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const headers = new Headers(response.headers);
          headers.set('Cross-Origin-Opener-Policy', 'same-origin');
          headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        })
        .catch(async () => {
          const cached = await caches.match(SHELL_URL);
          if (cached !== undefined) {
            const headers = new Headers(cached.headers);
            headers.set('Cross-Origin-Opener-Policy', 'same-origin');
            headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
            return new Response(cached.body, { status: cached.status, headers });
          }
          return new Response('<h1>Offline, and nothing cached yet.</h1>', {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }),
    );
    return;
  }

  if (request.url.includes('huggingface.co')) {
    event.respondWith(new NetworkFirst({ cacheName: 'ox-model-index' }).handle({ request }));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});