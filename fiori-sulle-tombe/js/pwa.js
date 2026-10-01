/* pwa.js — installazione, aggiornamenti, e le regole che valgono solo su iPhone.
 *
 * Registrazione con updateViaCache:'none': senza, alcuni browser servono sw.js
 * dalla HTTP cache e l'aggiornamento arriva quando gli pare. Qui si notifica
 * "c'è una versione nuova" e si lascia decidere.
 */
(function () {
'use strict';

let waitingSW = null;
let deferred = null;
let ricaricato = false;

function toast(m) { window.FSTApp && window.FSTApp.toast && window.FSTApp.toast(m); }

async function registra() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    if (reg.waiting && navigator.serviceWorker.controller) { waitingSW = reg.waiting; offriAggiornamento(); }
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          waitingSW = sw;
          offriAggiornamento();
        }
      });
    });
  } catch (err) {
    console.warn('[pwa] registrazione fallita:', err && err.message);
  }
}

function offriAggiornamento() {
  if (!waitingSW) return;
  const bar = document.createElement('div');
  bar.className = 'toast visibile';
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'display:flex;gap:10px;align-items:center';
  const span = document.createElement('span');
  span.textContent = 'C\'è un orto più nuovo.';
  const si = document.createElement('button');
  si.type = 'button';
  si.textContent = 'Ricarica';
  si.style.cssText = 'font:inherit;font-weight:700;background:#c9a76a;color:#1a1512;border:0;border-radius:2px;padding:9px 12px;min-height:38px;cursor:pointer';
  const dopo = document.createElement('button');
  dopo.type = 'button';
  dopo.textContent = 'Dopo';
  dopo.style.cssText = 'font:inherit;color:#cfc4b4;border:1px solid #4a3c31;border-radius:2px;padding:9px 12px;min-height:38px;cursor:pointer';
  const via = () => bar.remove();
  si.onclick = () => { via(); waitingSW.postMessage({ type: 'SKIP_WAITING' }); };
  dopo.onclick = via;
  bar.append(span, si, dopo);
  document.body.appendChild(bar);
  setTimeout(() => { if (bar.isConnected) via(); }, 14000);
}

navigator.serviceWorker && navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (ricaricato) return;
  ricaricato = true;
  location.reload();
});

/* ── persistenza ─────────────────────────────────────────── */

/* Su iOS Safari i dati localStorage possono essere sfrattati dopo settimane
 * di assenza. Chiedere `persist()` mentre l'app è in primo piano è l'unico
 * modo onesto di difendersi, e non costa nulla quando viene negato. */
async function chiediPersistenza() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch { /* niente: si continua senza, come fanno tutti i browser */ }
}

/* ── iPhone ──────────────────────────────────────────────── */

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  matchMedia('(display-mode: fullscreen)').matches ||
  window.navigator.standalone === true;

const eIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent);

function istruzioniInstalla() {
  if (standalone()) return 'Sei già nella versione installata. Buona permanenza.';
  if (eIOS()) return 'Su iPhone: Safari → icona Condividi → «Aggiungi alla schermata Home».';
  return 'Chrome e Edge: ⋮ → «Installa app». Su desktop: la barra di installazione nella barra degli indirizzi.';
}

function installa() {
  if (deferred) {
    deferred.prompt();
    deferred.userChoice.then(() => { deferred = null; }).catch(() => { deferred = null; });
    return;
  }
  if (standalone()) { toast('Sei già nella versione installata.'); return; }
  const avviso = document.getElementById('avviso-installa');
  if (avviso) { avviso.hidden = false; avviso.textContent = istruzioniInstalla(); }
  else toast(istruzioniInstalla(), 8000);
  const btn = document.getElementById('btn-installa');
  if (btn) btn.textContent = 'Come installare';
}

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  const btn = document.getElementById('btn-installa');
  if (btn) { btn.textContent = 'Installa adesso'; btn.classList.add('fantasma'); }
});
addEventListener('appinstalled', () => {
  deferred = null;
  toast('Fiori sulle Tombe è sulla tua Home.');
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') chiediPersistenza();
});

if (document.readyState === 'complete') registra();
else addEventListener('load', registra, { once: true });

window.FSTPWA = { installa, istruzioniInstalla, standalone, eIOS };
})();