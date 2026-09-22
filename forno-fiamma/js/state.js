import { INGREDIENTS } from './data.js';

let _state = null;

export function freshState() {
  return {
    version: 1,
    meta: { created: Date.now(), last: Date.now() },
    player: {
      name: 'Panettiere',
      level: 1,
      xp: 0,
      coins: 50,
      flour: 10,
      maxOvens: 3,
    },
    ovens: [
      { id: 0, recipeId: null, progress: 0, done: false, last_tick: Date.now(), ovenType: 'forno_cotto' },
      { id: 1, recipeId: null, progress: 0, done: false, last_tick: Date.now(), ovenType: 'forno_cotto' },
      { id: 2, recipeId: null, progress: 0, done: false, last_tick: Date.now(), ovenType: 'forno_cotto' },
    ],
    ingredients: Object.fromEntries(
      Object.entries(INGREDIENTS).map(([k, v]) => [k, { stock: Math.floor(v.maxStock * 0.5), last_regen: Date.now() }])
    ),
    inventory: { pane_base: 0 },
    collection: { recipes: {}, ovens: {}, helpers: {} },
    mutations: {},
    genetic: { catalog: {}, lineages: {}, stats: { totalBakes: 0, mutationsDiscovered: 0, lineagesCreated: 0, legendaryMutations: 0 }, catalogSize: 0 },
    alchemy: { cauldron: [], lastAlchemyTime: 0, discoveredRecipes: {} },
    gamification: { achievements: {}, mysteries: {}, mysteriesSolved: 0, ratingsGiven: 0, loginDays: 0, offlineSessions: 0, lastLoginDate: null },
    helpers: [],
    upgrades: [],
    gacha: { pity: 0, totalPulls: 0 },
    fields: [],
    village: { grid: [], buildings: [] },
    settings: { sound: true, music: false },
    dream: { isDreamMode: false, starsCollected: 0, starsEarned: 0, totalBakes: 0, recipesBaked: {}, npcs: [], startTime: 0 },
    construction: { materials: {}, buildings: {}, queue: [], lastDeterioration: 0, buildInProgress: false },
    npcs: { currentNPCs: [], lastRefresh: '', visitedNPCs: {}, history: [] },
    regional: { currentRegion: null, detected: false, history: [], bonuses: {}, recipesBaked: {} },
  };
}

export function getState() { return _state; }

export function setState(s) { _state = s; }

export function init() {
  const saved = load();
  if (saved) {
    _state = migrate(saved);
  } else {
    _state = freshState();
  }
  return _state;
}

export function serialize() {
  if (!_state) return null;
  _state.meta.last = Date.now();
  return JSON.stringify(_state);
}

export function deserialize(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function load() {
  try {
    const raw = localStorage.getItem('forno_fiamma_v1');
    if (!raw) return null;
    return deserialize(raw);
  } catch {
    return null;
  }
}

export function save() {
  const json = serialize();
  if (json) {
    try {
      const encoded = json + '';
      localStorage.setItem('forno_fiamma_v1', encoded);
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn('[FornoFiamma] localStorage full. Attempting cleanup...');
        try {
          const old = localStorage.getItem('forno_fiamma_v1_old');
          if (!old) {
            localStorage.setItem('forno_fiamma_v1_old', json);
            localStorage.removeItem('forno_fiamma_v1');
            localStorage.setItem('forno_fiamma_v1', json);
          }
        } catch {}
        console.error('[FornoFiamma] Save failed. Data may be lost.');
      }
    }
  }
}

function migrate(s) {
  if (!s.version || s.version < 1) {
    return { ...freshState(), ...s, version: 1 };
  }
  return s;
}

export function xpForLevel(lvl) {
  return Math.floor(100 * Math.pow(lvl, 1.5));
}

export function addXp(amount) {
  const p = _state.player;
  p.xp += amount;
  let leveled = false;
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    leveled = true;
  }
  return leveled;
}

export function hasUpgrade(id) {
  return _state.upgrades.includes(id);
}

export function hasHelper(id) {
  return _state.helpers.includes(id);
}

export function getBakedMutations(recipeId, mutationsKey) {
  if (!_state.mutations[mutationsKey]) return null;
  return _state.mutations[mutationsKey];
}

export function setBakedMutations(recipeId, mutationsKey, mutations) {
  _state.mutations[mutationsKey] = mutations;
}

export function getRecipeMutationCount(recipeId) {
  const data = getRecipeMutationData(recipeId);
  return data ? Object.keys(data).length : 0;
}

export function getAlchemyState() {
  return _state.alchemy;
}

export function setAlchemyState(alchemyData) {
  _state.alchemy = alchemyData;
}

export function updateAlchemyCauldron(ingredients) {
  _state.alchemy.cauldron = ingredients;
}

export function updateAlchemyCooldown(time) {
  _state.alchemy.lastAlchemyTime = time;
}

export function getGamificationData() {
  return _state.gamification;
}

export function updateGamificationData(data) {
  _state.gamification = { ..._state.gamification, ...data };
}

export function recordAchievement(achievementId) {
  _state.gamification.achievements[achievementId] = { unlockedAt: Date.now() };
}

export function recordMysterySolved() {
  _state.gamification.mysteriesSolved++;
}

export function recordRating() {
  _state.gamification.ratingsGiven++;
}

export function getDreamState() {
  return _state.dream;
}

export function updateDreamState(data) {
  _state.dream = { ..._state.dream, ...data };
}

export function recordDreamBake(recipeId) {
  if (!_state.dream.recipesBaked) _state.dream.recipesBaked = {};
  _state.dream.totalBakes++;
  _state.dream.recipesBaked[recipeId] = (_state.dream.recipesBaked[recipeId] || 0) + 1;
}

export function recordDreamStar() {
  _state.dream.starsCollected++;
  _state.dream.starsEarned++;
}

export function getConstructionData() {
  return _state.construction;
}

export function updateConstructionData(data) {
  _state.construction = { ..._state.construction, ...data };
}

export function recordConstructionMaterials(materials) {
  _state.construction.materials = { ...materials };
}

export function recordConstructionBuilding(buildingId, data) {
  _state.construction.buildings[buildingId] = data;
}

export function getNPCData() {
  return _state.npcs;
}

export function updateNPCData(data) {
  _state.npcs = { ..._state.npcs, ...data };
}

export function recordNPCRefresh(date, npcs) {
  _state.npcs.lastRefresh = date;
  _state.npcs.currentNPCs = npcs;
}

export function recordNPCVisit(npcId) {
  _state.npcs.visitedNPCs[npcId] = true;
  _state.npcs.history.push({ npcId, visitedAt: Date.now() });
}

export function getRegionalState() {
  return _state.regional;
}

export function updateRegionalState(data) {
  _state.regional = { ..._state.regional, ...data };
}

export function recordRegionalRegion(regionId) {
  _state.regional.currentRegion = regionId;
  _state.regional.detected = true;
}

export function recordRegionalHistory(history) {
  _state.regional.history = history;
}

export function recordRegionalBonus(ingredient, bonus) {
  _state.regional.bonuses[ingredient] = bonus;
}

export function recordRegionalBake(regionId, recipeId) {
  if (!_state.regional.recipesBaked[regionId]) _state.regional.recipesBaked[regionId] = {};
  _state.regional.recipesBaked[regionId][recipeId] = (_state.regional.recipesBaked[regionId][recipeId] || 0) + 1;
}

export function getGeneticState() {
  return _state.genetic;
}

export function updateGeneticState(data) {
  _state.genetic = { ..._state.genetic, ...data };
}

export function recordCatalogEntry(mutation) {
  const key = mutation.type + '_' + mutation.value;
  if (!_state.genetic.catalog[key]) {
    _state.genetic.catalog[key] = mutation;
    _state.genetic.catalogSize++;
    _state.genetic.stats.mutationsDiscovered++;
    if (mutation.powerLevel === 'legendary') _state.genetic.stats.legendaryMutations++;
  }
}

export function recordLineage(lineageId, lineage) {
  _state.genetic.lineages[lineageId] = lineage;
  _state.genetic.stats.lineagesCreated++;
}

export function recordGeneticBake(count) {
  _state.genetic.stats.totalBakes += count;
}


