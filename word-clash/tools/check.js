/* CHECK — valida sintassi di tutti i file + schema dei dati data-driven. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const FILES = [
  'data/balance.js','data/buildings.js','data/words.js','data/rivals.js',
  'data/minigames.js','data/dictionary.js',
  'js/state.js','js/time.js','js/audio.js','js/save.js','js/economy.js',
  'js/build.js','js/army.js','js/minigame.js','js/battle.js','js/ui.js','js/main.js'
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
const num = (v) => typeof v === 'number' && !isNaN(v);
const CATS = ['core','production','storage','army','defense','decor'];
const TRAITS = [null,'fast','tank','crit','swarm','double','splash','ranged'];

/* ---- BALANCE ---- */
for (const k of ['startMoney','startDobloni','buildersStart','buildersMax','baseStorage','baseDobloniStorage',
  'wallStart','wallBaseCount','wallPerLevel','skipDobloniPerMin','battleDuration','starThresholds','freeWord','defense']){
  if (BALANCE[k] === undefined) P.push('BALANCE: manca ' + k);
}
if (!Array.isArray(BALANCE.builderCost) || BALANCE.builderCost.length !== BALANCE.buildersMax - 1) P.push('BALANCE.builderCost: serve 1 costo per ogni bibliotecario extra');
if (!Array.isArray(BALANCE.starThresholds) || BALANCE.starThresholds.length !== 3 ||
    BALANCE.starThresholds.some((t, i, a) => i > 0 && t <= a[i - 1])) P.push('BALANCE.starThresholds: 3 valori crescenti');
for (const k of ['hpPerLetter','hpPerDouble','hpBase','dpsPerVowel','dpsPerRare','dpsBase','speedBase','speedPerLetter','speedMin','meleeRange','rangedRange','attackRate','splashRadius']){
  if (!num(BALANCE.wordStats[k])) P.push('BALANCE.wordStats: manca/non valido ' + k);
}
if (BALANCE.freeWord.min < 1 || BALANCE.freeWord.max < BALANCE.freeWord.min) P.push('BALANCE.freeWord: min/max non validi');

/* ---- BUILDINGS ---- */
uniq(BUILDINGS, 'id', 'BUILDINGS');
for (const b of BUILDINGS){
  for (const k of ['id','name','emoji','category','cell','unlock','levels']){
    if (b[k] === undefined) P.push('BUILDINGS.' + b.id + ': manca ' + k);
  }
  if (CATS.indexOf(b.category) === -1) P.push('BUILDINGS.' + b.id + ': categoria sconosciuta ' + JSON.stringify(b.category));
  if (!Array.isArray(b.cell) || b.cell.length !== 2 || b.cell[0] < 0 || b.cell[0] > 5 || b.cell[1] < 0 || b.cell[1] > 7) P.push('BUILDINGS.' + b.id + ': cell fuori griglia 6×8');
  if (!num(b.unlock) || b.unlock < 1 || b.unlock > 5) P.push('BUILDINGS.' + b.id + ': unlock non valido');
  if (!Array.isArray(b.levels) || b.levels.length !== 5) P.push('BUILDINGS.' + b.id + ': servono 5 livelli');
  if (b.levels[0].cost !== 0) P.push('BUILDINGS.' + b.id + ': il livello 1 deve costare 0');
  for (let i = 1; i < 5; i++){
    if (!num(b.levels[i].cost) || !num(b.levels[i].time) || b.levels[i].cost <= b.levels[i - 1].cost) P.push('BUILDINGS.' + b.id + ' lv' + (i + 1) + ': costo non crescente o tempo non valido');
  }
  if (b.currency && b.currency !== 'dobloni') P.push('BUILDINGS.' + b.id + ': currency non valido');
  if (b.category === 'production'){
    if (!Array.isArray(b.ratePerMin) || b.ratePerMin.length !== 5 || b.ratePerMin.some((r, i) => i > 0 && r <= b.ratePerMin[i - 1])) P.push('BUILDINGS.' + b.id + ': ratePerMin non crescente (5 valori)');
  }
  if (b.category === 'storage'){
    if (!Array.isArray(b.cap) || b.cap.length !== 5 || b.cap.some((c, i) => i > 0 && c <= b.cap[i - 1])) P.push('BUILDINGS.' + b.id + ': cap non crescente (5 valori)');
  }
  if (b.id === 'quaderno'){
    if (!Array.isArray(b.cap) || b.cap.length !== 5 || b.cap.some((c, i) => i > 0 && c <= b.cap[i - 1])) P.push('BUILDINGS.quaderno: cap non crescente');
  }
  if (b.id === 'tipografia'){
    if (!Array.isArray(b.tier) || b.tier.length !== 5 || b.tier.join(',') !== '1,2,3,4,5') P.push('BUILDINGS.tipografia: tier deve essere [1,2,3,4,5]');
  }
  if (b.id === 'muro'){
    for (const k of ['wallHp','copyCost','copyTime']){
      if (!Array.isArray(b[k]) || b[k].length !== 5 || b[k].some((v, i) => i > 0 && v <= b[k][i - 1])) P.push('BUILDINGS.muro: ' + k + ' non crescente (5 valori)');
    }
  }
  if (b.id === 'torretta'){
    if (!Array.isArray(b.dps) || b.dps.length !== 5 || b.dps.some((v, i) => i > 0 && v <= b.dps[i - 1])) P.push('BUILDINGS.torretta: dps non crescente (5 valori)');
  }
  if (b.id === 'trappola'){
    if (!Array.isArray(b.slow) || b.slow.length !== 5 || b.slow.some((v) => !num(v) || v <= 0 || v >= 1)) P.push('BUILDINGS.trappola: slow invalido (5 valori in 0-1)');
  }
  if (b.id === 'laboratorio'){
    if (!Array.isArray(b.boost) || b.boost.length !== 5 || b.boost[0] !== 1 || b.boost.some((v, i) => i > 0 && v <= b.boost[i - 1])) P.push('BUILDINGS.laboratorio: boost deve partire da 1 e crescere');
  }
  if (b.id === 'fontana'){
    if (b.currency !== 'dobloni') P.push('BUILDINGS.fontana: deve costare dobloni');
    if (!Array.isArray(b.bonus) || b.bonus.length !== 5 || b.bonus.some((v, i) => i > 0 && v <= b.bonus[i - 1])) P.push('BUILDINGS.fontana: bonus non crescente');
  }
}

/* ---- WORDS ---- */
uniq(WORDS, 'id', 'WORDS');
for (const w of WORDS){
  for (const k of ['id','word','emoji','type','tier','cost','trainTime','blurb']){
    if (w[k] === undefined) P.push('WORDS.' + w.id + ': manca ' + k);
  }
  if (['melee','splash','ranged'].indexOf(w.type) === -1) P.push('WORDS.' + w.id + ': tipo non valido');
  if (TRAITS.indexOf(w.trait) === -1) P.push('WORDS.' + w.id + ': trait non valido ' + JSON.stringify(w.trait));
  if (!num(w.tier) || w.tier < 1 || w.tier > 5) P.push('WORDS.' + w.id + ': tier non valido (1-5)');
  if (!num(w.cost) || w.cost <= 0) P.push('WORDS.' + w.id + ': costo non valido');
  if (!num(w.trainTime) || w.trainTime <= 0) P.push('WORDS.' + w.id + ': trainTime non valido');
}

/* ---- RIVALS ---- */
uniq(RIVALS, 'id', 'RIVALS');
for (const r of RIVALS){
  for (const k of ['id','name','emoji','needCatalogo','loot','dobloni','spec']){
    if (r[k] === undefined) P.push('RIVALS.' + r.id + ': manca ' + k);
  }
  if (!num(r.needCatalogo) || r.needCatalogo < 1 || r.needCatalogo > 5) P.push('RIVALS.' + r.id + ': needCatalogo non valido');
  if (!num(r.loot) || r.loot <= 0) P.push('RIVALS.' + r.id + ': loot non valido');
  if (!num(r.dobloni) || r.dobloni < 1) P.push('RIVALS.' + r.id + ': dobloni non validi');
  for (const k of ['catalogo','banco','caffe','edicola','torretta','trappola','muro','muroLv']){
    if (r.spec[k] === undefined || !num(r.spec[k])) P.push('RIVALS.' + r.id + '.spec: manca/non valido ' + k);
  }
  if (r.spec.muroLv < 1 || r.spec.muroLv > 5) P.push('RIVALS.' + r.id + ': spec.muroLv fuori 1-5');
  if (r.spec.torretta > 4) P.push('RIVALS.' + r.id + ': troppe torrette (max 4)');
  if (r.spec.trappola > 4) P.push('RIVALS.' + r.id + ': troppe trappole (max 4)');
}
for (let i = 1; i < RIVALS.length; i++){
  if (RIVALS[i].loot <= RIVALS[i - 1].loot) P.push('RIVALS: loot non crescente in ordine');
  if (RIVALS[i].dobloni < RIVALS[i - 1].dobloni) P.push('RIVALS: dobloni non crescenti in ordine');
}

/* ---- MINIGAMES ---- */
uniq(MINIGAMES, 'id', 'MINIGAMES');
for (const m of MINIGAMES){
  for (const k of ['id','name','emoji','cooldown','desc']){
    if (m[k] === undefined) P.push('MINIGAMES.' + m.id + ': manca ' + k);
  }
  if (!num(m.cooldown) || m.cooldown < 1) P.push('MINIGAMES.' + m.id + ': cooldown non valido');
}
const needGame = (id) => MINIGAMES.find(m => m.id === id);
for (const id of ['anagramma','catena','dattilo','impiccato']){
  if (!needGame(id)) P.push('MINIGAMES: manca ' + id);
}
if (needGame('anagramma')){
  const a = needGame('anagramma');
  for (const k of ['time','rewardBase','rewardSpeed']) if (!num(a[k])) P.push('MINIGAMES.anagramma: ' + k + ' non valido');
}
if (needGame('catena')){
  const c = needGame('catena');
  for (const k of ['chains','rewardBase','rewardPerChain']) if (!num(c[k])) P.push('MINIGAMES.catena: ' + k + ' non valido');
}
if (needGame('dattilo')){
  const d = needGame('dattilo');
  for (const k of ['parTime','rewardBase','rewardFast']) if (!num(d[k])) P.push('MINIGAMES.dattilo: ' + k + ' non valido');
}
if (needGame('impiccato')){
  const i = needGame('impiccato');
  for (const k of ['guesses','rewardCoins','rewardDobloni']) if (!num(i[k])) P.push('MINIGAMES.impiccato: ' + k + ' non valido');
}

/* ---- DICTIONARY ---- */
for (const k of ['hangman','anagram','typing','chainStart']){
  if (!Array.isArray(DICT[k]) || !DICT[k].length) P.push('DICT: manca o vuoto ' + k);
}
for (const h of (DICT.hangman || [])){
  if (!h.w || !h.hint) P.push('DICT.hangman: manca w o hint');
}
for (const w of DICT.anagram) if (w.length < 3) P.push('DICT.anagram: parola troppo corta ' + JSON.stringify(w));
for (const k of ['anagram','typing','chainStart']) for (const w of DICT[k]) if (!DICT.set[w]) P.push('DICT.set: manca ' + JSON.stringify(w) + ' (' + k + ')');

/* ---- funzioni e integrazione ---- */
const FNS = ['newGame','settleBuildings','save','prodRate','pendingProd','collect','startBuild','skipBuild','buyWall','buyBuilder',
  'computeWordStats','train','validateFreeWord','MGAME','battle','warCapacity','storageCap','dobloniCap','wallMax'];
for (const f of FNS){
  if (eval('typeof ' + f) === 'undefined') P.push('manca la funzione globale ' + f);
}
if (typeof computeWordStats('LIBRO').hp !== 'number') P.push('computeWordStats: hp non numerico');
if (computeWordStats('LIBRO').speed <= computeWordStats('ENCICLOPEDIA').speed) P.push('computeWordStats: la parola corta deve essere più veloce della lunga');
if (MGAME.resolve('anagramma', { word:'prato', expected:'prato', timeLeft:5 }).coins < MGAME.resolve('anagramma', { word:'x', expected:'prato', timeLeft:0 }).coins) P.push('MGAME.anagramma: risolvere deve pagare di più');

__problems = P;
__counts = { buildings: BUILDINGS.length, words: WORDS.length, rivals: RIVALS.length, minigames: MINIGAMES.length };
`;
vm.runInContext(vcode, sandbox, { filename: 'check-data' });
const P = sandbox.__problems || [];
const C = sandbox.__counts || {};
if (P.length){
  console.log('KO — problemi nei dati:\n' + P.join('\n'));
  process.exit(1);
}
console.log(`OK: ${FILES.length} file caricati senza errori, dati validi (${C.buildings} edifici, ${C.words} parole, ${C.rivals} rivali, ${C.minigames} minigiochi).`);