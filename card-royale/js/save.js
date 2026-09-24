const SAVE_KEY = 'enchanted_clash_save';

export function saveGame(data) {
  try {
    const saveData = {
      ...data,
      timestamp: Date.now()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load game:', e);
    return null;
  }
}

let statsCache = getDefaultStats();

export function getStatsCache() {
  return statsCache;
}

export function saveStats(stats) {
  try {
    localStorage.setItem('enchanted_clash_stats', JSON.stringify(stats));
    statsCache = { ...stats };
  } catch (e) {
    console.warn('Failed to save stats:', e);
  }
}

export function loadStats() {
  try {
    const raw = localStorage.getItem('enchanted_clash_stats');
    if (!raw) {
      statsCache = getDefaultStats();
      return statsCache;
    }
    const parsed = JSON.parse(raw);
    statsCache = { ...getDefaultStats(), ...parsed };
    // Ensure nested defaults
    statsCache.essences = statsCache.essences || {};
    statsCache.weatherTypes = statsCache.weatherTypes || [];
    statsCache.companionsUsed = statsCache.companionsUsed || [];
    statsCache.achievementsUnlocked = statsCache.achievementsUnlocked || [];
    statsCache.cardsPlayed = statsCache.cardsPlayed || {};
    if (!Array.isArray(statsCache.currentDeck) || statsCache.currentDeck.length === 0) {
      statsCache.currentDeck = getDefaultStats().currentDeck;
    }
    if (!Array.isArray(statsCache.unlockedCards) || statsCache.unlockedCards.length === 0) {
      statsCache.unlockedCards = getAllDefaultUnlocked();
    }
    return statsCache;
  } catch (e) {
    statsCache = getDefaultStats();
    return statsCache;
  }
}

function getDefaultStats() {
  return {
    gamesPlayed: 0,
    wins: 0,
    essences: {},
    fusions: 0,
    bossesDefeated: 0,
    weatherTypes: [],
    ultimateUses: 0,
    companionsUsed: [],
    achievementsUnlocked: [],
    highScore: 0,
    losses: 0,
    threeStarWins: 0,
    totalDamageDealt: 0,
    totalHeals: 0,
    cardsPlayed: {},
    currentDeck: [
      'moss_wisp', 'spore_sprout', 'dartling', 'starling_scout',
      'elder_tree', 'moon_fox', 'acorn_bomber', 'breeze_lark'
    ],
    unlockedCards: getAllDefaultUnlocked(),
    difficulty: 'medium'
  };
}

function getAllDefaultUnlocked() {
  return [
    'moss_wisp', 'spore_sprout', 'dartling', 'thorn_bush',
    'starling_scout', 'elder_tree', 'mushroom_circle', 'moon_fox',
    'ancient_oak', 'crystal_deer', 'pixie_queen',
    'heart_seed', 'breeze_lark', 'glow_cap',
    'willow_spirit', 'ember_wing', 'fern_guardian',
    'dew_drop', 'acorn_bomber', 'sylvan_herald', 'dreamweaver'
  ];
}

export function addWinToStats(stats) {
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.wins = (stats.wins || 0) + 1;
  saveStats(stats);
}

export function addLossToStats(stats) {
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.losses = (stats.losses || 0) + 1;
  saveStats(stats);
}

export function addThreeStarWin(stats) {
  stats.threeStarWins = (stats.threeStarWins || 0) + 1;
  saveStats(stats);
}

export function trackCardPlay(stats, cardId) {
  if (!stats.cardsPlayed) stats.cardsPlayed = {};
  if (!stats.cardsPlayed[cardId]) {
    stats.cardsPlayed[cardId] = 0;
  }
  stats.cardsPlayed[cardId]++;
  saveStats(stats);
}

export function saveHighScore(stats) {
  const score = stats.wins * 100 + stats.threeStarWins * 500;
  if (score > (stats.highScore || 0)) {
    stats.highScore = score;
    saveStats(stats);
  }
  return stats.highScore;
}

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem('enchanted_clash_leaderboard');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function addToLeaderboard(name, score) {
  const board = getLeaderboard();
  board.push({ name, score, date: Date.now() });
  board.sort((a, b) => b.score - a.score);
  const trimmed = board.slice(0, 10);
  localStorage.setItem('enchanted_clash_leaderboard', JSON.stringify(trimmed));
  return trimmed;
}
