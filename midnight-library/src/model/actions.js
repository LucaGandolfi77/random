// Model · Azioni: regole di gameplay. Ogni azione accetta `now` (purezza testabile).

import {
  MAX, CATALOG_COST, SERVE_COST, LANTERN_DIM_CHANCE, MAX_LETTERS, LETTER_MAX_LEN, clamp,
} from '../config.js';
import {
  MESSAGES, MILESTONES, RARE_BOOKS, ACTIVITIES, ROOMS, READERS, DAILY_LETTERS,
} from './data.js';
import { isRoomUnlocked, buildReaderProfile, moonPhase, moonPhaseId, defaultCatWeights, observeMoon } from './state.js';

const CAT_AREAS = ['hearth', 'lanterns', 'tableArea', 'kettle', 'shelves', 'archive', 'greenhouse'];
const HALL_AREAS = CAT_AREAS.slice(0, 5);

function pickCatAreaWeighted(weights, current, rng = Math.random) {
  // Zone preferite con decay esponenziale (F2.4): pesi > 0, mai zero.
  const options = HALL_AREAS.filter((a) => a !== current);
  if (!options.length) return current;
  const w = options.map((a) => Math.max(0.05, weights?.[a] ?? 1));
  const total = w.reduce((s, x) => s + x, 0);
  let roll = rng() * total;
  for (let i = 0; i < options.length; i += 1) {
    roll -= w[i];
    if (roll <= 0) return options[i];
  }
  return options[options.length - 1];
}

function bumpCatWeight(state, area) {
  if (!state.catWeights) state.catWeights = defaultCatWeights();
  const w = state.catWeights;
  Object.keys(w).forEach((k) => {
    // Interazione nella zona → boost; altre zone → decay esponenziale.
    w[k] = k === area ? Math.min(4, w[k] * 1.6) : Math.max(0.05, w[k] * 0.82);
  });
}

// Meccanica emergente: interagire dove siede il gatto-ombra dà +1.
function catBonus(state, area) {
  bumpCatWeight(state, area);
  if (state.catArea === area) {
    state.catArea = pickCatAreaWeighted(state.catWeights, area);
    return 1;
  }
  state.catArea = area;
  return 0;
}

function grantMilestone(state, key) {
  state.milestones[key] = true;
  const unlock = MILESTONES[key].unlock;
  if (unlock) state.unlocks[unlock] = true;
}

function advanceTutorial(state, step) {
  if (state.tutorialDone) return;
  if (state.tutorialStep === step) state.tutorialStep = step + 1;
  if (state.tutorialStep >= 4) state.tutorialDone = true;
}

// ---- Azioni ----

export function lightLantern(state, index, now) {
  void now;
  if (index < 0 || index >= state.lanterns.length) return { ok: false };
  if (state.lanterns[index]) return { ok: false };
  state.lanterns[index] = true;
  state.stats.lanternsLit += 1;
  const bonus = catBonus(state, 'lanterns');
  advanceTutorial(state, 0);
  const litCount = state.lanterns.filter(Boolean).length;
  const unlocked = litCount >= 4 && !state.milestones.firstLight;
  if (unlocked) grantMilestone(state, 'firstLight');
  return { ok: true, litCount, bonus, milestone: unlocked ? 'firstLight' : null };
}

export function shelveBook(state, now) {
  if (state.booksOnTable <= 0) return { ok: false, reason: 'empty' };
  state.booksOnTable -= 1;
  state.booksShelved += 1;
  state.stats.booksShelved += 1;
  const bonus = catBonus(state, 'shelves');
  const ink = 1 + bonus;
  state.resources.inchiostro = clamp(state.resources.inchiostro + ink, 0, MAX.inchiostro);
  state.resources.calma = clamp(state.resources.calma + 0.5, 0, MAX.calma);
  advanceTutorial(state, 1);
  if (state.bookDue - now > 25000) state.bookDue = now + 25000;
  return { ok: true, ink, bonus };
}

export function brewTea(state, now) {
  const gain = state.unlocks.wellRoom ? 2 : 1;
  state.resources.calma = clamp(state.resources.calma + gain, 0, MAX.calma);
  state.teasBrewed += 1;
  state.stats.teasBrewed += 1;
  const bonus = catBonus(state, 'kettle');
  advanceTutorial(state, 2);
  state.readerDue = Math.min(state.readerDue, now + (state.unlocks.wellRoom ? 8000 : 14000));
  if (bonus && !state.readerActive) state.readerDue = now + 3000;
  return { ok: true, gain: gain + bonus, bonus };
}

export function serveReader(state, now, rng = Math.random) {
  if (!state.readerActive) return { ok: false, reason: 'none' };
  if (state.resources.calma < SERVE_COST) return { ok: false, reason: 'calma' };
  state.resources.calma -= SERVE_COST;
  let inkGain = 2;
  let calmaGain = 0;
  let rareMod = 0;
  const profile = state.readerProfile;

  // Dialogo a scelta multipla (F2.1): se non ancora scelto, obbliga la scelta prima.
  if (profile && !profile.choice) {
    // Serve senza dialogo → nessun bonus, ma non bloccare (accessibile).
    rareMod = 0;
  } else if (profile?.choice) {
    const choiceDef = (READERS.dialogue?.choices || []).find((c) => c.id === profile.choice);
    if (choiceDef) {
      rareMod = Number(choiceDef.rareMod) || 0;
      calmaGain = Number(choiceDef.calmaMod) || 0;
      inkGain += Number(choiceDef.inkMod) || 0;
    }
  }

  state.resources.inchiostro = clamp(state.resources.inchiostro + inkGain, 0, MAX.inchiostro);
  state.resources.luce = clamp(state.resources.luce + 1, 0, MAX.luce);
  if (calmaGain) {
    state.resources.calma = clamp(state.resources.calma + calmaGain, 0, MAX.calma);
  }
  state.readersServed += 1;
  state.stats.readersServed += 1;
  state.readerActive = false;
  state.readerProfile = null;
  state.readerDue = now + (state.unlocks.wellRoom ? 18000 : 28000);
  const bonus = catBonus(state, 'readerZone');
  advanceTutorial(state, 3);

  let found = null;
  const missing = RARE_BOOKS.filter((b) => !state.raresFound.includes(b.id));
  const chance = clamp(
    0.35 + (state.teasBrewed % 3) * 0.05 + (bonus ? 0.1 : 0) + rareMod,
    0.05, 0.95,
  );
  if (missing.length && rng() < chance) {
    [found] = missing;
    state.raresFound.push(found.id);
  }

  const unlockedGuest = !state.milestones.firstGuest;
  if (unlockedGuest) grantMilestone(state, 'firstGuest');
  if (state.readersServed >= 3 && !state.unlocks.wellRoom) state.unlocks.wellRoom = true;

  return {
    ok: true,
    found,
    bonus,
    rareMod,
    choice: profile?.choice || null,
    milestone: unlockedGuest ? 'firstGuest' : null,
    unlockWellRoom: state.readersServed === 3,
  };
}

// Scelta dialogo con il lettore attivo (F2.1). Modera la chance di rari al serve.
export function answerReaderDialogue(state, choiceId, now) {
  if (!state.readerActive) return { ok: false, reason: 'none' };
  if (!state.readerProfile) state.readerProfile = buildReaderProfile(state.readerDue);
  const choice = (READERS.dialogue?.choices || []).find((c) => c.id === choiceId);
  if (!choice) return { ok: false, reason: 'unknown' };
  if (state.readerProfile.choice) return { ok: false, reason: 'already' };
  state.readerProfile.choice = choice.id;
  state.readerProfile.reply = choice.it?.reply || choice.en?.reply || null;
  void now;
  return {
    ok: true,
    choice: choice.id,
    reply: state.readerProfile.reply,
    rareMod: Number(choice.rareMod) || 0,
    calmaMod: Number(choice.calmaMod) || 0,
  };
}

export function catalogRare(state, id, now) {
  void now;
  if (!state.unlocks.curiosityShelf) return { ok: false, reason: 'locked' };
  if (!state.raresFound.includes(id)) return { ok: false, reason: 'notFound' };
  if (state.raresCataloged.includes(id)) return { ok: false, reason: 'done' };
  if (state.resources.inchiostro < CATALOG_COST) return { ok: false, reason: 'ink' };
  state.resources.inchiostro -= CATALOG_COST;
  state.raresCataloged.push(id);
  const complete = state.raresCataloged.length >= RARE_BOOKS.length && !state.milestones.dawn;
  if (complete) grantMilestone(state, 'dawn');
  return { ok: true, complete, milestone: complete ? 'dawn' : null };
}

export function collectFallenBook(state, now) {
  if (!state.event || state.event.type !== 'fallenBook') return { ok: false };
  const bonus = catBonus(state, 'tableArea');
  const ink = 2 + bonus;
  state.resources.inchiostro = clamp(state.resources.inchiostro + ink, 0, MAX.inchiostro);
  state.event = null;
  state.eventDue = now + 55000;
  return { ok: true, ink, bonus };
}

export function dismissEvent(state, now) {
  if (!state.event) return;
  if (state.event.type === 'rain') {
    state.resources.calma = clamp(state.resources.calma + 1, 0, MAX.calma);
  }
  state.event = null;
  state.eventDue = now + 55000;
}

// Lettere ricevute via Web Share Target / appunti (max N, testo troncato).
export function addLetter(state, rawText, now) {
  const text = String(rawText ?? '').trim().slice(0, LETTER_MAX_LEN);
  if (!text) return { ok: false, reason: 'empty' };
  const last = state.letters[state.letters.length - 1];
  if (last && last.text === text && now - last.ts < 5000) {
    return { ok: false, reason: 'duplicate' };
  }
  const id = (state.letters[state.letters.length - 1]?.id ?? 0) + 1;
  state.letters.push({ id, text, ts: now });
  if (state.letters.length > MAX_LETTERS) {
    state.letters = state.letters.slice(-MAX_LETTERS);
  }
  return { ok: true, text };
}

// ---- Stanze (Fase 1 · Scalabilità) ----

export function switchRoom(state, roomId) {
  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) return { ok: false, reason: 'unknown' };
  if (!isRoomUnlocked(state, roomId)) return { ok: false, reason: 'locked' };
  if (state.room === roomId) return { ok: true, noop: true };
  state.room = roomId;
  return { ok: true, room: roomId };
}

function activityReady(state, key, now) {
  return now >= (state.activityDue?.[key] || 0);
}

function scheduleActivity(state, key, now) {
  const def = ACTIVITIES[key] || {};
  const cooldown = def.cooldownMs || 4000;
  state.activityDue[key] = now + cooldown;
}

// Soppalco: riordina archivi → Inchiostro + un tocco di Calma.
export function sortArchive(state, now) {
  if (state.room !== 'attic') return { ok: false, reason: 'wrongRoom' };
  if (!isRoomUnlocked(state, 'attic')) return { ok: false, reason: 'locked' };
  if (!activityReady(state, 'sortArchive', now)) return { ok: false, reason: 'cooldown' };
  const def = ACTIVITIES.sortArchive || {};
  const gain = def.gain || { inchiostro: 1, calma: 0.25 };
  const bonus = catBonus(state, 'archive');
  const ink = (gain.inchiostro || 0) + bonus;
  state.resources.inchiostro = clamp(state.resources.inchiostro + ink, 0, MAX.inchiostro);
  state.resources.calma = clamp(state.resources.calma + (gain.calma || 0), 0, MAX.calma);
  state.stats.archiveSorted += 1;
  scheduleActivity(state, 'sortArchive', now);
  return { ok: true, ink, bonus };
}

// Giardino d'inverno: cura le serre → Calma + un tocco di Luce.
export function tendPlants(state, now) {
  if (state.room !== 'winterGarden') return { ok: false, reason: 'wrongRoom' };
  if (!isRoomUnlocked(state, 'winterGarden')) return { ok: false, reason: 'locked' };
  if (!activityReady(state, 'tendPlants', now)) return { ok: false, reason: 'cooldown' };
  const def = ACTIVITIES.tendPlants || {};
  const gain = def.gain || { calma: 1, luce: 0.25 };
  const bonus = catBonus(state, 'greenhouse');
  const calma = (gain.calma || 0) + bonus;
  state.resources.calma = clamp(state.resources.calma + calma, 0, MAX.calma);
  state.resources.luce = clamp(state.resources.luce + (gain.luce || 0), 0, MAX.luce);
  state.stats.plantsTended += 1;
  scheduleActivity(state, 'tendPlants', now);
  return { ok: true, calma, bonus };
}

// Timer del mondo: spawn libri, lettori, eventi, meteo, almanacco, lettera del giorno.
export function worldTick(state, now, rng = Math.random) {
  const events = [];

  // Metereologia dinamica (F2.2): alterna clear/rain con passi casuali.
  updateWeather(state, now, rng);

  // Almanacco lune (F2.3): osserva la fase reale (una per giorno solare).
  const moonUnlocked = observeMoonSafe(state, now);
  moonUnlocked.forEach((k) => events.push({ kind: 'moonAchievement', key: k }));

  // Lettera del giorno da seed locale (F2.5).
  const daily = ensureDaily(state, now);
  if (daily) events.push(daily);

  if (state.booksOnTable < 5 && now >= state.bookDue) {
    state.booksOnTable = Math.min(state.booksOnTable + 1, 6);
    state.bookDue = now + 40000 + rng() * 30000;
    events.push({ kind: 'bookArrived' });
  }

  if (!state.readerActive && now >= state.readerDue) {
    state.readerActive = true;
    state.readerProfile = buildReaderProfile(state.readerDue);
    events.push({ kind: 'readerArrived' });
  }

  if (!state.event && now >= state.eventDue) {
    state.event = rollEvent(state, now, rng);
    if (state.event) {
      state.stats.eventsSeen += 1;
      if (state.event.type === 'reader' && !state.readerActive) {
        state.readerActive = true;
        state.readerProfile = buildReaderProfile(state.readerDue);
      }
      events.push({ kind: 'event', type: state.event.type });
    } else {
      state.eventDue = now + 40000;
    }
  }

  if (state.event && now >= state.event.expires) {
    const t = state.event.type;
    dismissEvent(state, now);
    events.push({ kind: 'eventEnded', type: t });
  }

  // Le lanterne si spengono con calma (mai penalità: solo riaccensione).
  if (state.lanterns.some(Boolean) && rng() < LANTERN_DIM_CHANCE) {
    const litIdx = state.lanterns.reduce((acc, v, i) => (v ? [...acc, i] : acc), []);
    if (litIdx.length && (litIdx.length > 1 || rng() < 0.5)) {
      const victim = litIdx[Math.floor(rng() * litIdx.length)];
      state.lanterns[victim] = false;
      events.push({ kind: 'lanternDimmed', index: victim });
    }
  }

  if (now - state.lastAmbient > 22000) {
    state.ambientIndex = (state.ambientIndex + 1) % MESSAGES.it.length;
    state.lastAmbient = now;
    events.push({ kind: 'ambient' });
  }

  return events;
}

// Pesi eventi influenzati da meteo e luna reale (F2.2).
// - pioggia attiva → più eventi rain
// - luna piena → più lettori
function eventWeights(state, now) {
  const raining = state.weather === 'rain' || state.event?.type === 'rain';
  const phaseId = moonPhaseId(moonPhase(now));
  const isFull = phaseId === 'full';
  const isNew = phaseId === 'new';
  return {
    cat: 0.25,
    rain: raining ? 0.4 : 0.18,
    fallenBook: raining ? 0.15 : 0.22,
    reader: isFull ? 0.38 : isNew ? 0.12 : 0.24,
  };
}

function updateWeather(state, now, rng) {
  if (typeof state.weatherChangedAt !== 'number') state.weatherChangedAt = now;
  // Cambio meteo ogni ~90–150s
  if (now - state.weatherChangedAt < 90000) return;
  if (rng() > 0.35) return;
  state.weather = state.weather === 'rain' ? 'clear' : 'rain';
  state.weatherChangedAt = now;
}

function observeMoonSafe(state, now) {
  try {
    return observeMoon(state, now);
  } catch {
    return [];
  }
}

// Daily seed (F2.5): hash FNV-1a su YYYY-MM-DD locale → lettera del giorno.
export function dayKey(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function dailySeed(now = Date.now()) {
  return hashString(dayKey(now));
}

export function ensureDaily(state, now = Date.now()) {
  const key = dayKey(now);
  if (state.daily?.key === key && state.daily.letterApplied) return null;
  const seed = dailySeed(now);
  const lang = state.settings?.lang === 'en' ? 'en' : 'it';
  const pool = DAILY_LETTERS?.[lang]?.length
    ? DAILY_LETTERS[lang]
    : (DAILY_LETTERS?.it?.length ? DAILY_LETTERS.it : ['…']);
  const idx = seed % pool.length;
  const text = pool[idx];
  // Lettera "del giorno": solo una per data, non duplicata se già presente.
  const already = state.letters.some((l) => l && l.text === text);
  if (!already) {
    const id = (state.letters[state.letters.length - 1]?.id ?? 0) + 1;
    state.letters.push({ id, text, ts: now });
    if (state.letters.length > MAX_LETTERS) {
      state.letters = state.letters.slice(-MAX_LETTERS);
    }
  }
  state.daily = { key, seed, letterApplied: true };
  return { kind: 'dailyLetter', text, seed, key };
}

function rollEvent(state, now, rng) {
  const w = eventWeights(state, now);
  const total = w.cat + w.rain + w.fallenBook + w.reader;
  let roll = rng() * total;
  if (roll < w.cat) return { type: 'cat', expires: now + 30000, bonus: false };
  roll -= w.cat;
  if (roll < w.rain) return { type: 'rain', expires: now + 20000, bonus: false };
  roll -= w.rain;
  if (roll < w.fallenBook) return { type: 'fallenBook', expires: now + 35000, bonus: false };
  return { type: 'reader', expires: now + 25000, bonus: true };
}
