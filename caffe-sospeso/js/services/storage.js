import { SAVE_VERSION, STORAGE_KEY } from '../config.js';

const DEFAULTS = {
  version: SAVE_VERSION,
  lang: 'it',
  settings: { music: true, sfx: true, volume: 0.5, reduceMotion: false },
  level: 1,
  tokens: 6,
  beans: 8,
  aromi: {},
  recipesDiscovered: [],
  customers: {},
  decorOwned: [],
  decorPlaced: [],
  sospesiLeft: 0,
  sospesiStories: [],
  achievements: [],
  timePhase: 'giorno',
  weather: 'sereno',
  tutorialDone: false,
  lastSeen: null,
  stats: { served: 0, sospesi: 0, discoveries: 0 },
  currentCustomer: null,
  grind: 0,
  pour: 0,
  pourHeld: false,
  grindActive: false,
  pourActive: false,
  menuOpen: false,
};

const NUMBER_FIELDS = new Set([
  'level', 'tokens', 'beans', 'sospesiLeft', 'grind', 'pour', 'lastSeen',
]);

function isPlain(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function validateField(key, value) {
  if (key === 'version') return typeof value === 'number' ? value : SAVE_VERSION;
  if (key === 'stats') {
    if (!isPlain(value)) return DEFAULTS.stats;
    return {
      served: typeof value.served === 'number' ? value.served : 0,
      sospesi: typeof value.sospesi === 'number' ? value.sospesi : 0,
      discoveries: typeof value.discoveries === 'number' ? value.discoveries : 0,
    };
  }
  if (key === 'settings') {
    if (!isPlain(value)) return DEFAULTS.settings;
    return {
      music: Boolean(value.music),
      sfx: Boolean(value.sfx),
      volume: typeof value.volume === 'number' ? clamp(value.volume, 0, 1) : 0.5,
      reduceMotion: Boolean(value.reduceMotion),
    };
  }
  if (key === 'aromi' && isPlain(value)) return value;
  if (key === 'recipesDiscovered' && Array.isArray(value)) return value.filter((x) => typeof x === 'string');
  if (key === 'customers' && isPlain(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (!isPlain(v)) continue;
      out[k] = {
        affinity: typeof v.affinity === 'number' ? clamp(v.affinity, 0, 5) : 0,
        served: typeof v.served === 'number' ? v.served : 0,
        discovered: Array.isArray(v.discovered) ? v.discovered.filter((x) => typeof x === 'string') : [],
      };
    }
    return out;
  }
  if (key === 'sospesiStories' && Array.isArray(value)) return value.filter((x) => typeof x === 'string');
  if (key === 'decorOwned' && Array.isArray(value)) return value.filter((x) => typeof x === 'string');
  if (key === 'decorPlaced' && Array.isArray(value)) return value.filter((x) => typeof x === 'string');
  if (key === 'achievements' && Array.isArray(value)) return value.filter((x) => typeof x === 'string');
  if (NUMBER_FIELDS.has(key)) return typeof value === 'number' ? value : DEFAULTS[key];
  if (typeof DEFAULTS[key] !== 'undefined') {
    if (typeof DEFAULTS[key] === 'boolean' && typeof value === 'boolean') return value;
    if (typeof DEFAULTS[key] === 'string' && typeof value === 'string') return value;
    if (key === 'currentCustomer' && (value === null || typeof value === 'string')) return value;
  }
  return DEFAULTS[key];
}

function migrate(data) {
  if (!isPlain(data)) return { ...DEFAULTS };
  const version = typeof data.version === 'number' ? data.version : 0;
  let next = { ...DEFAULTS, ...data };
  if (version < 1) {
    next.sospesiStories = Array.isArray(next.sospesiStories) ? next.sospesiStories : [];
    next.stats = { served: 0, sospesi: 0, discoveries: 0, ...(next.stats || {}) };
  }
  next.version = SAVE_VERSION;
  return next;
}

export function defaultState() {
  return migrate({});
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!isPlain(parsed)) throw new Error('invalid');
    const validated = {};
    for (const [k, def] of Object.entries(DEFAULTS)) {
      validated[k] = validateField(k, parsed[k]);
    }
    if (parsed.version !== SAVE_VERSION) {
      return migrate(validated);
    }
    return validated;
  } catch (err) {
    console.warn('[storage] load failed, resetting', err);
    return defaultState();
  }
}

export function saveState(state) {
  try {
    const payload = { ...state };
    payload.version = SAVE_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[storage] save failed', err);
    return false;
  }
}

export function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[storage] reset failed', err);
  }
}

export function isSupported() {
  try {
    const k = '__test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function exportSave(state) {
  try {
    const payload = { ...state, version: SAVE_VERSION };
    return JSON.stringify(payload, null, 2);
  } catch (err) {
    console.warn('[storage] export failed', err);
    return null;
  }
}

export function downloadSave(state) {
  const text = exportSave(state);
  if (!text) return;
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `caffe-sospeso-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importSave(text) {
  try {
    const parsed = JSON.parse(text);
    if (!isPlain(parsed) || typeof parsed.version !== 'number') return { ok: false, reason: 'invalid' };
    return { ok: true, data: migrate(parsed) };
  } catch {
    return { ok: false, reason: 'parse' };
  }
}
