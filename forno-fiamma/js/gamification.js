const ACHIEVEMENT_DEFS = [
  { id: 'first_bake', name: 'Primo Forno', desc: 'Sforna il tuo primo pane', icon: '🍞', check: (s) => s.inventory && Object.values(s.inventory).some(q => q > 0) },
  { id: 'baker_10', name: 'Fornaio', desc: 'Sforna 10 pane', icon: '👨‍🍳', check: (s) => Object.values(s.inventory).reduce((a, b) => a + b, 0) >= 10 },
  { id: 'baker_50', name: 'Master Fornaio', desc: 'Sforna 50 pane', icon: '🏆', check: (s) => Object.values(s.inventory).reduce((a, b) => a + b, 0) >= 50 },
  { id: 'baker_100', name: 'Leggenda Viva', desc: 'Sforna 100 pane', icon: '👑', check: (s) => Object.values(s.inventory).reduce((a, b) => a + b, 0) >= 100 },
  { id: 'level_5', name: 'Apprendista', desc: 'Raggiungi livello 5', icon: '⭐', check: (s) => s.player.level >= 5 },
  { id: 'level_10', name: 'Artigiano', desc: 'Raggiungi livello 10', icon: '🌟', check: (s) => s.player.level >= 10 },
  { id: 'level_20', name: 'Maestro', desc: 'Raggiungi livello 20', icon: '💎', check: (s) => s.player.level >= 20 },
  { id: 'level_30', name: 'Immortale', desc: 'Raggiungi livello 30', icon: '🌌', check: (s) => s.player.level >= 30 },
  { id: 'coins_100', name: 'Tesoriere', desc: 'Raccogli 100 monete', icon: '💰', check: (s) => s.player.coins >= 100 },
  { id: 'coins_500', name: 'Magnate', desc: 'Raccogli 500 monete', icon: '💸', check: (s) => s.player.coins >= 500 },
  { id: 'oven_3', name: 'Primo Forno', desc: 'Hai 3 forni', icon: '🔥', check: (s) => s.player.maxOvens >= 3 },
  { id: 'oven_5', name: 'Panificio', desc: 'Hai 5 forni', icon: '🏪', check: (s) => s.player.maxOvens >= 5 },
  { id: 'oven_8', name: 'Fabbrica', desc: 'Hai 8 forni', icon: '🏭', check: (s) => s.player.maxOvens >= 8 },
  { id: 'helper_3', name: 'Compagno', desc: 'Assumi 3 aiutanti', icon: '🐱', check: (s) => s.helpers && s.helpers.length >= 3 },
  { id: 'helper_5', name: 'Esercito', desc: 'Assumi 5 aiutanti', icon: '🐕', check: (s) => s.helpers && s.helpers.length >= 5 },
  { id: 'upgrade_3', name: 'Investitore', desc: 'Acquista 3 upgrade', icon: '⬆️', check: (s) => s.upgrades && s.upgrades.length >= 3 },
  { id: 'upgrade_6', name: 'Collezionista', desc: 'Acquista 6 upgrade', icon: '💎', check: (s) => s.upgrades && s.upgrades.length >= 6 },
  { id: 'recipe_5', name: 'Esploratore', desc: 'Scopri 5 ricette', icon: '📖', check: (s) => s.collection && s.collection.recipes && Object.keys(s.collection.recipes).length >= 5 },
  { id: 'recipe_10', name: 'Gastronomo', desc: 'Scopri 10 ricette', icon: '🍽️', check: (s) => s.collection && s.collection.recipes && Object.keys(s.collection.recipes).length >= 10 },
  { id: 'recipe_all', name: 'Enciclopedista', desc: 'Scopri tutte le ricette', icon: '📚', check: (s) => s.collection && s.collection.recipes && Object.keys(s.collection.recipes).length >= 20 },
  { id: 'gacha_5', name: 'Tiratore', desc: 'Tira il gacha 5 volte', icon: '🎰', check: (s) => s.gacha && s.gacha.totalPulls >= 5 },
  { id: 'gacha_20', name: 'Fortunato', desc: 'Tira il gacha 20 volte', icon: '🍀', check: (s) => s.gacha && s.gacha.totalPulls >= 20 },
  { id: 'rare_floor', name: 'Piano Raro', desc: 'Ottieni un forno raro', icon: '🪨', check: (s) => s.collection && s.collection.ovens && Object.keys(s.collection.ovens).some(id => getOvenTier(id) === 'rare') },
  { id: 'legendary_floor', name: 'Piano Leggendario', desc: 'Ottieni un forno leggendario', icon: '⭐', check: (s) => s.collection && s.collection.ovens && Object.keys(s.collection.ovens).some(id => getOvenTier(id) === 'legendary') },
  { id: 'mystery_solve', name: 'Detective', desc: 'Risolvi un mistero', icon: '🔍', check: (s) => s.gamification && s.gamification.mysteriesSolved >= 1 },
  { id: 'mystery_5', name: 'Investigatore', desc: 'Risolvi 5 misteri', icon: '🕵️', check: (s) => s.gamification && s.gamification.mysteriesSolved >= 5 },
  { id: 'rate_5', name: 'Critico', desc: 'Valuta 5 pane', icon: '⭐', check: (s) => s.gamification && s.gamification.ratingsGiven >= 5 },
  { id: 'rate_20', name: 'Critico Stellato', desc: 'Valuta 20 pane', icon: '🌟', check: (s) => s.gamification && s.gamification.ratingsGiven >= 20 },
  { id: 'offline_30', name: 'Viaggiatore', desc: 'Rientra dopo 30min offline', icon: '🌍', check: (s) => s.gamification && s.gamification.offlineSessions >= 1 },
  { id: 'flour_100', name: 'Molinario', desc: 'Raccogli 100 fiocchi', icon: '🥜', check: (s) => s.player.flour >= 100 },
  { id: 'daily_login', name: 'Fedele', desc: 'Torna ogni giorno per 3 giorni', icon: '📅', check: (s) => s.gamification && s.gamification.loginDays >= 3 },
];

const MYSTERY_TEMPLATES = [
  { id: 'mystery_spring', name: 'Fioritura Primaverile', desc: 'Sforna 5 pane con ingredienti fioriti (rosmarino, fiori) entro 24h', icon: '🌸', timer: 86400000, condition: (s) => Object.values(s.inventory).reduce((a, b) => a + b, 0) >= 5 && hasIngredient(s, 'rosmarino'), reward: 50 },
  { id: 'mystery_dawn', name: 'Alba Dorata', desc: 'Sforna un pane con miele e zafferano entro 12h', icon: '🌅', timer: 43200000, condition: (s) => hasBread(s), reward: 100 },
  { id: 'mystery_storm', name: 'Tempesta di Farina', desc: 'Sforna 3 pane in un solo giorno', icon: '🌪️', timer: 86400000, condition: (s) => getDailyBakes(s) >= 3, reward: 75 },
  { id: 'mystery_hunt', name: 'Caccia al Tesoro', desc: 'Tira il gacha 3 volte in un giorno', icon: '🎯', timer: 86400000, condition: (s) => getDailyPulls(s) >= 3, reward: 200 },
  { id: 'mystery_master', name: 'Sfida del Maestro', desc: 'Raggiungi livello 15 in una settimana', icon: '⚔️', timer: 604800000, condition: (s) => s.player.level >= 15, reward: 500 },
  { id: 'mystery_collector', name: 'Collezionista Instancabile', desc: 'Scopri 10 ricette in 3 giorni', icon: '📦', timer: 259200000, condition: (s) => Object.keys(s.collection.recipes || {}).length >= 10, reward: 300 },
  { id: 'mystery_baker', name: 'Forno Infinito', desc: 'Sforna 20 pane in 48h', icon: '🔥', timer: 172800000, condition: (s) => Object.values(s.inventory).reduce((a, b) => a + b, 0) >= 20, reward: 150 },
];

let _achievements = {};
let _mysteries = {};
let _dailyBakes = {};
let _dailyPulls = {};
let _ratingCount = 0;
let _loginDays = 0;
let _offlineSessions = 0;
let _lastLoginDate = null;

const OVEN_TIERS = { forno_cotto: 'common', forno_legna: 'common', forno_pietra: 'uncommon', forno_napoletano: 'rare', forno_medievale: 'rare', forno_marmo: 'rare', forno_biscotti: 'uncommon', forno_forno: 'epic', forno_solare: 'epic', forno_volcanico: 'legendary' };

function getOvenTier(id) {
  return OVEN_TIERS[id] || null;
}

function hasIngredient(state, ingredientId) {
  return state.ingredients && state.ingredients[ingredientId] && state.ingredients[ingredientId].stock > 0;
}

function hasBread(state) {
  return state.inventory && Object.entries(state.inventory).some(([id, qty]) => qty > 0 && id.startsWith('pane'));
}

function getDailyBakes(state) {
  const today = new Date().toISOString().split('T')[0];
  if (!_dailyBakes[today]) _dailyBakes[today] = 0;
  return _dailyBakes[today];
}

function getDailyPulls(state) {
  const today = new Date().toISOString().split('T')[0];
  if (!_dailyPulls[today]) _dailyPulls[today] = 0;
  return _dailyPulls[today];
}

export function getAchievements() {
  return _achievements;
}

export function getMysteries() {
  return _mysteries;
}

export function getDailyBakes() {
  return _dailyBakes;
}

export function getDailyPulls() {
  return _dailyPulls;
}

export function getRatingCount() {
  return _ratingCount;
}

export function getLoginDays() {
  return _loginDays;
}

export function getOfflineSessions() {
  return _offlineSessions;
}

export function getGamificationState() {
  return {
    achievements: _achievements,
    mysteries: _mysteries,
    dailyBakes: _dailyBakes,
    dailyPulls: _dailyPulls,
    ratingCount: _ratingCount,
    loginDays: _loginDays,
    offlineSessions: _offlineSessions,
    lastLoginDate: _lastLoginDate,
  };
}

export function checkAchievements(state) {
  const newlyUnlocked = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (_achievements[def.id]) continue;
    try {
      if (def.check(state)) {
        _achievements[def.id] = {
          id: def.id,
          name: def.name,
          desc: def.desc,
          icon: def.icon,
          unlockedAt: Date.now(),
        };
        newlyUnlocked.push(_achievements[def.id]);
      }
    } catch (e) {
      console.warn('[Gamification] Achievement check failed:', def.id, e);
    }
  }
  return newlyUnlocked;
}

export function unlockMystery(mysteryId, mysteryData) {
  _mysteries[mysteryId] = {
    ...mysteryData,
    active: true,
    startedAt: Date.now(),
    solved: false,
  };
}

export function solveMystery(mysteryId, state) {
  const mystery = _mysteries[mysteryId];
  if (!mystery || !mystery.active || mystery.solved) return null;

  const template = MYSTERY_TEMPLATES.find(m => m.id === mysteryId);
  if (!template) return null;

  const condition = template.condition;
  let isComplete = false;
  try {
    isComplete = condition(state);
  } catch (e) {
    console.warn('[Gamification] Mystery condition failed:', mysteryId, e);
    return null;
  }

  if (!isComplete) return null;

  mystery.solved = true;
  mystery.solvedAt = Date.now();
  _offlineSessions = 0;

  return { mystery, reward: template.reward };
}

export function getActiveMysteries() {
  return Object.values(_mysteries).filter(m => m.active && !m.solved);
}

export function getDailyMystery() {
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').join('');
  const idx = parseInt(seed) % MYSTERY_TEMPLATES.length;
  return MYSTERY_TEMPLATES[idx];
}

export function recordBake() {
  const today = new Date().toISOString().split('T')[0];
  _dailyBakes[today] = (_dailyBakes[today] || 0) + 1;
}

export function recordPull() {
  const today = new Date().toISOString().split('T')[0];
  _dailyPulls[today] = (_dailyPulls[today] || 0) + 1;
}

export function recordRating() {
  _ratingCount++;
}

export function recordLogin() {
  const today = new Date().toISOString().split('T')[0];
  if (_lastLoginDate && _lastLoginDate !== today) {
    _loginDays++;
  } else if (!_lastLoginDate) {
    _loginDays = 1;
  }
  _lastLoginDate = today;
}

export function recordOffline() {
  _offlineSessions++;
}

export function getTotalBakes(state) {
  return Object.values(state.inventory || {}).reduce((a, b) => a + b, 0);
}

export function getGamificationDef(id) {
  return ACHIEVEMENT_DEFS.find(a => a.id === id) || null;
}

export function getAllAchievementDefs() {
  return ACHIEVEMENT_DEFS;
}

export function getAllMysteryDefs() {
  return MYSTERY_TEMPLATES;
}

export function getAchievementProgress(state) {
  return ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    unlocked: !!_achievements[def.id],
  }));
}

export function getMysteryProgress(state) {
  const active = getActiveMysteries();
  return active.map(mystery => {
    const template = MYSTERY_TEMPLATES.find(t => t.id === mystery.id);
    let progress = 0;
    let total = 1;
    try {
      if (template) {
        if (template.id === 'mystery_spring') progress = Object.values(state.inventory || {}).reduce((a, b) => a + b, 0);
        else if (template.id === 'mystery_dawn') progress = Object.values(state.inventory || {}).filter(([id, q]) => q > 0 && id.startsWith('pane')).length;
        else if (template.id === 'mystery_storm') progress = getDailyBakes(state);
        else if (template.id === 'mystery_hunt') progress = getDailyPulls(state);
        else if (template.id === 'mystery_master') progress = state.player.level;
        else if (template.id === 'mystery_collector') progress = Object.keys(state.collection?.recipes || {}).length;
        else if (template.id === 'mystery_baker') progress = getTotalBakes(state);
        total = template.id === 'mystery_master' ? 15 : template.id === 'mystery_collector' ? 10 : template.id === 'mystery_baker' ? 20 : template.id === 'mystery_storm' ? 3 : template.id === 'mystery_dawn' ? 1 : template.id === 'mystery_spring' ? 5 : template.id === 'mystery_hunt' ? 3 : 1;
      }
    } catch (e) {}
    return { mystery, progress, total };
  });
}

export function loadGamificationState(saved) {
  if (!saved) return;
  if (saved._achievements) _achievements = saved._achievements;
  if (saved._mysteries) _mysteries = saved._mysteries;
  if (saved._dailyBakes) _dailyBakes = saved._dailyBakes;
  if (saved._dailyPulls) _dailyPulls = saved._dailyPulls;
  if (saved._ratingCount !== undefined) _ratingCount = saved._ratingCount;
  if (saved._loginDays !== undefined) _loginDays = saved._loginDays;
  if (saved._offlineSessions !== undefined) _offlineSessions = saved._offlineSessions;
  if (saved._lastLoginDate) _lastLoginDate = saved._lastLoginDate;
}

export function getGamificationSaveState() {
  return {
    _achievements,
    _mysteries,
    _dailyBakes,
    _dailyPulls,
    _ratingCount,
    _loginDays,
    _offlineSessions,
    _lastLoginDate,
  };
}

export function getAchievementRarity(achievementId) {
  const def = getGamificationDef(achievementId);
  if (!def) return 'common';
  if (def.id.includes('legendary') || def.id.includes('Immortale') || def.id.includes('Enciclopedista')) return 'legendary';
  if (def.id.includes('rare') || def.id.includes('Master') || def.id.includes('Maestro')) return 'rare';
  if (def.id.includes('uncommon') || def.id.includes('Esploratore') || def.id.includes('Artigiano')) return 'uncommon';
  return 'common';
}

export function resetGamification() {
  _achievements = {};
  _mysteries = {};
  _dailyBakes = {};
  _dailyPulls = {};
  _ratingCount = 0;
  _loginDays = 0;
  _offlineSessions = 0;
  _lastLoginDate = null;
}
