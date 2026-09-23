import * as C from './config.js';
import { pick, hashStr } from './utils.js';
import { loadState, defaultState, saveState } from './services/storage.js';

let state = null;

export function init(loaded) {
  state = loaded ?? defaultState();
  if (typeof state.tutorialDone !== 'boolean') state.tutorialDone = false;
}

export function getState() {
  return state;
}

function persist() {
  saveState(state);
}

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

export function levelFor(served) {
  let lvl = C.MIN_LEVEL;
  for (const l of C.LEVELS) if (served >= l.served) lvl = l.level;
  return clamp(lvl, C.MIN_LEVEL, C.MAX_LEVEL);
}

export function computePreferredRecipe(customerId) {
  const phase = state.timePhase;
  const weather = state.weather;
  const seed = `${customerId}|${phase}|${weather}`;
  const h = hashStr(seed);
  const idx = h % (C.ORIGINS.length * C.MILKS.length * C.SWEETS.length);
  const o = C.ORIGINS[idx % C.ORIGINS.length].id;
  const m = C.MILKS[Math.floor(idx / C.ORIGINS.length) % C.MILKS.length].id;
  const s = C.SWEETS[Math.floor(idx / (C.ORIGINS.length * C.MILKS.length)) % C.SWEETS.length].id;
  return C.recipeKey(o, m, s);
}

export function reset() {
  state = defaultState();
  persist();
}

export function leaveCustomer() {
  state.currentCustomer = null;
  state.grind = 0;
  state.pour = 0;
  state.grindActive = false;
  state.pourActive = false;
  state.pourHeld = false;
  state.lastRecipe = null;
  persist();
}

export function greetCustomer() {
  if (state.currentCustomer) return null;
  const id = pick(C.CUSTOMERS).id;
  state.currentCustomer = id;
  state.grind = 0;
  state.pour = 0;
  state.grindActive = false;
  state.pourActive = false;
  state.pourHeld = false;
  state.lastRecipe = null;
  const preferred = computePreferredRecipe(id);
  state.preferred = preferred;
  if (!state.customers[id]) {
    state.customers[id] = { affinity: 0, served: 0, discovered: [] };
  }
  persist();
  return { customerId: id, preferred };
}

export function setBrewRecipe(originId, milkId, sweetId) {
  state.lastRecipe = C.recipeKey(originId, milkId, sweetId);
  persist();
}

export function grindStep() {
  if (!state.currentCustomer) return;
  state.grind = clamp(state.grind + 0.22, 0, 1);
  state.grindActive = true;
  persist();
  return state.grind;
}

export function pourStart() {
  if (!state.currentCustomer) return;
  state.pourActive = true;
  state.pourHeld = true;
  persist();
}

export function pourTick() {
  if (!state.pourActive || !state.pourHeld) return;
  state.pour = clamp(state.pour + 0.06, 0, 1);
}

export function pourStop() {
  if (!state.currentCustomer) return;
  state.pourActive = false;
  state.pourHeld = false;
  persist();
  return state.pour;
}

export function serveCustomer() {
  if (!state.currentCustomer) return { error: true };
  const id = state.currentCustomer;
  const preferred = computePreferredRecipe(id);
  const grindQ = state.grind;
  const pourQ = state.pour;
  const quality = (grindQ + pourQ) / 2;
  const perfect = Math.abs(grindQ - 0.75) < 0.15 && Math.abs(pourQ - 0.6) < 0.15 && preferred === state.lastRecipe;
  const matched = preferred && state.lastRecipe === preferred;
  const base = C.SERVE_TOKEN_BASE;
  const bonus = matched ? C.SERVE_TOKEN_BONUS : 0;
  const perfectB = perfect ? C.SERVE_TOKEN_PERFECT : 0;
  const tokens = base + bonus + perfectB;
  state.tokens += tokens;
  state.beans = clamp(state.beans + (C.BEAN_REGEN_BASE + (C.BEAN_REGEN_WEATHER[state.weather] ?? 0)) - 0, 0, C.MAX_BEANS);

  const cust = state.customers[id] ??= { affinity: 0, served: 0, discovered: [] };
  cust.served += 1;
  const affinityDelta = matched ? 1 : 0;
  cust.affinity = clamp(cust.affinity + affinityDelta, 0, C.MAX_AFFINITY);
  state.stats.served += 1;

  let discoveredAroma = null;
  const aroma = C.AROMAS.find((a) => a.recipe === state.lastRecipe && !state.aromi[a.id]);
  if (aroma && Math.random() < C.AROMA_DISCOVER_CHANCE) {
    state.aromi[aroma.id] = true;
    if (!state.recipesDiscovered.includes(aroma.id)) state.recipesDiscovered.push(aroma.id);
    discoveredAroma = aroma.id;
    state.stats.discoveries += 1;
  }

  state.lastRecipe = null;
  state.currentCustomer = null;
  state.grind = 0;
  state.pour = 0;
  state.grindActive = false;
  state.pourActive = false;
  state.pourHeld = false;

  const newLevel = levelFor(state.stats.served);
  let leveled = false;
  if (newLevel > state.level) {
    state.level = newLevel;
    state.tokens += C.LEVEL_REWARD_TOKENS[state.level - 1] ?? 0;
    leveled = true;
  }
  checkAchievements();
  persist();
  return { tokens, matched, perfect, discoveredAroma, leveled, quality };
}

export function leaveSospeso() {
  if (state.tokens < C.SOGGI_TOKEN_COST) return { ok: false };
  state.tokens -= C.SOGGI_TOKEN_COST;
  state.sospesiLeft += 1;
  state.sospesiStories.push(`${state.timePhase}|${state.weather}`);
  state.stats.sospesi += 1;
  checkAchievements();
  persist();
  return { ok: true };
}

export function claimSospeso() {
  if (state.sospesiLeft <= 0) return { ok: false };
  state.sospesiLeft -= 1;
  state.tokens += C.SOGGI_BONUS;
  persist();
  return { ok: true };
}

export function waterPlants() {
  if (state.tokens < C.PLANT_TOKEN_COST) return { ok: false };
  state.tokens -= C.PLANT_TOKEN_COST;
  state.beans = clamp(state.beans + 4, 0, C.MAX_BEANS);
  persist();
  return { ok: true };
}

export function buyDecor(id) {
  const def = C.UNLOCKABLES.find((u) => u.id === id);
  if (!def || state.decorOwned.includes(id)) return { ok: false };
  if (state.tokens < def.cost) return { ok: false, lack: true };
  state.tokens -= def.cost;
  state.decorOwned.push(id);
  persist();
  return { ok: true };
}

export function toggleDecor(id) {
  if (!state.decorOwned.includes(id) && state.decorOwned.length >= 4) return false;
  if (state.decorPlaced.includes(id)) {
    state.decorPlaced = state.decorPlaced.filter((x) => x !== id);
  } else {
    state.decorPlaced.push(id);
  }
  persist();
  return true;
}

export function advancePhase() {
  const cur = C.TIME_PHASES.findIndex((p) => p.id === state.timePhase);
  const next = C.TIME_PHASES[(cur + 1) % C.TIME_PHASES.length];
  state.timePhase = next.id;
  return next;
}

export function rollWeather() {
  const w = pick(C.WEATHERS);
  state.weather = w.id;
  return w;
}

export function rollEvent() {
  return pick(C.EVENTS);
}

export function checkAchievements() {
  const fresh = [];
  for (const a of C.ACHIEVEMENTS) {
    if (!state.achievements.includes(a.id) && a.check(state)) {
      state.achievements.push(a.id);
      fresh.push(a.id);
    }
  }
  return fresh;
}

export function applyEvent(ev) {
  switch (ev.id) {
    case 'pioggia':
      state.weather = 'pioggia';
      return 'event_pioggia';
    case 'gatto':
      state.tokens += 2;
      return 'event_gatto';
    case 'musica':
      state.tokens += 3;
      return 'event_musica';
    case 'sacco':
      state.beans = Math.min(state.beans + 5, C.MAX_BEANS);
      return 'event_sacco';
  }
  return null;
}

export function setSetting(key, value) {
  if (key === 'lang') {
    state.lang = value;
  } else if (state.settings && key in state.settings) {
    state.settings[key] = value;
  }
  persist();
}

