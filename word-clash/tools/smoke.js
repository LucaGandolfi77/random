/* SMOKE — simula una partita completa in Node (stub DOM/Audio/localStorage). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ORDER = [
  'data/balance.js','data/buildings.js','data/words.js','data/rivals.js',
  'data/minigames.js','data/dictionary.js',
  'js/state.js','js/time.js','js/audio.js','js/save.js','js/economy.js',
  'js/build.js','js/army.js','js/minigame.js','js/battle.js','js/ui.js','js/main.js'
];

function ctxStub(){
  return new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (() => {}) : t[k]), set: () => true });
}

function makeEl(){
  return {
    textContent:'', innerHTML:'', className:'', style:{}, scrollTop:0, dataset:{},
    clientWidth: 0, clientHeight: 0, width: 0, height: 0,
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
  const lvUp = (id, target) => {
    let guard = 0;
    while (buildingLevel(id) < target && guard++ < 20){
      const r = startBuild(id);
      if (!r.ok) break;
      G.buildings[id].doneAt = now() - 1000;
      settleBuildings();
    }
  };

  /* --- nuova partita --- */
  newGame(1234);
  ok(G.money === BALANCE.startMoney, 'capitale iniziale ' + BALANCE.startMoney + ' monete');
  ok(catalogoLevel() === 1 && buildingBusy('catalogo') === false, 'Catalogo Lv 1 già costruito');
  ok(G.walls === BALANCE.wallStart && wallMax() === BALANCE.wallBaseCount, 'muri iniziali ' + G.walls + '/' + wallMax());
  ok(G.builders === 1 && buildersFree() === 1, 'un bibliotecario libero');
  ok(storageCap() === BALANCE.baseStorage + getBuilding('cassaforte').cap[0], 'capienza iniziale ' + storageCap());

  /* --- produzione --- */
  G.prod.banco_prestito = now() - 60000;
  const rate = prodRate('banco_prestito');
  ok(rate > 0, 'banco produce ' + rate + ' monete/min');
  const pending = pendingProd('banco_prestito');
  ok(pending >= 1 && pending <= rate, 'monete pendenti (' + pending + ')');
  const m0 = G.money;
  const collected = collect('banco_prestito');
  ok(collected === pending && G.money === m0 + pending, 'raccolte le monete pendenti');
  ok(collect('banco_prestito') === 0, 'niente da raccogliere appena raccolto');

  /* --- costruzione: catalogo fino al Lv 3 --- */
  G.money = 100000;
  lvUp('catalogo', 3);
  ok(catalogoLevel() === 3, 'Catalogo potenziato al Lv 3');
  ok(isUnlocked('tipografia'), 'Tipografia sbloccata al Lv 3');
  ok(isUnlocked('caffe'), 'Caffè sbloccato al Lv 2');
  ok(!isUnlocked('torretta'), 'Torretta ancora chiusa (serve Lv 4)');
  ok(maxLevelFor('catalogo') === 5, 'il Catalogo può arrivare fino al Lv 5');
  ok(wallMax() === BALANCE.wallBaseCount + BALANCE.wallPerLevel * 2, 'muri disponibili col catalogo alto (' + wallMax() + ')');

  /* --- capienza --- */
  lvUp('cassaforte', 3);
  ok(storageCap() === BALANCE.baseStorage + getBuilding('cassaforte').cap[2], 'cassaforte Lv3 alza la capienza a ' + storageCap());
  lvUp('quaderno', 2);
  ok(warCapacity() === getBuilding('quaderno').cap[1], 'capienza di guerra ' + warCapacity());
  ok(stockCap() === warCapacity() * 2, 'magazzino = doppio della capienza di guerra');

  /* --- stats dalle lettere --- */
  const stLibro = computeWordStats('LIBRO');
  ok(stLibro.hp > 50 && stLibro.dps > 5, 'LIBRO: robusto e combattivo (' + stLibro.hp + 'hp, ' + stLibro.dps + 'dps, vel ' + Math.round(stLibro.speed) + ')');
  const stEnc = computeWordStats('ENCICLOPEDIA');
  ok(stEnc.hp > stLibro.hp && stEnc.speed < stLibro.speed, 'ENCICLOPEDIA più dura e più lenta');
  ok(computeWordStats('LIBRO').hp === stLibro.hp, 'stats deterministiche');
  const stZ = computeWordStats(getWord('zanzara'));
  ok(stZ.crit === 0.2, 'ZANZARA ha il colpo critico (0.2)');
  ok(computeWordStats(getWord('dizionario')).ranged === true, 'DIZIONARIO è a distanza');
  ok(computeWordStats(getWord('onomatopea')).splash === true, 'ONOMATOPEA è splash');

  /* --- parola libera --- */
  ok(validateFreeWord('STREGA').ok === true, 'parola libera STREGA valida');
  ok(validateFreeWord('XY').ok === false, 'senza vocali rifiutata');
  ok(validateFreeWord('A').ok === false, 'troppo corta rifiutata');
  ok(validateFreeWord('ZANZARONA').word === 'ZANZARONA', 'parola normalizzata in maiuscolo');

  /* --- addestramento --- */
  lvUp('tipografia', 1);
  ok(wordUnlocked(getWord('libro')), 'TIPOGRAFIA Lv1 sblocca LIBRO');
  ok(!wordUnlocked(getWord('caffe')), 'CAFFÈ ancora chiuso (tier 2)');
  G.money = 10000;
  let tr = train('libro');
  ok(tr.ok === true && G.army.libro === 1, 'addestrato un LIBRO');
  ok(train('caffe').ok === false, 'CAFFÈ non addestrabile senza tipografia 2');
  G.money = 0;
  ok(train('libro').ok === false, 'senza monete non si stampa');
  G.money = 10000;
  let guard2 = 0;
  while (totalStock() < stockCap() && guard2++ < 40) train('libro');
  ok(totalStock() === stockCap(), 'magazzino pieno fino alla capienza (' + totalStock() + '/' + stockCap() + ')');
  ok(train('libro').ok === false, 'oltre la capienza non si addestra');

  /* --- minigiochi: risoluzione pura --- */
  const ra = MGAME.resolve('anagramma', { word: 'prato', expected: 'prato', timeLeft: 5 });
  ok(ra.coins === getMinigame('anagramma').rewardBase + 5 * getMinigame('anagramma').rewardSpeed, 'anagramma risolto con tempo: +' + ra.coins);
  ok(MGAME.resolve('anagramma', { word: 'x', expected: 'prato', timeLeft: 0 }).coins === 5, 'anagramma fallito: consolazione 5');
  const rc = MGAME.resolve('catena', { chains: 5 });
  ok(rc.coins === getMinigame('catena').rewardBase + 5 * getMinigame('catena').rewardPerChain, 'catena completa: +' + rc.coins);
  const rd = MGAME.resolve('dattilo', { time: 2 });
  ok(rd.coins > getMinigame('dattilo').rewardBase, 'dattilo veloce premia (' + rd.coins + ')');
  const ri = MGAME.resolve('impiccato', { win: true });
  ok(ri.dobloni === 1 && ri.coins === getMinigame('impiccato').rewardCoins, 'impiccato vinto: 💛1 e 🪙' + ri.coins);
  ok(MGAME.resolve('impiccato', { win: false }).coins === 0, 'impiccato perso: niente');
  const d0 = G.dobloni;
  addCoins(ri.coins); addDobloni(ri.dobloni);
  ok(G.dobloni === d0 + ri.dobloni, 'ricompense impiccato applicate');

  /* --- battaglia in tempo reale --- */
  const team = battleTeamFromStock();
  ok(team.length === 1 && team[0].id === 'libro' && team[0].count === warCapacity(), 'team letto dal magazzino (' + team[0].count + ' schierabili)');
  const s = battle.start('r1');
  ok(s !== null && s.buildings.length === 6, 'r1 schierata: ' + s.buildings.length + ' edifici (4 muri + catalogo + banco)');
  ok(s.capacity === warCapacity(), 'capienza battaglia ' + s.capacity);
  const coinsBefore = G.money;
  battle.deployAt('libro', 0, 0);
  battle.deployAt('libro', 0, 1);
  battle.deployAt('libro', 0, 2);
  battle.deployAt('libro', 0, 3);
  const freeRes = battle.deployFree('STREGA', 0, 4);
  ok(freeRes.ok === true && s.freeUsed === true, 'parola libera STREGA schierata');
  ok(battle.deployFree('X', 0, 5).ok === false, 'seconda parola libera rifiutata');
  battle.deployAt('libro', 0, 5);
  ok(s.deployed === 6 && s.units.length === 6, 'capienza riempita (6/6)');
  ok(battle.deployAt('libro', 0, 6).ok === false, 'oltre la capienza non si schiera');
  let guard = 0;
  while (!s.over && guard++ < 400) battle.step(0.5);
  ok(s.over === true, 'battaglia conclusa in ' + Math.round(guard * 0.5) + 's');
  const res = battle.result();
  ok(res.stars === 3, '3 stelle (' + Math.round(res.pct * 100) + '% distrutto)');
  ok(res.loot > 0, 'bottino raccolto +€' + res.loot);
  const ended = battle.end();
  ok(ended && ended.loot === res.loot && ended.dobloni === 1, 'bottino e dobloni riscossi');
  ok(G.money === coinsBefore + res.loot, 'monete del bottino nel tesoro');
  ok(G.army.libro === stockCap() - 5, 'parole consumate dallo schieramento (restano ' + G.army.libro + ')');
  ok(G.stats.battles === 1 && G.stats.wins === 1 && G.stats.threeStars === 1, 'statistiche di guerra aggiornate');

  /* --- difesa offline --- */
  const logLen0 = G.log.length;
  G.lastSeen = Date.now() - 120 * 60000;
  G.rng = () => 0;
  save._offlineDefense();
  ok(G.log.length > logLen0, 'attacco offline registrato nel registro');
  ok(G.log[0].icon === '💨', 'difese deboli: assalto subito (rubati soldi)');
  G.rng = null;

  /* --- salvataggio --- */
  const mS = G.money;
  ok(save.save() === true, 'salvataggio ok');
  G.money = 0;
  const loaded = save.load();
  ok(loaded && loaded.state.money === mS, 'caricamento ripristina i soldi');

  /* --- export/import --- */
  const b64 = save.exportB64();
  G.money = 5;
  ok(save.importB64(b64) === true && G.money === mS, 'export/import roundtrip ok');

  /* --- mercato --- */
  G.money = 10000;
  const w0 = G.walls;
  const wr = buyWall();
  ok(wr.ok === true && G.walls === w0 + 1, 'comprato un muro extra (' + G.walls + '/' + wallMax() + ')');
  G.dobloni = 20;
  const b0 = G.builders;
  ok(buyBuilder().ok === true && G.builders === b0 + 1, 'assunto un bibliotecario in più (cost ' + BALANCE.builderCost[b0 - 1] + ' dobloni)');
  G.dobloni = 5;
  ok(buyBuilder().ok === false, 'dobloni insufficienti per il terzo bibliotecario');

  /* --- costruzione + salto coi dobloni --- */
  G.money = 10000;
  G.dobloni = 20;
  ok(startBuild('caffe').ok === true, 'primo caffè costruito gratis');
  settleBuildings();
  ok(buildingLevel('caffe') === 1 && !buildingBusy('caffe'), 'prima costruzione (gratis) completata');
  ok(startBuild('caffe').ok === true && buildingBusy('caffe'), 'potenziamento caffè avviato');
  ok(skipBuild('caffe').ok === true && buildingLevel('caffe') === 2 && !buildingBusy('caffe'), 'potenziamento saltato coi dobloni');
  ok(buildersFree() === G.builders, 'bibliotecari tornati liberi');

  /* --- cooldown minigiochi --- */
  G.cooldowns.anagramma = now();
  const cd = cooldownLeft('anagramma');
  ok(cd <= getMinigame('anagramma').cooldown && cd >= getMinigame('anagramma').cooldown - 1, 'cooldown attivo dopo la partita (' + cd + 's)');

  /* --- tutte le viste renderizzano --- */
  UI.showTab('home');
  UI.showTab('army');
  UI.showTab('mini');
  UI.showTab('attack');
  UI.showTab('shop');
  ok(true, 'le 5 viste renderizzano senza errori DOM');

  /* --- stato finale --- */
  ok(G.money >= 0 && G.dobloni >= 0, 'risorse non negative a fine partita');
  ok(G.army.libro >= 0, 'magazzino coerente');
  ok(G.log.length <= BALANCE.maxLog, 'registro dentro il massimo (' + G.log.length + ')');

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