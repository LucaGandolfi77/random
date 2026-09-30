/* pwa.js — registrazione SW + install */
'use strict';
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
document.getElementById('btn-install')?.addEventListener('click', async () => {
  if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; }
  else alert('Per installare: Safari iOS → Condividi → Aggiungi a Home. Chrome Android → ⋮ → Installa app.');
});
