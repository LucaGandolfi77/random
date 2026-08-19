// DARK ORBIT CLONE - Dati di gioco
// Lingua: italiano. Valute: crediti e uridio.

var DATA = {};

// --- Mappa ---------------------------------------------------------------
DATA.WORLD_W = 3000;
DATA.WORLD_H = 2400;
DATA.BASE = { x: 1500, y: 1200 };   // base di partenza / respawn

// Settori (zone rettangolari con nome)
// reqLevel = livello minimo consigliato (sistema "livello = permesso geografico")
// tierMin/tierMax = fascia di NPC che popolano il settore
// ores = pool di minerali estraibili dagli asteroidi del settore
DATA.SECTORS = [
  { name: 'Settore Alpha', x0: 0,      y0: 0,      x1: 1500, y1: 1200, reqLevel: 1,  tierMin: 0, tierMax: 1, ores: ['prometium', 'prometium', 'prometium', 'endurium', 'endurium', 'terbium'] },
  { name: 'Settore Beta',  x0: 1500,   y0: 0,      x1: 3000, y1: 1200, reqLevel: 3,  tierMin: 1, tierMax: 3, ores: ['endurium', 'endurium', 'terbium', 'terbium', 'prometid', 'duranium'] },
  { name: 'Settore Gamma', x0: 0,      y0: 1200,   x1: 1500, y1: 2400, reqLevel: 5,  tierMin: 3, tierMax: 5, ores: ['prometid', 'prometid', 'duranium', 'duranium', 'promerium', 'seprom'] },
  { name: 'Settore Delta', x0: 1500,   y0: 1200,   x1: 3000, y1: 2400, reqLevel: 8,  tierMin: 5, tierMax: 6, ores: ['promerium', 'promerium', 'seprom', 'seprom', 'seprom', 'osmium'] }
];

// --- Navi ----------------------------------------------------------------
// baseMaxHp = scafo (hull), speed, size, color, slots = numero di slot moduli
// Ogni slot ospita un modulo (laser, scudo, generatore, batterie, propulsore);
// gli effetti dei moduli si sommano. Velocita' = caratteristica della nave.
DATA.SHIPS = {
  phoenix:   { name: 'Phoenix',   maxHp: 100, speed: 140, size: 18, slots: 3,  color: '#4fd6ff', cost: 0,        uridium: 0 },
  yamato:    { name: 'Yamato',    maxHp: 160, speed: 155, size: 19, slots: 4,  color: '#6ee7a0', cost: 20000,    uridium: 0 },
  vengeance: { name: 'Vengeance', maxHp: 220, speed: 170, size: 20, slots: 5,  color: '#f07a7a', cost: 60000,    uridium: 40 },
  goliath:   { name: 'Goliath',   maxHp: 320, speed: 180, size: 22, slots: 7,  color: '#c58bff', cost: 150000,   uridium: 150 },
  nemesis:   { name: 'Nemesis',   maxHp: 430, speed: 195, size: 24, slots: 9,  color: '#ffd54a', cost: 350000,   uridium: 500 }
};

// Valori base dello scafo (quando uno slot e' vuoto o manca il modulo)
DATA.BASE_STATS = {
  shield: 30,
  shieldRegen: 2,
  energy: 60,
  energyRegen: 6
};

// --- Laser ---------------------------------------------------------------
// dmg = danno per colpo, rate = colpi al secondo, range
DATA.LASERS = {
  laser1: { name: 'Laser LC-1',   dmg: 12, rate: 2.2, range: 260, cost: 0,       uridium: 0 },
  laser2: { name: 'Laser LC-2',   dmg: 22, rate: 2.4, range: 280, cost: 12000,   uridium: 0 },
  laser3: { name: 'Laser LCB-10', dmg: 38, rate: 2.6, range: 300, cost: 45000,   uridium: 20 },
  laser4: { name: 'Laser LCB-20', dmg: 60, rate: 2.8, range: 320, cost: 120000,  uridium: 80 },
  laser5: { name: 'Laser LF-4',   dmg: 95, rate: 3.0, range: 340, cost: 280000,  uridium: 250 }
};

// --- Scudo ---------------------------------------------------------------
// max, regen = rigenerazione per secondo
DATA.SHIELDS = {
  shield1: { name: 'Scudo SG1-B01', max: 60,   regen: 6,  cost: 0,       uridium: 0 },
  shield2: { name: 'Scudo SG2-B02', max: 120,  regen: 10, cost: 15000,   uridium: 0 },
  shield3: { name: 'Scudo SG3-B03', max: 220,  regen: 16, cost: 50000,   uridium: 30 },
  shield4: { name: 'Scudo SG4-B04', max: 360,  regen: 24, cost: 140000,  uridium: 100 },
  shield5: { name: 'Scudo SG5-B05', max: 560,  regen: 35, cost: 320000,  uridium: 300 }
};

// --- Generatore (energia al secondo) --------------------------------------
DATA.GENERATORS = {
  gen1: { name: 'Generatore G3N-1', regen: 12, cost: 0,       uridium: 0 },
  gen2: { name: 'Generatore G3N-2', regen: 22, cost: 15000,   uridium: 0 },
  gen3: { name: 'Generatore G3N-3', regen: 35, cost: 50000,   uridium: 30 },
  gen4: { name: 'Generatore G3N-4', regen: 52, cost: 140000,  uridium: 100 },
  gen5: { name: 'Generatore G3N-5', regen: 75, cost: 320000,  uridium: 300 }
};

// --- Batterie (energia max) ----------------------------------------------
DATA.BATTERIES = {
  batt1: { name: 'Batterie B4T-1', max: 100, cost: 0,      uridium: 0 },
  batt2: { name: 'Batterie B4T-2', max: 180, cost: 12000,  uridium: 0 },
  batt3: { name: 'Batterie B4T-3', max: 300, cost: 45000,  uridium: 20 },
  batt4: { name: 'Batterie B4T-4', max: 460, cost: 120000, uridium: 80 },
  batt5: { name: 'Batterie B4T-5', max: 680, cost: 280000, uridium: 250 }
};

// --- Propulsore -----------------------------------------------------------
DATA.ENGINES = {
  eng1: { name: 'Propulsore PR-1', boost: 0,   cost: 0,      uridium: 0 },
  eng2: { name: 'Propulsore PR-2', boost: 18,  cost: 10000,  uridium: 0 },
  eng3: { name: 'Propulsore PR-3', boost: 40,  cost: 40000,  uridium: 20 },
  eng4: { name: 'Propulsore PR-4', boost: 70,  cost: 110000, uridium: 80 },
  eng5: { name: 'Propulsore PR-5', boost: 110, cost: 260000, uridium: 250 }
};

// --- NPC (pirati / alien) -------------------------------------------------
// hp, speed, dmg, aggro = raggio di inseguimento, range = gittata di tiro,
// color, reward = crediti drop, uridiumChance, size, ep = punti esperienza,
// honor = punti onore (economia indiretta: migliora il prezzo dei minerali)
DATA.NPCS = [
  { name: 'Streuner',       hp: 60,   speed: 55,  dmg: 8,  aggro: 260, range: 200, color: '#e8546a', reward: 200,   uridiumChance: 0.04, size: 16, ep: 8,    honor: 2 },
  { name: 'Lordakia',       hp: 110,  speed: 68,  dmg: 15, aggro: 280, range: 220, color: '#ff8a5b', reward: 600,   uridiumChance: 0.08, size: 17, ep: 25,   honor: 5 },
  { name: 'Saimon',         hp: 180,  speed: 78,  dmg: 24, aggro: 300, range: 240, color: '#d06bff', reward: 1400,  uridiumChance: 0.14, size: 18, ep: 70,   honor: 12 },
  { name: 'Devolarium',     hp: 280,  speed: 86,  dmg: 34, aggro: 320, range: 260, color: '#5be0a0', reward: 3000,  uridiumChance: 0.22, size: 20, ep: 190,  honor: 30 },
  { name: 'Sibelon',        hp: 420,  speed: 95,  dmg: 48, aggro: 340, range: 280, color: '#ffd54a', reward: 6000,  uridiumChance: 0.30, size: 22, ep: 480,  honor: 70 },
  { name: 'Kristallin',     hp: 650,  speed: 100, dmg: 65, aggro: 360, range: 300, color: '#7df0ff', reward: 12000, uridiumChance: 0.40, size: 23, ep: 1100, honor: 150 },
  { name: 'Kristallon',     hp: 1000, speed: 105, dmg: 85, aggro: 380, range: 320, color: '#ff6ec7', reward: 25000, uridiumChance: 0.50, size: 25, ep: 2600, honor: 350 }
];

// --- Asteroidi ------------------------------------------------------------
// In dark orbit si mina per estrarre risorse: ogni asteroide ha un tipo di
// minerale (ore) e dei punti risorsa (res) da consumare col laser.
DATA.ASTEROID_ORE_AMOUNT = 3;             // unita' di minerale per asteroide
DATA.ASTEROID_URIDIUM_CHANCE = 0.06;

// --- Minerali (ore) ----------------------------------------------------------
// tier: raw = grezzo, sec = raffinato di II grado, prime = III grado, adv = avanzato
// value = prezzo base di vendita in crediti (migliorato dall'Honor)
DATA.ORES = {
  prometium: { name: 'Prometium', tier: 'raw',   value: 10,   color: '#8ae0ff' },
  endurium:  { name: 'Endurium',  tier: 'raw',   value: 15,   color: '#ffb35b' },
  terbium:   { name: 'Terbium',   tier: 'raw',   value: 25,   color: '#b9f06a' },
  prometid:  { name: 'Prometid',  tier: 'sec',   value: 200,  color: '#7de8f5' },
  duranium:  { name: 'Duranium',  tier: 'sec',   value: 200,  color: '#ff8a9a' },
  promerium: { name: 'Promerium', tier: 'prime', value: 500,  color: '#ffd54a' },
  seprom:    { name: 'Seprom',    tier: 'prime', value: 750,  color: '#c58bff' },
  osmium:    { name: 'Osmium',    tier: 'adv',   value: 3000, color: '#ffffff' }
};

// --- Ricette di raffinazione --------------------------------------------------
// Converte minerali grezzi in raffinati (come la raffineria di Dark Orbit).
// cost = ingredienti consumati per 1 unita' prodotta
DATA.RECIPES = {
  prometid:  { name: 'Prometid',  out: 'prometid',  cost: { prometium: 3, endurium: 2 } },
  duranium:  { name: 'Duranium',  out: 'duranium',  cost: { endurium: 3, terbium: 2 } },
  promerium: { name: 'Promerium', out: 'promerium', cost: { prometid: 3, duranium: 1 } },
  seprom:    { name: 'Seprom',    out: 'seprom',    cost: { duranium: 3, promerium: 1 } },
  osmium:    { name: 'Osmium',    out: 'osmium',    cost: { seprom: 3, promerium: 1 } }
};

// --- Configurazioni nave ------------------------------------------------------
// Dark Orbit ha 2 configurazioni per nave: una per l'attacco e una per la corsa.
// V: alterna. I moltiplicatori si applicano alle statistiche.
DATA.CONFIGS = {
  assalto:  { name: 'ASSALTO',  dmg: 1.20, speed: 0.92, shield: 1.00 },
  velocita: { name: 'VELOCITA', dmg: 0.85, speed: 1.18, shield: 0.92 }
};

// --- Skylab (produzione passiva) ----------------------------------------------
// Ogni livello produce minerali raffinati nel tempo, anche da offline
// (si calcola il tempo trascorso dall'ultimo salvataggio).
// rate = unita' all'ora del minerale scelto, reqLevel = livello richiesto.
DATA.SKYLAB = [
  { name: 'Skylab L1', cost: 5000,   rate: 20,   reqLevel: 1 },
  { name: 'Skylab L2', cost: 25000,  rate: 45,   reqLevel: 4 },
  { name: 'Skylab L3', cost: 80000,  rate: 90,   reqLevel: 8 },
  { name: 'Skylab L4', cost: 200000, rate: 160,  reqLevel: 12 },
  { name: 'Skylab L5', cost: 450000, rate: 260,  reqLevel: 16 },
  { name: 'Skylab L6', cost: 900000, rate: 400,  reqLevel: 20 }
];

// --- Livelli (EP) ---------------------------------------------------------------
// Formula wiki: per passare dal livello l al livello l+1 servono 10000 * 2^(l-1) EP.
// Il livello funziona da permesso geografico: i settori richiedono un livello minimo.
DATA.EP_FOR_LEVEL = function (l) { return 10000 * Math.pow(2, l - 1); };

// --- Gradi (rank) -----------------------------------------------------------------
// Punti rank = EP + Honor*50 + kills*200; il grado e' un titolo meta-progressione.
DATA.RANKS = [
  { pts: 0,       title: 'Recluta' },
  { pts: 1000,    title: 'Pilota' },
  { pts: 10000,   title: 'Soldato' },
  { pts: 50000,   title: 'Capitano' },
  { pts: 150000,  title: 'Comandante' },
  { pts: 400000,  title: 'Ammiraglio' }
];

// --- Munizioni -------------------------------------------------------------
// Rosse = danno normale, blu x2, verdi x3, bianche x4
DATA.AMMO = {
  red:   { name: 'ROSSE',   mult: 1, color: '#ff5b6a' },
  blue:  { name: 'BLU',     mult: 2, color: '#3f8dff' },
  green: { name: 'VERDI',   mult: 3, color: '#46e0a0' },
  white: { name: 'BIANCHE', mult: 4, color: '#ffffff' }
};

// --- Droni (assistenti di combattimento) ------------------------------------
// Un drone equipaggiato orbita attorno alla nave, spara sullo stesso bersaglio
// del pilota e raccoglie automaticamente i drop vicini.
DATA.DRONES = {
  drone1: { name: 'Drone E-1', dmg: 8,  rate: 1.6, range: 260, cost: 8000,    uridium: 0,   color: '#46e0a0' },
  drone2: { name: 'Drone E-2', dmg: 18, rate: 2.0, range: 300, cost: 40000,   uridium: 20,  color: '#7de8f5' },
  drone3: { name: 'Drone E-3', dmg: 40, rate: 2.4, range: 340, cost: 150000,  uridium: 120, color: '#ffd54a' },
  drone4: { name: 'Drone X-4', dmg: 95, rate: 2.8, range: 380, cost: 450000,  uridium: 400, color: '#ff6ec7' }
};

// --- Missioni ----------------------------------------------------------------
// Bacheca missioni: la borsa genera obiettivi proporzionati al livello.
// type: kill (abbatti), collect (raccogli minerali), reach (raggiungi settore),
//       survive (sopravvivi in combattimento)
// gen = parametri casuali della missione
DATA.MISSION_POOL = [
  { type: 'kill',    gen: { tier: null,           n: [3, 5] } },
  { type: 'kill',    gen: { tier: [0, 2],         n: [4, 7] } },
  { type: 'kill',    gen: { tier: [2, 5],         n: [3, 6] } },
  { type: 'collect', gen: { oreTier: 'raw',       n: [6, 10] } },
  { type: 'collect', gen: { oreTier: 'sec',       n: [3, 5] } },
  { type: 'collect', gen: { oreTier: 'prime',     n: [2, 4] } },
  { type: 'reach',   gen: { } },
  { type: 'survive', gen: { secs: [25, 50] } }
];

// Soglie di livello per i "tier" dei nemici (usate nelle missioni kill)
DATA.NPC_TIER_RANGE = function (level) {
  if (level >= 10) return [2, 6];
  if (level >= 6) return [1, 5];
  if (level >= 3) return [0, 3];
  return [0, 2];
};

// --- Galaxy Gate --------------------------------------------------------------
// Dungeon a ondate nel Settore Delta: 5 ondate + boss. Le parti raccolte si
// scambiano nel tab "Portale" del negozio.
DATA.GATE = {
  reqLevel: 8,
  arena: { x0: 2400, y0: 1800, x1: 2950, y1: 2350 },
  portal: { x: 2700, y: 2075 },
  waves: 5,                          // ondate normali + boss
  boss: {
    name: 'MINDIFIRE BEHEMOTH', hp: 2500, speed: 88, dmg: 90,
    aggro: 420, range: 340, color: '#ff2d4d', size: 30, reward: 40000,
    uridiumChance: 1
  }
};

// Fascia di tier dei nemici nel gate, per livello
DATA.GATE_TIERS = function (level) {
  if (level >= 14) return [3, 6];
  if (level >= 9) return [2, 5];
  if (level >= 6) return [1, 4];
  return [0, 3];
};

// Ricompensa del gate: crediti/uridio/ep/onore + parti
DATA.GATE_REWARD = function (level) {
  return {
    credits: 2500 + level * 1500,
    uridium: 15 + level * 4,
    ep: 1500 * level,
    honor: 80 * level,
    parts: 2 + Math.floor(level / 6)
  };
};

// --- Booster (potenziamenti temporanei) ----------------------------------------
// Moneta d'accesso: uridio -> tempo (monetizzazione di Dark Orbit).
// dur = durata in millisecondi (10 ore reali, contano anche da offline).
DATA.BOOSTERS = {
  danno:     { name: 'Booster DANNO',      uridium: 25, dur: 10 * 3600 * 1000, color: '#ff5b6a', desc: '+25% danno per 10 ore' },
  scudo:     { name: 'Booster SCUDO',      uridium: 20, dur: 10 * 3600 * 1000, color: '#2fd3ff', desc: '+40% scudo massimo per 10 ore' },
  velocita:  { name: 'Booster VELOCITA',   uridium: 15, dur: 10 * 3600 * 1000, color: '#46e0a0', desc: '+25% velocita per 10 ore' },
  mining:    { name: 'Booster MINING',     uridium: 15, dur: 10 * 3600 * 1000, color: '#ffd54a', desc: '+50% minerali estratti per 10 ore' }
};

// --- Kit consumabili -----------------------------------------------------------
// Svuotano il portafoglio crediti in favore di comodita' immediate.
DATA.KITS = {
  repair: { name: 'Kit riparazione scafo', cost: 2000, desc: 'Ripara il 60% dello scafo' },
  shield: { name: 'Ricarica scudo',        cost: 1500, desc: 'Riporta lo scudo al massimo' },
  energy: { name: 'Ricaricatore energia',  cost: 800,  desc: 'Riporta l\'energia al massimo' }
};

// --- Admin -----------------------------------------------------------------
DATA.ADMIN_NAME = 'admin';