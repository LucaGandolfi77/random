export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    return reg;
  } catch (err) {
    console.warn('[pwa] SW registration failed', err);
    return null;
  }
}

export async function promptInstall(app) {
  if (!window.deferredPrompt) return null;
  try {
    window.deferredPrompt.prompt();
    const choice = await window.deferredPrompt.userChoice;
    window.deferredPrompt = null;
    return choice;
  } catch (err) {
    return null;
  }
}

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
  });
}

export function isInstallable() {
  return !!window.deferredPrompt || ('standalone' in window.navigator && window.navigator.standalone);
}
