// sw.js — service worker cache-first per DITTOPIA (PWA installabile/offline).
var CACHE='dittopia-v1';
var ASSETS=[
  './','./index.html','./style.css','./manifest.webmanifest',
  './icons/192.png','./icons/512.png','./icons/180.png',
  './js/data.js','./js/sprites.js','./js/audio.js','./js/world.js','./js/pokemon.js','./js/save.js','./js/ui.js','./js/game.js'
];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){return;}); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);})); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(function(hit){ if(hit) return hit;
      return fetch(e.request).then(function(resp){
        var copy=resp.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy).catch(function(){}); });
        return resp;
      }).catch(function(){
        return new Response('Offline.', {status:503, headers:{'Content-Type':'text/plain'}});
      });
    })
  );
});