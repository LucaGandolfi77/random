// ===== Bar Blu — Storage =====
import { createInitialState, SAVE_KEY, SAVE_VERSION, CUSTOMERS } from './model.js';

function migrate(state) {
  if (!state || typeof state !== 'object') return createInitialState();
  if (!state.version || state.version < SAVE_VERSION) {
    const merged = Object.assign(createInitialState(), state);
    merged.version = SAVE_VERSION;
    if (!Array.isArray(merged.displayCase)) merged.displayCase = [null, null, null, null];
    if (!Array.isArray(merged.inventory)) merged.inventory = [];
    if (!merged.affinity) merged.affinity = createInitialState().affinity;
    if (!merged.settings) merged.settings = createInitialState().settings;
    CUSTOMERS.forEach(c => { if (merged.affinity[c.id] === undefined) merged.affinity[c.id] = 0; });
    if (!Array.isArray(merged.memories)) merged.memories = [];
    return merged;
  }
  if (!Array.isArray(state.memories)) state.memories = [];
  CUSTOMERS.forEach(c => { if (state.affinity[c.id] === undefined) state.affinity[c.id] = 0; });
  return state;
}

function validate(state) {
  if (!state || typeof state !== 'object') return false;
  if (typeof state.version !== 'number') return false;
  if (typeof state.tokens !== 'number') return false;
  if (typeof state.xp !== 'number') return false;
  if (!Array.isArray(state.inventory)) return false;
  if (!Array.isArray(state.displayCase)) return false;
  if (typeof state.started !== 'boolean') return false;
  return true;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (!validate(parsed)) {
      console.warn('Bar Blu: salvataggio non valido, uso stato predefinito');
      localStorage.removeItem(SAVE_KEY);
      return createInitialState();
    }
    return migrate(parsed);
  } catch (e) {
    console.warn('Bar Blu: errore caricamento salvataggio', e);
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
    return createInitialState();
  }
}

export function saveState(state) {
  try {
    state.lastAccess = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('Bar Blu: errore salvataggio', e);
    return false;
  }
}

export function resetState() {
  try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
  return createInitialState();
}

export { SAVE_VERSION, SAVE_KEY, createInitialState as defaultState };
