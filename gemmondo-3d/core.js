/* ============================================================
   GEMMONDO — Core
   Dati di gioco, economia, artigianato e salvataggio.

   Regola architetturale: questo file NON importa three e NON
   tocca il DOM. È puro, quindi gira identico nel browser e
   sotto `node --test`. Tutto ciò che ha bisogno di WebGL o di
   un elemento HTML vive in game.js.

   Gli upgrade che influenzano il reddito passivo passano
   tutti da incomePerSec(), mai da una formula sparsa nel loop:
   è così che un cambiamento di bilanciamento si fa in un posto.
   ============================================================ */

/* ------------------------------------------------------------
   1. UTILITÀ
   ------------------------------------------------------------ */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Numero compatto per l'HUD: 1234 → "1.23K", 5e9 → "5.00B". */
export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    if (n < 10 && n % 1 !== 0) return n.toFixed(1);
    return Math.floor(n).toString();
  }
  let tier = Math.floor(Math.log10(n) / 3);
  if (tier >= UNITS.length) tier = UNITS.length - 1;
  const scaled = n / Math.pow(10, tier * 3);
  const dec = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return scaled.toFixed(dec) + UNITS[tier];
}

/* ------------------------------------------------------------
   2. ZONE (biomi)
   ------------------------------------------------------------ */
export const ZONES = [
  {
    name: 'Prato Felice', tagline: 'Dove le gemme crescono sugli alberi. Quasi.',
    unlock: 0, base: 1, gem: 0x46f06a, ground: 0x4f9e5a, sky: 0x8fd8ff, fog: 0x9ad8e8,
    sun: 0xfff4d6, hemiSky: 0xbfe8ff, hemiGround: 0x3c9d55, decor: ['tree', 'flower', 'rock'],
    radius: 50, exposure: 1.05, bloom: 0.42,
  },
  {
    name: 'Deserto Scintillante', tagline: 'Caldo, ma con stile.',
    unlock: 250, base: 6, gem: 0xffb84d, ground: 0xe0bd6f, sky: 0xffd9a0, fog: 0xf2cf92,
    sun: 0xffe0b0, hemiSky: 0xffe9c2, hemiGround: 0xc9974a, decor: ['cactus', 'rock', 'crystal'],
    radius: 54, exposure: 1.0, bloom: 0.38,
  },
  {
    name: 'Caverna di Cristallo', tagline: 'Sotto terra c’è il tesoro. E un po’ di muffa.',
    unlock: 2500, base: 25, gem: 0xc46bff, ground: 0x3a2f5c, sky: 0x120c2e, fog: 0x170f38,
    sun: 0x9f8bff, hemiSky: 0x7a63c9, hemiGround: 0x241a45, decor: ['crystal', 'rock', 'spike'],
    radius: 56, exposure: 1.35, bloom: 0.85,
  },
  {
    name: 'Oceano al Neon', tagline: 'Atlantide, ma con le luci LED.',
    unlock: 25000, base: 120, gem: 0x00e5ff, ground: 0x123a66, sky: 0x081e3d, fog: 0x0a2144,
    sun: 0x00e5ff, hemiSky: 0x3fd4ff, hemiGround: 0x0a2440, decor: ['coral', 'coral', 'rock'],
    radius: 58, exposure: 1.2, bloom: 0.75,
  },
  {
    name: 'Vulcano Fiamma', tagline: 'Non toccare la lava. Ovviamente.',
    unlock: 400000, base: 700, gem: 0xff5a3c, ground: 0x3d1c14, sky: 0x1a0a06, fog: 0x2a0e08,
    sun: 0xff7a3c, hemiSky: 0xff7a5a, hemiGround: 0x1a0a06, decor: ['rock', 'rock', 'spike', 'crystal'],
    radius: 60, exposure: 1.15, bloom: 0.7,
  },
  {
    name: 'Spazio Profondo', tagline: 'Nessuno può sentirti raccogliere.',
    unlock: 8000000, base: 6000, gem: 0xffffff, ground: 0x0b0b14, sky: 0x000008, fog: 0x0b0b14,
    sun: 0xcfe6ff, hemiSky: 0x3a4a7a, hemiGround: 0x08080f, decor: ['asteroid', 'asteroid', 'rock'],
    radius: 64, exposure: 1.25, bloom: 1.0,
  },
  {
    name: 'Dimensione Folle', tagline: 'Qui la fisica si è presa una pausa caffè.',
    unlock: 150000000, base: 50000, gem: 0xff00ff, ground: 0x2a0f3a, sky: 0x1a0a2e, fog: 0x200a36,
    sun: 0xffffff, hemiSky: 0xff5e9c, hemiGround: 0x12041f, decor: ['crystal', 'tree', 'coral', 'asteroid', 'spike'],
    radius: 68, exposure: 1.1, bloom: 0.95,
  },
];

/** Indice di zona sicuro: protegge da salvataggi corrotti o editati a mano. */
export function safeZoneIndex(i) {
  const n = Number(i);
  if (!Number.isFinite(n)) return 0;
  return clamp(Math.floor(n), 0, ZONES.length - 1);
}

export function zoneAt(i) {
  return ZONES[safeZoneIndex(i)];
}

/* ------------------------------------------------------------
   3. POTENZIAMENTI
   ------------------------------------------------------------ */
export const UPGRADES = [
  { id: 'speed',  name: 'Scarpe Razzo',       icon: '👟', base: 10,   mult: 1.35, desc: (v) => `Cubetto corre ×${v.toFixed(2)}` },
  { id: 'radius', name: 'Braccia Lunghe',     icon: '🫸', base: 25,   mult: 1.4,  desc: (v) => `Raggio di raccolta ${v.toFixed(1)}m` },
  { id: 'magnet', name: 'Magnete Cosmico',    icon: '🧲', base: 80,   mult: 1.45, desc: (v) => `Attira gemme entro ${v.toFixed(1)}m` },
  { id: 'value',  name: 'Taglia Gemme',       icon: '💎', base: 50,   mult: 1.6,  desc: (v) => `Valore gemma ×${fmt(v)}` },
  { id: 'spawn',  name: 'Fertilità',          icon: '🌱', base: 120,  mult: 1.5,  desc: (v) => `Massimo ${v} gemme nel mondo` },
  { id: 'drone',  name: 'Droni Raccoglitori', icon: '🛸', base: 300,  mult: 1.7,  desc: (v) => `${v} droni (reddito passivo)` },
  { id: 'luck',   name: 'Fortuna Sfacciata',  icon: '🍀', base: 500,  mult: 1.6,  desc: (v) => `${(v * 100).toFixed(0)}% gemme d’oro (×12)` },
];

const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export function upgradeValue(id, lvl) {
  const n = Number(lvl) || 0;
  switch (id) {
    case 'speed':  return 1 + n * 0.18;
    case 'radius': return 1.6 + n * 0.3;
    case 'magnet': return 3 + n * 1.2;
    case 'value':  return Math.pow(1.6, n);
    case 'spawn':  return 8 + n * 3;
    case 'drone':  return n;
    case 'luck':   return Math.min(0.03 + n * 0.03, 0.6);
    default: return 1;
  }
}

export function upgradeCost(id, lvl) {
  const u = UPGRADE_BY_ID[id];
  if (!u) return Infinity;
  return Math.floor(u.base * Math.pow(u.mult, lvl));
}

/* ------------------------------------------------------------
   4. RISORSE
   ------------------------------------------------------------ */
export const RESOURCES = {
  legno:       { name: 'Legno',      icon: '🪵', color: '#c98a4b' },
  pietra:      { name: 'Pietra',     icon: '🪨', color: '#9aa0a8' },
  tavole:      { name: 'Tavole',     icon: '📦', color: '#d9a05b' },
  mattoni:     { name: 'Mattoni',    icon: '🧱', color: '#c66b5a' },
  ingranaggio: { name: 'Ingranaggi', icon: '⚙️', color: '#d8d8e8' },
  cristallo:   { name: 'Cristallo',  icon: '🔮', color: '#8f7bff' },
  oro:         { name: 'Oro',        icon: '💰', color: '#ffd54f' },
};

export const RESOURCE_IDS = Object.keys(RESOURCES);

/* ------------------------------------------------------------
   5. ATTREZZI
   ------------------------------------------------------------ */
export const TOOL_NAMES = { axe: { name: 'Ascia', icon: '🪓' }, pick: { name: 'Piccone', icon: '⛏️' } };
export const TOOL_LEVELS = { axe: 3, pick: 3 };

/** Livello effettivo: clampa sempre a TOOL_LEVELS, anche da save corrotto. */
export function toolLevel(state, kind) {
  const max = TOOL_LEVELS[kind];
  if (max === undefined) return 0;
  return clamp(Math.floor(Number(state?.tools?.[kind]) || 0), 0, max);
}

export function toolStats(state, kind) {
  const lvl = toolLevel(state, kind);
  if (kind === 'axe') {
    return { yield: [1, 3, 8, 20][lvl] ?? 1, interval: [2.2, 1.4, 0.9, 0.55][lvl] ?? 2.2 };
  }
  return { yield: [1, 2, 5, 12][lvl] ?? 1, interval: [2.2, 1.5, 1.0, 0.6][lvl] ?? 2.2 };
}

export function toolLabel(state, kind) {
  const info = TOOL_NAMES[kind];
  if (!info) return '?';
  const lvl = toolLevel(state, kind);
  return lvl === 0 ? '✋ Mani Nude' : `${info.icon} ${info.name} Lv${lvl}`;
}

/* ------------------------------------------------------------
   6. RICETTE DI CRAFT
   ------------------------------------------------------------ */
export const RECIPES = [
  { id: 'tavole',      name: 'Tavole',             icon: '📦', out: { tavole: 1 },      cost: { legno: 3 },                       desc: 'Legno segato con molta fatica' },
  { id: 'mattoni',     name: 'Mattoni',            icon: '🧱', out: { mattoni: 1 },     cost: { pietra: 3 },                      desc: 'Pietra cotta con molta rabbia' },
  { id: 'axe1',        name: 'Ascia di Pietra',    icon: '🪓', out: { tool: 'axe', lvl: 1 }, cost: { legno: 3, pietra: 2 },          desc: 'Per tagliare gli ALBERI come si deve' },
  { id: 'pick1',       name: 'Piccone di Legno',   icon: '⛏️', out: { tool: 'pick', lvl: 1 }, cost: { legno: 4, pietra: 3 },         desc: 'Per spaccare i SASSI come si deve' },
  { id: 'ingranaggio', name: 'Ingranaggio',        icon: '⚙️', out: { ingranaggio: 1 }, cost: { tavole: 2, mattoni: 2, energia: 50 }, desc: 'Meccanica da quattro soldi', zone: 1 },
  { id: 'axe2',        name: 'Ascia Rinforzata',   icon: '🪓', out: { tool: 'axe', lvl: 2 }, cost: { tavole: 10, mattoni: 5, legno: 20 }, desc: 'Taglia come un forsennato', needTool: 'axe', needLvl: 1 },
  { id: 'pick2',       name: 'Piccone Rinforzato', icon: '⛏️', out: { tool: 'pick', lvl: 2 }, cost: { tavole: 8, mattoni: 8, pietra: 25 }, desc: 'Spacca come un tritacarne', needTool: 'pick', needLvl: 1 },
  { id: 'axe3',        name: 'Ascia del Multiverso', icon: '🪓', out: { tool: 'axe', lvl: 3 }, cost: { ingranaggio: 4, cristallo: 10, tavole: 25 }, desc: 'Il bosco piange al solo vederla', needTool: 'axe', needLvl: 2 },
  { id: 'pick3',       name: 'Piccone Stellare',   icon: '⛏️', out: { tool: 'pick', lvl: 3 }, cost: { ingranaggio: 4, cristallo: 12, mattoni: 30 }, desc: 'Scava fino al cuore delle stelle', needTool: 'pick', needLvl: 2 },
];

/** Una ricetta produce l'attrezzo `lvl` solo se ne possiedi esattamente `lvl - 1`. */
export function recipeUnlocked(state, r) {
  if (r.zone && safeZoneIndex(state.unlockedZone) < r.zone) return false;
  if (r.needTool && toolLevel(state, r.needTool) < r.needLvl) return false;
  return true;
}

export function isRecipeDone(state, r) {
  if (!r.out.tool) return false;
  return toolLevel(state, r.out.tool) >= r.out.lvl;
}

export function canCraft(state, r) {
  if (!recipeUnlocked(state, r)) return false;
  if (r.out.tool && toolLevel(state, r.out.tool) !== r.out.lvl - 1) return false;
  return Object.entries(r.cost).every(([id, n]) => haveOf(state, id) >= n);
}

/** Quantità posseduta di una risorsa; `energia` è la valuta principale. */
export function haveOf(state, id) {
  return id === 'energia' ? state.energy : (state.resources?.[id] || 0);
}

/**
 * Applica una ricetta allo stato, in place.
 * Restituisce false senza toccare nulla se manca qualcosa: così un doppio
 * click su "Craft" non può spendere due volte gli stessi materiali.
 */
export function craftInto(state, r) {
  if (!canCraft(state, r)) return false;
  for (const [id, n] of Object.entries(r.cost)) {
    if (id === 'energia') state.energy -= n;
    else state.resources[id] = (state.resources[id] || 0) - n;
  }
  if (r.out.tool) {
    state.tools[r.out.tool] = r.out.lvl;
  } else {
    for (const [id, n] of Object.entries(r.out)) {
      state.resources[id] = (state.resources[id] || 0) + n;
    }
  }
  return true;
}

/* ------------------------------------------------------------
   7. PREZZI DEL MERCANTE
   ------------------------------------------------------------ */

/** Prezzi base per unità. `oro` è assente di proposito: non si compra. */
export const PRICES = {
  legno:       { sell: 2, buy: 3 },
  pietra:      { sell: 2, buy: 3 },
  tavole:      { sell: 8, buy: 12 },
  mattoni:     { sell: 8, buy: 12 },
  ingranaggio: { sell: 40, buy: 60 },
  cristallo:   { sell: 60, buy: 90 },
};

/**
 * Le zone avanzate pagano di più, sia in vendita sia in acquisto.
 * Il bonus va applicato a entrambi i lati: applicarlo solo alla vendita
 * (com'era) rendeva il prezzo di acquisto sempre conveniente rispetto alla
 * rivendita, e "comprato → rivenduto" diventava energia infinita.
 * I due prezzi base differiscono sempre, quindi il bonus li mantiene
 * ordinati: vedi test/economy.test.mjs.
 */
export function zonePriceBonus(zone) {
  return 1 + safeZoneIndex(zone) * 0.15;
}

export function sellPrice(id, zone) {
  const p = PRICES[id];
  return p ? Math.floor(p.sell * zonePriceBonus(zone)) : 0;
}

export function buyPrice(id, zone) {
  const p = PRICES[id];
  return p ? Math.floor(p.buy * zonePriceBonus(zone)) : 0;
}

/** 100 💠 ↔ Oro. */
export const EXCHANGE = { sell: 25, buy: 40, energy: 100 };

/* ------------------------------------------------------------
   8. STATO E SALVATAGGIO
   ------------------------------------------------------------ */
export const SAVE_KEY = 'gemmondo_save_v1';

/** Incrementare a ogni cambio di forma del salvataggio. */
export const SAVE_VERSION = 2;

export function defaultState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    energy: 0,
    totalEarned: 0,
    gemsCollected: 0,
    zone: 0,
    unlockedZone: 0,
    stars: 0,
    upgrades: {},
    resources: {},
    tools: { axe: 0, pick: 0 },
    lastSave: now,
    started: false,
    muted: false,
  };
}

const finite = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const nonNeg = (v) => Math.max(0, finite(v));

/**
 * Normalizza un salvataggio: numeri finiti e non negativi, indici di zona
 * dentro range, livelli attrezzo clampati. Un save manipolato o di una
 * versione futura non deve mai far crashare il boot.
 */
export function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;

  const version = finite(raw.version, 1);
  const s = { ...base, ...raw };

  s.version = SAVE_VERSION;
  s.energy = nonNeg(raw.energy);
  s.totalEarned = nonNeg(raw.totalEarned);
  s.gemsCollected = Math.floor(nonNeg(raw.gemsCollected));
  s.stars = nonNeg(raw.stars);
  s.zone = safeZoneIndex(raw.zone);
  s.unlockedZone = Math.min(safeZoneIndex(raw.unlockedZone ?? raw.zone), s.zone);
  s.started = !!raw.started;
  s.muted = !!raw.muted;
  s.lastSave = nonNeg(raw.lastSave) || Date.now();

  const upgrades = {};
  for (const u of UPGRADES) {
    const lvl = Math.floor(nonNeg(raw.upgrades?.[u.id]));
    if (lvl > 0) upgrades[u.id] = lvl;
  }
  s.upgrades = upgrades;

  const resources = {};
  for (const id of RESOURCE_IDS) {
    const n = nonNeg(raw.resources?.[id]);
    if (n > 0) resources[id] = n;
  }
  s.resources = resources;

  s.tools = {
    axe: toolLevel(raw, 'axe'),
    pick: toolLevel(raw, 'pick'),
  };

  // v1 → v2: la v1 non aveva né versione né 'muted'. Nient'altro da migrare:
  // i nomi dei campi sono rimasti gli stessi, quindi il merge sopra basta.
  void version;
  return s;
}

/** Legge da localStorage degradando pulito su JSON corrotto o storage negato. */
export function loadState(storage, now = Date.now()) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return defaultState(now);
    return migrate(JSON.parse(raw));
  } catch {
    return defaultState(now);
  }
}

export function serialize(state) {
  return JSON.stringify(state);
}

/** Salva e restituisce l'errore, se ce n'è stato: il chiamante può avvisare. */
export function saveState(storage, state, now = Date.now()) {
  state.lastSave = now;
  try {
    storage?.setItem(SAVE_KEY, serialize(state));
    return null;
  } catch (e) {
    return e;
  }
}

/* ------------------------------------------------------------
   9. RINASCITA (prestige)
   ------------------------------------------------------------ */
export const PRESTIGE_MIN = 1e6;
export const STAR_BONUS = 0.1;

export function starMult(state) {
  return 1 + nonNeg(state.stars) * STAR_BONUS;
}

export function prestigeGain(state) {
  if (state.totalEarned < PRESTIGE_MIN) return 0;
  return Math.floor(Math.pow(state.totalEarned / PRESTIGE_MIN, 0.6));
}

/**
 * Reinventa lo stato dopo l'esplosione.
 * Risorse e attrezzi vengono azzerati: il testo del pannello promette
 * "ricomincia da zero", e senza questo la rinascita non è una rinascita.
 * Restano solo le Stelle, che sono il meta-progresso.
 */
export function applyPrestige(state, gain, now = Date.now()) {
  return {
    ...defaultState(now),
    stars: nonNeg(state.stars) + Math.floor(nonNeg(gain)),
    started: state.started,
    muted: state.muted,
  };
}

/* ------------------------------------------------------------
   10. REDDITO
   ------------------------------------------------------------ */

/** Guadagno per drono al secondo, in unità di "gemme". */
export function droneRate(state) {
  return upgradeValue('drone', state.upgrades?.drone || 0) * 0.35;
}

/** Valore di una gemma normale nella zona corrente. */
export function gemValue(state) {
  return zoneAt(state.zone).base * upgradeValue('value', state.upgrades?.value || 0);
}

/** Valore con il moltiplicatore Stelle. */
export function gemValueWithStars(state) {
  return gemValue(state) * starMult(state);
}

export function incomePerSec(state) {
  return droneRate(state) * gemValue(state) * starMult(state);
}

/* ------------------------------------------------------------
   11. PROGRESSIONE OFFLINE
   ------------------------------------------------------------ */
export const OFFLINE_MIN_SECONDS = 30;
export const OFFLINE_CAP_SECONDS = 8 * 3600;
export const OFFLINE_RATE = 0.5;
export const OFFLINE_HITS = 30;

export function offlineSeconds(state, now = Date.now()) {
  const elapsed = (now - (state.lastSave || 0)) / 1000;
  return elapsed > OFFLINE_MIN_SECONDS ? Math.min(elapsed, OFFLINE_CAP_SECONDS) : 0;
}

/**
 * Quanto si guadagna mentre il gioco era chiuso. Ricalcolato da zero a ogni
 * chiamata sullo stato corrente: così non accumula mai per due volte e resta
 * un'unica fonte di verità per i test.
 */
export function offlineGain(state, now = Date.now()) {
  const seconds = offlineSeconds(state, now);
  if (seconds <= 0) return { seconds: 0, energy: 0, wood: 0, stone: 0 };

  const hours = seconds / 3600;
  return {
    seconds,
    energy: incomePerSec(state) * seconds * OFFLINE_RATE,
    wood: Math.floor(toolStats(state, 'axe').yield * OFFLINE_HITS * OFFLINE_RATE * hours),
    stone: Math.floor(toolStats(state, 'pick').yield * OFFLINE_HITS * OFFLINE_RATE * hours),
  };
}

/* ------------------------------------------------------------
   12. NODI RACCOGLIBILI
   ------------------------------------------------------------ */
export const NODE_HITS = 4;

export function nodeResource(type) {
  return type === 'tree' ? 'legno' : type === 'rock' ? 'pietra' : 'cristallo';
}

export function nodeRespawnMs(type) {
  return type === 'tree' ? 30000 : type === 'rock' ? 26000 : 20000;
}

/** Quanti nodi di ogni tipo per zona: i cristalli richiedono la caverna. */
export function nodeCounts(zone) {
  return { tree: 5, rock: 5, crystal: safeZoneIndex(zone) >= 2 ? 3 : 0 };
}

/** Resa di un colpo. I cristalli danno il 60% della resa dello strumento. */
export function harvestYield(state, type) {
  const stats = toolStats(state, type === 'tree' ? 'axe' : 'pick');
  return type === 'crystal' ? Math.max(1, Math.round(stats.yield * 0.6)) : stats.yield;
}