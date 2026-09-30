/* eggs.js — 10 easter egg, tutti leggeri e cozy */
'use strict';
const HAIKU = [
  'Pioggia di notte — / anche la luna / beve matcha.',
  'Tazza vuota, cuore / pieno: Hana sorride / nel vapore.',
  'Il chasen dorme. / Tu no. Va bene. / Respira.',
  'Sakura fuori stagione: / i miracoli non guardano / il calendario.',
  'Tre sorsi e passa. / Tutto passa. / Resta il tè.',
];
function stats() { return window.MH.save.stats; }
function persist() { window.MHSave.writeSave(window.MH.save); }
function toast(m) { window.MHToast?.(m); }
/* lettere dell’universo attivo (fallback canone piatto pre-migrazione) */
function PL() { try { return window.P().letters; } catch { return window.MH.save.letters; } }
function badge(name) {
  const s = stats();
  s.badges = s.badges || [];
  if (s.badges.includes(name)) return false;
  s.badges.push(name); persist();
  try { document.getElementById('diary'); } catch {}
  toast(`🏅 Distintivo: ${name}! (vedi Diario)`);
  return true;
}
/* 1. Konami del tè: ↑↑↓↓ sulla mappa → +5 mosse 1 volta/giorno */
function initKonami() {
  let seq = [];
  addEventListener('keydown', (e) => {
    const map = document.getElementById('view-map');
    if (!map || !map.classList.contains('active')) { seq = []; return; }
    seq.push(e.key); seq = seq.slice(-4);
    if (seq.join(',') === 'ArrowUp,ArrowUp,ArrowDown,ArrowDown') {
      seq = [];
      const today = new Date().toISOString().slice(0, 10);
      const s = stats();
      if (s.konamiDate === today) { toast('Il tè arcobaleno riposa fino a domani 🌈'); return; }
      s.konamiDate = today;
      window.MH.save.bonusMoves = (window.MH.save.bonusMoves || 0) + 5;
      persist(); badge('Arcobaleno segreto 🌈');
      toast('🌈 Konami del tè! +5 mosse al prossimo livello!');
    }
  });
}
/* 2+8+9. Checks all'avvio: mezzanotte, compleanno locale, offline */
function initChecks() {
  const today = new Date().toISOString().slice(0, 10);
  const s = stats();
  if (!s.firstPlay) { s.firstPlay = today; persist(); }
  // mezzanotte 00-04: haiku di Hana
  const h = new Date().getHours();
  if (h < 4 && s.midnightDate !== today) {
    s.midnightDate = today; persist();
    const hk = HAIKU[[...today].reduce((a, c) => a + c.charCodeAt(0), 0) % HAIKU.length];
    const t = document.getElementById('oracle-title'), x = document.getElementById('oracle-text');
    if (t && x) {
      t.textContent = '🌙 Haiku di mezzanotte'; x.textContent = hk + '\n\n— Hana, per chi non dorme.';
      document.getElementById('oracle-modal').classList.add('open');
    }
  }
  // compleanno del locale (anniversario firstPlay)
  const mmdd = today.slice(5);
  if (s.firstPlay && s.firstPlay !== today && s.firstPlay.slice(5) === mmdd && s.bdayYear !== today.slice(0, 4)) {
    s.bdayYear = today.slice(0, 4);
    window.MH.save.bonusMoves = (window.MH.save.bonusMoves || 0) + 3;
    persist(); badge('Compleanno del locale 🎂');
    toast('🎂 Buon compleanno, chashitsu! Tutti cantano +3 mosse!');
  }
  // eremita offline
  try {
    if (navigator.onLine === false) badge('Eremita del tè 🌙');
  } catch {}
}
/* 3. Tap Hana: 7 tap sulla 7ª lettera → lettera segreta 26 */
function initHanaTap() {
  document.getElementById('diary')?.addEventListener('click', (e) => {
    const items = [...document.querySelectorAll('#diary .diary-item')];
    if (items.length < 7) return;
    if (items[6].contains(e.target) && !e.target.closest('button')) {
      const s = stats();
      s.hanaTaps = (s.hanaTaps || 0) + 1;
      if (s.hanaTaps >= 7 && !PL().some(l => l.startsWith('Lettera segreta'))) {
        PL().push('Lettera segreta — "Per quando dubiti: rileggi la prima. Eri già brava allora. H."');
        persist(); toast('💌 Lettera segreta 26 trovata! Hana ti aspettava.');
      } else if (s.hanaTaps < 7) {
        toast(`La 7ª lettera vibra… (${s.hanaTaps}/7) 💌`);
      }
      persist();
    }
  });
}
/* 4. Pioggia 100 tap totali */
function onRainTap() {
  const s = stats();
  s.rainTaps = (s.rainTaps || 0) + 1;
  if (s.rainTaps === 100) badge('Amico della pioggia 🌧️');
  persist();
}
/* 7. Kiku soccorre dopo 3 sconfitte sullo stesso livello */
function onLoss(id) {
  const s = stats();
  s.losses[id] = (s.losses[id] || 0) + 1;
  if (s.losses[id] === 3 && !s.kikuRescue[id]) {
    s.kikuRescue[id] = true;
    window.MH.save.bonusMoves = (window.MH.save.bonusMoves || 0) + 2;
    persist();
    setTimeout(() => toast('👵 Kiku appare: "Ti insegno io, testarda. +2 mosse, una volta sola."'), 1500);
  }
  persist();
}
/* 10. 25 S ai riti → Mugi dorato + frase Hana */
function onRite(grade) {
  if (grade !== 'S') return;
  const s = stats();
  s.riteS = (s.riteS || 0) + 1;
  if (s.riteS === 25 && !PL().some(l => l.startsWith('Parola segreta'))) {
    PL().push('Parola segreta di Hana — "Venticinque schiume perfette: ora puoi insegnare. Il cerchio è completo."');
    persist(); badge('Maestro di schiuma ✨');
  }
  persist();
}
/* Tick chiamato da hud(): Yuki art, nome Hana, decori Tama */
function tick() {
  try {
    // 6. striscia di 7 🌸 → disegno Yuki in home
    const log = (window.MH.save.mood.log || []).slice(-7);
    const art = document.getElementById('yuki-art');
    if (art) art.style.display = (log.length === 7 && log.every(m => m === 'bene')) ? 'block' : 'none';
    // 5. Tama chiamato Hana → Takeshi parla
    const s = stats();
    if (window.MH.save.tama?.name === 'Hana' && !s.hanaNameSeen) {
      s.hanaNameSeen = true; persist();
      setTimeout(() => toast('🌧️ Takeshi sussurra: "Hana… due volte nella stessa stanza. Che fortuna."'), 1200);
    }
    // decori Tama: ombrello pioggia + oro
    const face = document.getElementById('tama-face');
    if (face && (s.rainTaps || 0) >= 100 && !face.textContent.includes('☂️')) face.textContent += '☂️';
    const meta = document.getElementById('tama-meta');
    if (meta && (s.riteS || 0) >= 25 && !meta.textContent.includes('dorato')) meta.textContent += ' · Mugi dorato ✨';
  } catch {}
}
function init() { initKonami(); initChecks(); initHanaTap(); }
window.MHEggs = { init, tick, onRainTap, onLoss, onRite };
