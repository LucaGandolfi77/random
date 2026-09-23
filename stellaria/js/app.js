import { boot } from './ui/controller.js';
import { initView } from './ui/view.js';

async function hydratePendingShare() {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open('share-target');
    const r = await cache.match('/pending');
    if (!r) return;
    const text = await r.text();
    if (text) localStorage.setItem('stellaria-pending-share', text.slice(0, 5000));
    await cache.delete('/pending');
  } catch {}
}

function start() {
  initView();
  hydratePendingShare();
  boot().catch((e) => { console.error('boot error', e); });
  window.addEventListener('online', () => {});
  window.addEventListener('offline', () => {});
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
