const NPC_POOL = [
  { id: 'sage', name: 'Saggio', emoji: '🧙', personality: 'Wisdom', desc: 'Insegna una tecnica speciale', tier: 'rare', effect: 'double_xp', reward: { type: 'xp', value: 50 } },
  { id: 'merchant', name: 'Mercante', emoji: '🤵', personality: 'Trade', desc: 'Scambia risorse al 50%', tier: 'uncommon', effect: 'discount', reward: { type: 'coins', value: 30 } },
  { id: 'critic', name: 'Critico', emoji: '🎭', personality: 'Judge', desc: 'Valuta i tuoi pani con 5 stelle', tier: 'common', effect: 'rating', reward: { type: 'rating', value: 5 } },
  { id: 'thief', name: 'Ladra', emoji: '🗡️', personality: 'Deceit', desc: 'Rubaste un po\' di fiocchi', tier: 'rare', effect: 'steal_flour', reward: { type: 'flour_steal', value: 5 } },
  { id: 'traveler', name: 'Viandante', emoji: '🧭', personality: 'Lore', desc: 'Racconta storie del villaggio', tier: 'uncommon', effect: 'lore', reward: { type: 'coins', value: 20 } },
  { id: 'healer', name: 'Curatore', emoji: '💚', personality: 'Heal', desc: 'Ripara tutti i tuoi edifici', tier: 'rare', effect: 'repair_all', reward: { type: 'repair', value: 100 } },
  { id: 'child', name: 'Bambino', emoji: '👶', personality: 'Joy', desc: 'Porta allegria + monete', tier: 'common', effect: 'joy', reward: { type: 'coins', value: 15 } },
  { id: 'blacksmith', name: 'Ferratore', emoji: '🔨', personality: 'Craft', desc: 'Rafforza i tuoi forni', tier: 'epic', effect: 'oven_boost', reward: { type: 'speed_boost', value: 0.2 } },
];

const NPC_PER_DAY = 2;
const NPC_COOLDOWN = 86400000;

let _currentNPCs = [];
let _lastNPCRefresh = 0;
let _visitedNPCs = {};
let _dailyNPCs = [];
let _npcHistory = [];

function getDaySeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function seededRand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function getTodayNPCs() {
  const seed = getDaySeed();
  const shuffled = [...NPC_POOL].sort((a, b) => seededRand(seed + NPC_POOL.indexOf(a)) - seededRand(seed + NPC_POOL.indexOf(b)));
  return shuffled.slice(0, NPC_PER_DAY);
}

export function initNPCs() {
  _currentNPCs = [];
  _lastNPCRefresh = 0;
  _visitedNPCs = {};
  _dailyNPCs = [];
  _npcHistory = [];
}

export function refreshNPCs() {
  const today = new Date().toISOString().split('T')[0];
  if (_lastNPCRefresh === today) return;

  _lastNPCRefresh = today;
  _dailyNPCs = getTodayNPCs();
  _currentNPCs = [..._dailyNPCs];
  _visitedNPCs = {};

  for (const npc of _currentNPCs) {
    _visitedNPCs[npc.id] = false;
  }

  return _currentNPCs;
}

export function getCurrentNPCs() {
  return _currentNPCs;
}

export function getDailyNPCs() {
  return _dailyNPCs;
}

export function getNPCById(id) {
  return NPC_POOL.find(n => n.id === id) || null;
}

export function getAllNPCPool() {
  return NPC_POOL;
}

export function visitNPC(npcId) {
  if (_visitedNPCs[npcId]) return null;
  const npc = getNPCById(npcId);
  if (!npc) return null;

  _visitedNPCs[npcId] = true;
  _npcHistory.push({
    id: npcId,
    name: npc.name,
    visitedAt: Date.now(),
    today: new Date().toISOString().split('T')[0],
  });

  return { npc, visited: true };
}

export function applyNPCEffect(npcId, state) {
  const npc = getNPCById(npcId);
  if (!npc || !_visitedNPCs[npcId]) return null;

  switch (npc.effect) {
    case 'double_xp':
      return { type: 'xp_bonus', value: npc.reward.value, duration: 300000 };
    case 'discount':
      return { type: 'sell_bonus', value: 0.15, duration: 3600000 };
    case 'rating':
      return { type: 'rating_bonus', value: npc.reward.value, duration: 86400000 };
    case 'steal_flour':
      return { type: 'flour_steal', value: npc.reward.value, duration: 0 };
    case 'lore':
      return { type: 'lore_bonus', value: 1, duration: 86400000 };
    case 'repair_all':
      return { type: 'repair_all', value: npc.reward.value, duration: 0 };
    case 'joy':
      return { type: 'joy_bonus', value: npc.reward.value, duration: 3600000 };
    case 'oven_boost':
      return { type: 'oven_boost', value: npc.reward.value, duration: 7200000 };
    default:
      return null;
  }
}

export function isNPCRefreshed(today) {
  return _lastNPCRefresh === today;
}

export function getLastNPCRefresh() {
  return _lastNPCRefresh;
}

export function getVisitedNPCs() {
  return _visitedNPCs;
}

export function isNPCVisited(npcId) {
  return !!_visitedNPCs[npcId];
}

export function getNPCHistory() {
  return _npcHistory.slice(-30);
}

export function getNPCCountToday() {
  const today = new Date().toISOString().split('T')[0];
  return _npcHistory.filter(h => h.today === today).length;
}

export function getNPCPersonalityEmoji(personality) {
  const map = {
    Wisdom: '🧠', Trade: '💰', Judge: '⚖️', Deceit: '👁️',
    Lore: '📖', Heal: '💚', Joy: '😊', Craft: '⚒️'
  };
  return map[personality] || '❓';
}

export function getNPCRarityColor(tier) {
  const colors = {
    common: '#95a5a6', uncommon: '#3498db', rare: '#9b59b6', epic: '#e67e22', legendary: '#e74c3c'
  };
  return colors[tier] || '#95a5a6';
}

export function getNPCRarityEmoji(tier) {
  const emojis = { common: '🗡️', uncommon: '🛡️', rare: '💎', epic: '🔥', legendary: '👑' };
  return emojis[tier] || '';
}

export function getNPCsByTier(tier) {
  return NPC_POOL.filter(n => n.tier === tier);
}

export function getActiveNPCEffects() {
  const effects = [];
  for (const [npcId, visited] of Object.entries(_visitedNPCs)) {
    if (visited) {
      const npc = getNPCById(npcId);
      if (npc) {
        effects.push({ npc, effect: npc.effect, ...applyNPCEffect(npcId, null) });
      }
    }
  }
  return effects;
}

export function loadNPCState(saved) {
  if (!saved) return;
  if (saved._currentNPCs) _currentNPCs = saved._currentNPCs;
  if (saved._lastNPCRefresh) _lastNPCRefresh = saved._lastNPCRefresh;
  if (saved._visitedNPCs) _visitedNPCs = saved._visitedNPCs;
  if (saved._dailyNPCs) _dailyNPCs = saved._dailyNPCs;
  if (saved._npcHistory) _npcHistory = saved._npcHistory;
}

export function getNPCSaveState() {
  return {
    _currentNPCs,
    _lastNPCRefresh,
    _visitedNPCs,
    _dailyNPCs,
    _npcHistory,
  };
}

export function resetNPCs() {
  initNPCs();
}

export function getNPCTodaySummary() {
  const today = new Date().toISOString().split('T')[0];
  const visited = Object.entries(_visitedNPCs).filter(([_, v]) => v).length;
  const total = _dailyNPCs.length;
  return { today, visited, total, history: getNPCHistory().slice(-5) };
}

export function getNPCRate(today) {
  const current = getNPCCountToday();
  const max = _dailyNPCs.length * 7;
  if (max === 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

export function getAllNPCEffects(state) {
  const effects = [];
  for (const [npcId, visited] of Object.entries(_visitedNPCs)) {
    if (visited) {
      const npc = getNPCById(npcId);
      if (npc && state) {
        const effect = applyNPCEffect(npcId, state);
        if (effect) {
          effects.push({ ...effect, npcId, npcName: npc.name, npcEmoji: npc.emoji });
        }
      }
    }
  }
  return effects;
}
