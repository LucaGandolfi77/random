/* CHARACTERS — livello/XP, umore, relazioni. Logica su dati da data/characters.js. */
'use strict';

function levelFromXp(xp){
  const L = BALANCE.levels;
  let lv = 1;
  for (let i = 0; i < L.length; i++) if (xp >= L[i]) lv = i + 1;
  return lv;
}

function gainXp(f, amt){
  f.xp += Math.max(1, Math.round(amt));
  const nl = levelFromXp(f.xp);
  if (nl > f.level){
    f.level = nl;
    toast(`🎉 ${getCharacter(f.id).name} sale di livello! (lv ${nl})`);
    audio.success();
  }
}

function charStats(f){
  return getCharacter(f.id).stats || { social:50, cooking:50, driving:50, energy:50, luck:50 };
}

function moodOf(f){
  if (f.energy < 12) return 'fuori_controllo';
  if (f.energy < 28) return 'nervoso';
  if (f.energy < 45) return 'stanco';
  if (f.energy > 85) return 'felicissimo';
  if (f.energy > 70) return 'felice';
  return 'normale';
}

function recomputeMood(f){
  f.mood = moodOf(f);
}

const MOOD_EMOJI = {
  felicissimo: '😀', felice: '🙂', normale: '😐', stanco: '😴', nervoso: '😡', fuori_controllo: '🤯'
};
const MOOD_LABEL = {
  felicissimo: 'FELICISSIMO', felice: 'Felice', normale: 'Normale', stanco: 'Stanco', nervoso: 'Nervoso', fuori_controllo: 'FUORI CONTROLLO'
};

function friendshipValue(a, b){
  if (a.id === b.id) return 100;
  return (a.rels && a.rels[b.id] != null) ? a.rels[b.id] : 30;
}

function gainFriendship(a, b, amt){
  if (a.id === b.id) return;
  a.rels[b.id] = clamp((a.rels[b.id] || 30) + amt, 0, 100);
  b.rels[a.id] = clamp((b.rels[a.id] || 30) + amt, 0, 100);
}

function bestFriends(f){
  return Object.keys(f.rels || {})
    .map(id => ({ id, v: f.rels[id] }))
    .sort((x, y) => y.v - x.v)
    .slice(0, 2);
}