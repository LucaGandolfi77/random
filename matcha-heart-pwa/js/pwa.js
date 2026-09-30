/* pwa.js — registrazione SW, installazione, aggiornamenti, storage */
(function () {
'use strict';
const toast = (m) => window.MHToast?.(m);

/* 1. Registrazione.
 * B17: senza updateViaCache:'none' alcuni browser servono sw.js dalla HTTP cache
 * e ritardano gli aggiornamenti; inoltre mancava del tutto il flusso
 * "c'è una versione nuova" (l'utente restava su codice vecchio per sempre). */
let waitingSW = null;
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          waitingSW = sw;
          offerUpdate();
        }
      });
    });
    if (reg.waiting && navigator.serviceWorker.controller) { waitingSW = reg.waiting; offerUpdate(); }
  } catch (err) {
    console.warn('[pwa] registrazione SW fallita:', err && err.message);
  }
}
function offerUpdate() {
  if (!waitingSW) return;
  const bar = document.createElement('div');
  bar.className = 'toast show';
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'display:flex;gap:10px;align-items:center;max-width:92vw';
  const span = document.createElement('span');
  span.textContent = '🍵 C\'è una tazza più calda. Aggiornare?';
  const yes = document.createElement('button');
  yes.type = 'button';
  yes.textContent = 'Sì';
  yes.style.cssText = 'font:inherit;font-weight:800;background:#7a9e7e;color:#fff;border:0;border-radius:10px;padding:8px 12px;min-height:36px;cursor:pointer';
  const no = document.createElement('button');
  no.type = 'button';
  no.textContent = 'Dopo';
  no.style.cssText = 'font:inherit;font-weight:800;background:transparent;color:#fff;border:1px solid #ffffff66;border-radius:10px;padding:8px 12px;min-height:36px;cursor:pointer';
  const done = () => bar.remove();
  yes.onclick = () => { done(); waitingSW.postMessage({ type: 'SKIP_WAITING' }); };
  no.onclick = done;
  bar.append(span, yes, no);
  document.body.appendChild(bar);
  setTimeout(() => { if (bar.isConnected) done(); }, 12000);
}
let reloading = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (reloading) return;
  reloading = true;
  location.reload();
});

/* 2. Installazione. */
let deferred = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  const btn = document.getElementById('btn-install');
  if (btn && !btn.dataset.hooked) {
    btn.dataset.hooked = '1';
    btn.textContent = '📲 Installa adesso';
    btn.classList.add('primary');
  }
});
addEventListener('appinstalled', () => {
  deferred = null;
  toast('🍵 Matcha Heart è sulla tua Home. Buon servizio!');
});
document.getElementById('btn-install')?.addEventListener('click', async () => {
  if (deferred) {
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    deferred = null;
    return;
  }
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) { toast('Sei già nella versione installata 🍵'); return; }
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  alert(iOS
    ? 'Su iPhone: Safari → icona Condividi ⬆️ → "Aggiungi alla schermata Home".'
    : 'Chrome/Edge Android: ⋮ → "Installa app".\nDesktop: icona di installazione nella barra degli indirizzi.');
});

/* 3. Storage: chiedere la persistenza evita che il browser evicti i save. */
async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    if (navigator.storage.persist) await navigator.storage.persist();
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') requestPersistence();
});

if (document.readyState === 'complete') registerSW();
else addEventListener('load', registerSW, { once: true });
})();
