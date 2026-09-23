// Servizio di persistenza: localStorage primario, IndexedDB come
// fallback quota e archivio lettere esteso (opzionale, settings.archiveIdb).
// Nessuna logica di gioco, nessun DOM.

import {
  SAVE_KEY, IDB_SAVE_KEY, IDB_LETTERS_KEY, LETTER_ARCHIVE_MAX, LETTER_MAX_LEN, clamp,
} from '../config.js';
import { validateAndMigrate } from '../model/state.js';
import { idbGet, idbSet, idbDel, idbClear, idbAvailable } from './idb.js';

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Legge il salvataggio (con migrazione) oppure restituisce lo stato di default.
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { state: null, corrupted: false, missing: true, backend: 'none' };
    const parsed = safeParse(raw);
    if (!parsed) return { state: validateAndMigrate(null), corrupted: true, missing: false, backend: 'ls' };
    const state = validateAndMigrate(parsed);
    return { state, corrupted: false, missing: false, backend: 'ls' };
  } catch {
    return { state: validateAndMigrate(null), corrupted: true, missing: false, backend: 'ls' };
  }
}

// Fallback asincrono: prova IndexedDB se localStorage non ha il save
// (quota piena o storage rimosso parzialmente). Restituisce lo stato validato o null.
export async function loadFromIdb() {
  if (!idbAvailable()) return null;
  const raw = await idbGet(IDB_SAVE_KEY);
  if (raw == null) return null;
  const text = typeof raw === 'string' ? raw : String(raw);
  const parsed = safeParse(text);
  if (!parsed) return null;
  return validateAndMigrate(parsed);
}

// Scrive lo stato. true = ok (LS), false = fallito.
// Se LS supera la quota, prova automaticamente IndexedDB (ritorna 'idb' se ok).
export function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (state.settings?.archiveIdb) mirrorLetters(state.letters);
    return true;
  } catch {
    // quota → fallback IndexedDB (fire-and-forget)
    saveIdb(state);
    return false;
  }
}

// Scrittura esplicita su IndexedDB (usata dal fallback quota e dai test).
export async function saveIdb(state) {
  const ok = await idbSet(IDB_SAVE_KEY, JSON.stringify(state));
  if (ok && state.settings?.archiveIdb) await mirrorLetters(state.letters, true);
  return ok;
}

// Archivio lettere esteso (max LETTER_ARCHIVE_MAX) — solo se archiveIdb attivo.
async function mirrorLetters(letters, force = false) {
  if (!force && !idbAvailable()) return false;
  if (!Array.isArray(letters)) return false;
  const trimmed = letters.slice(-LETTER_ARCHIVE_MAX).map((l) => ({
    id: clamp(l?.id, 0, 999999999) | 0,
    text: String(l?.text ?? '').slice(0, LETTER_MAX_LEN),
    ts: clamp(l?.ts, 0, Date.now() + 1000) | 0,
  })).filter((l) => l.text);
  return idbSet(IDB_LETTERS_KEY, trimmed);
}

// Idra l'archivio lettere esteso (più lunghi del cap in-memory) se presente.
export async function hydrateLetters(state) {
  if (!state?.settings?.archiveIdb) return state;
  const archived = await idbGet(IDB_LETTERS_KEY);
  if (!Array.isArray(archived) || archived.length <= state.letters.length) return state;
  const merged = [...state.letters, ...archived]
    .sort((a, b) => (a.ts - b.ts) || (a.id - b.id));
  const seen = new Set();
  state.letters = merged.filter((l) => {
    const key = `${l.id}:${l.ts}:${l.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(-LETTER_ARCHIVE_MAX);
  return state;
}

export function clear() {
  let ok = false;
  try {
    localStorage.removeItem(SAVE_KEY);
    ok = true;
  } catch {
    ok = false;
  }
  idbDel(IDB_SAVE_KEY);
  idbDel(IDB_LETTERS_KEY);
  return ok;
}

export async function clearAll() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch { /* ok */ }
  await idbClear();
  return true;
}

export function serialize(state) {
  return JSON.stringify(state, null, 2);
}

// Parsing dell'import + diff anteprima rispetto allo stato corrente.
export function parse(text) {
  try {
    const parsed = JSON.parse(text);
    const state = validateAndMigrate(parsed);
    return { ok: true, state, raw: parsed };
  } catch {
    return { ok: false, state: null };
  }
}

// Diff strutturale leggero per l'editor: percorso → { from, to }.
// Copre risorse, contatori, milestone, sblocchi, stanze, lettere, settings.
export function diffStates(current, next) {
  const out = [];
  const push = (path, from, to) => {
    if (JSON.stringify(from) !== JSON.stringify(to)) out.push({ path, from, to });
  };

  if (!current || !next) return out;

  ['luce', 'calma', 'inchiostro'].forEach((k) => {
    push(`resources.${k}`, current.resources?.[k], next.resources?.[k]);
  });
  ['booksOnTable', 'booksShelved', 'teasBrewed', 'readersServed', 'playtime'].forEach((k) => {
    push(k, current[k], next[k]);
  });
  push('room', current.room, next.room);
  push('letters.length', current.letters?.length ?? 0, next.letters?.length ?? 0);
  push('raresFound', current.raresFound, next.raresFound);
  push('raresCataloged', current.raresCataloged, next.raresCataloged);
  push('readerActive', current.readerActive, next.readerActive);

  Object.keys({ ...current.milestones, ...next.milestones }).forEach((k) => {
    push(`milestones.${k}`, Boolean(current.milestones?.[k]), Boolean(next.milestones?.[k]));
  });
  Object.keys({ ...current.unlocks, ...next.unlocks }).forEach((k) => {
    push(`unlocks.${k}`, Boolean(current.unlocks?.[k]), Boolean(next.unlocks?.[k]));
  });
  Object.keys({ ...current.stats, ...next.stats }).forEach((k) => {
    push(`stats.${k}`, current.stats?.[k], next.stats?.[k]);
  });
  Object.keys({ ...current.settings, ...next.settings }).forEach((k) => {
    if (k === 'lang') push(`settings.${k}`, current.settings?.[k], next.settings?.[k]);
  });
  push('version', current.version, next.version);
  return out;
}

export function subscribe(onExternal) {
  const handler = (e) => {
    if (e.key !== SAVE_KEY || e.newValue == null) return;
    try {
      const parsed = JSON.parse(e.newValue);
      onExternal(validateAndMigrate(parsed));
    } catch {
      /* dato corrotto dall'altra scheda: ignora */
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
