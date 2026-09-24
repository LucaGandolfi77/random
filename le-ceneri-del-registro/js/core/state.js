const KEY = 'ceneri.save.v1';
const SET_KEY = 'ceneri.settings.v1';

export function defaultState() {
  return {
    version: 1,
    chapter: 0,
    scene: 0,
    completed: [],
    fragments: [],
    quizDone: [],
    gamesWon: [],
    glossaryUnlocked: [],
    flags: {},
    endings: [],
    achievements: [],
    stats: { plays: 0, perfectGames: 0, quizStreak: 0, bestStreak: 0, startedAt: Date.now() }
  };
}

export function defaultSettings() {
  return {
    sound: true,
    haptics: true,
    textSpeed: 1,
    reduceMotion: false
  };
}

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function loadState() {
  const base = defaultState();
  const saved = safeParse(localStorage.getItem(KEY), null);
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    stats: { ...base.stats, ...(saved.stats || {}) },
    flags: { ...(saved.flags || {}) },
    completed: Array.isArray(saved.completed) ? saved.completed : [],
    fragments: Array.isArray(saved.fragments) ? saved.fragments : [],
    quizDone: Array.isArray(saved.quizDone) ? saved.quizDone : [],
    gamesWon: Array.isArray(saved.gamesWon) ? saved.gamesWon : [],
    glossaryUnlocked: Array.isArray(saved.glossaryUnlocked) ? saved.glossaryUnlocked : [],
    endings: Array.isArray(saved.endings) ? saved.endings : [],
    achievements: Array.isArray(saved.achievements) ? saved.achievements : []
  };
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function clearState() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function loadSettings() {
  return { ...defaultSettings(), ...safeParse(localStorage.getItem(SET_KEY), {}) };
}

export function saveSettings(settings) {
  try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch { /* noop */ }
}

export function hasFragment(state, id) {
  return state.fragments.includes(id);
}

export function addOnce(arr, id) {
  return arr.includes(id) ? arr : [...arr, id];
}
