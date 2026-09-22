const DREAM_HOUR_START = 22;
const DREAM_HOUR_END = 6;
const STARS_MAX = 20;
const STAR_COLLECT_TIME = 5000;

const DREAM_RECIPES = [
  { id: 'sogno_lieve', name: 'Sogno Lieve', emoji: '🌙', tier: 'common', bakeTime: 25, sellPrice: 15, xp: 12, ingredients: { farina: 2, miele: 1, acqua: 1 } },
  { id: 'sogno_dentro', name: 'Sogno Dentro', emoji: '💭', tier: 'uncommon', bakeTime: 40, sellPrice: 25, xp: 20, ingredients: { farina: 3, cioccolato: 1, uova: 1, rosmarino: 1 } },
  { id: 'sogno_profondo', name: 'Sogno Profondo', emoji: '🌌', tier: 'rare', bakeTime: 60, sellPrice: 40, xp: 35, ingredients: { farina: 4, miele: 2, cioccolato: 2, mandorle: 1 } },
  { id: 'sogno_eterno', name: 'Sogno Eterno', emoji: '✨', tier: 'legendary', bakeTime: 120, sellPrice: 80, xp: 70, ingredients: { farina: 6, miele: 3, cioccolato: 3, mandorle: 2, romano: 1 } },
  { id: 'sogno_fuggente', name: 'Sogno Fuggente', emoji: '💫', tier: 'rare', bakeTime: 50, sellPrice: 35, xp: 30, ingredients: { farina: 3, zucchero: 2, uova: 1, scorza: 1 } },
  { id: 'sogno_alba', name: 'Sogno Alba', emoji: '🌅', tier: 'legendary', bakeTime: 90, sellPrice: 60, xp: 50, ingredients: { farina: 5, miele: 2, cioccolato: 2, rosmarino: 2, mandorle: 1 } },
];

const DREAM_NPCS = [
  { id: 'sogno_saggio', name: 'Sogno Saggio', emoji: '🧙', desc: 'Insegna ricette speciali', tier: 'rare' },
  { id: 'sogno_viandante', name: 'Sogno Viandante', emoji: '🧭', desc: 'Racconta storie del villaggio', tier: 'uncommon' },
  { id: 'sogno_ladra', name: 'Sogno Ladra', emoji: '🗡️', desc: 'Rubasta stelle per ricette', tier: 'rare' },
  { id: 'sogno_stella', name: 'Sogno Stella', emoji: '⭐', desc: 'Dona stelle cadenti', tier: 'legendary' },
];

let _isDreamMode = false;
let _dreamStars = [];
let _dreamStarsCollected = 0;
let _dreamNpcs = [];
let _lastDreamCheck = 0;
let _dreamStartTime = 0;
let _dreamTotalBakes = 0;
let _dreamStarsEarned = 0;
let _dreamRecipesBaked = {};

function isNightTime() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= DREAM_HOUR_START || hour < DREAM_HOUR_END;
}

function seededRand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export function isDreamMode() {
  return _isDreamMode;
}

export function isNightTimeExternal() {
  return isNightTime();
}

export function updateDreamMode(state) {
  const now = Date.now();
  if (now - _lastDreamCheck < 60000) return;
  _lastDreamCheck = now;

  const night = isNightTime();
  if (night !== _isDreamMode) {
    _isDreamMode = night;
    _dreamStartTime = now;
    if (night) {
      _dreamStars = [];
      _dreamStarsCollected = 0;
      _dreamNpcs = [];
      spawnDreamNPCs();
    }
  }
  return _isDreamMode;
}

export function toggleDreamMode() {
  _isDreamMode = !_isDreamMode;
  _dreamStartTime = Date.now();
  if (_isDreamMode) {
    _dreamStars = [];
    _dreamStarsCollected = 0;
    _dreamNpcs = [];
    spawnDreamNPCs();
  }
  return _isDreamMode;
}

function spawnDreamNPCs() {
  const seed = Math.floor(Date.now() / 3600000);
  const npcCount = 1 + Math.floor(seededRand(seed) * 2);
  _dreamNpcs = [];
  for (let i = 0; i < npcCount && i < DREAM_NPCS.length; i++) {
    _dreamNpcs.push({
      ...DREAM_NPCS[i],
      appearedAt: Date.now(),
      visited: false,
    });
  }
}

export function getDreamNPCs() {
  return _dreamNpcs;
}

export function visitDreamNPC(npcId, state) {
  const npc = _dreamNpcs.find(n => n.id === npcId);
  if (!npc || npc.visited) return null;
  npc.visited = true;

  const rewards = {
    sogno_saggio: { type: 'recipe', id: 'sogno_lieve' },
    sogno_viandante: { type: 'coins', amount: 30 },
    sogno_ladra: { type: 'stars', amount: 3 },
    sogno_stella: { type: 'stars', amount: 5 },
  };

  const reward = rewards[npcId];
  if (!reward) return null;

  return { npc, reward };
}

export function getDreamStars() {
  return _dreamStars;
}

export function getDreamStarsCollected() {
  return _dreamStarsCollected;
}

export function getDreamStarsEarned() {
  return _dreamStarsEarned;
}

export function getDreamTotalBakes() {
  return _dreamTotalBakes;
}

export function getDreamRecipesBaked() {
  return _dreamRecipesBaked;
}

export function generateDreamStars(count) {
  const seed = Math.floor(Date.now() / 1000);
  _dreamStars = [];
  for (let i = 0; i < count; i++) {
    _dreamStars.push({
      id: i,
      x: seededRand(seed + i) * 80 + 10,
      y: seededRand(seed + i + 100) * 60 + 20,
      size: seededRand(seed + i + 200) * 8 + 6,
      speed: seededRand(seed + i + 300) * 2 + 1,
      collected: false,
      sparkle: seededRand(seed + i + 400) > 0.5,
    });
  }
  return _dreamStars;
}

export function collectDreamStar(starId) {
  const star = _dreamStars.find(s => s.id === starId);
  if (!star || star.collected) return null;
  star.collected = true;
  _dreamStarsCollected++;
  _dreamStarsEarned++;
  return star;
}

export function recordDreamBake(recipeId) {
  _dreamTotalBakes++;
  if (!_dreamRecipesBaked[recipeId]) _dreamRecipesBaked[recipeId] = 0;
  _dreamRecipesBaked[recipeId]++;
}

export function getDreamRecipes() {
  return DREAM_RECIPES;
}

export function getDreamRecipe(id) {
  return DREAM_RECIPES.find(r => r.id === id) || null;
}

export function getAllDreamRecipes() {
  return DREAM_RECIPES;
}

export function getDreamNPCDefs() {
  return DREAM_NPCS;
}

export function getDreamState() {
  return {
    isDreamMode: _isDreamMode,
    dreamStarsCollected: _dreamStarsCollected,
    dreamStarsEarned: _dreamStarsEarned,
    dreamTotalBakes: _dreamTotalBakes,
    dreamRecipesBaked: _dreamRecipesBaked,
    dreamNpcs: _dreamNpcs,
    dreamStartTime: _dreamStartTime,
  };
}

export function loadDreamState(saved) {
  if (!saved) return;
  if (saved._isDreamMode !== undefined) _isDreamMode = saved._isDreamMode;
  if (saved._dreamStarsCollected !== undefined) _dreamStarsCollected = saved._dreamStarsCollected;
  if (saved._dreamStarsEarned !== undefined) _dreamStarsEarned = saved._dreamStarsEarned;
  if (saved._dreamTotalBakes !== undefined) _dreamTotalBakes = saved._dreamTotalBakes;
  if (saved._dreamRecipesBaked) _dreamRecipesBaked = saved._dreamRecipesBaked;
  if (saved._dreamNpcs) _dreamNpcs = saved._dreamNpcs;
  if (saved._dreamStartTime) _dreamStartTime = saved._dreamStartTime;
}

export function getDreamSaveState() {
  return {
    _isDreamMode,
    _dreamStarsCollected,
    _dreamStarsEarned,
    _dreamTotalBakes,
    _dreamRecipesBaked,
    _dreamNpcs,
    _dreamStartTime,
  };
}

export function resetDreamMode() {
  _isDreamMode = false;
  _dreamStars = [];
  _dreamStarsCollected = 0;
  _dreamStarsEarned = 0;
  _dreamTotalBakes = 0;
  _dreamRecipesBaked = {};
  _dreamNpcs = [];
  _dreamStartTime = 0;
}

export function getTimeUntilDream() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const startMinutes = DREAM_HOUR_START * 60;
  const endMinutes = DREAM_HOUR_END * 60;

  if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
    return 0;
  }
  return (startMinutes - currentMinutes) * 60 * 1000;
}

export function getDreamHoursRemaining() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const startMinutes = DREAM_HOUR_START * 60;

  if (currentMinutes >= startMinutes) {
    return ((24 - currentMinutes + startMinutes) / 60).toFixed(1);
  } else if (currentMinutes < endMinutes) {
    return ((endMinutes - currentMinutes) / 60).toFixed(1);
  }
  return ((startMinutes - currentMinutes) / 60).toFixed(1);
}
