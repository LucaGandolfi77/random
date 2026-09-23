// Contenuto di gioco config-driven: sorgente unica = content.json alla root.
// Il loader fonde il JSON esterno su un embedded di fallback (prima load offline
// o se il fetch fallisce), valida la struttura e congela il risultato.

import rawEmbedded from '../../content.json' with { type: 'json' };

/** @type {any} */
let CONTENT = freezeContent(rawEmbedded);

function freezeContent(obj) {
  // structuredClone + shallow freeze top-level: abbastanza per impedire accidenti.
  const copy = structuredClone(obj);
  return Object.freeze(copy);
}

function isNonEmptyArr(v) {
  return Array.isArray(v) && v.length > 0;
}

// Valida la forma minima; restituisce null se invalida.
export function validateContent(c) {
  if (!c || typeof c !== 'object') return null;
  if (typeof c.version !== 'number' || c.version < 1) return null;
  if (!c.messages?.it || !c.messages?.en) return null;
  if (!isNonEmptyArr(c.rareBooks)) return null;
  if (!c.milestones || !c.unlocks) return null;
  if (!isNonEmptyArr(c.rooms)) return null;
  if (!c.rooms.some((r) => r.id === 'hall')) return null;
  if (!c.readers?.names?.it || !c.readers?.dialogue?.choices?.length) return null;
  if (!c.moonAlmanac?.achievements) return null;
  if (!c.daily?.letters?.it?.length || !c.daily?.letters?.en?.length) return null;
  const ids = new Set(c.rareBooks.map((b) => b?.id).filter(Boolean));
  if (ids.size !== c.rareBooks.length) return null;
  return c;
}

/**
 * Carica/sovrascrive il contenuto da content.json remoto (opzionale).
 * Il fallback embedded resta attivo se il fetch fallisce o il JSON è invalido.
 * @returns {Promise<{ ok: boolean, source: 'embedded'|'remote' }>}
 */
export async function loadContent(url = './content.json') {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return { ok: true, source: 'embedded' };
    const remote = await res.json();
    const valid = validateContent(remote);
    if (valid && valid.version >= CONTENT.version) {
      CONTENT = freezeContent(valid);
      notify();
      return { ok: true, source: 'remote' };
    }
    return { ok: true, source: 'embedded' };
  } catch {
    return { ok: true, source: 'embedded' };
  }
}

export function getContent() {
  return CONTENT;
}

// Fase 3 · sovrappone pack mod validati (chiamato dal controller, nessun eval).
// Dopo il swap notifica i subscriber (data.refreshData).
export function __setContentForMods(merged) {
  if (!merged || typeof merged !== 'object') return false;
  const valid = validateContent(merged);
  if (!valid) return false;
  CONTENT = freezeContent(valid);
  notify();
  return true;
}

const listeners = new Set();
export function onContentChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => {
    try { fn(CONTENT); } catch { /* ok */ }
  });
}

// Comodi accessori tipizzati per il resto del Model/View.
export const RARE_BOOKS = () => CONTENT.rareBooks;
export const MILESTONES = () => CONTENT.milestones;
export const UNLOCKS = () => CONTENT.unlocks;
export const MESSAGES = () => CONTENT.messages;
export const TUTORIAL_STEPS = () => CONTENT.tutorialSteps;
export const ROOMS = () => CONTENT.rooms;
export const ACTIVITIES = () => CONTENT.activities || {};
export const READERS = () => CONTENT.readers || {};
export const MOON_ALMANAC = () => CONTENT.moonAlmanac || { achievements: {} };
export const DAILY = () => CONTENT.daily || { letters: { it: [], en: [] } };
