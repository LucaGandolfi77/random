/* save.js — persistenza locale, deep-merge e migrazioni */
(function () {
'use strict';
const SAVE_KEY = 'matcha-heart-save-v1';
/* B10: Object.assign(d, parsed) sostituiva `stats` per intero, quindi ogni
   nuova sottochiave aggiunta in futuro spariva per i save già esistenti.
   Ora il merge è ricorsivo e ogni salvataggio porta la sua versione. */
const SAVE_VERSION = 2;
const DEFAULT_SAVE = () => ({
  saveVersion: SAVE_VERSION,
  stars: {}, unlocked: 1, totalStars: 0, choices: {},
  letters: [], endings: [], hearts: 5, lastRefill: Date.now(),
  oracleDate: '', settings: { sound: true, night: false },
  bonusMoves: 0, pendingMoves: 0, boosters: { chasen: 2, cup: 2 }, endingsSeen: {},
  tama: { name: 'Mugi', xp: 0, stage: 0, cuddlesDate: '', cuddles: 0, lastDailyChasen: '' },
  mood: { date: '', value: '', log: [] },
  stats: { rainTaps: 0, riteS: 0, losses: {}, konamiDate: '', hanaTaps: 0, kikuRescue: {}, firstPlay: '' },
  universe: 'pioggia', progress: null // progress multiverso costruito da MHU.ensureSave()
});
/* merge ricorsivo: le chiavi assenti in `src` restano quelle di `dst` */
function deepMerge(dst, src) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) return dst;
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) {
      deepMerge(dst[k], v);
    } else if (v !== undefined) {
      dst[k] = v;
    }
  }
  return dst;
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const d = DEFAULT_SAVE();
    if (!raw) { d.stats.firstPlay = new Date().toISOString().slice(0, 10); return d; }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return d;
    deepMerge(d, parsed);
    if (!d.stats.firstPlay) d.stats.firstPlay = new Date().toISOString().slice(0, 10);
    d.saveVersion = SAVE_VERSION;
    return d;
  } catch { return DEFAULT_SAVE(); }
}
/* B11: prima ogni errore (quota piena, modalità privata, storage disabilitato)
   veniva ingoiato e il giocatore perdeva i progressi senza saperlo. */
let lastWriteFailed = false;
function writeSave(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    if (lastWriteFailed) { lastWriteFailed = false; window.MHToast?.('💾 Salvataggio ripristinato'); }
    return true;
  } catch (err) {
    const quota = err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014);
    if (!lastWriteFailed) {
      lastWriteFailed = true;
      window.MHToast?.(quota
        ? '⚠️ Spazio esaurito: i progressi di questa sessione non saranno salvati.'
        : '⚠️ Salvataggio non disponibile (modalità privata?): i progressi vivono solo finché resti qui.');
    }
    return false;
  }
}
function refillHearts(s) {
  const now = Date.now(), FIVE_MIN = 5 * 60 * 1000;
  if (s.hearts >= 5) { s.lastRefill = now; return s; }
  const elapsed = now - (s.lastRefill || now);
  const gain = Math.floor(elapsed / FIVE_MIN);
  if (gain > 0) { s.hearts = Math.min(5, s.hearts + gain); s.lastRefill = now; }
  return s;
}
window.MHSave = { loadSave, writeSave, refillHearts, DEFAULT_SAVE, deepMerge, SAVE_VERSION };
})();
