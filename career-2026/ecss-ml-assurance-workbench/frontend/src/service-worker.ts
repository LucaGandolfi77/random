/// <reference types="vite-plugin-pwa/client" />

import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

clientsClaim();

const API_BASE = "/api";

registerRoute(
  ({ url }) => url.pathname.startsWith(API_BASE),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 300,
      }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === "script" || request.destination === "style",
  new CacheFirst({
    cacheName: "asset-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 86400,
      }),
    ],
  })
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    (self as any).skipWaiting();
  }
});