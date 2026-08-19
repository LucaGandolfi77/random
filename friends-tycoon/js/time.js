/* TIME — calendario settimanale e fasce orarie. */
'use strict';

const DAYS = [
  { id:'lun', name:'LUNEDÌ', emoji:'🌅' },
  { id:'mar', name:'MARTEDÌ', emoji:'☀️' },
  { id:'mer', name:'MERCOLEDÌ', emoji:'🌤️' },
  { id:'gio', name:'GIOVEDÌ', emoji:'☀️' },
  { id:'ven', name:'VENERDÌ', emoji:'🎉' },
  { id:'sab', name:'SABATO', emoji:'🥳' },
  { id:'dom', name:'DOMENICA', emoji:'😴' }
];
const SLOTS = [
  { id:'mattina', name:'Mattina', emoji:'☀️' },
  { id:'pomeriggio', name:'Pomeriggio', emoji:'🌤️' },
  { id:'sera', name:'Sera', emoji:'🌆' },
  { id:'notte', name:'Notte', emoji:'🌙' }
];

function dayDef(i){ return DAYS[i % 7]; }
function slotDef(i){ return SLOTS[i % 4]; }
function isWeekday(){ return G.dayIndex < 5; }
function isWeekend(){ return !isWeekday(); }

function slotLabel(){ return (dayDef(G.dayIndex).emoji + ' ' + dayDef(G.dayIndex).name + ' · ' + slotDef(G.slotIndex).name); }

/* Un amico è disponibile in questo slot? Lun-Ven solo sera e notte. */
function friendAvailable(friend){
  const s = slotDef(G.slotIndex).id;
  if (isWeekday()) return (s === 'sera' || s === 'notte');
  return true;
}

/* Notte in settimana: lavoriamo domani, si va a letto presto (gli eventi duri 1-2 slot). */
function maxActivityDuration(){
  const s = slotDef(G.slotIndex).id;
  if (s === 'notte') return 2;
  if (s === 'pomeriggio') return 3;
  if (s === 'sera') return 4;
  return 4;
}

/* Avanza di uno slot. Al cambio giorno: stipendi, recupero, affitti, umori. */
function advanceTime(){
  G.slotIndex++;
  if (G.slotIndex > 3){
    G.slotIndex = 0;
    G.dayIndex++;
    if (G.dayIndex > 6){ G.dayIndex = 0; G.week++; }
    dailySettle();
  }
  G.lastSeen = Date.now();
  autosave();
  if (typeof UI !== 'undefined' && UI.refreshUI) UI.refreshUI();
}

function dailySettle(){
  if (isWeekday()){
    economy.paySalaries();
  }
  const recExtra = G.friends.reduce((s, f) => s + (hasPower(f, 'recover') ? (getCharacter(f.id).power.val || 0) : 0), 0);
  for (const f of G.friends){
    charRecoverEnergy(f, recExtra);
    charDriftMood(f);
  }
  for (const h of G.houses){
    const def = getHouse(h.id);
    if (def){
      const inc = Math.round(houseValue(h, def) * BALANCE.passivePerHouse);
      if (inc > 0){
        G.money += inc;
        toast(`🏡 Affitto dalla ${def.name}: +€${inc}`);
      }
    }
  }
  tickFriendships();
  checkMissions();
  autosave();
}

function charRecoverEnergy(f, extra){
  let rec = 30 + (extra || 0);
  if (hasSkill(f, 'divanologo')) rec += 20;
  if (hasSkill(f, 'non_dorme_mai')) rec += 10;
  f.energy = clamp(f.energy + rec, 0, 100);
}

function charDriftMood(f){
  if (f.energy < 25) setMood(f, 'stanco');
  else if (f.energy >= 80 && f.mood === 'stanco') setMood(f, 'normale');
}

function setMood(f, mood){
  if (f.mood !== mood){
    f.mood = mood;
    if (mood === 'nervoso' || mood === 'fuori_controllo'){
      toast(`😡 ${getCharacter(f.id).name} è ${mood === 'nervoso' ? 'NERVOSO' : 'FUORI CONTROLLO'}!`);
    }
  }
}

function tickFriendships(){
  for (const f of G.friends){
    for (const id in f.rels){
      if (f.energy < 20) f.rels[id] = clamp(f.rels[id] - 1, 0, 100);
    }
  }
}

function canFitActivity(activity, participants){
  const n = participants.length;
  if (activity.min && n < activity.min) return false;
  if (activity.travel){
    return n <= totalSeats() + (n > 0 ? 0 : 0);
  }
  const hEntry = G.houses[G.mainHouse];
  const hDef = currentHouse();
  if (activity.home && hDef && n > houseCapacity(hEntry, hDef)) return false;
  return true;
}