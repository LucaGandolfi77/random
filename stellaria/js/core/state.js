// core/state.js — serializzazione, validazione, migrazione, normalizzazione. Zero DOM.
import { CONFIG } from './config.js';
import { ROOMS } from '../domain/data/rooms.js';
import { CITIZENS } from '../domain/data/citizens.js';

const STORAGE_KEY = CONFIG.storageKey;
const ALLOWED_TOP = new Set([
  'version', 'session', 'stats', 'roomId', 'time', 'stars', 'riflesso', 'fame',
  'outfit', 'furniture', 'visitedRooms', 'achievements', 'collectibles',
  'citizens', 'unlocked', 'unlockedRooms', 'tutorialDone',
  'soundOn', 'musicOn', 'volume',
  'avatarPos', 'mood', 'gentleNotif',
  'ownedOutfits',
]);

const DEFAULT_CITIZEN = { affinity: 8, repetition: 0, lastGesture: null, lastAt: -1, reflectionGiven: false };

export function defaultCitizens() {
  const m = {};
  for (const c of CITIZENS) m[c.id] = { ...DEFAULT_CITIZEN, id: c.id };
  return m;
}

export function defaultUnlockedRooms() {
  return ROOMS.filter((r) => !r.locked).map((r) => r.id);
}

export function defaultState() {
  const furniture = {};
  for (const r of ROOMS) furniture[r.id] = [];
  return {
    version: CONFIG.storageVersion,
    session: { createdAt: Date.now(), lastVisit: Date.now(), totalSessions: 1 },
    stats: { starsEarned: 0, gestures: 0, helps: 0, moves: 0, firstStar: false },
    roomId: 'piazza',
    time: { hour: 10, phase: 'pomeriggio', weather: 'sereno' },
    stars: CONFIG.defaultStars,
    riflesso: CONFIG.defaultRiflesso,
    fame: CONFIG.defaultFame,
    outfit: { capelli: 'capelli-mora', top: 'top-lavoro', bottom: 'bottom-vestito', accessorio: null },
    furniture,
    visitedRooms: ['piazza'],
    achievements: [],
    collectibles: [],
    citizens: defaultCitizens(),
    unlocked: [],
    unlockedRooms: defaultUnlockedRooms(),
    tutorialDone: false,
    soundOn: true,
    musicOn: false,
    volume: 0.6,
    avatarPos: { x: 0.5, y: 0.72 },
    mood: { palette: null, source: null },
    gentleNotif: false,
    ownedOutfits: [],
  };
}

export function normalize(state) {
  if (!state || typeof state !== 'object') return defaultState();
  const out = { ...state };
  if (!out.stats || typeof out.stats !== 'object') out.stats = { starsEarned: 0, gestures: 0, helps: 0, moves: 0, firstStar: false };
  for (const k of ['starsEarned', 'gestures', 'helps', 'moves', 'firstStar']) {
    if (typeof out.stats[k] !== 'boolean' && typeof out.stats[k] !== 'number') out.stats[k] = defaultState().stats[k];
  }
  if (!out.time || typeof out.time !== 'object') out.time = { hour: 10, phase: 'pomeriggio', weather: 'sereno' };
  out.time.hour = clampHour(out.time.hour);
  if (!out.citizens || typeof out.citizens !== 'object') out.citizens = defaultCitizens();
  for (const c of CITIZENS) {
    if (!out.citizens[c.id] || typeof out.citizens[c.id] !== 'object') out.citizens[c.id] = { ...DEFAULT_CITIZEN, id: c.id };
    const cc = out.citizens[c.id];
    cc.id = c.id;
    if (typeof cc.affinity !== 'number') cc.affinity = 8;
    if (typeof cc.repetition !== 'number') cc.repetition = 0;
  }
  if (!out.outfit || typeof out.outfit !== 'object') out.outfit = {};
  for (const slot of CONFIG.storageKey ? [] : []) {} // noop
  const df = defaultState().outfit;
  for (const k of Object.keys(df)) if (!(k in out.outfit)) out.outfit[k] = df[k];
  if (!Array.isArray(out.unlocked)) out.unlocked = [];
  if (!Array.isArray(out.unlockedRooms)) out.unlockedRooms = defaultUnlockedRooms();
  if (!Array.isArray(out.visitedRooms)) out.visitedRooms = ['piazza'];
  if (!Array.isArray(out.achievements)) out.achievements = [];
  out.achievements = out.achievements.filter((a) => typeof a === 'string').slice(0, 200);
  if (!Array.isArray(out.collectibles)) out.collectibles = [];
  out.collectibles = out.collectibles
    .filter((c) => typeof c === 'string')
    .map((c) => c.slice(0, 80))
    .slice(0, 200);
  if (!out.furniture || typeof out.furniture !== 'object') out.furniture = {};
  for (const r of ROOMS) if (!Array.isArray(out.furniture[r.id])) out.furniture[r.id] = [];
  if (typeof out.stars !== 'number') out.stars = CONFIG.defaultStars;
  if (typeof out.riflesso !== 'number') out.riflesso = CONFIG.defaultRiflesso;
  if (typeof out.fame !== 'number') out.fame = CONFIG.defaultFame;
  if (typeof out.roomId !== 'string') out.roomId = 'piazza';
  if (typeof out.version !== 'number') out.version = CONFIG.storageVersion;
  if (!out.session || typeof out.session !== 'object') out.session = { createdAt: Date.now(), lastVisit: Date.now(), totalSessions: 1 };
  if (!out.avatarPos || typeof out.avatarPos !== 'object') out.avatarPos = { x: 0.5, y: 0.72 };
  ['x', 'y'].forEach((k) => { if (typeof out.avatarPos[k] !== 'number') out.avatarPos[k] = 0.5; });
  out.avatarPos.x = clamp(out.avatarPos.x, 0, 1);
  out.avatarPos.y = clamp(out.avatarPos.y, 0, 1);
  if (!out.mood || typeof out.mood !== 'object') out.mood = { palette: null, source: null };
  if (typeof out.gentleNotif !== 'boolean') out.gentleNotif = false;
  if (!Array.isArray(out.ownedOutfits)) out.ownedOutfits = [];
  out.ownedOutfits = out.ownedOutfits.filter((a) => typeof a === 'string').slice(0, 200);
  return out;
}

function clampHour(h) {
  const n = parseInt(h, 10);
  if (Number.isNaN(n)) return 10;
  return ((n % 24) + 24) % 24;
}

export function validate(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (typeof raw.version !== 'number') return false;
  if (typeof raw.roomId !== 'string') return false;
  if (!raw.stats || typeof raw.stats !== 'object') return false;
  if (typeof raw.stars !== 'number' || typeof raw.riflesso !== 'number' || typeof raw.fame !== 'number') return false;
  if (!raw.outfit || typeof raw.outfit !== 'object') return false;
  if (!raw.citizens || typeof raw.citizens !== 'object') return false;
  for (const id of ['capelli', 'top', 'bottom', 'accessorio']) {
    const v = raw.outfit[id];
    if (v !== null && typeof v !== 'string') return false;
  }
  for (const c of CITIZENS) {
    const cc = raw.citizens[c.id];
    if (!cc || typeof cc !== 'object') return false;
    if (typeof cc.affinity !== 'number') return false;
  }
  if (raw.collectibles !== undefined) {
    if (!Array.isArray(raw.collectibles)) return false;
    for (const item of raw.collectibles) if (typeof item !== 'string') return false;
  }
  if (raw.ownedOutfits !== undefined) {
    if (!Array.isArray(raw.ownedOutfits)) return false;
    for (const item of raw.ownedOutfits) if (typeof item !== 'string') return false;
  }
  if (raw.achievements !== undefined) {
    if (!Array.isArray(raw.achievements)) return false;
    for (const item of raw.achievements) if (typeof item !== 'string') return false;
  }
  return true;
}

export function migrate(state) {
  if (!state) return defaultState();
  let v = state.version || 0;
  if (v < 1) {
    state.version = 1;
    if (!state.time) state.time = { hour: 10, phase: 'pomeriggio', weather: 'sereno' };
    for (const r of ROOMS) if (!state.furniture[r.id]) state.furniture[r.id] = [];
  }
  if (v < 2) {
    state.version = 2;
    if (!state.avatarPos) state.avatarPos = { x: 0.5, y: 0.72 };
    if (!state.mood) state.mood = { palette: null, source: null };
    if (typeof state.gentleNotif === 'undefined') state.gentleNotif = false;
    if (!Array.isArray(state.ownedOutfits)) state.ownedOutfits = [];
  }
  if (v < CONFIG.storageVersion) state.version = CONFIG.storageVersion;
  if (!state.unlockedRooms) state.unlockedRooms = defaultUnlockedRooms();
  if (typeof state.unlocked === 'undefined') state.unlocked = [];
  return state;
}

export function serialize(state) {
  const obj = {};
  for (const k of ALLOWED_TOP) {
    if (k in state) obj[k] = state[k];
  }
  return JSON.stringify(obj);
}

export function deserialize(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export function storageKey() { return STORAGE_KEY; }

// Alias per compatibilità con i servizi.
export const validateSave = validate;
export const serializeState = serialize;
export const deserializeState = deserialize;

export { CONFIG };
