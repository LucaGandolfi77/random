// domain/scoring.js — calcolo voto/vibe, fama, progresso. Formule pure.
import { CONFIG } from '../core/config.js';
import { CITIZENS } from './data/citizens.js';
import { ALL_ITEMS as ITEMS, GESTURES } from './data/items.js';
import { ROOMS } from './data/rooms.js';
import { clamp, pick } from '../core/utils.js';

export { CONFIG };

function outfitTags(state) {
  const tags = new Set();
  for (const slot of ['capelli', 'top', 'bottom', 'accessorio']) {
    const id = state.outfit[slot];
    const item = ITEMS.find((it) => it.id === id);
    if (item) for (const tg of item.tags) tags.add(tg);
  }
  return tags;
}

function roomTags(state, roomId) {
  const room = ROOMS.find((r) => r.id === roomId);
  const tags = room ? new Set(room.decor) : new Set();
  for (const f of state.furniture[roomId] || []) {
    const item = ITEMS.find((it) => it.id === f);
    if (item) for (const tg of item.tags) tags.add(tg);
  }
  return tags;
}

export function vibeScore(state, roomId, gestureId, citizenId) {
  const out = outfitTags(state);
  const room = roomTags(state, roomId);
  const gesture = GESTURES.find((g) => g.id === gestureId);
  if (gesture) room.add(gesture.tag);
  const citizen = CITIZENS.find((c) => c.id === citizenId);
  if (!citizen) return 0.1;
  let match = 0;
  for (const tg of citizen.tags) if (room.has(tg)) match++;
  return match / Math.max(1, citizen.tags.length);
}

export function voteFor(state, roomId, gestureId, citizenId) {
  const v = vibeScore(state, roomId, gestureId, citizenId);
  const citizen = CITIZENS.find((c) => c.id === citizenId);
  const base = (state.stats && state.stats.starsEarned) > 20 ? 1 : CONFIG.voteBase;
  const rep = 1 - clamp((state.citizens[citizenId]?.repetition || 0), 0, 8) * 0.08;
  const aff = (state.citizens[citizenId]?.affinity || 0) / CONFIG.maxAffinity;
  const stars = Math.max(0, Math.round(base * (0.4 + 1.2 * v) * rep * (0.5 + 0.5 * aff)));
  const reflex = Math.round((v >= 0.7 ? 2 : v >= 0.5 ? 1 : 0) * (0.5 + aff));
  return { stars, reflex, liked: v >= 0.55, vibe: v };
}

export function computeFame(state) {
  const earned = (state.stats && state.stats.starsEarned) || 0;
  const thresholds = [0, 5, 15, 35, 70, 120, 200];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (earned >= thresholds[i]) return i + 1;
  }
  return 1;
}

export function canUnlockRoom(state, roomId) {
  const room = ROOMS.find((r) => r.id === roomId);
  if (!room || !room.locked) return { ok: true };
  const req = room.unlockRequire;
  if (!req) return { ok: true };
  if ((state.fame || 0) >= req.fame && (state.riflesso || 0) >= req.riflesso) return { ok: true };
  return { ok: false, require: req };
}

export function pickGesture() { return pick(GESTURES); }
export function pickWeather(weathers) { return pick(weathers); }
