/* Vola! — service worker: app shell offline + cache del modello AI */
"use strict";

const CACHE = "vola-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./js/main.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  /* Modello AI e motore 3D: cache-first con fallback alla rete
     (dopo il primo download la PWA funziona anche offline) */
  if (url.href.includes("hand_landmarker.task") ||
      url.href.includes("pose_landmarker_full.task") ||
      url.href.includes("three.module.js")) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        if (hit) return hit;
        return fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        });
      })
    );
    return;
  }

  /* CDN MediaPipe: sempre rete (mai in cache) */
  if (url.origin !== self.location.origin) return;

  /* App shell: cache-first */
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
