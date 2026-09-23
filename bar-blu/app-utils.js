// ===== Bar Blu — App Utils (PWA registration) =====
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./service-worker.js'); console.log('Bar Blu SW OK'); } catch (e) { console.log('SW err', e); }
  }
}
