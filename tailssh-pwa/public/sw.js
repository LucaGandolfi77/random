'use strict';

const CACHE = 'tailssh-v2';
const SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/files.js',
  '/vnc.js',
  '/manifest.webmanifest',
  '/vendor/xterm.css',
  '/vendor/xterm.js',
  '/vendor/addon-fit.js',
  '/vendor/novnc/core/rfb.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => { const c = res.clone(); caches.open(CACHE).then((cache) => cache.put(e.request, c)); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
