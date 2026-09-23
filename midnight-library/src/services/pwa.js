// PWA: registrazione SW con flusso di aggiornamento esplicito + install prompt.

let deferredInstall = null;
let updateRegistration = null;
let onUpdateReady = null;

// Registra lo SW dopo il load (evita race sul primo paint) e gestisce update.
export function registerSW({ onUpdate } = {}) {
  onUpdateReady = onUpdate || null;
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' })
      .then((reg) => {
        updateRegistration = reg;
        // Aggiornamento già disponibile al caricamento?
        if (reg.waiting) notifyUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdate(nw);
            }
          });
        });
      })
      .catch(() => { /* offline/unsupported: il gioco resta giocabile */ });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });

  // Ricarica automatica quando il vecchio SW prende il controllo dopo SKIP_WAITING.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function notifyUpdate(worker) {
  if (onUpdateReady) onUpdateReady(worker);
}

// L'utente accetta l'aggiornamento: chiede al nuovo SW di attivarsi.
export function applyUpdate() {
  if (!updateRegistration || !updateRegistration.waiting) return;
  updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

// Hook per beforeinstallprompt (Android/desktop Chrome). iOS non lo espone.
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
  });
  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    document.dispatchEvent(new CustomEvent('lumina:installed'));
  });
}

export function promptInstall() {
  if (!deferredInstall) return Promise.resolve(null);
  const p = deferredInstall;
  deferredInstall = null;
  p.prompt();
  return p.userChoice.finally(() => { deferredInstall = null; });
}

export function canPromptInstall() {
  return Boolean(deferredInstall);
}

// iOS non ha beforeinstallprompt: rileva standalone + UA per mostrare il hint manual.
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// File System Access API (Chromium): pickers con fallback Blob download/upload.
export function supportsFileSystemAccess() {
  return typeof window.showSaveFilePicker === 'function';
}

export async function saveToFile(suggestedName, contents, mime = 'application/json') {
  if (supportsFileSystemAccess()) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Lumina save', accept: { [mime]: ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      return { ok: true, method: 'fs' };
    } catch (err) {
      if (err && err.name === 'AbortError') return { ok: false, cancelled: true };
      // quota/unsupported: fallback al blob
    }
  }
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { ok: true, method: 'blob' };
}

export async function pickFile(accept = '.json,application/json') {
  if (typeof window.showOpenFilePicker === 'function') {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Lumina save', accept: { 'application/json': ['.json'] } }],
      });
      const file = await handle.getFile();
      return { ok: true, text: await file.text() };
    } catch (err) {
      if (err && err.name === 'AbortError') return { ok: false, cancelled: true };
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) { resolve({ ok: false, cancelled: true }); return; }
      resolve({ ok: true, text: await file.text() });
    });
    input.click();
  });
}

// Web Share Target (GET con param `text`): ingest lettere alla prima interazione.
export function readShareTarget() {
  try {
    const url = new URL(window.location.href);
    const text = url.searchParams.get('text') || url.searchParams.get('title') || '';
    if (text) {
      url.searchParams.delete('text');
      url.searchParams.delete('title');
      url.searchParams.delete('body');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      return text;
    }
  } catch { /* URL invalido */ }
  return '';
}

// Rileva la prima navigazione condivisa (da avantlink o URL pulito).
export function onShareTarget(handler) {
  // Chiamato una volta all'avvio; il controller decide cosa fare col testo.
  const text = readShareTarget();
  if (text) handler(text);
}
