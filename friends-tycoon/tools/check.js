/* CHECK — valida sintassi di tutti i file + schema dei dati data-driven. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const FILES = [
  'data/balance.js','data/characters.js','data/houses.js','data/vehicles.js',
  'data/activities.js','data/minigames.js','data/randomevents.js','data/missions.js','data/scenes.js',
  'js/state.js','js/time.js','js/audio.js','js/save.js','js/idle.js',
  'js/characters.js','js/economy.js','js/sim.js','js/minigame.js','js/render3d.js','js/charscene.js','js/ui.js','js/main.js'
];

function makeEl(){
  return {
    textContent:'', innerHTML:'', className:'', style:{}, scrollTop:0, dataset:{},
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(){}, querySelectorAll(){ return []; },
    querySelector(){ return makeEl(); }, appendChild(){}, remove(){}
  };
}

const els = new Map();
const sandbox = {
  console,
  window: { addEventListener(){} },
  document: {
    getElementById(id){ if (!els.has(id)) els.set(id, makeEl()); return els.get(id); },
    createElement(){ return makeEl(); },
    querySelectorAll(){ return []; }
  },
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} }
};
vm.createContext(sandbox);

const problems = [];
for (const f of FILES){
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  try{
    vm.runInContext(code, sandbox, { filename: f });
  }catch(e){
    problems.push(`${f}: errore di caricamento: ${e.message}`);
  }
}

if (problems.length){
  console.log('KO:\n' + problems.join('\n'));
  process.exit(1);
}

const vcode = `
const P = [];
const uniq = (arr, field, label) => {
  const seen = new Set();
  for (const x of arr){
    if (seen.has(x[field])) P.push(label + ': id duplicato ' + JSON.stringify(x[field]));
    seen.add(x[field]);
  }
};
const num = (v, label) => typeof v === 'number' && !isNaN(v);
const in01 = (v, label) => num(v, label) && v >= 0 && v <= 100;

uniq(CHARACTERS, 'id', 'CHARACTERS');
for (const c of CHARACTERS){
  for (const k of ['id','name','age','emoji','color','job','blurb','stats','skills','traits','preferences','dislikes']){
    if (c[k] === undefined) P.push('CHARACTERS.' + c.id + ': manca ' + k);
  }
  for (const k of ['social','cooking','driving','energy','luck']){
    if (!in01(c.stats && c.stats[k], k)) P.push('CHARACTERS.' + c.id + '.stats.' + k + ' non valido (0-100)');
  }
  for (const s of (c.skills||[])){
    if (!SKILLS[s]) P.push('CHARACTERS.' + c.id + ': skill sconosciuta ' + JSON.stringify(s));
  }
  if (!BALANCE.salaryBase[c.job]) P.push('CHARACTERS.' + c.id + ': lavoro ' + JSON.stringify(c.job) + ' non in balance.salaryBase');
  if (c.power){
    for (const k of ['name','desc','type','val']){
      if (c.power[k] === undefined) P.push('CHARACTERS.' + c.id + '.power: manca ' + k);
    }
    if (['happy','rep','money','energy','travel','travelHappy','foodHappy','friendship','recover','income','luckShield'].indexOf(c.power.type) === -1) P.push('CHARACTERS.' + c.id + '.power: tipo sconosciuto ' + JSON.stringify(c.power.type));
    if (!num(c.power.val)) P.push('CHARACTERS.' + c.id + '.power: val non numerico');
  }
}
for (const s in SKILLS){
  const sk = SKILLS[s];
  if (!sk.name || !sk.desc || (sk.sign !== 1 && sk.sign !== -1)) P.push('SKILLS.' + s + ': campi mancanti (name/desc/sign)');
}

/* ---- sblocco progressivo ---- */
const UNLOCK_KEYS = ['rep','week','houses','cars','money'];
if (!Array.isArray(BALANCE.startFriends) || !BALANCE.startFriends.length) P.push('BALANCE.startFriends: manca');
const coveredIds = new Set();
for (const id of (BALANCE.startFriends || [])){
  if (!CHARACTERS.find(c => c.id === id)) P.push('BALANCE.startFriends: id sconosciuto ' + JSON.stringify(id));
  if (coveredIds.has(id)) P.push('BALANCE.startFriends: id duplicato ' + JSON.stringify(id));
  coveredIds.add(id);
}
if (!Array.isArray(BALANCE.recruitTiers) || !BALANCE.recruitTiers.length) P.push('BALANCE.recruitTiers: manca');
for (const t of (BALANCE.recruitTiers || [])){
  const m = /^([a-z]+)(>=|<=|>|<)(\\d+)$/.exec(t.cond || '');
  if (!m) P.push('BALANCE.recruitTiers: cond non valida ' + JSON.stringify(t.cond));
  else if (UNLOCK_KEYS.indexOf(m[1]) === -1) P.push('BALANCE.recruitTiers: chiave sconosciuta ' + JSON.stringify(m[1]));
  if (!t.label) P.push('BALANCE.recruitTiers: manca label');
  for (const id of (t.ids || [])){
    if (!CHARACTERS.find(c => c.id === id)) P.push('BALANCE.recruitTiers: id sconosciuto ' + JSON.stringify(id));
    if (coveredIds.has(id)) P.push('BALANCE.recruitTiers: id duplicato ' + JSON.stringify(id));
    coveredIds.add(id);
  }
}
for (const c of CHARACTERS){
  if (!coveredIds.has(c.id)) P.push('CHARACTERS.' + c.id + ': non assegnato a startFriends né a recruitTiers');
}

uniq(HOUSES, 'id', 'HOUSES');
for (const h of HOUSES){
  for (const k of ['id','name','emoji','price','capacity','rooms','comfort','value','parking','desc','allowed','rooms']){
    if (h[k] === undefined) P.push('HOUSES.' + h.id + ': manca ' + k);
  }
  if (!num(h.price) || h.price < 0) P.push('HOUSES.' + h.id + ': prezzo non valido');
  if (!num(h.capacity) || h.capacity < 1) P.push('HOUSES.' + h.id + ': capienza non valida');
  for (const roomId in h.rooms){
    if (!UPGRADES[roomId]) P.push('HOUSES.' + h.id + ': stanza sconosciuta ' + JSON.stringify(roomId));
  }
  for (const a of (h.allowed||[])){
    if (!ACTIVITIES.find(x => x.id === a)) P.push('HOUSES.' + h.id + ': attività consentita sconosciuta ' + JSON.stringify(a));
  }
}
for (const up in UPGRADES){
  const u = UPGRADES[up];
  if (!u.name || !u.levels || !u.levels.length) P.push('UPGRADES.' + up + ': invalida');
  let prev = -1;
  for (let i = 0; i < u.levels.length; i++){
    const lv = u.levels[i];
    if (!num(lv.cost) || lv.cost < prev) P.push('UPGRADES.' + up + ' lv' + i + ': costo non crescente');
    prev = lv.cost;
    if (!lv.label) P.push('UPGRADES.' + up + ' lv' + i + ': manca label');
  }
  if (u.levels[0].cost !== 0) P.push('UPGRADES.' + up + ': il livello 1 deve costare 0');
}

uniq(VEHICLES, 'id', 'VEHICLES');
for (const v of VEHICLES){
  for (const k of ['id','name','emoji','price','seats','speed','comfort','reliability','style','trunk','desc']){
    if (v[k] === undefined) P.push('VEHICLES.' + v.id + ': manca ' + k);
  }
  if (!num(v.seats) || v.seats < 1) P.push('VEHICLES.' + v.id + ': posti non validi');
}

uniq(ACTIVITIES, 'id', 'ACTIVITIES');
for (const a of ACTIVITIES){
  for (const k of ['id','name','icon','category','cost','duration','min','max','energyCost','output','pool','desc']){
    if (a[k] === undefined) P.push('ACTIVITIES.' + a.id + ': manca ' + k);
  }
  if (!num(a.cost) || a.cost <= 0) P.push('ACTIVITIES.' + a.id + ': costo non valido');
  if (!num(a.min) || a.min < 1) P.push('ACTIVITIES.' + a.id + ': min non valido');
  if (!num(a.duration) || a.duration < 1) P.push('ACTIVITIES.' + a.id + ': durata non valida');
  for (const k of ['money','happy','rep']){
    if (!num(a.output[k], k)) P.push('ACTIVITIES.' + a.id + ': output.' + k + ' non valido');
  }
  for (const e of (a.pool||[])){
    if (!RANDOM_EVENTS.find(x => x.id === e)) P.push('ACTIVITIES.' + a.id + ': evento sconosciuto ' + JSON.stringify(e));
  }
  if (a.requiresRoom && !UPGRADES[a.requiresRoom]) P.push('ACTIVITIES.' + a.id + ': stanza richiesta sconosciuta');
  for (const s of (a.requiresSkill||[])){
    if (!SKILLS[s]) P.push('ACTIVITIES.' + a.id + ': skill richiesta sconosciuta ' + JSON.stringify(s));
  }
}

uniq(RANDOM_EVENTS, 'id', 'RANDOM_EVENTS');
for (const e of RANDOM_EVENTS){
  for (const k of ['id','emoji','title','text','type','effects','weight']){
    if (e[k] === undefined) P.push('RANDOM_EVENTS.' + e.id + ': manca ' + k);
  }
  if (['good','bad','neutral','chaos'].indexOf(e.type) === -1) P.push('RANDOM_EVENTS.' + e.id + ': tipo non valido');
  if (!num(e.weight) || e.weight < 0) P.push('RANDOM_EVENTS.' + e.id + ': peso non valido');
  if (e.find && !SKILLS[e.find]) P.push('RANDOM_EVENTS.' + e.id + ': skill di salvataggio sconosciuta');
}

uniq(MISSIONS, 'id', 'MISSIONS');
for (const m of MISSIONS){
  for (const k of ['id','title','text','check','reward']){
    if (m[k] === undefined) P.push('MISSIONS.' + m.id + ': manca ' + k);
  }
  if (typeof m.check !== 'function') P.push('MISSIONS.' + m.id + ': check non è una funzione');
  if (!num(m.reward.money)) P.push('MISSIONS.' + m.id + ': reward.money non valido');
}

/* ---- MINIGIOCHI ---- */
const MGTYPES = ['dice','catch','double','scratch','sequence'];
for (const a of ACTIVITIES){
  if (!MINIGAMES[a.id]) P.push('ACTIVITIES.' + a.id + ': manca il minigioco in MINIGAMES');
}
for (const id in MINIGAMES){
  const m = MINIGAMES[id];
  if (!ACTIVITIES.find(x => x.id === id)) P.push('MINIGAMES.' + id + ': attività sconosciuta');
  if (MGTYPES.indexOf(m.type) === -1) P.push('MINIGAMES.' + id + ': tipo sconosciuto ' + JSON.stringify(m.type));
  for (const k of ['name','emoji','blurb']){
    if (m[k] === undefined) P.push('MINIGAMES.' + id + ': manca ' + k);
  }
  const tiersOk = (list) => {
    if (!Array.isArray(list) || !list.length) return false;
    let prev = Infinity;
    for (const t of list){
      if (!num(t.at) || !t.label || !num(t.mul) || t.mul <= 0) return false;
      if (t.at >= prev) return false;
      prev = t.at;
    }
    return list[list.length - 1].at === 0;
  };
  if (m.type === 'dice'){
    if (!num(m.dice) || m.dice < 1) P.push('MINIGAMES.' + id + ': dice non valido');
    if (!num(m.sides) || m.sides < 2) P.push('MINIGAMES.' + id + ': sides non valido');
    if (!tiersOk(m.tiers)) P.push('MINIGAMES.' + id + ': tier non validi (decrescenti, ultimo a 0)');
  }
  if (m.type === 'catch'){
    if (!num(m.target) || m.target < 0 || m.target > 100) P.push('MINIGAMES.' + id + ': target non valido (0-100)');
    if (!tiersOk(m.tiers)) P.push('MINIGAMES.' + id + ': tier non validi');
  }
  if (m.type === 'double'){
    if (!num(m.stake) || m.stake <= 0) P.push('MINIGAMES.' + id + ': stake non valido');
    if (!num(m.winOdds) || m.winOdds <= 0 || m.winOdds >= 1) P.push('MINIGAMES.' + id + ': winOdds non valido (0-1)');
  }
  if (m.type === 'scratch'){
    if (!num(m.stake) || m.stake < 0) P.push('MINIGAMES.' + id + ': stake non valido');
    if (!num(m.prize) || m.prize < 0) P.push('MINIGAMES.' + id + ': prize non valido');
    if (!Array.isArray(m.symbols) || m.symbols.length < 2) P.push('MINIGAMES.' + id + ': symbols non validi');
  }
  if (m.type === 'sequence'){
    if (!Array.isArray(m.items) || m.items.length < 1) P.push('MINIGAMES.' + id + ': items non validi');
    if (!num(m.length) || m.length < 1 || m.length > (m.items || []).length) P.push('MINIGAMES.' + id + ': length non valido');
  }
}

/* ---- SCENES 3D ---- */
const KNOWN_ZONES = ['living','cucina','tavolo','centro','discoteca','giardino','piscina','porta'];
const KNOWN_ANIMS = ['sit','cook','eat','party','dance','swim','leave'];
for (const h of HOUSES){
  if (!SCENES[h.id]) P.push('HOUSES.' + h.id + ': manca la scena 3D in SCENES');
  else{
    const s = SCENES[h.id];
    if (!num(s.floorW) || s.floorW <= 0) P.push('SCENES.' + h.id + ': floorW non valido');
    if (!num(s.floorD) || s.floorD <= 0) P.push('SCENES.' + h.id + ': floorD non valido');
    if (!Array.isArray(s.furniture) || !s.furniture.length) P.push('SCENES.' + h.id + ': mobili mancanti');
    for (const f of (s.furniture||[])){
      for (const k of ['type','x','z']){
        if (f[k] === undefined) P.push('SCENES.' + h.id + ': mobile senza ' + k);
      }
      if (['sedia','lampada'].indexOf(f.type) === -1){
        for (const k of ['w','d']){
          if (f[k] === undefined) P.push('SCENES.' + h.id + ': mobile senza ' + k);
        }
      }
    }
    if (!s.zones) P.push('SCENES.' + h.id + ': mancano le zone');
    else{
      for (const z of ['living','cucina','centro','porta']){
        if (!s.zones[z]) P.push('SCENES.' + h.id + ': manca la zona ' + z);
        else if (!num(s.zones[z].x) || !num(s.zones[z].z)) P.push('SCENES.' + h.id + '.zones.' + z + ': coordinate non valide');
      }
    }
  }
}
for (const a in ACTIVITY_ZONE){
  if (!ACTIVITIES.find(x => x.id === a)) P.push('ACTIVITY_ZONE: attività sconosciuta ' + JSON.stringify(a));
  const v = ACTIVITY_ZONE[a];
  if (!Array.isArray(v) || KNOWN_ZONES.indexOf(v[0]) === -1) P.push('ACTIVITY_ZONE.' + a + ': zona non valida ' + JSON.stringify(v));
  if (KNOWN_ANIMS.indexOf(v[1]) === -1) P.push('ACTIVITY_ZONE.' + a + ': animazione non valida ' + JSON.stringify(v[1]));
}

__problems = P;
__counts = { characters: CHARACTERS.length, houses: HOUSES.length, vehicles: VEHICLES.length, activities: ACTIVITIES.length, events: RANDOM_EVENTS.length, missions: MISSIONS.length };
`;
vm.runInContext(vcode, sandbox, { filename: 'check-data' });
const P = sandbox.__problems || [];
const C = sandbox.__counts || {};
if (P.length){
  console.log('KO — problemi nei dati:\n' + P.join('\n'));
  process.exit(1);
}
console.log(`OK: ${FILES.length} file caricati senza errori, dati validi (${C.characters} personaggi, ${C.houses} case, ${C.vehicles} auto, ${C.activities} attività, ${C.events} eventi, ${C.missions} missioni).`);