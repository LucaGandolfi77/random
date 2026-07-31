/* ===================================================
   🎚 Audio Editor PWA — Bootstrap SoundTouch
   soundtouchjs v0.3.0 è un modulo ES: questo script
   classico lo importa dinamicamente ed espone le classi
   come globali (window.SoundTouch / window.SimpleFilter).
   La risoluzione avviene in pochi ms, sempre prima del
   primo playback/export (attivati dall'utente).
   =================================================== */
import('./vendor/soundtouch.min.js')
  .then((ST) => {
    window.SoundTouch = {
      SoundTouch: ST.SoundTouch,
      SimpleFilter: ST.SimpleFilter,
    };
  })
  .catch((err) => {
    console.error('SoundTouch load failed:', err);
  });
