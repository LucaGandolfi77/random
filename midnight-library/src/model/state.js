// Model · Stato: default, validazione, migrazione, tick passivo.
// Nessun accesso al DOM. Il tempo entra sempre come parametro `now`.

import {
  MAX, SAVE_VERSION, PASSIVE_CAP_MS, LETTER_MAX_LEN, MAX_LETTERS, clamp,
} from '../config.js';
import { MESSAGES, RARE_BOOKS, ROOMS, MOON_ACHIEVEMENTS, READERS } from './data.js';

const MOON_ALMANAC = { achievements: MOON_ACHIEVEMENTS };

export function roomIds() {
  return ROOMS.map((r) => r.id);
}

// Profilo lettore procedurale: seed deterministico da `readerDue` (F2.1).
export function buildReaderProfile(seed) {
  const names = READERS.names?.it?.length ? READERS.names.it : ['Ospite'];
  const moods = ['shy', 'curious', 'dreamy'];
  const books = RARE_BOOKS.map((b) => b.id);
  const n = ((seed | 0) % names.length + names.length) % names.length;
  const m = ((seed | 0) % moods.length + moods.length) % moods.length;
  const b = books.length
    ? books[((seed | 0) % books.length + books.length) % books.length]
    : null;
  return {
    seed: seed | 0,
    name: names[n],
    mood: moods[m],
    preferredBook: b,
    choice: null,
    reply: null,
  };
}

export function isRoomUnlocked(state, roomId) {
  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) return false;
  if (room.id === 'hall') return true;
  const req = room.requires;
  if (!req) return true;
  if (req.unlock) return Boolean(state.unlocks?.[req.unlock]);
  if (req.milestone) return Boolean(state.milestones?.[req.milestone]);
  return false;
}

export function defaultState() {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    resources: { luce: 3, calma: 5, inchiostro: 0 },
    lanterns: [false, false, false, false],
    booksOnTable: 3,
    booksShelved: 0,
    teasBrewed: 0,
    readersServed: 0,
    readerActive: false,
    readerProfile: null,
    raresFound: [],
    raresCataloged: [],
    letters: [],
    room: 'hall',
    activityDue: { sortArchive: 0, tendPlants: 0 },
    unlocks: { curiosityShelf: false, skylight: false, wellRoom: false },
    milestones: { firstLight: false, firstGuest: false, dawn: false },
    stats: {
      lanternsLit: 0, booksShelved: 0, teasBrewed: 0,
      readersServed: 0, eventsSeen: 0, archiveSorted: 0, plantsTended: 0,
    },
    settings: {
      music: true, sfx: true, lang: 'it', reducedMotion: false,
      haptics: true, wakeLock: false, parallax: false, archiveIdb: false,
      highContrast: false, voiceCommands: false,
    },
    peerName: '',
    activeMods: [],
    tutorialStep: 0,
    tutorialDone: false,
    lastSave: now,
    lastTick: now,
    lastAmbient: now,
    ambientIndex: 0,
    catArea: 'hearth',
    catWeights: defaultCatWeights(),
    weather: 'clear',
    weatherChangedAt: now,
    event: null,
    eventDue: now + 60000,
    bookDue: now + 45000,
    readerDue: now + 40000,
    playtime: 0,
    almanac: {
      full: 0, new: 0, phases: [],
      lastPhaseId: null, lastPhaseDay: null,
      achievements: {},
    },
    daily: { key: null, seed: 0, letterApplied: false },
  };
}

export function defaultCatWeights() {
  return {
    hearth: 1, lanterns: 1, tableArea: 1, kettle: 1,
    shelves: 1, archive: 1, greenhouse: 1, readerZone: 1,
  };
}

// Validazione e migrazione del salvataggio → restituisce sempre uno stato valido.
export function validateAndMigrate(raw) {
  if (!raw || typeof raw !== 'object') return defaultState();
  let data = raw;
  if (typeof data.version !== 'number' || data.version < 1) return defaultState();
  if (!data.resources || typeof data.resources !== 'object') return defaultState();
  if (data.version < SAVE_VERSION) data = migrate(data);

  const s = defaultState();
  const now = Date.now();

  s.resources = {
    luce: clamp(data.resources.luce, 0, MAX.luce),
    calma: clamp(data.resources.calma, 0, MAX.calma),
    inchiostro: clamp(data.resources.inchiostro, 0, MAX.inchiostro),
  };
  if (Array.isArray(data.lanterns) && data.lanterns.length === 4) {
    s.lanterns = data.lanterns.map(Boolean);
  }
  s.booksOnTable = clamp(data.booksOnTable, 0, 8) | 0;
  s.booksShelved = clamp(data.booksShelved, 0, 99999) | 0;
  s.teasBrewed = clamp(data.teasBrewed, 0, 99999) | 0;
  s.readersServed = clamp(data.readersServed, 0, 99999) | 0;
  s.readerActive = Boolean(data.readerActive);
  s.readerProfile = sanitizeReaderProfile(data.readerProfile);

  const knownIds = new Set(RARE_BOOKS.map((b) => b.id));
  s.raresFound = Array.isArray(data.raresFound)
    ? data.raresFound.filter((id) => knownIds.has(id))
    : [];
  s.raresCataloged = Array.isArray(data.raresCataloged)
    ? data.raresCataloged.filter((id) => knownIds.has(id) && s.raresFound.includes(id))
    : [];

  s.letters = sanitizeLetters(data.letters);

  s.unlocks = {
    curiosityShelf: Boolean(data.unlocks?.curiosityShelf),
    skylight: Boolean(data.unlocks?.skylight),
    wellRoom: Boolean(data.unlocks?.wellRoom),
  };
  s.milestones = {
    firstLight: Boolean(data.milestones?.firstLight),
    firstGuest: Boolean(data.milestones?.firstGuest),
    dawn: Boolean(data.milestones?.dawn),
  };
  s.stats = {
    lanternsLit: clamp(data.stats?.lanternsLit, 0, 99999) | 0,
    booksShelved: clamp(data.stats?.booksShelved, 0, 99999) | 0,
    teasBrewed: clamp(data.stats?.teasBrewed, 0, 99999) | 0,
    readersServed: clamp(data.stats?.readersServed, 0, 99999) | 0,
    eventsSeen: clamp(data.stats?.eventsSeen, 0, 99999) | 0,
    archiveSorted: clamp(data.stats?.archiveSorted, 0, 99999) | 0,
    plantsTended: clamp(data.stats?.plantsTended, 0, 99999) | 0,
  };
  s.settings = {
    music: data.settings?.music !== false,
    sfx: data.settings?.sfx !== false,
    lang: data.settings?.lang === 'en' ? 'en' : 'it',
    reducedMotion: Boolean(data.settings?.reducedMotion),
    haptics: data.settings?.haptics !== false,
    wakeLock: Boolean(data.settings?.wakeLock),
    parallax: Boolean(data.settings?.parallax),
    archiveIdb: Boolean(data.settings?.archiveIdb),
    highContrast: Boolean(data.settings?.highContrast),
    voiceCommands: Boolean(data.settings?.voiceCommands),
  };
  s.peerName = typeof data.peerName === 'string' ? data.peerName.trim().slice(0, 32) : '';
  s.activeMods = Array.isArray(data.activeMods)
    ? data.activeMods.filter((m) => typeof m === 'string' && /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(m)).slice(0, 8)
    : [];
  const knownRooms = roomIds();
  s.room = knownRooms.includes(data.room) ? data.room : 'hall';
  s.activityDue = {
    sortArchive: clamp(data.activityDue?.sortArchive, 0, now + 3600000) | 0,
    tendPlants: clamp(data.activityDue?.tendPlants, 0, now + 3600000) | 0,
  };
  s.tutorialStep = clamp(data.tutorialStep, 0, 4) | 0;
  s.tutorialDone = Boolean(data.tutorialDone);
  s.lastSave = clamp(data.lastSave, 0, now + 1000) | 0;
  s.lastTick = clamp(data.lastTick, 0, now) | 0;
  s.lastAmbient = clamp(data.lastAmbient, 0, now) | 0;
  s.ambientIndex = clamp(data.ambientIndex, 0, MESSAGES.it.length - 1) | 0;
  s.catArea = ['hearth', 'lanterns', 'tableArea', 'kettle', 'shelves'].includes(data.catArea)
    ? data.catArea
    : 'hearth';
  s.catWeights = sanitizeCatWeights(data.catWeights);
  s.weather = data.weather === 'rain' ? 'rain' : 'clear';
  s.weatherChangedAt = clamp(data.weatherChangedAt, 0, now) | 0;
  s.event = validateEvent(data.event, now);
  s.eventDue = clamp(data.eventDue, 0, now + 3600000) | 0;
  s.bookDue = clamp(data.bookDue, 0, now + 3600000) | 0;
  s.readerDue = clamp(data.readerDue, 0, now + 3600000) | 0;
  s.playtime = clamp(data.playtime, 0, 99999999) | 0;
  s.almanac = sanitizeAlmanac(data.almanac);
  s.daily = sanitizeDaily(data.daily);

  // Se il lettore è attivo ma manca il profilo, rigeneralo (cross-load sicuro).
  if (s.readerActive && !s.readerProfile) {
    s.readerProfile = buildReaderProfile(s.readerDue);
  }
  if (!s.readerActive) s.readerProfile = null;

  // Riallinea milestone/sblocchi con i dati effettivi.
  if (s.lanterns.filter(Boolean).length >= 4) s.milestones.firstLight = true;
  if (s.readersServed >= 1) s.milestones.firstGuest = true;
  if (s.raresCataloged.length >= RARE_BOOKS.length) s.milestones.dawn = true;
  if (s.milestones.firstLight) s.unlocks.curiosityShelf = true;
  if (s.milestones.firstGuest) s.unlocks.skylight = true;
  if (s.readersServed >= 3) s.unlocks.wellRoom = true;
  if (!isRoomUnlocked(s, s.room)) s.room = 'hall';
  return s;
}

function sanitizeLetters(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((l) => l && typeof l === 'object' && typeof l.text === 'string')
    .map((l) => ({
      id: clamp(l.id, 0, 999999999) | 0,
      text: l.text.trim().slice(0, LETTER_MAX_LEN),
      ts: clamp(l.ts, 0, Date.now() + 1000) | 0,
    }))
    .filter((l) => l.text.length > 0)
    .slice(-MAX_LETTERS);
}

function migrate(data) {
  // v1→v2 timer · v2→v3 letters/settings · v3→v4 stanze · v4→v5 intelligenza · v5→v6 ecosistema.
  const out = { ...data, version: SAVE_VERSION };
  if (!out.eventDue) out.eventDue = Date.now() + 60000;
  if (!out.bookDue) out.bookDue = Date.now() + 45000;
  if (!out.readerDue) out.readerDue = Date.now() + 40000;
  if (!out.stats) out.stats = {};
  if (typeof out.stats.archiveSorted !== 'number') out.stats.archiveSorted = 0;
  if (typeof out.stats.plantsTended !== 'number') out.stats.plantsTended = 0;
  if (!Array.isArray(out.letters)) out.letters = [];
  if (typeof out.room !== 'string') out.room = 'hall';
  if (!out.activityDue || typeof out.activityDue !== 'object') {
    out.activityDue = { sortArchive: 0, tendPlants: 0 };
  }
  if (!out.settings || typeof out.settings !== 'object') out.settings = {};
  if (typeof out.settings.archiveIdb !== 'boolean') out.settings.archiveIdb = false;
  // Fase 2 defaults
  if (!out.catWeights || typeof out.catWeights !== 'object') out.catWeights = defaultCatWeights();
  if (out.weather !== 'rain') out.weather = 'clear';
  if (typeof out.weatherChangedAt !== 'number') out.weatherChangedAt = Date.now();
  if (out.readerProfile === undefined) out.readerProfile = null;
  if (!out.almanac || typeof out.almanac !== 'object') {
    out.almanac = { full: 0, new: 0, phases: [], lastPhaseId: null, lastPhaseDay: null, achievements: {} };
  }
  if (!out.daily || typeof out.daily !== 'object') out.daily = { key: null, seed: 0, letterApplied: false };
  // Fase 3 defaults
  if (!out.settings || typeof out.settings !== 'object') out.settings = {};
  if (typeof out.settings.highContrast !== 'boolean') out.settings.highContrast = false;
  if (typeof out.settings.voiceCommands !== 'boolean') out.settings.voiceCommands = false;
  if (typeof out.peerName !== 'string') out.peerName = '';
  if (!Array.isArray(out.activeMods)) out.activeMods = [];
  return out;
}

function sanitizeReaderProfile(p) {
  if (!p || typeof p !== 'object') return null;
  if (typeof p.name !== 'string' || !p.name) return null;
  const mood = ['shy', 'curious', 'dreamy'].includes(p.mood) ? p.mood : 'curious';
  const choice = typeof p.choice === 'string' ? p.choice : null;
  return {
    seed: clamp(p.seed, 0, 999999999) | 0,
    name: p.name.slice(0, 24),
    mood,
    preferredBook: typeof p.preferredBook === 'string' ? p.preferredBook.slice(0, 40) : null,
    choice,
    reply: typeof p.reply === 'string' ? p.reply.slice(0, 280) : null,
  };
}

function sanitizeCatWeights(w) {
  const base = defaultCatWeights();
  if (!w || typeof w !== 'object') return base;
  Object.keys(base).forEach((k) => {
    base[k] = clamp(w[k], 0.05, 20) || 1;
  });
  return base;
}

function sanitizeAlmanac(a) {
  const base = { full: 0, new: 0, phases: [], lastPhaseId: null, lastPhaseDay: null, achievements: {} };
  if (!a || typeof a !== 'object') return base;
  base.full = clamp(a.full, 0, 9999) | 0;
  base.new = clamp(a.new, 0, 9999) | 0;
  base.phases = Array.isArray(a.phases)
    ? [...new Set(a.phases.filter((p) => typeof p === 'string'))]
    : [];
  base.lastPhaseId = typeof a.lastPhaseId === 'string' ? a.lastPhaseId : null;
  base.lastPhaseDay = typeof a.lastPhaseDay === 'number' ? (a.lastPhaseDay | 0) : null;
  if (a.achievements && typeof a.achievements === 'object') {
    Object.entries(a.achievements).forEach(([k, v]) => {
      if (typeof k === 'string' && k.length <= 40) base.achievements[k] = Boolean(v);
    });
  }
  return base;
}

function sanitizeDaily(d) {
  const base = { key: null, seed: 0, letterApplied: false };
  if (!d || typeof d !== 'object') return base;
  if (typeof d.key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.key)) base.key = d.key;
  base.seed = clamp(d.seed, 0, 4294967295) | 0;
  base.letterApplied = Boolean(d.letterApplied);
  return base;
}

function validateEvent(ev, now) {
  if (!ev || typeof ev !== 'object') return null;
  const type = ['reader', 'cat', 'rain', 'fallenBook'].includes(ev.type) ? ev.type : null;
  if (!type) return null;
  return {
    type,
    expires: clamp(ev.expires, 0, now + 120000) | 0,
    bonus: Boolean(ev.bonus),
  };
}

// Rigenerazione passiva in base al tempo trascorso (cap: 1h per ciclo).
export function tick(state, now) {
  const dt = Math.min(now - (state.lastTick || now), PASSIVE_CAP_MS);
  if (dt < 1000) return;
  const secs = dt / 1000;
  const lit = state.lanterns.filter(Boolean).length;
  const skylightBonus = state.unlocks.skylight ? 0.02 : 0;

  state.resources.luce = clamp(
    state.resources.luce + (lit * 0.012 + skylightBonus) * secs,
    0, MAX.luce,
  );
  state.resources.calma = clamp(state.resources.calma + 0.004 * secs, 0, MAX.calma);
  state.playtime += Math.floor(secs);
  state.lastTick = now;
}

// Fase lunare 0..1 (0 = nuova, 0.5 = piena): algoritmo date-only, zero rete.
export const SYNODIC_MS = 29.530588853 * 24 * 60 * 60 * 1000;
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);

export function moonPhase(now = Date.now()) {
  const phase = (((now - NEW_MOON_EPOCH) % SYNODIC_MS) + SYNODIC_MS) % SYNODIC_MS / SYNODIC_MS;
  return phase;
}

export function moonPhaseId(phase) {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p >= 0.97) return 'new';
  if (p < 0.22) return 'waxingCrescent';
  if (p < 0.28) return 'first';
  if (p < 0.47) return 'waxingGibbous';
  if (p < 0.53) return 'full';
  if (p < 0.72) return 'waningGibbous';
  if (p < 0.78) return 'last';
  return 'waningCrescent';
}

// ---- Almanacco delle lune (F2.3) ----
// Conta le fasi osservate "in sessione di gioco" (una per giorno solare).
// Ritorna le conquiste sbloccate in questo ciclo (per i toast).
export function observeMoon(state, now = Date.now(), moonFn = moonPhase) {
  const phase = moonFn(now);
  const id = moonPhaseId(phase);
  const day = Math.floor(now / 86400000);
  const a = state.almanac;
  const unlocked = [];

  // Prima osservazione della giornata per questa fase.
  if (a.lastPhaseDay !== day || a.lastPhaseId !== id) {
    if (!a.phases.includes(id)) a.phases.push(id);
    if (id === 'full' && a.lastPhaseDay !== day) a.full += 1;
    if (id === 'new' && a.lastPhaseDay !== day) a.new += 1;
    a.lastPhaseId = id;
    a.lastPhaseDay = day;
    unlockMoonAchievements(state, unlocked);
  }
  void phase;
  return unlocked;
}

function unlockMoonAchievements(state, unlocked) {
  const list = Object.entries(MOON_ALMANAC.achievements || {});
  const a = state.almanac;
  list.forEach(([key, def]) => {
    if (a.achievements[key]) return;
    const req = def.require || {};
    let ok = true;
    if (typeof req.full === 'number' && a.full < req.full) ok = false;
    if (typeof req.new === 'number' && a.new < req.new) ok = false;
    if (typeof req.phases === 'number' && a.phases.length < req.phases) ok = false;
    if (ok) {
      a.achievements[key] = true;
      unlocked.push(key);
    }
  });
}
