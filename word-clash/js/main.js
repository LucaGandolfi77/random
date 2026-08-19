/* MAIN — avvio: carica la partita, sblocca l'audio al primo gesto, lancia l'interfaccia. */
'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const loaded = save.load();
  if (!loaded) newGame();

  UI.init();
  UI.showTab('home');
  UI.toast(loaded ? '📖 Bentornato in libreria!' : '📖 Benvenuto! Costruisci la tua libreria e fai guerra di parole.');

  const unlockAudio = () => { audio.unlock(); };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  window.addEventListener('beforeunload', () => save.save());
});