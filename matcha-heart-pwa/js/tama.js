/* tama.js — Chasen Tama, cucciolo-frullino che non muore mai */
(function () {
'use strict';
const TAMA_STAGES = [
  { name: 'Germoglio', emoji: '🌱', need: 0, bonus: 'nessuno, solo amore' },
  { name: 'Bamboo', emoji: '🎋', need: 80, bonus: '+5% schiuma a fine livello' },
  { name: 'Lacca oro', emoji: '✨🥢', need: 200, bonus: '1 Chasen gratis al giorno' },
];
function tama() { return window.MH.save.tama; }
function sanitizeName(n) {
  n = String(n || '').trim().replace(/[<>&"]/g, '').slice(0, 12);
  return n || 'Mugi';
}
function stageFor(xp) { let s = 0; TAMA_STAGES.forEach((st, i) => { if (xp >= st.need) s = i; }); return s; }
function feed(kind, n = 1) {
  const t = tama(); if (!t) return;
  const gain = kind === 'stars' ? 10 * n : kind === 'mini' ? 4 : kind === 'cuddle' ? 2 : 1;
  t.xp += gain;
  const ns = stageFor(t.xp);
  if (ns > t.stage) {
    t.stage = ns;
    window.MHSave.writeSave(window.MH.save);
    window.MHToast?.(`${t.name} è diventato ${TAMA_STAGES[ns].name}! ${TAMA_STAGES[ns].emoji} (${TAMA_STAGES[ns].bonus})`);
    window.MHAudio?.chime();
  } else {
    window.MHSave.writeSave(window.MH.save);
  }
  renderTama();
}
function cuddle() {
  const t = tama(); if (!t) return;
  const today = new Date().toISOString().slice(0, 10);
  if (t.cuddlesDate !== today) { t.cuddlesDate = today; t.cuddles = 0; }
  if (t.cuddles >= 5) { window.MHToast?.(`${t.name} è sazio di coccole per oggi 🐾`); return; }
  t.cuddles++;
  if (navigator.vibrate) try { navigator.vibrate(15); } catch {}
  feed('cuddle');
  window.MHToast?.(`${t.name} fa le fusa 🐾 (+2 xp)`);
}
function rename() {
  const t = tama(); if (!t) return;
  const v = prompt('Nome del tuo frullino-cucciolo (max 12):', t.name || 'Mugi');
  if (v === null) return;
  t.name = sanitizeName(v);
  window.MHSave.writeSave(window.MH.save);
  renderTama();
  window.MHToast?.(`Si chiamerà ${t.name} 🐾`);
}
function moodFace() {
  const days = window.MH.save.mood?.value;
  if (days === 'ansiosa') return '🫣';
  if (days === 'malinconica') return '🥺';
  return '😊';
}
function renderTama() {
  const t = tama(); if (!t) return;
  const st = TAMA_STAGES[t.stage] || TAMA_STAGES[0];
  const face = document.getElementById('tama-face');
  const nameEl = document.getElementById('tama-name');
  const meta = document.getElementById('tama-meta');
  if (face) face.textContent = st.emoji + moodFace();
  if (nameEl) nameEl.textContent = t.name + ' · ' + st.name;
  if (meta) {
    const next = TAMA_STAGES[t.stage + 1];
    meta.textContent = `${t.xp} xp${next ? ` · ${next.need - t.xp} a ${next.name}` : ' · forma finale ✨'} · ${st.bonus}`;
  }
}
function dailyChasen() {
  // stage 2: 1 chasen gratis al giorno
  const t = tama(); if (!t || t.stage < 2) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (t.lastDailyChasen === today) return false;
  t.lastDailyChasen = today;
  window.MH.save.boosters.chasen++;
  window.MHSave.writeSave(window.MH.save);
  window.MHToast?.(`${t.name} ti ha lucidato un Chasen! +1 🌀`);
  return true;
}
window.MHTama = { feed, cuddle, rename, renderTama, dailyChasen, sanitizeName, TAMA_STAGES };
})();
