/* Scala B, Civico 0 — persistenza locale */

import { SAVE_KEY, SAVE_VERSION } from "./data.js";
import { loadState, newState } from "./game.js";

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newState();
    return loadState(JSON.parse(raw));
  } catch {
    return newState();
  }
}

export function save(state) {
  try {
    state.lastSeen = Date.now();
    state.v = SAVE_VERSION;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function reset() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* niente */
  }
  return newState();
}

/* Esporta lo stato come stringa JSON pronta per file/condivisione */
export function exportSave(state) {
  try {
    const copy = JSON.parse(JSON.stringify(state));
    copy.v = SAVE_VERSION;
    copy.lastSeen = Date.now();
    return { ok: true, data: JSON.stringify(copy, null, 2) };
  } catch {
    return { ok: false, data: null };
  }
}

/* Importa da testo JSON: valida via loadState, non muta l'input */
export function importSave(text) {
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, msg: "File vuoto o non valido." };
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, msg: "Non è un salvataggio JSON valido." };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, msg: "Formato del salvataggio non riconosciuto." };
  }
  const next = loadState(raw);
  try {
    next.v = SAVE_VERSION;
    next.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    return { ok: true, state: next, msg: "Salvataggio importato." };
  } catch {
    return { ok: false, msg: "Salvataggio non salvato in locale." };
  }
}
