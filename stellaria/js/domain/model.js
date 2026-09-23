// domain/model.js — regole di gioco e stato. Zero DOM. Delega a core/state per persistenza.
import { CONFIG } from '../core/config.js';
import * as stateCore from '../core/state.js';
import * as world from './world.js';
import * as scoring from './scoring.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { UNLOCKABLES } from './data/unlockables.js';
import { ITEMS } from './data/items.js';
import { MARKET_ITEMS } from './data/market.js';
import { CITIZENS } from './data/citizens.js';
import { ROOMS } from './data/rooms.js';
import { clamp, pick } from '../core/utils.js';

export const defaultState = stateCore.defaultState;
export const defaultCitizens = stateCore.defaultCitizens;
export const defaultUnlockedRooms = stateCore.defaultUnlockedRooms;
export const validateSave = stateCore.validate;
export const migrate = stateCore.migrate;
export const serializeState = stateCore.serialize;
export const deserializeState = stateCore.deserialize;
export const storageKey = stateCore.storageKey;

export { CONFIG, CITIZENS, ROOMS, ITEMS };
export { vibeScore, voteFor, canUnlockRoom } from './scoring.js';

export function getRoom(id) { return ROOMS.find((r) => r.id === id); }
export function getRooms() { return ROOMS; }

function canAfford(state, item) {
  if (item.type === 'upgrade' && item.requireFame && state.fame < item.requireFame) return false;
  const currency = item.currency || 'stelle';
  if (state[currency] < priceOf(item, state)) return false;
  return true;
}

export function buy(state, itemId) {
  const item = ITEMS.find((it) => it.id === itemId) || null;
  if (!item || !canAfford(state, item)) return { ok: false, reason: 'not-affordable' };
  const currency = item.currency || 'stelle';
  state[currency] -= priceOf(item, state);
  if (item.isOutfit) {
    state.outfit[item.slot] = item.id;
    return { ok: true, kind: 'outfit', name: item.nameIT };
  }
  if (item.room) {
    if (!Array.isArray(state.furniture[item.room])) state.furniture[item.room] = [];
    if (state.furniture[item.room].includes(item.id)) return { ok: false, reason: 'already' };
    state.furniture[item.room].push(item.id);
    return { ok: true, kind: 'furniture', name: item.nameIT };
  }
  if (item.slot === 'upgrade') {
    return { ok: true, kind: 'upgrade', name: item.nameIT };
  }
  return { ok: false, reason: 'unknown' };
}

export function unlock(state, unlockId) {
  const u = UNLOCKABLES.find((x) => x.id === unlockId);
  if (!u) return { ok: false, reason: 'not-found' };
  if (state.fame < (u.require.fame || 0) || state.riflesso < (u.require.riflesso || 0)) return { ok: false, reason: 'not-met' };
  if (!state.unlocked) state.unlocked = [];
  if (state.unlocked.includes(u.id)) return { ok: false, reason: 'already' };
  state.unlocked.push(u.id);
  if (u.type === 'room' && u.target) {
    if (!(state.unlockedRooms || []).includes(u.target)) state.unlockedRooms.push(u.target);
    if (!state.visitedRooms.includes(u.target)) state.visitedRooms.push(u.target);
  }
  return { ok: true, kind: u.type, name: u.nameIT };
}

export function setOutfit(state, slot, itemId) {
  const item = ITEMS.find((it) => it.id === itemId);
  if (!item || item.slot !== slot) return false;
  state.outfit[slot] = itemId;
  return true;
}

export function checkAchievements(state) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    let pass = false;
    if (a.id === 'prima-stella' && state.stats.firstStar) pass = true;
    if (a.id === 'anima-piazza') {
      const n = Object.values(state.citizens).filter((c) => c.affinity >= CONFIG.maxAffinity).length;
      if (n >= 4) pass = true;
    }
    if (a.id === 'riflesso-autentico' && state.riflesso >= 30) pass = true;
    if (pass) { state.achievements.push(a.id); got.push(a); }
  }
  return got;
}

// Azioni (wrapper verso domain/world.js)
export function performGesture(state, roomId, gestureId, citizenId) {
  return world.performGesture(state, roomId, gestureId, citizenId);
}
export function helpCitizen(state, citizenId) { return world.helpCitizen(state, citizenId); }
export function complimentCitizen(state, citizenId) { return world.complimentCitizen(state, citizenId); }
export function moveTo(state, targetRoomId) { return world.moveTo(state, targetRoomId); }
export function tickTime(state) { world.tickTime(state); }
export function computeFame(state) { return scoring.computeFame(state); }
export { applyEvent } from './world.js';

export function availableOutfitItems() { return ITEMS.filter((it) => it.type === 'outfit'); }
export function availableFurnitureFor(roomId) { return ITEMS.filter((it) => it.type === 'furniture' && it.room === roomId); }
export function availableUpgrades(state) { return ITEMS.filter((it) => it.type === 'upgrade' && (!it.requireFame || state.fame >= it.requireFame)); }

export function priceOf(item, state) {
  const inflation = Math.max(0, (state.fame - 1) * (CONFIG.inflation || 0.15));
  return Math.round((item.cost || 0) * (1 + inflation));
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hashDate(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h || 1;
}

export function marketStock(state, dateKey) {
  const key = dateKey || todayKey();
  const seed = hashDate(key);
  const order = MARKET_ITEMS.map((it, i) => ({ it, s: (seed * (i + 3)) % 997 })).sort((a, b) => a.s - b.s);
  return order.slice(0, 3).map((o) => o.it);
}

export function buyMarket(state, itemId) {
  const item = MARKET_ITEMS.find((m) => m.id === itemId) || null;
  if (!item) return { ok: false, reason: 'not-found' };
  if (item.requireRiflesso && state.riflesso < item.requireRiflesso) return { ok: false, reason: 'require-riflesso' };
  const stock = marketStock(state);
  if (!stock.find((s) => s.id === itemId)) return { ok: false, reason: 'sold-out' };
  if (!canAfford(state, item)) return { ok: false, reason: 'not-affordable' };
  const currency = item.currency || 'stelle';
  state[currency] -= priceOf(item, state);
  if (item.kind === 'outfit') {
    state.outfit[item.slot] = item.id;
    if (!state.ownedOutfits.includes(item.id)) state.ownedOutfits.push(item.id);
    return { ok: true, kind: 'outfit', name: item.nameIT };
  }
  if (item.kind === 'furniture') {
    const roomId = item.room;
    if (!Array.isArray(state.furniture[roomId])) state.furniture[roomId] = [];
    if (state.furniture[roomId].includes(item.id)) return { ok: false, reason: 'already' };
    state.furniture[roomId].push(item.id);
    return { ok: true, kind: 'furniture', name: item.nameIT };
  }
  if (item.kind === 'collectible') {
    if (!state.collectibles.includes(item.id)) state.collectibles.push(item.id);
    return { ok: true, kind: 'collectible', name: item.nameIT };
  }
  return { ok: false, reason: 'unknown' };
}
