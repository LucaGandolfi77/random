/* eslint-env service-worker */

import { precacheAndRoute } from 'workbox-precaching'

// Workbox precache manifest (injected at build time)
precacheAndRoute(self.__WB_MANIFEST || [])

// Inject COOP/COEP headers for SharedArrayBuffer (WASM support)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return
  }

  // Only intercept navigation requests to inject headers
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.type === 'basic') {
            const headers = new Headers(response.headers)
            headers.set('Cross-Origin-Embedder-Policy', 'credentialless')
            headers.set('Cross-Origin-Opener-Policy', 'same-origin')
            return new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers,
            })
          }
          return response
        })
        .catch(() => caches.match(event.request))
    )
  }
})
