// DARK ORBIT CLONE - Salvataggio
// Account e mondo condiviso persistono in localStorage.

var SAVE = {};

SAVE.LS_ACCOUNTS = 'darkorbit_accounts';
SAVE.LS_WORLD = 'darkorbit_world';

SAVE.rawGet = function (key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
};
SAVE.rawSet = function (key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
};

// --- Account --------------------------------------------------------------
// Struttura account:
// { name, credits, uridium, ship, owned (moduli posseduti), slots (moduli
//   installati nella nave), x, y, vx, vy, hp, shieldHp, energy, kills, admin,
//   ammo, ep, level, honor, config, ores, skylab, drone, mission, ... }
SAVE.defaultAccount = function (name) {
  return {
    name: name,
    credits: 3000,
    uridium: 20,
    ship: 'phoenix',
    owned: {
      ship: ['phoenix'],
      laser: ['laser1'],
      shield: ['shield1'],
      gen: ['gen1'],
      batt: ['batt1'],
      eng: ['eng1']
    },
    slots: ['laser1', 'shield1', 'gen1'],  // 3 slot della Phoenix
    x: DATA.BASE.x,
    y: DATA.BASE.y,
    vx: 0,
    vy: 0,
    hp: DATA.SHIPS.phoenix.maxHp,
    shieldHp: DATA.BASE_STATS.shield,
    energy: DATA.BASE_STATS.energy,
    kills: 0,
    admin: (name.toLowerCase() === DATA.ADMIN_NAME),
    ammo: 'red',
    ep: 0,
    level: 1,
    honor: 0,
    config: 'assalto',
    ores: SAVE.emptyOres(),
    skylab: { level: 0, recipe: 'prometid', lastTick: Date.now() },
    drone: null,
    mission: null,
    missionBoard: null,
    gateParts: 0,
    gate: null,
    boosters: { danno: 0, scudo: 0, velocita: 0, mining: 0 }
  };
};

// Inventario minerali vuoto
SAVE.emptyOres = function () {
  var o = {}, k;
  for (k in DATA.ORES) if (DATA.ORES.hasOwnProperty(k)) o[k] = 0;
  return o;
};

// Categoria di un modulo (laser/scudo/gen/batt/eng) oppure null
SAVE.moduleOf = function (key) {
  if (DATA.LASERS[key]) return 'laser';
  if (DATA.SHIELDS[key]) return 'shield';
  if (DATA.GENERATORS[key]) return 'gen';
  if (DATA.BATTERIES[key]) return 'batt';
  if (DATA.ENGINES[key]) return 'eng';
  return null;
};

// Ordine di riempimento degli slot (stesso ordine delle tab del negozio)
SAVE.SLOT_ORDER = ['laser', 'shield', 'gen', 'batt', 'eng'];

// Ridimensiona gli slot in base agli slot della nave, conservando i moduli.
SAVE.resizeSlots = function (acc) {
  var n = DATA.SHIPS[acc.ship].slots;
  if (!Array.isArray(acc.slots)) acc.slots = [];
  if (acc.slots.length > n) acc.slots.length = n;
  var i;
  for (i = acc.slots.length; i < n; i++) {
    // riempi con il primo modulo posseduto non ancora installato, nell'ordine
    var filled = false;
    for (var j = 0; j < SAVE.SLOT_ORDER.length && !filled; j++) {
      var cat = SAVE.SLOT_ORDER[j];
      var owned = (acc.owned && acc.owned[cat]) || [];
      for (var k = 0; k < owned.length && !filled; k++) {
        if (acc.slots.indexOf(owned[k]) < 0) { acc.slots.push(owned[k]); filled = true; }
      }
    }
    if (!filled) acc.slots.push('');
  }
};

// Normalizza un account caricato (migrazione account creati prima dell'espansione)
SAVE.ensureFields = function (acc) {
  if (typeof acc !== 'object' || !acc) return acc;
  if (!acc.ammo) acc.ammo = 'red';
  if (acc.vx === undefined) acc.vx = 0;
  if (acc.vy === undefined) acc.vy = 0;
  if (acc.angle === undefined) acc.angle = 0;
  if (acc.ep === undefined) acc.ep = 0;
  if (acc.level === undefined || !acc.level) acc.level = 1;
  if (acc.honor === undefined) acc.honor = 0;
  if (!acc.config || !DATA.CONFIGS[acc.config]) acc.config = 'assalto';
  if (!acc.ores) acc.ores = SAVE.emptyOres();
  var k;
  for (k in DATA.ORES) if (DATA.ORES.hasOwnProperty(k)) { if (acc.ores[k] === undefined) acc.ores[k] = 0; }
  if (!acc.skylab) acc.skylab = { level: 0, recipe: 'prometid', lastTick: Date.now() };
  if (!acc.skylab.recipe || !DATA.RECIPES[acc.skylab.recipe]) acc.skylab.recipe = 'prometid';
  if (acc.skylab.lastTick === undefined) acc.skylab.lastTick = Date.now();
  if (acc.drone === undefined) acc.drone = null;
  if (acc.mission === undefined) acc.mission = null;
  if (acc.missionBoard === undefined) acc.missionBoard = null;
  if (acc.gateParts === undefined) acc.gateParts = 0;
  if (acc.gate === undefined) acc.gate = null;
  if (!acc.boosters) acc.boosters = { danno: 0, scudo: 0, velocita: 0, mining: 0 };
  var bk;
  for (bk in DATA.BOOSTERS) if (DATA.BOOSTERS.hasOwnProperty(bk)) { if (acc.boosters[bk] === undefined) acc.boosters[bk] = 0; }
  // migrazione dal vecchio modello (moduli singoli) al modello a slot
  if (!acc.owned) {
    acc.owned = { ship: [acc.ship || 'phoenix'], laser: [], shield: [], gen: [], batt: [], eng: [] };
    if (acc.laser) acc.owned.laser.push(acc.laser);
    if (acc.shield) acc.owned.shield.push(acc.shield);
    if (acc.gen) acc.owned.gen.push(acc.gen);
    if (acc.batt) acc.owned.batt.push(acc.batt);
    if (acc.eng) acc.owned.eng.push(acc.eng);
    acc.slots = [];
    SAVE.resizeSlots(acc);
  }
  if (!DATA.SHIPS[acc.ship]) acc.ship = 'phoenix';
  if (!acc.owned.ship) acc.owned.ship = [acc.ship];
  SAVE.resizeSlots(acc);
  return acc;
};

SAVE.getAccounts = function () {
  var a = SAVE.rawGet(SAVE.LS_ACCOUNTS);
  return (a && typeof a === 'object') ? a : {};
};

SAVE.listAccounts = function () {
  var all = SAVE.getAccounts(), out = [], k;
  for (k in all) if (all.hasOwnProperty(k)) out.push(k);
  return out.sort();
};

SAVE.loadAccount = function (name) {
  var all = SAVE.getAccounts();
  var acc = all[name];
  if (!acc) { acc = SAVE.defaultAccount(name); all[name] = acc; SAVE.rawSet(SAVE.LS_ACCOUNTS, all); }
  else acc.admin = (name.toLowerCase() === DATA.ADMIN_NAME);
  SAVE.ensureFields(acc);
  return acc;
};

SAVE.saveAccount = function (acc) {
  var all = SAVE.getAccounts();
  all[acc.name] = acc;
  SAVE.rawSet(SAVE.LS_ACCOUNTS, all);
};

SAVE.deleteAccount = function (name) {
  var all = SAVE.getAccounts();
  delete all[name];
  SAVE.rawSet(SAVE.LS_ACCOUNTS, all);
};

// --- Mondo condiviso --------------------------------------------------------
// Il mondo (asteroidi, NPC, drops) e' condiviso tra tutti gli account.
SAVE.loadWorld = function () {
  return SAVE.rawGet(SAVE.LS_WORLD);
};
SAVE.saveWorld = function (w) {
  SAVE.rawSet(SAVE.LS_WORLD, w);
};