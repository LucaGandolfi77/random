/* GEMMONDO — Service Worker (offline-first)
   Nessuna dipendenza, nessun build step.
   ---------------------------------------------------------------
   Strategia:
   - Navigazioni (index.html): rete PRIMA, cache come ripiego. Il
     gioco deve aggiornarsi quando esce una versione nuova.
   - Asset con versione nell'URL o nel nome: cache PRIMA, rete in
     secondo piano (stale-while-revalidate). Sono file immutabili.
   - Il resto: rete, con fallback in cache.

   Prima la strategia era "cache sempre" per tutto: finché
   CACHE_VERSION non cambiava, nessun giocatore installato riceveva
   una correzione. Ora la shell si aggiorna e la CACHE_VERSION va
   comunque bumpata a ogni deploy (tools/check.mjs lo segnala). */

const CACHE_VERSION = 'v3';
const SHELL_CACHE = `gemmondo-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `gemmondo-assets-${CACHE_VERSION}`;

/* La shell: se cambiano questi file, cambia CACHE_VERSION. */
const SHELL = [
  './',
  './index.html',
  './style.css',
  './core.js',
  './game.js',
  './audio.js',
  './manifest.json',
];

/* Gli asset di Three.js non cambiano senza cambiare versione: si
   possono tenere in cache all'infinito. */
const VENDOR = [
  './vendor/three/three.module.min.js',
  './vendor/three/three.core.min.js',
  './vendor/three/addons/postprocessing/EffectComposer.js',
  './vendor/three/addons/postprocessing/RenderPass.js',
  './vendor/three/addons/postprocessing/ShaderPass.js',
  './vendor/three/addons/postprocessing/MaskPass.js',
  './vendor/three/addons/postprocessing/Pass.js',
  './vendor/three/addons/postprocessing/UnrealBloomPass.js',
  './vendor/three/addons/postprocessing/OutputPass.js',
  './vendor/three/addons/shaders/CopyShader.js',
  './vendor/three/addons/shaders/LuminosityHighPassShader.js',
  './vendor/three/addons/shaders/OutputShader.js',
];

const ICONS = [
  './icon-16.png',
  './icon-32.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    /* addAll è atomico: se un file manca, l'installazione fallisce e
       il worker precedente continua a servire. Meglio che metà precache. */
    await shell.addAll(SHELL);
    const assets = await caches.open(ASSET_CACHE);
    await assets.addAll([...VENDOR, ...ICONS]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

const isNavigation = (req) =>
  req.mode === 'navigate' ||
  (req.headers.get('accept') || '').includes('text/html');

async function networkFirstShell(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req, { ignoreSearch: true });
    return cached || (await cache.match('./index.html')) || Response.error();
  }
}

async function cacheFirstAsset(req) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(req);
  if (cached) {
    /* stale-while-revalidate: si serve subito, si aggiorna in fondo */
    fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
    }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return Response.error();
  }
}

async function networkPassthrough(req) {
  const cache = await caches.open(ASSET_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  /* Gli asset di Three.js sono self-hosted: tutto il resto va in rete. */
  if (url.origin === self.location.origin) {
    if (isNavigation(req)) { e.respondWith(networkFirstShell(req)); return; }
    if (url.pathname.includes('/vendor/three/')) { e.respondWith(cacheFirstAsset(req)); return; }
    if (url.pathname.endsWith('.png')) { e.respondWith(cacheFirstAsset(req)); return; }
  }
  e.respondWith(networkPassthrough(req));
});

/* Un messaggio dal gioco permette di saltare l'attesa del reload. */
self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});