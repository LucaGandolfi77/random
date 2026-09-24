/* Vola! — service worker: app shell offline + cache del modello AI */
"use strict";

const CACHE = "vola-v2";
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

/* Risorse CDN necessarie per avviarsi senza rete dopo il primo caricamento:
   - modello pose (anche se passi a pose_landmarker_lite)
   - bundle + wasm MediaPipe tasks-vision
   - motore Three.js */
const CDN_OFFLINE = [
  "pose_landmarker",
  "/@mediapipe/tasks-vision",
  "storage.googleapis.com/mediapipe-models",
  "three.module.js",
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

  if (CDN_OFFLINE.some((frag) => url.href.includes(frag))) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        if (hit) return hit;
        return fetch(e.request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  /* altri CDN: sempre rete */
  if (url.origin !== self.location.origin) return;

  /* App shell: cache-first */
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
