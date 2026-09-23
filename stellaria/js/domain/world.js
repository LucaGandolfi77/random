// domain/world.js — flussi di gioco (azioni sullo stato). Chiama scoring.js per le formule.
import { CONFIG } from '../core/config.js';
import { ROOMS, PHASES, WEATHERS } from './data/rooms.js';
import { CITIZENS } from './data/citizens.js';
import { ALL_ITEMS as ITEMS, OUTFIT_SLOTS, GESTURES } from './data/items.js';
import { EVENTS, AMBIENT_MESSAGES } from './data/events.js';
import { rand, pick, clamp } from '../core/utils.js';
import { vibeScore, voteFor, computeFame, canUnlockRoom, pickGesture, pickWeather } from './scoring.js';

export { CITIZENS, ROOMS, PHASES, WEATHERS, CONFIG };
export { vibeScore, voteFor, computeFame, canUnlockRoom, pickGesture, pickWeather };

export function getRoom(id) { return ROOMS.find((r) => r.id === id); }
export function getRooms() { return ROOMS; }
export function getPhases() { return PHASES; }
export function getWeathers() { return WEATHERS; }
export function getOutfitSlots() { return OUTFIT_SLOTS; }
export { GESTURES, EVENTS, AMBIENT_MESSAGES, ITEMS };

export function phaseFor(hour) {
  return PHASES.find((p) => {
    if (p.range[0] <= p.range[1]) return hour >= p.range[0] && hour < p.range[1];
    return hour >= p.range[0] || hour < p.range[1];
  }) || PHASES[0];
}

export function isCitizenActive(citizen, hour) {
  const [a, b] = citizen.hours;
  return a <= b ? (hour >= a && hour < b) : (hour >= a || hour < b);
}

// Stato precedente del gesto per il calcolo della novità.
function lastGestureOf(state, citizenId) {
  return state.citizens[citizenId]?.lastGesture || null;
}

// Azione: esibizione → voto + affinità + possibile riflesso.
export function performGesture(state, roomId, gestureId, citizenId) {
  const result = voteFor(state, roomId, gestureId, citizenId);
  const c = state.citizens[citizenId];
  if (!c) return { ...result, citizen: c };
  // Novelty: aumenta repetition solo se stesso gesto ripetuto.
  const repeated = lastGestureOf(state, citizenId) === gestureId;
  c.lastGesture = gestureId;
  if (repeated) c.repetition = (c.repetition || 0) + 1;
  else c.repetition = Math.max(0, (c.repetition || 0) - 1);
  c.lastAt = state.time.hour;
  if (result.liked) c.affinity = clamp(c.affinity + 4 + Math.round(result.vibe * 8), 0, CONFIG.maxAffinity);
  else c.affinity = clamp(c.affinity - 2, 0, CONFIG.maxAffinity);
  if (c.affinity >= CONFIG.maxAffinity && !c.reflectionGiven) {
    c.reflectionGiven = true;
    if (!state.collectibles.includes(c.collectible)) state.collectibles.push(c.collectible);
  }
  state.stars += result.stars;
  state.riflesso += result.reflex;
  state.stats.gestures++;
  state.stats.starsEarned += result.stars;
  if (!state.stats.firstStar && result.stars > 0) state.stats.firstStar = true;
  return { citizen: c, ...result };
}

export function helpCitizen(state, citizenId) {
  const c = state.citizens[citizenId];
  if (!c) return c;
  c.affinity = clamp(c.affinity + 12, 0, CONFIG.maxAffinity);
  state.riflesso += 2;
  state.stats.helps++;
  if (!c.reflectionGiven && c.affinity >= CONFIG.maxAffinity) {
    c.reflectionGiven = true;
    if (!state.collectibles.includes(c.collectible)) state.collectibles.push(c.collectible);
  }
  return c;
}

export function complimentCitizen(state, citizenId) {
  const c = state.citizens[citizenId];
  if (!c) return c;
  const out = outfitTags(state);
  const match = c.tags.filter((tg) => out.has(tg)).length;
  c.affinity = clamp(c.affinity + 2 + match * 2, 0, CONFIG.maxAffinity);
  state.riflesso += 1;
  return c;
}

// Spostamento tra stanze. Rientra la Sala dei Riflessi dallo stato (non muta ROOMS).
export function moveTo(state, targetRoomId) {
  const target = getRoom(targetRoomId);
  if (!target) return false;
  if (target.id === 'sala-specchi' && !(state.unlockedRooms || []).includes(target.id)) {
    const req = target.unlockRequire;
    if (state.fame >= req.fame && state.riflesso >= req.riflesso) {
      state.unlockedRooms.push(target.id);
    } else return 'locked';
  }
  if (state.roomId === targetRoomId) return true;
  state.roomId = targetRoomId;
  state.stats.moves++;
  return true;
}

export function tickTime(state) {
  state.time.hour = (state.time.hour + 1) % 24;
  const oldPhase = state.time.phase;
  const newPhase = phaseFor(state.time.hour);
  if (newPhase.id !== oldPhase) state.time.phase = newPhase.id;
  if (rand(10) === 0) state.time.weather = pick(WEATHERS).id;
}

// Gossip event: bump/lower affinities pseudo-randomly of citizens in same room.
export function applyGossip(state) {
  const inRoom = citizensIn(state, state.roomId);
  const target = pick(inRoom) || CITIZENS[0];
  const c = state.citizens[target.id];
  const up = rand(2) === 0;
  if (up) c.affinity = clamp(c.affinity + 6, 0, CONFIG.maxAffinity);
  else c.affinity = clamp(c.affinity - 4, 0, CONFIG.maxAffinity);
  return { citizen: c, up };
}

export function applyEvent(state, eventId) {
  switch (eventId) {
    case 'gossip': return applyGossip(state);
    case 'meteor': {
      if (!state.collectibles.includes('Frammento')) state.collectibles.push('Frammento');
      return { item: 'Frammento' };
    }
    case 'vip': {
      citizensIn(state, state.roomId).forEach((c) => {
        const cc = state.citizens[c.id];
        cc.affinity = clamp(cc.affinity + 3, 0, CONFIG.maxAffinity);
      });
      return { stars: 5 };
    }
    case 'blackout': {
      state.riflesso += 3;
      return { riflesso: 3 };
    }
    default: return {};
  }
}

// Stanza attuale di un cittadino in base all'ora (agenda circadiana).
export function roomOfCitizen(c, hour) {
  if (c.agenda && Array.isArray(c.agenda)) {
    for (const slot of c.agenda) {
      const [a, b] = [slot.from, slot.to];
      if (a <= b) { if (hour >= a && hour < b) return slot.room; }
      else { if (hour >= a || hour < b) return slot.room; }
    }
  }
  return c.home;
}

function citizensIn(state, roomId) {
  return CITIZENS.filter((c) => roomOfCitizen(c, state.time.hour) === roomId && isCitizenActive(c, state.time.hour));
}

function outfitTags(state) {
  const tags = new Set();
  for (const slot of OUTFIT_SLOTS) {
    const id = state.outfit[slot];
    const item = ITEMS.find((it) => it.id === id);
    if (item) for (const tg of item.tags) tags.add(tg);
  }
  return tags;
}

export { outfitTags };
