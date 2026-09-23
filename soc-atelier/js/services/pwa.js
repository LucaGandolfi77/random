export async function registerPWA() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./service-worker.js');
  } catch { /* SW unavailable */ }
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.querySelector('#install-banner');
  if (banner) banner.hidden = false;
});

export function showInstallBanner() {
  const banner = document.querySelector('#install-banner');
  if (banner) banner.hidden = false;
}

export async function promptInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => {});
  deferredPrompt = null;
}

export async function handleShareTarget() {
  if (!('shareTarget' in window)) return null;
  try {
    const data = await window.shareTarget.data;
    const text = await data.text();
    return text;
  } catch {
    return null;
  }
}
