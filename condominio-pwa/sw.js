/* Scala B, Civico 0 — service worker */
"use strict";

const CACHE_PREFIX = "civico0-";
const CACHE = "civico0-v2";

/* Shell critica: se manca qualcosa, l'installazione fallisce
   e resta attiva la versione precedente (niente mezzi aggiornamenti). */
const CORE = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./js/main.js",
  "./js/ui.js",
  "./js/game.js",
  "./js/data.js",
  "./js/save.js",
  "./js/audio.js",
  "./js/postcard.js",
];

/* Extra (icone): utili, ma non bloccano l'installazione. */
const EXTRA = [
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await Promise.all(CORE.map((u) => c.add(u)));
      await Promise.all(EXTRA.map((u) => c.add(u).catch(() => {})));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      /* elimina solo le cache di questa app, mai quelle di altri progetti sullo stesso origin */
      await Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;
  if (e.request.headers.get("range")) return;

  const isNav = e.request.mode === "navigate";

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request, { ignoreVary: true });

      const network = fetch(e.request)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            cache.put(e.request, copy).catch(() => {});
          }
          return res;
        })
        .catch(() => null);

      /* stale-while-revalidate: risposta immediata dalla cache, rete in background */
      if (cached) {
        e.waitUntil(network);
        return cached;
      }

      const res = await network;
      if (res) return res;

      /* offline senza copia: solo le navigazioni ricadono sulla shell */
      if (isNav) {
        const shell = await cache.match("./index.html");
        if (shell) return shell;
      }
      return Response.error();
    })()
  );
});
