// services/pwa.js — install prompt + Service Worker + online/offline.
export async function initPwa() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    window.__sw = reg;
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        if (sw.state === 'activated' && reg.active && reg.active !== sw) {
          window.dispatchEvent(new Event('sw-updated'));
        }
      });
    });
  } catch { /* SW non disponibile */ }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__deferredInstall = e;
  });
}

export async function promptInstall() {
  const d = window.__deferredInstall;
  if (!d) return false;
  try {
    await d.prompt();
    const choice = await d.userChoice;
    if (choice && choice.outcome === 'accepted') return true;
  } catch { /* ignore */ }
  window.__deferredInstall = null;
  return false;
}

export function isInstallable() { return !!window.__deferredInstall; }
