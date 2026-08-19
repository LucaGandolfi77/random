/* SMOKE — simula una partita completa in Node (stub DOM/Audio/localStorage). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ORDER = [
  'data/balance.js','data/characters.js','data/houses.js','data/vehicles.js',
  'data/activities.js','data/minigames.js','data/randomevents.js','data/missions.js','data/scenes.js',
  'js/state.js','js/time.js','js/audio.js','js/save.js','js/idle.js',
  'js/characters.js','js/economy.js','js/sim.js','js/minigame.js','js/render3d.js','js/charscene.js','js/ui.js','js/main.js'
];

function ctxStub(){
  return new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (() => {}) : t[k]), set: () => true });
}

function makeEl(){
  return {
    textContent:'', innerHTML:'', className:'', style:{}, scrollTop:0, dataset:{},
    clientWidth: 0,
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(){}, querySelectorAll(){ return []; },
    querySelector(){ return makeEl(); }, appendChild(){}, remove(){},
    getContext(){ return ctxStub(); }
  };
}

const els = new Map();
const store = {};
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  window: { addEventListener(){}, AudioContext: undefined },
  document: {
    getElementById(id){ if (!els.has(id)) els.set(id, makeEl()); return els.get(id); },
    createElement(){ return makeEl(); },
    querySelectorAll(){ return []; }
  },
  localStorage: {
    getItem(k){ return store[k] !== undefined ? store[k] : null; },
    setItem(k, v){ store[k] = String(v); },
    removeItem(k){ delete store[k]; }
  }
};
vm.createContext(sandbox);

let failed = 0;
function check(cond, label){
  if (cond) console.log('  ✓ ' + label);
  else { console.log('  ✗ ' + label); failed++; }
}

try{
  for (const f of ORDER){
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
  }
  console.log('OK: tutti i file caricati senza errori top-level.');
}catch(e){
  console.log('KO al caricamento: ' + e.stack);
  process.exit(1);
}

const scenario = `
function scenario(){
  const lines = [];
  const ok = (cond, label) => lines.push((cond ? 'PASS ' : 'FAIL ') + label);

  /* --- nuova partita --- */
  newGame(1234);
  ok(G.money === 1000, 'capitale iniziale €1000');
  ok(G.friends.length === BALANCE.startFriends.length, 'si parte con il gruppo iniziale (' + BALANCE.startFriends.length + ' amici)');
  ok(G.friends.every(f => BALANCE.startFriends.indexOf(f.id) !== -1), 'solo gli amici di partenza sono nel gruppo');
  ok(currentHouse().id === 'stanza_studenti', 'prima casa: Stanza Studenti');
  ok(G.vehicles.length === 1 && G.vehicles[0] === 'macchina_scassata', 'prima auto: La Scassata');

  /* --- calendario: LUN sera, disponibili --- */
  ok(G.dayIndex === 0 && G.slotIndex === 2, 'inizio: LUN sera');
  ok(friendAvailable(G.friends[0]), 'amici disponibili di sera in settimana');
  G.slotIndex = 0; // lun mattina
  ok(!friendAvailable(G.friends[0]), 'in settimana di mattina si lavora');
  G.slotIndex = 2;

  /* --- prima serata --- */
  let res = sim.run('serata_tranquilla', [G.friends[0].id, G.friends[1].id]);
  ok(res.ok === true, 'serata tranquilla organizzabile');
  ok(res.happy > 0, 'genera felicità (+' + res.happy + ')');
  ok(G.money === 1000 - res.cost + 150, 'costo detratto e missione "prima serata" premiata (+€150)');

  /* --- validazioni --- */
  res = sim.run('serata_tranquilla', [G.friends[0].id]);
  ok(res.ok === false, 'serve almeno il minimo di partecipanti');
  const savedMoney = G.money;
  G.money = 0;
  res = sim.run('pizza', [G.friends[0].id, G.friends[1].id]);
  ok(res.ok === false && /Servono/.test(res.reason), 'senza soldi non si fa la pizza');
  G.money = savedMoney;

  /* --- evento casuale forzato --- */
  const prevRng = G.rng;
  G.rng = () => 0;   // rnd()=0 → chance sempre vera
  res = sim.run('serata_tranquilla', [G.friends[0].id, G.friends[2].id]);   // senza Armandino (il suo scudo cancellerebbe l'evento)
  ok(res.ok && res.event != null, 'evento casuale innescato (' + res.event.title + ')');
  G.rng = prevRng;

  /* --- auto e viaggi --- */
  G.money = 10000;
  let r = economy.buyVehicle('city_car');
  ok(r.ok === true && G.vehicles.length === 2, 'acquistata City Car');
  ok(economy.buyVehicle('city_car').ok === false, 'non si ricompra la stessa auto');

  /* --- sblocco e reclutamento --- */
  ok(recruitPool().length === 0, "nessuno sbloccato all'inizio (serve reputazione)");
  G.money = 100000;
  ok(economy.inviteFriend('tubo').ok === false, 'non si recluta un personaggio non ancora sbloccato');
  let recruited = 0;
  G.rep = 500;   // sblocca i tier basati sulla reputazione
  G.houses.push({ id:'casa', ownedRooms:{}, since:1 });   // sblocca il tier "houses>=2"
  checkMissions();
  const pool = recruitPool();
  ok(pool.length === CHARACTERS.length - BALANCE.startFriends.length, 'tutti gli altri sbloccati con rep 500 (' + pool.length + ')');
  for (const id of pool){
    const r = economy.inviteFriend(id);
    if (r.ok) recruited++;
  }
  ok(recruited === pool.length, 'reclutati tutti gli amici sbloccati (' + recruited + ')');
  ok(economy.inviteFriend('dario').ok === false, 'non si recluta un amico già presente');
  const all = G.friends.map(f => f.id);

  /* --- skill: chef sulla grigliata (Tubo reclutato) --- */
  const chefFriend = G.friends.find(f => hasSkill(f, 'chef'));
  ok(chefFriend != null && hasSkill(chefFriend, 'chef'), chefFriend ? chefFriend.id + ' è Chef' : 'cè uno Chef nel gruppo');
  const costWith = economy.activityCost(getActivity('grigliata'), G.friends).cost;
  ok(costWith < getActivity('grigliata').cost, 'lo Chef sconta la grigliata');

  /* --- poteri speciali --- */
  const lucaF = G.friends.find(f => f.id === 'luca');
  ok(lucaF && hasPower(lucaF, 'travel'), 'Luca ha il Passaporto (potere viaggi)');
  const base4 = G.friends.slice(0, 4).map(f => f.id);
  const noTravel = economy.activityCost(getActivity('mare'), base4.map(getFriend)).cost;
  const withLuca = economy.activityCost(getActivity('mare'), [lucaF]).cost;
  ok(withLuca < noTravel, 'il Passaporto di Luca sconta i viaggi (' + withLuca + ' < ' + noTravel + ')');
  const gandoF = G.friends.find(f => f.id === 'gando');
  ok(gandoF && hasPower(gandoF, 'income'), 'Gando ha il Sistema (reddito passivo)');
  const beforePay = G.money;
  economy.paySalaries();
  ok(G.money >= beforePay + 40, 'il Sistema Gando frutta €40 a settimana');

  /* --- minigiochi --- */
  ok(ACTIVITIES.every(a => MINIGAME.has(a.id)), 'tutte le ' + ACTIVITIES.length + ' attività hanno un minigioco');
  const rg = MINIGAME.resolve('grattata', { win: true });
  ok(rg.moneyDelta === 20, 'gratta e vinci vincente: +€' + rg.moneyDelta + ' (prize 30 - stake 10)');
  const ra = MINIGAME.resolve('aperitivo', { finalPot: 80 });
  ok(ra.moneyDelta === 60, 'spritz raddoppiato e incassato: +€' + ra.moneyDelta);
  const rb = MINIGAME.resolve('torneo', { finalPot: 0 });
  ok(rb.moneyDelta === -30, 'posta persa al torneo: -€' + (-rb.moneyDelta));
  ok(MINIGAME.resolve('mare', { pos: 40 }).happyMul >= 1, 'catch sul mare: moltiplicatore felicità');
  ok(MINIGAME.resolve('pizza', { correct: 3, total: 3 }).happyMul === 1.5, 'ricetta perfetta: x1.5 felicità');
  ok(MINIGAME.resolve('gaming', { sum: 20 }).happyMul === 1.6, 'dado 20 sulla gaming: tier massimo');

  const savedMissions = G.missions.slice();
  G.missions = MISSIONS.map(m => m.id);   // nessuna missione può scattare durante il run
  const oldRng2 = G.rng;
  G.rng = () => 0.5;                      // nessun evento casuale: p di chaos è bassa
  const m2 = G.money;
  res = sim.run('serata_tranquilla', [G.friends[0].id, G.friends[1].id], { happyMul: 1.5, repMul: 1.2, moneyDelta: 10, messages: ['test'], mini: { emoji: '🎲', label: 'PROVA', moneyDelta: 10 } });
  ok(res.ok === true && res.minigame && res.minigame.label === 'PROVA', 'mods del minigioco integrati in sim.run');
  ok(G.money === m2 - res.cost + 10 + res.eventEffects.money, 'moneyDelta del minigioco applicato (+€10, evento escluso)');
  ok(res.happy > 0 && res.rep > 0, 'felicità e reputazione con moltiplicatore del minigioco');
  G.rng = oldRng2;
  G.missions = savedMissions;

  /* --- taxi quando i posti non bastano --- */
  res = sim.run('mare', all);   // 14 amici, Scassata+CityCar = 8 posti → taxi per 6
  ok(res.ok === true, 'gita al mare possibile con 14 amici');
  ok(res.taxiUsed === 5, 'taxi per 5 posti mancanti (14 amici, 8 posti auto + skill Macchina Piena)');

  /* --- capienza casa --- */
  res = sim.run('festa', all);
  ok(res.ok === false && /grande/.test(res.reason), 'Stanza Studenti (cap 6) non regge una festa da 8');

  /* --- upgrade e casa più grande --- */
  r = economy.buyUpgrade('divano');
  ok(r.ok === true && ownedRoom(G.houses[G.mainHouse], 'divano') === 1, 'divano upgradato al livello 2');
  ok(economy.buyUpgrade('divano').ok === true, 'divano upgradato al livello 3');
  r = economy.buyHouse('appartamento');
  ok(r.ok === true && currentHouse().id === 'appartamento', 'acquistato e trasferiti in Appartamento');
  res = sim.run('festa', all.slice(0, 8));
  ok(res.ok === true, 'festa da 8 riuscita in Appartamento');
  ok(res.n >= 8, 'festa con 8 partecipanti');

  /* --- stamina --- */
  ok(res.participants.every(p => p.energy >= 0), 'nessuna energia negativa dopo la festa');

  /* --- missioni --- */
  checkMissions();
  ok(G.missions.indexOf('prima_serata') !== -1, 'missione "prima serata" completata');
  G.money = 10000;
  checkMissions();
  ok(G.missions.indexOf('diecimila') !== -1, 'missione "€10.000" completata');

  /* --- avanzamento di una settimana --- */
  const moneyBefore = G.money;
  for (let i = 0; i < 28; i++) advanceTime();  // 28 slot = 7 giorni
  ok(G.money > moneyBefore, 'gli stipendi e gli affitti aumentano i soldi');
  ok(G.friends.every(f => f.energy > 60), 'energia recuperata ogni giorno');

  /* --- salvataggio / caricamento --- */
  const moneySaved = G.money;
  const okSave = save.save();
  ok(okSave === true, 'salvataggio riuscito');
  G.money = 0;
  const loaded = save.load();
  ok(loaded && loaded.state.money === moneySaved, 'caricamento ripristina i soldi');

  /* --- export/import --- */
  const b64 = save.exportB64();
  G.money = 5;
  ok(save.importB64(b64) === true && G.money === moneySaved, 'export/import roundtrip ok');

  /* --- idle --- */
  G.lastSeen = Date.now() - 5 * 3600000;
  const away = idle.compute();
  ok(away && away.hours === 5, 'idle calcola 5 ore di assenza');
  idle.apply(away);
  ok(G.money > moneySaved, 'idle aggiunge soldi al ritorno');

  /* --- statistiche e felicità --- */
  ok(G.stats.activities >= 4, 'statistiche attività aggiornate');
  ok(G.happy > 0 && G.rep > 0, 'felicità e reputazione accumulate');

  /* --- scena 3D: costruzione, vagabondaggio, coreografia --- */
  const sc = R3D.rebuild();
  ok(sc && sc.floorW > 0 && sc.furniture.length > 0, 'scena 3D costruita dalla casa corrente');
  CHARSCENE.init(sc);
  ok(CHARSCENE.chars.length === G.friends.length, 'personaggi spawnati nella scena (' + CHARSCENE.chars.length + ')');
  CHARSCENE.update(2.0);
  ok(CHARSCENE.chars.every(c => isFinite(c.x) && isFinite(c.z)), 'posizioni personaggi valide');
  const allIds = G.friends.map(f => f.id);
  CHARSCENE.choreograph('festa', allIds);
  for (let i = 0; i < 150; i++) CHARSCENE.update(0.1);   // 15s: camminano + coreografia
  ok(CHARSCENE.chars.every(c => !c.choreo), 'coreografia terminata, personaggi di nuovo liberi');
  ok(CHARSCENE.chars.some(c => c.anim === 'walk' || c.anim === 'idle'), 'animazioni attive dopo la coreografia');
  CHARSCENE.choreograph('piscina', allIds);
  for (let i = 0; i < 150; i++) CHARSCENE.update(0.1);
  ok(CHARSCENE.chars.every(c => !c.choreo), 'coreografia piscina terminata');

  return { lines, last: G };
}
scenario();
`;
let result;
try{
  result = vm.runInContext(scenario, sandbox, { filename: 'smoke-scenario' });
}catch(e){
  console.log('KO — errore runtime nello scenario: ' + e.stack);
  process.exit(1);
}

const lines = result.lines;
const fails = lines.filter(l => l.startsWith('FAIL'));
for (const l of lines) console.log('  ' + l);
if (fails.length){
  console.log('\nSMOKE KO — ' + fails.length + ' check falliti.');
  process.exit(1);
}
console.log('\nSMOKE OK — partita completa simulata senza errori runtime.');