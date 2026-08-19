/* STATE — stato globale G, lookups, RNG, newGame(). */
'use strict';

function $id(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmt(n){ return Number(n||0).toLocaleString('it-IT'); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function rnd(){ return G.rng ? G.rng() : Math.random(); }
function chance(p){ return rnd() < p; }
function pick(arr){ return arr[Math.floor(rnd()*arr.length)]; }

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const G = {
  version: 1,
  money: 0, happy: 0, rep: 0,
  dayIndex: 0, slotIndex: 2,   // inizio: LUN sera
  week: 1,
  friends: [],          // istanze personaggio
  houses: [],           // [{id, ownedRooms:{roomId:level}, since}]
  mainHouse: 0,         // indice in houses
  vehicles: [],         // [vehicleId]
  missions: [],         // missioni completate
  stats: { activities:0, festa6:0, mare:0, events:0, moneyEarned:0, invites:0 },
  lastSeen: null,       // timestamp per idle
  rng: null,
  toast: null
};

/* ---- lookup ---- */
function getCharacter(id){ return CHARACTERS.find(c => c.id === id) || null; }
function getFriend(id){ return G.friends.find(f => f.id === id) || null; }
function getHouse(id){ return HOUSES.find(h => h.id === id) || null; }
function getVehicle(id){ return VEHICLES.find(v => v.id === id) || null; }
function getActivity(id){ return ACTIVITIES.find(a => a.id === id) || null; }
function getEvent(id){ return RANDOM_EVENTS.find(e => e.id === id) || null; }
function getMission(id){ return MISSIONS.find(m => m.id === id) || null; }
function getUpgrade(roomId){ return UPGRADES[roomId] || null; }
function getSkill(id){ return SKILLS[id] || null; }

/* ---- istanze personaggio ---- */
function makeFriend(base){
  return {
    id: base.id,
    xp: 0, level: 1,
    energy: 100,
    mood: 'normale',
    rels: {},           // {otherId: 0..100}
    alive: true
  };
}

function currentHouse(){
  if (!G.houses.length) return null;
  return getHouse(G.houses[G.mainHouse].id);
}

function ownedRoom(houseEntry, roomId){
  return (houseEntry && houseEntry.ownedRooms && houseEntry.ownedRooms[roomId]) || 0;
}

function houseCapacity(houseEntry, houseDef){
  let cap = houseDef.capacity;
  for (const roomId in (houseEntry.ownedRooms||{})){
    const lv = houseEntry.ownedRooms[roomId];
    const def = getUpgrade(roomId);
    if (def && def.levels[lv]) cap += def.levels[lv].capacity||0;
  }
  return cap;
}

function houseComfort(houseEntry, houseDef){
  let cf = houseDef.comfort;
  for (const roomId in (houseEntry.ownedRooms||{})){
    const lv = houseEntry.ownedRooms[roomId];
    const def = getUpgrade(roomId);
    if (def && def.levels[lv]) cf += def.levels[lv].comfort||0;
  }
  return cf;
}

function houseParking(houseEntry, houseDef){
  let p = houseDef.parking||0;
  for (const roomId in (houseEntry.ownedRooms||{})){
    const lv = houseEntry.ownedRooms[roomId];
    const def = getUpgrade(roomId);
    if (def && def.levels[lv]) p += def.levels[lv].parking||0;
  }
  return p;
}

function houseValue(houseEntry, houseDef){
  let v = houseDef.value;
  for (const roomId in (houseEntry.ownedRooms||{})){
    const lv = houseEntry.ownedRooms[roomId];
    const def = getUpgrade(roomId);
    if (def && def.levels[lv]) v += def.levels[lv].value||0;
  }
  return v;
}

function ownedVehicles(){ return G.vehicles.map(getVehicle).filter(Boolean); }
function totalSeats(){
  let s = 0;
  for (const f of G.friends) if (hasSkill(f, 'macchina_piena')) s += 1;
  for (const v of ownedVehicles()) s += v.seats;
  return s;
}
function hasSkill(friend, skillId){
  const base = getCharacter(friend.id);
  return base && base.skills && base.skills.indexOf(skillId) !== -1;
}

/* ---- poteri speciali dei personaggi ---- */
function hasPower(friend, type){
  const base = getCharacter(friend.id);
  return base && base.power && base.power.type === type;
}
function powerVal(participants, type){
  let v = 0;
  for (const p of participants) if (hasPower(p, type)) v += (getCharacter(p.id).power.val || 0);
  return v;
}

function skillBonusCount(skillId, participants){
  return participants.filter(p => hasSkill(p, skillId)).length;
}

/* ---- nuova partita ---- */
function newGame(seed){
  G.money = BALANCE.startMoney;
  G.happy = 0; G.rep = 0;
  G.dayIndex = 0; G.slotIndex = 2; G.week = 1;
  G.friends = [];
  G.houses = [{ id: BALANCE.startHouse, ownedRooms: { divano:0, cucina:0, tv:0, bagno:0 }, since: 0 }];
  G.mainHouse = 0;
  G.vehicles = BALANCE.startCars.slice();
  G.missions = [];
  G.stats = { activities:0, festa6:0, mare:0, events:0, moneyEarned:0, invites:0 };
  G.lastSeen = Date.now();
  G.rng = seed != null ? mulberry32(seed) : null;

  for (const id of BALANCE.startFriends){
    G.friends.push(makeFriend(getCharacter(id)));
  }
  linkFriendships();
}

/* ---- sblocco progressivo dei personaggi ---- */
function unlockMet(cond){
  const m = /^([a-z]+)(>=|<=|>|<)(\d+)$/.exec(cond || '');
  if (!m) return false;
  const vals = { rep:G.rep, week:G.week, houses:G.houses.length, cars:G.vehicles.length, money:G.money };
  const v = vals[m[1]]; if (v == null) return false;
  const n = parseInt(m[3], 10);
  switch (m[2]){ case '>=': return v >= n; case '<=': return v <= n; case '>': return v > n; case '<': return v < n; }
  return false;
}

function isUnlocked(id){
  if (BALANCE.startFriends.indexOf(id) !== -1) return true;
  return (BALANCE.recruitTiers || []).some(t => t.ids.indexOf(id) !== -1 && unlockMet(t.cond));
}

function unlockedChars(){
  const out = BALANCE.startFriends.slice();
  for (const t of (BALANCE.recruitTiers || [])) if (unlockMet(t.cond)) for (const id of t.ids) out.push(id);
  return out;
}

function recruitPool(){
  return unlockedChars().filter(id => !getFriend(id));
}

function linkFriendships(){
  for (let i = 0; i < G.friends.length; i++){
    for (let j = 0; j < G.friends.length; j++){
      if (i === j) continue;
      const a = G.friends[i], b = G.friends[j];
      if (a.rels[b.id] == null) a.rels[b.id] = 30;
    }
  }
}

/* ---- missioni ---- */
function checkMissions(){
  let done = false;
  for (const m of MISSIONS){
    if (G.missions.indexOf(m.id) !== -1) continue;
    if (m.check(G)){
      G.missions.push(m.id);
      G.money += m.reward.money || 0;
      G.rep += m.reward.rep || 0;
      G.happy += m.reward.xp || 0;
      done = true;
      if (typeof toast === 'function') toast(`🏆 Missione: "${m.title}" completata! +€${m.reward.money}`);
      if (typeof audio !== 'undefined' && audio.fanfare) audio.fanfare();
    }
  }
  if (done) autosave();
}