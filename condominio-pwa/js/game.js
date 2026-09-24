/* Scala B, Civico 0 — logica di gioco (nessun DOM) */

import {
  APTS_PER_FLOOR,
  BOARD_REACTION_BY_ID,
  BOARD_REACTIONS,
  BOARD_TEMPLATES,
  COMBOS,
  COMBO_BY_ID,
  EPISODES,
  EPISODE_BY_ID,
  ELEVATOR_DESTS,
  ELEVATOR_BY_ID,
  FAVOR_BY_RARITY,
  FAVOR_COOLDOWN,
  FLOOR_BY_NUM,
  FURN_BY_ID,
  FURN_SLOTS,
  FURN_STORIES,
  FURNITURE,
  GOALS,
  GOAL_BY_ID,
  LEVEL_COST,
  LEVEL_NAMES,
  MAX_FLOOR,
  MAX_LEVEL,
  MULTI_COST,
  PITY_MAX,
  PULL_COST,
  PULLS_PER_MULTI,
  RARITY,
  SAVE_VERSION,
  STAMPS,
  TENANT_BY_ID,
  TENANTS,
  seasonEvent,
} from "./data.js";

export { PULL_COST, MULTI_COST, SAVE_VERSION };

/* ------------------------------------------------------------------ stato */

export function newState(now = Date.now()) {
  const apartments = {};
  for (let f = 1; f <= MAX_FLOOR; f++) {
    apartments[f] = Array.from({ length: APTS_PER_FLOOR }, () => ({
      tenant: null,
      furniture: [null, null],
    }));
  }
  apartments[1][0].tenant = "nuvola";
  apartments[1][1].tenant = "mimi";

  return {
    v: SAVE_VERSION,
    crumbs: 180,
    fragments: 0,
    tenants: { nuvola: { level: 1, memories: 0 }, mimi: { level: 1, memories: 0 } },
    furniture: {},
    apartments,
    unlockedFloors: 1,
    cooldowns: {},
    pity: 0,
    pulls: 0,
    favorsDone: 0,
    lastDaily: null,
    episodes: {},
    goals: {},
    diary: [],
    combos: {},
    furnPast: {},
    boardReactions: {},
    elevator: {},
    stamps: {},
    selectedStamp: null,
    tourStep: 0,
    tourDone: false,
    seen: { tenants: ["nuvola", "mimi"], furniture: [] },
    settings: { sound: true, haptics: true, grisIA: true, reminders: false, skyTilt: false },
    createdAt: now,
    lastSeen: now,
  };
}

const isPlainObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);

/* ------------------------------------------------------------- migrazioni */

/* Ogni passo porta lo schema dalla versione chiave alla successiva (v → v+1).
   Per cambiare lo schema in futuro:
     1. bump SAVE_VERSION in data.js
     2. aggiungere MIGRATIONS[vecchiaVersione] = (s) => ({ ...s, v: nuova, ... }) */
const MIGRATIONS = {
  /* v0 → v1: salvataggi pre-rilascio senza seen/settings/episodi/cooldowns */
  0: (s) => {
    const out = { ...s };
    out.seen = isPlainObj(out.seen) ? out.seen : { tenants: [], furniture: [] };
    out.settings = { sound: true, haptics: true, grisIA: true, reminders: false, skyTilt: false, ...(isPlainObj(out.settings) ? out.settings : {}) };
    out.episodes = isPlainObj(out.episodes) ? out.episodes : {};
    out.cooldowns = isPlainObj(out.cooldowns) ? out.cooldowns : {};
    out.v = 1;
    return out;
  },
  /* v1 → v2: campo obiettivi già riscossi */
  1: (s) => {
    const out = { ...s };
    out.goals = isPlainObj(out.goals) ? out.goals : {};
    out.v = 2;
    return out;
  },
  /* v2 → v3: memoria del palazzo (diario, combinazioni, bacheca, …) */
  2: (s) => {
    const out = { ...s };
    out.diary = Array.isArray(out.diary) ? out.diary : [];
    out.combos = isPlainObj(out.combos) ? out.combos : {};
    out.furnPast = isPlainObj(out.furnPast) ? out.furnPast : {};
    out.boardReactions = isPlainObj(out.boardReactions) ? out.boardReactions : {};
    out.elevator = isPlainObj(out.elevator) ? out.elevator : {};
    out.stamps = isPlainObj(out.stamps) ? out.stamps : {};
    out.selectedStamp = typeof out.selectedStamp === "string" ? out.selectedStamp : null;
    out.tourStep = Number.isFinite(+out.tourStep) ? Math.max(0, Math.floor(+out.tourStep)) : 0;
    out.tourDone = out.tourDone === true;
    out.v = 3;
    return out;
  },
};

/* Applica le migrazioni dalla versione del file fino a SAVE_VERSION.
   Non muta l'input; salvataggi già aggiornati o di versione ignota restano intatti. */
export function migrateSave(raw) {
  if (!isPlainObj(raw)) return raw;
  let s = raw;
  let v = Math.max(0, Math.floor(+s.v || 0));
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) break; /* versione inferiore senza passo noto: si ferma qui */
    s = step(s);
    const advanced = Math.floor(+s.v || 0);
    if (advanced > v && advanced <= SAVE_VERSION) v = advanced;
    else v += 1;
    if (+s.v !== v) s = { ...s, v };
  }
  return s;
}

function normalizeApt(apt) {
  const a = isPlainObj(apt) ? apt : { tenant: null, furniture: null };
  if (a.tenant && (typeof a.tenant !== "string" || !TENANT_BY_ID[a.tenant])) a.tenant = null;
  if (!Array.isArray(a.furniture)) a.furniture = [];
  a.furniture = Array.from({ length: FURN_SLOTS }, (_, i) => {
    const id = a.furniture[i];
    return typeof id === "string" && FURN_BY_ID[id] ? id : null;
  });
  return a;
}

export function loadState(raw) {
  if (!isPlainObj(raw)) return newState();
  const migrated = migrateSave(raw);
  const base = newState();
  let s;
  try {
    s = { ...base, ...migrated };
  } catch {
    return newState();
  }

  /* appartamenti: ogni piano va riparato cella per cella */
  if (!isPlainObj(s.apartments)) s.apartments = base.apartments;
  else {
    for (let f = 1; f <= MAX_FLOOR; f++) {
      const row = s.apartments[f];
      if (!Array.isArray(row) || row.length !== APTS_PER_FLOOR) {
        s.apartments[f] = base.apartments[f];
        continue;
      }
      for (let i = 0; i < APTS_PER_FLOOR; i++) row[i] = normalizeApt(row[i]);
    }
    for (const k of Object.keys(s.apartments)) {
      const n = +k;
      if (!Number.isInteger(n) || n < 1 || n > MAX_FLOOR) delete s.apartments[k];
    }
  }

  /* inquilini: solo id noti, solo oggetti, valori numerici */
  s.tenants = isPlainObj(s.tenants) ? s.tenants : {};
  for (const id of Object.keys(s.tenants)) {
    if (!TENANT_BY_ID[id]) {
      delete s.tenants[id];
      continue;
    }
    if (!isPlainObj(s.tenants[id])) s.tenants[id] = { level: 1, memories: 0 };
  }

  /* arredi: solo id noti, conteggi interi non negativi */
  s.furniture = isPlainObj(s.furniture) ? s.furniture : {};
  for (const id of Object.keys(s.furniture)) {
    if (!FURN_BY_ID[id]) {
      delete s.furniture[id];
      continue;
    }
    s.furniture[id] = Math.max(0, Math.floor(+s.furniture[id] || 0));
  }

  /* cooldown: solo inquilini noti e numeri finiti */
  s.cooldowns = isPlainObj(s.cooldowns) ? s.cooldowns : {};
  for (const id of Object.keys(s.cooldowns)) {
    const v = +s.cooldowns[id];
    if (!TENANT_BY_ID[id] || !Number.isFinite(v)) delete s.cooldowns[id];
    else s.cooldowns[id] = v;
  }

  /* episodi: solo id noti, flag booleani (gli falsi si eliminano) */
  s.episodes = isPlainObj(s.episodes) ? s.episodes : {};
  for (const id of Object.keys(s.episodes)) {
    if (!EPISODE_BY_ID[id] || !s.episodes[id]) delete s.episodes[id];
    else s.episodes[id] = true;
  }

  /* obiettivi riscossi: solo id noti, solo true */
  s.goals = isPlainObj(s.goals) ? s.goals : {};
  for (const id of Object.keys(s.goals)) {
    if (!GOAL_BY_ID[id] || !s.goals[id]) delete s.goals[id];
    else s.goals[id] = true;
  }

  /* memoria del palazzo v3 */
  s.diary = Array.isArray(s.diary)
    ? s.diary.filter((e) => isPlainObj(e) && typeof e.id === "string" && typeof e.text === "string").slice(-60)
    : [];
  s.combos = isPlainObj(s.combos) ? s.combos : {};
  for (const id of Object.keys(s.combos)) {
    if (!COMBO_BY_ID[id] || !s.combos[id]) delete s.combos[id];
    else s.combos[id] = true;
  }
  s.furnPast = isPlainObj(s.furnPast) ? s.furnPast : {};
  for (const id of Object.keys(s.furnPast)) {
    const story = FURN_STORIES.find((x) => x.id === id);
    if (!story || !s.furnPast[id]) delete s.furnPast[id];
    else s.furnPast[id] = true;
  }
  s.boardReactions = isPlainObj(s.boardReactions) ? s.boardReactions : {};
  for (const day of Object.keys(s.boardReactions)) {
    const r = s.boardReactions[day];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !BOARD_REACTION_BY_ID[r]) delete s.boardReactions[day];
  }
  s.elevator = isPlainObj(s.elevator) ? s.elevator : {};
  for (const id of Object.keys(s.elevator)) {
    if (!ELEVATOR_BY_ID[id] || !s.elevator[id]) delete s.elevator[id];
    else s.elevator[id] = true;
  }
  s.stamps = isPlainObj(s.stamps) ? s.stamps : {};
  for (const id of Object.keys(s.stamps)) {
    const stamp = STAMPS.find((x) => x.id === id);
    if (!stamp || !s.stamps[id]) delete s.stamps[id];
    else s.stamps[id] = true;
  }
  s.selectedStamp = typeof s.selectedStamp === "string" && STAMPS.some((x) => x.id === s.selectedStamp) ? s.selectedStamp : null;
  s.tourStep = Number.isFinite(+s.tourStep) ? Math.max(0, Math.floor(+s.tourStep)) : 0;
  s.tourDone = s.tourDone === true;

  s.seen = isPlainObj(s.seen) ? s.seen : { tenants: [], furniture: [] };
  s.seen.tenants = [
    ...new Set((Array.isArray(s.seen.tenants) ? s.seen.tenants : []).filter((id) => TENANT_BY_ID[id])),
  ];
  s.seen.furniture = [
    ...new Set((Array.isArray(s.seen.furniture) ? s.seen.furniture : []).filter((id) => FURN_BY_ID[id])),
  ];

  /* impostazioni: solo booleani veri, il resto torna al default */
  const rawSettings = isPlainObj(s.settings) ? s.settings : {};
  const boolOr = (v, d) => (typeof v === "boolean" ? v : d);
  s.settings = {
    sound: boolOr(rawSettings.sound, base.settings.sound),
    haptics: boolOr(rawSettings.haptics, base.settings.haptics),
    grisIA: boolOr(rawSettings.grisIA, base.settings.grisIA),
    reminders: boolOr(rawSettings.reminders, base.settings.reminders),
    skyTilt: boolOr(rawSettings.skyTilt, base.settings.skyTilt),
  };

  s.unlockedFloors = clamp(Math.floor(+s.unlockedFloors || 1), 1, MAX_FLOOR);
  s.crumbs = Math.max(0, Math.floor(+s.crumbs || 0));
  s.fragments = Math.max(0, Math.floor(+s.fragments || 0));
  s.pity = clamp(Math.floor(+s.pity || 0), 0, PITY_MAX);
  s.pulls = Math.max(0, Math.floor(+s.pulls || 0));
  s.favorsDone = Math.max(0, Math.floor(+s.favorsDone || 0));
  s.lastDaily =
    typeof s.lastDaily === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.lastDaily) ? s.lastDaily : null;
  s.createdAt = Number.isFinite(+s.createdAt) ? +s.createdAt : base.createdAt;
  s.lastSeen = Number.isFinite(+s.lastSeen) ? +s.lastSeen : base.lastSeen;
  s.v = SAVE_VERSION;

  /* i due inquilini di partenza devono sempre esistere: altrimenti
     il palazzo resterebbe senza modo di guadagnare briciole */
  for (const id of ["nuvola", "mimi"]) {
    if (!s.tenants[id]) s.tenants[id] = { level: 1, memories: 0 };
  }
  for (const id of Object.keys(s.tenants)) {
    const info = s.tenants[id];
    info.level = clamp(Math.floor(+info.level || 1), 1, MAX_LEVEL);
    info.memories = Math.max(0, Math.floor(+info.memories || 0));
  }
  return s;
}

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/* -------------------------------------------------------------- inquilini */

export function ownedTenants(state) {
  return TENANTS.filter((t) => state.tenants[t.id]);
}

export function placedTenantIds(state) {
  const out = new Set();
  for (let f = 1; f <= state.unlockedFloors; f++) {
    for (const apt of state.apartments[f]) if (apt.tenant) out.add(apt.tenant);
  }
  return out;
}

export function unplacedTenants(state) {
  const placed = placedTenantIds(state);
  return ownedTenants(state).filter((t) => !placed.has(t.id));
}

export function findTenantHome(state, tenantId) {
  for (let f = 1; f <= state.unlockedFloors; f++) {
    const idx = state.apartments[f].findIndex((a) => a.tenant === tenantId);
    if (idx >= 0) return { floor: f, index: idx };
  }
  return null;
}

export function tenantLine(state, tenantId) {
  const t = TENANT_BY_ID[tenantId];
  const info = state.tenants[tenantId];
  if (!t || !info) return "";
  const unlocked = Math.min(t.lines.length, info.level);
  const pool = t.lines.slice(0, unlocked);
  return pool[Math.floor(Math.random() * pool.length)] || pool[0];
}

export function favorReward(state, tenantId) {
  const t = TENANT_BY_ID[tenantId];
  const info = state.tenants[tenantId];
  if (!t || !info) return 0;
  return FAVOR_BY_RARITY[t.rarity] + (info.level - 1) * 6;
}

export function favorReady(state, tenantId, now = Date.now()) {
  if (!state.tenants[tenantId]) return false;
  const home = findTenantHome(state, tenantId);
  if (!home) return false;
  const until = state.cooldowns[tenantId] || 0;
  return now >= until;
}

export function favorRemaining(state, tenantId, now = Date.now()) {
  return Math.max(0, (state.cooldowns[tenantId] || 0) - now);
}

export function readyFavors(state, now = Date.now()) {
  return ownedTenants(state).filter((t) => favorReady(state, t.id, now)).length;
}

export function doFavor(state, tenantId, now = Date.now()) {
  if (!state.tenants[tenantId]) return { ok: false, msg: "Inquilino non trovato." };
  if (!favorReady(state, tenantId, now)) {
    return { ok: false, msg: "È ancora riposando dopo l'ultima impresa." };
  }
  const amount = favorReward(state, tenantId);
  state.crumbs += amount;
  state.favorsDone += 1;
  state.cooldowns[tenantId] = now + FAVOR_COOLDOWN;

  /* ogni cinque favori il portiere rimballa un pacco e ci mette un frammento */
  const fragments = state.favorsDone % 5 === 0 ? 1 : 0;
  state.fragments += fragments;

  return {
    ok: true,
    crumbs: amount,
    fragments,
    line: TENANT_BY_ID[tenantId].favor.line,
    msg: `+${amount} briciole${fragments ? " e un frammento" : ""}`,
  };
}

/* -------------------------------------------------------------- album/potenziamenti */

export function canLevelUp(state, tenantId) {
  const info = state.tenants[tenantId];
  if (!info) return false;
  if (info.level >= MAX_LEVEL) return false;
  return info.memories >= LEVEL_COST;
}

export function levelName(level) {
  return LEVEL_NAMES[clamp(level, 1, LEVEL_NAMES.length) - 1];
}

export function levelUp(state, tenantId) {
  const info = state.tenants[tenantId];
  if (!info) return { ok: false, msg: "Non lo conosci ancora." };
  if (info.level >= MAX_LEVEL) return { ok: false, msg: "È già una leggenda di Scale B." };
  if (info.memories < LEVEL_COST)
    return { ok: false, msg: `Ti serve ${LEVEL_COST} ricordo (un doppione).` };
  info.memories -= LEVEL_COST;
  info.level += 1;
  return { ok: true, level: info.level, msg: `Livello ${info.level}: ${levelName(info.level)}` };
}

/* --------------------------------------------------------------- alloggio */

/* Risolve un appartamento validando piano, indice e struttura:
   nessun accesso diretto a [floor][index] senza controlli. */
function apartmentAt(state, floor, index, opts = {}) {
  const { requireUnlocked = true } = opts;
  if (!Number.isInteger(floor) || floor < 1 || floor > MAX_FLOOR) return null;
  if (requireUnlocked && floor > state.unlockedFloors) return null;
  const row = state.apartments?.[floor];
  if (!Array.isArray(row)) return null;
  if (!Number.isInteger(index) || index < 0 || index >= row.length) return null;
  const apt = row[index];
  return isPlainObj(apt) ? apt : null;
}

export function placeTenant(state, tenantId, floor, index) {
  if (!state.tenants[tenantId]) return { ok: false, msg: "Non hai ancora questo inquilino." };
  if (!Number.isInteger(floor) || floor < 1 || floor > state.unlockedFloors)
    return { ok: false, msg: "Piano non ancora sbloccato." };
  const apt = apartmentAt(state, floor, index);
  if (!apt) return { ok: false, msg: "Appartamento inesistente." };
  const home = findTenantHome(state, tenantId);
  if (home) state.apartments[home.floor][home.index].tenant = null;
  if (apt.tenant) {
    // scambio: l'inquilino precedente torna in lista
    delete state.cooldowns[apt.tenant];
  }
  apt.tenant = tenantId;
  if (!state.seen.tenants.includes(tenantId)) state.seen.tenants.push(tenantId);
  return { ok: true, msg: `${TENANT_BY_ID[tenantId].name} ha trovato casa.` };
}

export function removeTenant(state, tenantId) {
  const home = findTenantHome(state, tenantId);
  if (!home) return { ok: false, msg: "Non abita qui." };
  state.apartments[home.floor][home.index].tenant = null;
  delete state.cooldowns[tenantId];
  return { ok: true, msg: "Appartamento liberato." };
}

export function ownedFurniture(state) {
  return FURNITURE.filter((f) => state.furniture[f.id] > 0).map((f) => ({
    ...f,
    count: state.furniture[f.id],
    available: furnitureAvailable(state, f.id),
    placed: countPlaced(state, f.id),
  }));
}

export function countPlaced(state, id) {
  let n = 0;
  for (let f = 1; f <= state.unlockedFloors; f++) {
    for (const apt of state.apartments[f]) {
      for (const x of apt.furniture) if (x === id) n++;
    }
  }
  return n;
}

export function furnitureAvailable(state, id) {
  return (state.furniture[id] || 0) - countPlaced(state, id);
}

export function placedFurnitureIds(state) {
  const out = new Set();
  for (let f = 1; f <= state.unlockedFloors; f++) {
    for (const apt of state.apartments[f]) for (const id of apt.furniture) if (id) out.add(id);
  }
  return out;
}

export function placeFurniture(state, floor, index, slot, furnitureId) {
  if (!FURN_BY_ID[furnitureId]) return { ok: false, msg: "Arredo sconosciuto." };
  if (!state.furniture[furnitureId]) return { ok: false, msg: "Non lo possiedi." };
  if (!Number.isInteger(floor) || floor < 1 || floor > state.unlockedFloors)
    return { ok: false, msg: "Piano non sbloccato." };
  const apt = apartmentAt(state, floor, index);
  if (!apt) return { ok: false, msg: "Appartamento inesistente." };
  if (!Number.isInteger(slot) || slot < 0 || slot >= FURN_SLOTS)
    return { ok: false, msg: "Nicchia inesistente." };

  const current = apt.furniture[slot];
  if (current === furnitureId) {
    apt.furniture[slot] = null;
    return { ok: true, removed: true, msg: "Rimosso dall'appartamento." };
  }
  if (furnitureAvailable(state, furnitureId) >= 1) {
    apt.furniture[slot] = furnitureId;
    if (!state.seen.furniture.includes(furnitureId)) state.seen.furniture.push(furnitureId);
    return { ok: true, msg: `${FURN_BY_ID[furnitureId].name} al suo posto.` };
  }
  const other = apt.furniture.indexOf(furnitureId);
  if (other >= 0) {
    apt.furniture[other] = current;
    apt.furniture[slot] = furnitureId;
    return { ok: true, msg: `${FURN_BY_ID[furnitureId].name} spostato di nicchia.` };
  }
  return { ok: false, msg: "Ne hai uno solo: resta dove sta." };
}

export function removeFurnitureAt(state, floor, index, slot) {
  const apt = apartmentAt(state, floor, index, { requireUnlocked: false });
  if (!apt) return { ok: false, msg: "Su." };
  if (!Number.isInteger(slot) || slot < 0 || slot >= FURN_SLOTS)
    return { ok: false, msg: "Nicchia inesistente." };
  const id = apt.furniture[slot];
  if (!id) return { ok: false, msg: "Slot vuoto." };
  apt.furniture[slot] = null;
  return { ok: true, msg: "Rimesso in cantina." };
}

/* ------------------------------------------------------------------ piani */

export function floorCost(floor) {
  return FLOOR_BY_NUM[floor] || null;
}

export function canUnlockFloor(state) {
  if (state.unlockedFloors >= MAX_FLOOR) return false;
  const cost = floorCost(state.unlockedFloors + 1);
  if (!cost) return false;
  return state.crumbs >= cost.crumbs && state.fragments >= cost.fragments;
}

export function unlockFloor(state) {
  if (state.unlockedFloors >= MAX_FLOOR) return { ok: false, msg: "Sei già all'attico." };
  const cost = floorCost(state.unlockedFloors + 1);
  if (state.crumbs < cost.crumbs || state.fragments < cost.fragments)
    return { ok: false, msg: "Non hai abbastanza roba strana da mettere in comune." };
  state.crumbs -= cost.crumbs;
  state.fragments -= cost.fragments;
  state.unlockedFloors += 1;
  return { ok: true, floor: state.unlockedFloors, msg: `Piano ${state.unlockedFloors} aperto!` };
}

/* ---------------------------------------------------------------- gacha */

function weightedRarity(forceGood = false, rng = Math.random) {
  const entries = Object.values(RARITY).filter((r) => (forceGood ? r.weight < 60 : true));
  const total = entries.reduce((s, r) => s + r.weight, 0);
  let roll = rng() * total;
  for (const r of entries) {
    roll -= r.weight;
    if (roll <= 0) return r.id;
  }
  return entries[entries.length - 1].id;
}

function rollForPull(state, rng) {
  /* al 30° tiro di fila la bustina NON può che essere epica o leggendaria */
  if (state.pity + 1 >= PITY_MAX) {
    state.pity = 0;
    return rng() < 0.12 ? "leggendario" : "epico";
  }
  const rarity = weightedRarity(false, rng);
  if (rarity === "epico" || rarity === "leggendario") state.pity = 0;
  else state.pity += 1;
  return rarity;
}

function pickFromRarity(rarity, rng) {
  const t = TENANTS.filter((x) => x.rarity === rarity);
  const f = FURNITURE.filter((x) => x.rarity === rarity);
  const pool = [...t.map((x) => ({ kind: "tenant", item: x })), ...f.map((x) => ({ kind: "furniture", item: x }))];
  if (!pool.length) return pickFromRarity("comune", rng);
  return pool[Math.floor(rng() * pool.length)];
}

function validCount(count) {
  return count === 1 || count === PULLS_PER_MULTI;
}

export function canPull(state, count = 1) {
  if (!validCount(count)) return false;
  return state.crumbs >= (count === PULLS_PER_MULTI ? MULTI_COST : PULL_COST * count);
}

export function pull(state, count = 1, rng = Math.random) {
  if (!validCount(count)) return { ok: false, msg: "Numero di bustine non valido." };
  const cost = count === PULLS_PER_MULTI ? MULTI_COST : PULL_COST * count;
  if (state.crumbs < cost) return { ok: false, msg: "Briciole insufficienti." };

  state.crumbs -= cost;
  const results = [];
  let guaranteedGood = false;

  for (let i = 0; i < count; i++) {
    const rarity = rollForPull(state, rng);
    if (rarity !== "comune") guaranteedGood = true;
    results.push({ ...pickFromRarity(rarity, rng), rarity, isNew: false, memories: 0, fragments: 0 });
  }

  // decina: almeno un raro o meglio
  if (count === PULLS_PER_MULTI && !guaranteedGood) {
    const idx = results.length - 1;
    const rarity = weightedRarity(true, rng);
    results[idx] = { ...pickFromRarity(rarity, rng), rarity, isNew: false, memories: 0, fragments: 0 };
    /* se la garanzia ha promosso un epico, il pity riparte da zero */
    if (rarity === "epico" || rarity === "leggendario") state.pity = 0;
  }

  for (const r of results) {
    if (r.kind === "tenant") {
      const owned = state.tenants[r.item.id];
      if (owned) {
        owned.memories += 1;
        r.memories = 1;
      } else {
        state.tenants[r.item.id] = { level: 1, memories: 0 };
        r.isNew = true;
        if (!state.seen.tenants.includes(r.item.id)) state.seen.tenants.push(r.item.id);
      }
    } else {
      if (state.furniture[r.item.id]) {
        state.furniture[r.item.id] += 1;
        state.fragments += 1;
        r.fragments = 1;
      } else {
        state.furniture[r.item.id] = 1;
        r.isNew = true;
        if (!state.seen.furniture.includes(r.item.id)) state.seen.furniture.push(r.item.id);
      }
    }
  }

  state.pulls += count;
  return { ok: true, results, cost };
}

/* --------------------------------------------------------------- episodi */

function episodeMet(state, ep) {
  if (ep.tenants) {
    for (let f = 1; f <= state.unlockedFloors; f++) {
      const here = new Set(state.apartments[f].map((a) => a.tenant).filter(Boolean));
      if (ep.tenants.every((id) => here.has(id))) return { floor: f };
    }
    return null;
  }
  for (let f = 1; f <= state.unlockedFloors; f++) {
    for (const apt of state.apartments[f]) {
      if (apt.tenant === ep.tenant && apt.furniture.includes(ep.furniture)) return { floor: f };
    }
  }
  return null;
}

export function checkEpisodes(state) {
  const unlocked = [];
  for (const ep of EPISODES) {
    if (state.episodes[ep.id]) continue;
    const where = episodeMet(state, ep);
    if (!where) continue;
    state.episodes[ep.id] = true;
    state.crumbs += ep.crumbs;
    state.fragments += ep.fragments;
    unlocked.push(ep);
  }
  return unlocked;
}

export function episodeProgress(state, ep) {
  if (state.episodes[ep.id]) return 1;
  return episodeMet(state, ep) ? 1 : 0;
}

/* ------------------------------------------------------------- regali/hoja */

export function todayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dailyAvailable(state, now = Date.now()) {
  return state.lastDaily !== todayKey(now);
}

export function claimDaily(state, now = Date.now()) {
  if (!dailyAvailable(state, now)) return { ok: false, msg: "Già ritirato. Torna domani." };
  const crumbs = 90;
  const fragments = 2;
  state.lastDaily = todayKey(now);
  state.crumbs += crumbs;
  state.fragments += fragments;
  return { ok: true, crumbs, fragments, msg: `+${crumbs} briciole, +${fragments} frammenti` };
}

/* ------------------------------------------------------------------ stats */

export function collectionStats(state) {
  const tenantsOwned = TENANTS.filter((t) => state.tenants[t.id]).length;
  const furnitureOwned = FURNITURE.filter((f) => state.furniture[f.id]).length;
  const episodesDone = EPISODES.filter((e) => state.episodes[e.id]).length;
  return {
    tenantsOwned,
    tenantsTotal: TENANTS.length,
    furnitureOwned,
    furnitureTotal: FURNITURE.length,
    episodesDone,
    episodesTotal: EPISODES.length,
  };
}

/* ------------------------------------------------------ verbali assemblea */

/* PRNG locale: stesso algoritmo mulberry32 usato nei test, qui per i verbali */
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const VERBALE_OPENERS = [
  "L'assemblea della Scala B si è riunita d'urgenza nel corridoio (la sala è in asciugatura).",
  "Seduta straordinaria del condominio, presieduta da un gatto che non aveva voglia.",
  "Verbale dell'assemblea tenutasi a mezz'ora incerta, tra due ricordi e un frigorifero.",
  "Convocata l'assemblea per discutere la mozione «Chi ha lasciato il buco nel muro di nuovo?».",
];

const VERBALE_CLOSERS = [
  "Nessuna mozione è passata. Tutti sono tornati a casa contenti lo stesso.",
  "La seduta è stata sciolta in allegria e in confusione.",
  "Si è concluso con un applauso scambiato per un tuono (colpa di Nuvola, forse).",
  "Il verbale verrà affisso accanto al tabellino delle bollette, sotto un poster di Lasagna.",
  "Si è bevuto il tè. L'ordine del giorno è stato considerato assolto.",
];

/* Articoli generati dallo stato di gioco: tenant, episodi, arredi, piani */
function verbaItems(state, rng) {
  const items = [];
  const owned = TENANTS.filter((t) => state.tenants[t.id]);
  const doneEps = EPISODES.filter((e) => state.episodes[e.id]);
  const placed = FURNITURE.filter((f) => (state.furniture[f.id] || 0) > 0);

  if (owned.length) {
    const a = pick(rng, owned);
    const b = owned.length > 1 ? pick(rng, owned.filter((t) => t.id !== a.id)) : null;
    if (b) {
      items.push(
        `Si è discusso a lungo del rapporto fra ${a.emoji} ${a.name} e ${b.emoji} ${b.name}: la delibera consiglia di non metterli sullo stesso piano senza un mediatore.`
      );
    } else {
      items.push(
        `Ordine del giorno: la richiesta di ${a.emoji} ${a.name} di sostituire la porta con qualcosa di più elastico.`
      );
    }
  }

  if (doneEps.length) {
    const ep = pick(rng, doneEps);
    items.push(
      `Ricordo agli aventi diritto che «${ep.title}» è un episodio chiuso: non si riscuote due volte, nemmeno per sbaglio.`
    );
  } else {
    items.push(
      "Si è segnalato che nessun episodio è ancora accaduto: il palazzo attende con pazienza architettonica."
    );
  }

  if (placed.length) {
    const f = pick(rng, placed);
    items.push(
      `Proposta di ${f.emoji} ${f.name}: restare in funzione solo di giorno. Respinta perché «non si sa mai».`
    );
  } else {
    items.push(
      "Si è notato che gli appartamenti sono ancora vuoti: la mobilità degli arredi resta un sogno irrealizzato."
    );
  }

  if (state.unlockedFloors >= 3) {
    items.push(
      `I residenti dei piani 1–${state.unlockedFloors} chiedono un ascensore che funzioni almeno per le scale.`
    );
  } else {
    items.push("Si è votato per un ascensore. Il risultato è sospeso a data da destinarsi (cioè mai).");
  }

  if (state.favorsDone > 0) {
    items.push(
      `Registro dei favori: ${state.favorsDone} richieste evase senza burocrazia. Complimenti al portiere.`
    );
  }

  return items;
}

/* Compose un verbale assurdo deterministico per (state, seed).
   Più alto è il seed, più il testo cambia: stesso seed → stesso verbale. */
export function assemblyMinutes(state, seed = 0) {
  const rng = mulberry32((seed * 2654435761 + state.pulls * 97 + state.favorsDone * 13) >>> 0);
  const opener = pick(rng, VERBALE_OPENERS);
  const items = verbaItems(state, rng);
  const closer = pick(rng, VERBALE_CLOSERS);
  const lines = [opener, "", "Ordine del giorno:", ...items.map((s, i) => `${i + 1}. ${s}`), "", closer];
  return lines.join("\n");
}

/* --------------------------------------------------- Gris IA offline locale */

/* Compositore 100% locale: template + PRNG, nessuna rete, nessun modello.
   Se qualcosa va storto, ritorna null e l'UI usa le battute scritte. */
const GRIS_TEMPLATES = [
  "Corridoio {corridoio}: {dettaglio}. Vi avviso solo per cortesia.",
  "Ho contato {numero} pacchi interdimensionali. {chiusa}",
  "Nota del portiere: {dettaglio}. Firmato, Gris.",
  "Oggi il palazzo {verbo}. {chiusa}",
  "{dettaglio} — e no, non si può mettere in cassa.",
  "Se serve {cosa}, chiedete a {vicino}. Io resto qui a giudicare.",
  "Il {posto} ha opinioni su {dettaglio}. Le ignoro con eleganza.",
];

const GRIS_DETAILS = [
  "la buca delle lettere ha sognato di essere un portafoglio",
  "l'ascensore ha chiesto ferie non retribuite",
  "un fantasma ha firmato il registro degli ospiti con inchiostro invisibile",
  "il martedì si è di nuovo scambiato per un pesce",
  "il tabellino delle bollette canta fuori tono",
  "la scala B ha stretto un patto con la polvere",
  "il citofono risponde solo alle battute sensibili",
  "un divano ha preteso la scrivania del presidente",
];

const GRIS_CHIUSA = [
  "Nessun modulo da compilare.",
  "Se qualcuno chiede, era tutto regolare.",
  "Il gatto del portiere ha già dimenticato.",
  "Avvisato è armato. O almeno informato.",
  "Buona fortuna a tutti, soprattutto a me.",
  "Non firmate nulla senza leggere. Nemmeno questo.",
];

const GRIS_VERBI = ["si è svegliato con un reverse", "ha dimenticato di essere un edificio", "respira piano"];
const GRIS_COSE = ["un pangolino amministrativo", "una chiave che apre solo porte inesistenti", "tre briciole diplomatiche"];
const GRIS_POSTI = ["corridoio", "sottoscala", "attico", "cancello"];
const GRIS_VICINI = ["Nuvola", "Mimi", "Gris", "il martedì"];

export function grisLine(state, seed = 0) {
  try {
    if (!isPlainObj(state)) return null;
    const s = state;
    const rng = mulberry32(
      (seed * 2654435761 + (s.pulls | 0) * 97 + (s.favorsDone | 0) * 13 + (s.unlockedFloors | 0) * 31) >>> 0
    );
    const template = pick(rng, GRIS_TEMPLATES);
    const line = template
      .replace("{corridoio}", GRIS_POSTI[Math.floor(rng() * GRIS_POSTI.length)])
      .replace("{dettaglio}", pick(rng, GRIS_DETAILS))
      .replace("{numero}", String(1 + Math.floor(rng() * 12)))
      .replace("{chiusa}", pick(rng, GRIS_CHIUSA))
      .replace("{verbo}", pick(rng, GRIS_VERBI))
      .replace("{cosa}", pick(rng, GRIS_COSE))
      .replace("{vicino}", pick(rng, GRIS_VICINI))
      .replace("{posto}", pick(rng, GRIS_POSTI));
    if (typeof line !== "string" || !line.trim()) return null;
    return line.trim();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------ obiettivi gentili */

/* Progresso corrente (mai negativo) e completezza di un obiettivo */
export function goalProgress(state, goal) {
  if (!isPlainObj(state) || !goal || typeof goal.current !== "function") return 0;
  try {
    const n = Math.floor(+goal.current(state));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  } catch {
    return 0;
  }
}

export function goalDone(state, goal) {
  return goalProgress(state, goal) >= (goal.target || 0);
}

/* Riscuote un obiettivo raggiunto una sola volta: niente streak, niente penalità */
export function claimGoal(state, id) {
  const goal = GOAL_BY_ID[id];
  if (!goal || !isPlainObj(state)) return { ok: false, msg: "Obiettivo sconosciuto." };
  if (!isPlainObj(state.goals)) state.goals = {};
  if (state.goals[id]) return { ok: false, msg: "Già riscosso." };
  if (!goalDone(state, goal)) return { ok: false, msg: "Non è ancora pronto." };
  state.goals[id] = true;
  const crumbs = Math.max(0, Math.floor(+goal.crumbs || 0));
  const fragments = Math.max(0, Math.floor(+goal.fragments || 0));
  state.crumbs = Math.max(0, Math.floor(+state.crumbs || 0) + crumbs);
  state.fragments = Math.max(0, Math.floor(+state.fragments || 0) + fragments);
  return { ok: true, crumbs, fragments, title: goal.title };
}

export { EPISODE_BY_ID, TENANT_BY_ID, FURN_BY_ID, RARITY, MAX_LEVEL, GOALS };

/* =============================== Fase 4 — il palazzo ha memoria ========== */

const hashStr = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

function dayKeyFrom(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DIARY_TEMPLATES = [
  "Alle {ora} il pianerottolo ha sussurrato. {dettaglio}",
  "Nota del portiere: {dettaglio}. Nessun modulo allegato.",
  "{dettaglio} — e no, non si può mettere in assemblea.",
  "Oggi il palazzo ricorda: {dettaglio}",
  "Tra due ricordi e un frigorifero: {dettaglio}",
];

const DIARY_DETAILS = [
  "la buca ha sognato di essere un portafoglio e si è svegliata delusa",
  "un fantasma ha firmato il registro con inchiostro invisibile",
  "il martedì si è di nuovo scambiato per un pesce",
  "il tabellino delle bollette ha cantato fuori tono",
  "la scala B ha stretto un patto con la polvere",
  "il citofono ha risposto solo alle battute sensibili",
  "un divano ha preteso la scrivania del presidente",
  "l'ascensore ha chiesto ferie non retribuite",
];

/* Genera una cronaca del giorno: deterministica per (state, dayKey). */
export function diaryEntryFor(state, dayKey, now = Date.now()) {
  try {
    const owned = TENANTS.filter((t) => state.tenants[t.id]);
    const placed = FURNITURE.filter((f) => (state.furniture[f.id] || 0) > 0);
    const doneEps = EPISODES.filter((e) => state.episodes[e.id]);
    const ev = seasonEvent(new Date(now));
    const rng = mulberry32(hashStr(dayKey + "|" + (state.pulls | 0) + "|" + (state.favorsDone | 0) + "|" + (state.unlockedFloors | 0)) >>> 0);

    const parts = [];
    if (owned.length) {
      const a = pick(rng, owned);
      parts.push(`${a.emoji} ${a.name} ha commentato la ${ev.month || "stagione"} da ${a.title.toLowerCase()}`);
    }
    if (placed.length && rng() < 0.7) {
      const f = pick(rng, placed);
      parts.push(`${f.emoji} ${f.name} ha opinioni su ${pick(rng, DIARY_DETAILS)}`);
    }
    if (doneEps.length && rng() < 0.5) {
      const ep = pick(rng, doneEps);
      parts.push(`in archivio resta «${ep.title}», chiusa senza riscossione doppia`);
    }
    if (!parts.length) parts.push(pick(rng, DIARY_DETAILS));

    const template = pick(rng, DIARY_TEMPLATES);
    const dettaglio = parts.join("; ");
    const ora = `${8 + Math.floor(rng() * 14)}:${String(Math.floor(rng() * 60)).padStart(2, "0")}`;
    const text = template
      .replace("{ora}", ora)
      .replace("{dettaglio}", dettaglio)
      .replace("{n}", String(1 + Math.floor(rng() * 9)));

    return {
      id: dayKey,
      day: dayKey,
      season: ev.season,
      emoji: "📝",
      text: text.slice(0, 280),
    };
  } catch {
    return {
      id: dayKey,
      day: dayKey,
      season: "stagione",
      emoji: "📝",
      text: "Il palazzo è lo stesso, con o senza calendario.",
    };
  }
}

/* Assicura che ci sia al massimo una voce per oggi. Ritorna true se ne ha aggiunta una. */
export function ensureDiary(state, dayKeyFromNow) {
  if (!isPlainObj(state)) return false;
  if (!Array.isArray(state.diary)) state.diary = [];
  const day = dayKeyFrom(dayKeyFromNow);
  if (state.diary.some((e) => e && e.id === day)) return false;
  const entry = diaryEntryFor(state, day, dayKeyFromNow);
  state.diary.push(entry);
  if (state.diary.length > 60) state.diary = state.diary.slice(-60);
  return true;
}

/* ---------------------------------------------- combinazioni impossibili */

function comboMet(state, combo) {
  const hasTenant = !!state.tenants[combo.tenant];
  const hasFurn = (state.furniture[combo.furniture] || 0) > 0;
  if (!hasTenant || !hasFurn) return null;

  if (combo.where === "same-apt") {
    for (let f = 1; f <= state.unlockedFloors; f++) {
      for (const apt of state.apartments[f]) {
        if (apt.tenant === combo.tenant && apt.furniture.includes(combo.furniture)) return { floor: f };
      }
    }
    return null;
  }

  /* same-floor: tenant e arredo in appartamenti diversi dello stesso piano */
  for (let f = 1; f <= state.unlockedFloors; f++) {
    const tenantApt = state.apartments[f].findIndex((a) => a.tenant === combo.tenant);
    if (tenantApt < 0) continue;
    const other = state.apartments[f].findIndex((a, i) => i !== tenantApt && a.furniture.includes(combo.furniture));
    if (other >= 0) return { floor: f };
    const same = state.apartments[f][tenantApt].furniture.includes(combo.furniture);
    if (same && combo.where === "same-apt") return { floor: f };
  }
  return null;
}

export function checkCombos(state) {
  const unlocked = [];
  if (!isPlainObj(state.combos)) state.combos = {};
  for (const combo of COMBOS) {
    if (state.combos[combo.id]) continue;
    if (!comboMet(state, combo)) continue;
    state.combos[combo.id] = true;
    unlocked.push(combo);
  }
  /* vita precedente arredi: arredo + inquilino nella stessa casa */
  if (!isPlainObj(state.furnPast)) state.furnPast = {};
  for (const story of FURN_STORIES) {
    if (state.furnPast[story.id]) continue;
    if (!(state.furniture[story.furniture] > 0) || !state.tenants[story.withTenant]) continue;
    let found = false;
    for (let f = 1; f <= state.unlockedFloors && !found; f++) {
      for (const apt of state.apartments[f]) {
        if (apt.tenant === story.withTenant && apt.furniture.includes(story.furniture)) {
          found = true;
          break;
        }
      }
    }
    if (found) {
      state.furnPast[story.id] = true;
      unlocked.push({ ...story, kind: "furnPast" });
    }
  }
  return unlocked;
}

export function comboProgress(state, combo) {
  if (state.combos && state.combos[combo.id]) return 1;
  return comboMet(state, combo) ? 1 : 0;
}

/* ------------------------------------------- bacheca + reazioni (Fase 5) */

export function boardNotices(state, dayKey = dayKeyFrom(Date.now())) {
  try {
    const owned = TENANTS.filter((t) => state.tenants[t.id]);
    const ids = owned.map((t) => t.id);
    const rng = mulberry32(hashStr("board|" + dayKey) >>> 0);
    const pickId = () => ids[Math.floor(rng() * ids.length)] || "nuvola";
    const notices = [];
    for (let i = 0; i < 3; i++) {
      const tpl = BOARD_TEMPLATES[Math.floor(rng() * BOARD_TEMPLATES.length)];
      const a = TENANT_BY_ID[pickId()] || TENANT_BY_ID.nuvola;
      const b = TENANT_BY_ID[pickId()] || TENANT_BY_ID.mimi;
      const c = TENANT_BY_ID[pickId()] || TENANT_BY_ID.nuvola;
      const text = tpl
        .replace("{a}", a.name)
        .replace("{b}", b.name)
        .replace("{c}", c.name)
        .replace("{n}", String(1 + Math.floor(rng() * 9)));
      notices.push({ id: `${dayKey}-${i}`, text, from: a });
    }
    return notices;
  } catch {
    return [{ id: `${dayKey}-0`, text: "AVVISO: la bacheca è in riposo. Tornate con l'assemblea.", from: TENANT_BY_ID.nuvola }];
  }
}

export function reactToNotice(state, dayKey, reactionId) {
  const day = typeof dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dayKey) ? dayKey : dayKeyFrom(Date.now());
  const reaction = BOARD_REACTION_BY_ID[reactionId];
  if (!reaction) return { ok: false, msg: "Timbro sconosciuto." };
  if (!isPlainObj(state.boardReactions)) state.boardReactions = {};
  state.boardReactions[day] = reactionId;
  return { ok: true, reaction, msg: `Timbrato: ${reaction.label}` };
}

/* ---------------------------------------- ascensore impossibile (Fase 5) */

export function elevatorAvailable(state, dest) {
  if (!dest || !dest.require) return true;
  const r = dest.require;
  if (r.floors && state.unlockedFloors < r.floors) return false;
  if (r.episode && !(state.episodes && state.episodes[r.episode])) return false;
  if (r.combo && !(state.combos && state.combos[r.combo])) return false;
  return true;
}

export function visitElevator(state, destId) {
  const dest = ELEVATOR_BY_ID[destId];
  if (!dest) return { ok: false, msg: "Piano non trovato." };
  if (!elevatorAvailable(state, dest)) return { ok: false, msg: "L'ascensore non arriva ancora lì." };
  if (!isPlainObj(state.elevator)) state.elevator = {};
  const first = !state.elevator[dest.id];
  state.elevator[dest.id] = true;
  return { ok: true, dest, first };
}

export function unlockedElevatorDests(state) {
  return ELEVATOR_DESTS.filter((d) => elevatorAvailable(state, d));
}

/* ------------------------------------------- francobolli (Fase 5) */

export function refreshStamps(state) {
  if (!isPlainObj(state.stamps)) state.stamps = {};
  const fresh = [];
  for (const stamp of STAMPS) {
    if (state.stamps[stamp.id]) continue;
    let ok = false;
    try {
      ok = !!stamp.unlock(state);
    } catch {
      ok = false;
    }
    if (ok) {
      state.stamps[stamp.id] = true;
      fresh.push(stamp);
    }
  }
  return fresh;
}

export function availableStamps(state) {
  return STAMPS.filter((s) => state.stamps && state.stamps[s.id]);
}

export function selectStamp(state, stampId) {
  if (stampId == null) {
    state.selectedStamp = null;
    return { ok: true, stamp: null };
  }
  if (!state.stamps || !state.stamps[stampId]) return { ok: false, msg: "Francobollo non sbloccato." };
  state.selectedStamp = stampId;
  return { ok: true, stamp: STAMPS.find((s) => s.id === stampId) };
}

/* ------------------------------------------- visita guidata (Fase 5) */

export function tourStops(state) {
  const stops = [{ kind: "intro" }];
  for (let f = 1; f <= state.unlockedFloors; f++) {
    const residents = state.apartments[f].map((a) => a.tenant).filter(Boolean);
    stops.push({ kind: "floor", floor: f, residents });
  }
  stops.push({ kind: "outro" });
  return stops;
}

export function tourStepData(state, index) {
  const stops = tourStops(state);
  if (index < 0 || index >= stops.length) return null;
  return stops[index];
}

export function advanceTour(state) {
  const stops = tourStops(state);
  if (state.tourDone) return { done: true, step: null };
  const next = (state.tourStep | 0) + 1;
  if (next >= stops.length) {
    state.tourDone = true;
    state.tourStep = stops.length;
    return { done: true, step: null, stop: stops[stops.length - 1] };
  }
  state.tourStep = next;
  return { done: false, step: next, stop: stops[next] };
}

export function startTour(state) {
  state.tourStep = 0;
  state.tourDone = false;
  return tourStepData(state, 0);
}
