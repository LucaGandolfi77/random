/* STATE — stato globale, lookup, RNG, newGame. */
'use strict';

const G = {
  version: 1,
  money: 0,
  dobloni: 0,
  buildings: {},
  walls: 0,
  prod: {},
  army: {},
  builders: 1,
  cooldowns: {},
  stats: { battles:0, wins:0, threeStars:0, minigames:0, wordsKilled:0 },
  log: [],
  lastSeen: 0,
  rng: null,
  toast: null
};

/* ---- helper generici ---- */
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmt(n){ return Number(n||0).toLocaleString('it-IT'); }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function chance(p){ return rnd() < p; }
function rnd(){ return G.rng ? G.rng() : Math.random(); }
function $id(id){ return document.getElementById(id); }
function pick(arr){ return arr[Math.floor(rnd() * arr.length)]; }

/* ---- lookup dati ---- */
function getBuilding(id){ return BUILDINGS.find(b => b.id === id); }
function getWord(id){ return WORDS.find(w => w.id === id); }
function getRival(id){ return RIVALS.find(r => r.id === id); }
function getMinigame(id){ return MINIGAMES.find(m => m.id === id); }

/* ---- stato edifici ---- */
function buildingState(id){ return G.buildings[id]; }
function buildingLevel(id){ const b = G.buildings[id]; return b ? b.level : 0; }
function hasBuilding(id){ return buildingLevel(id) >= 1; }
function catalogoLevel(){ return buildingLevel('catalogo'); }
function maxLevelFor(id){ if (id === 'catalogo') return 5; return Math.min(5, catalogoLevel()); }
function isUnlocked(id){ const d = getBuilding(id); return catalogoLevel() >= d.unlock; }
function buildingBusy(id){ const b = G.buildings[id]; return b && b.state !== 0; }
function buildersBusy(){ return Object.keys(G.buildings).filter(id => buildingBusy(id)).length; }
function buildersFree(){ return Math.max(0, G.builders - buildersBusy()); }
function isFullLevel(id){ return buildingLevel(id) >= maxLevelFor(id); }

/* ---- capienza ---- */
function storageCap(){
  const cass = getBuilding('cassaforte');
  const lv = buildingLevel('cassaforte');
  const cap = lv >= 1 && cass ? cass.cap[lv - 1] : 0;
  return BALANCE.baseStorage + cap;
}
function dobloniCap(){
  const scr = getBuilding('scrigno');
  const lv = buildingLevel('scrigno');
  const cap = lv >= 1 && scr ? scr.cap[lv - 1] : 0;
  return BALANCE.baseDobloniStorage + cap;
}
function wallMax(){
  return BALANCE.wallBaseCount + BALANCE.wallPerLevel * Math.max(0, catalogoLevel() - 1);
}

/* ---- nuova partita ---- */
function newGame(seed){
  if (seed !== undefined) G.rng = (() => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  else G.rng = null;
  G.money = BALANCE.startMoney;
  G.dobloni = BALANCE.startDobloni;
  G.buildings = {};
  G.prod = {};
  G.army = {};
  G.builders = BALANCE.buildersStart;
  G.cooldowns = {};
  G.stats = { battles:0, wins:0, threeStars:0, minigames:0, wordsKilled:0 };
  G.log = [];
  G.lastSeen = Date.now();
  for (const id of ['catalogo','banco_prestito','cassaforte','quaderno','muro']){
    G.buildings[id] = { level:1, state:0, doneAt:0 };
    G.prod[id] = Date.now();
  }
  G.walls = BALANCE.wallStart;
  return G;
}