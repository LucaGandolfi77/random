// Bootstrap del gioco: collega Model → Controller → View e avvia il loop.
// Unico punto d'ingresso dell'applicazione (registrato come module da index.html).

import { start } from './controller.js';

function boot() {
  try {
    start();
  } catch (err) {
    // Fail-safe: se qualcosa va storto all'avvio, mostra un messaggio minimale
    // senza mai usare innerHTML con dati esterni.
    const el = document.getElementById('toast');
    if (el) {
      el.textContent = 'Lumina could not start — try clearing site data.';
      el.classList.add('show');
      el.setAttribute('role', 'alert');
    }
    console.error(err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
