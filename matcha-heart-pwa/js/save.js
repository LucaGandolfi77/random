/* save.js — persistenza locale */
'use strict';
const SAVE_KEY = 'matcha-heart-save-v1';
const DEFAULT_SAVE = () => ({
  stars: {}, unlocked: 1, totalStars: 0, choices: {},
  letters: [], endings: [], hearts: 5, lastRefill: Date.now(),
  oracleDate: '', settings: { sound: true, night: false },
  bonusMoves: 0, boosters: { chasen: 2, cup: 2 }, endingsSeen: {},
  tama: { name: 'Mugi', xp: 0, stage: 0, cuddlesDate: '', cuddles: 0, lastDailyChasen: '' },
  mood: { date: '', value: '', log: [] },
  stats: { rainTaps: 0, riteS: 0, losses: {}, konamiDate: '', hanaTaps: 0, kikuRescue: {}, firstPlay: '' },
  universe: 'pioggia', progress: null // progress multiverso costruito da MHU.ensureSave()
});
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const d = DEFAULT_SAVE();
    if (!raw) return d;
    const s = Object.assign(d, JSON.parse(raw));
    if (!s.tama) s.tama = DEFAULT_SAVE().tama;
    if (!s.mood) s.mood = DEFAULT_SAVE().mood;
    if (!s.stats) s.stats = DEFAULT_SAVE().stats;
    if (!s.stats.firstPlay) s.stats.firstPlay = new Date().toISOString().slice(0,10);
    return s;
  } catch { return DEFAULT_SAVE(); }
}
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {} }
function refillHearts(s) {
  const now = Date.now(), FIVE_MIN = 5 * 60 * 1000;
  if (s.hearts >= 5) { s.lastRefill = now; return s; }
  const elapsed = now - (s.lastRefill || now);
  const gain = Math.floor(elapsed / FIVE_MIN);
  if (gain > 0) { s.hearts = Math.min(5, s.hearts + gain); s.lastRefill = now; }
  return s;
}
window.MHSave = { loadSave, writeSave, refillHearts, DEFAULT_SAVE };
