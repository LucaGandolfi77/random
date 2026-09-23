// services/storage.js — persistenza (localStorage) con validazione e migrazione.
import { storageKey, validateSave, migrate, serializeState, deserializeState, defaultState } from '../core/state.js';
import { safeLocalStorage, safeJSON } from '../core/utils.js';
import { CONFIG } from '../core/config.js';

const STORAGE = { get: (k) => safeLocalStorage('get', k), set: (k, v) => safeLocalStorage('set', k, v) };

export async function loadState() {
  const raw = STORAGE.get(storageKey());
  if (!raw) return defaultState();
  const parsed = safeJSON(raw, null);
  if (!parsed || !validateSave(parsed)) {
    STORAGE.set(storageKey(), null);
    return defaultState();
  }
  return migrate(parsed);
}

export async function persistState(state) {
  try {
    STORAGE.set(storageKey(), serializeState(state));
    return true;
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      try { window.dispatchEvent(new CustomEvent('storage:quota')); } catch {}
    }
    return false;
  }
}

export async function clearState() {
  STORAGE.remove(storageKey());
}

export async function exportSave(state) {
  const text = serializeState(state);
  return { text, name: `stellaria-save-${new Date().toISOString().slice(0, 10)}.json` };
}

export async function importFromFile(file) {
  const text = await file.text();
  const parsed = safeJSON(text, null);
  if (!parsed || !validateSave(parsed)) return false;
  await persistState(parsed);
  return true;
}

export async function requestPersistent() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      return granted;
    }
  } catch {}
  return false;
}

export async function saveQuotaEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      return { used: est.usage, remaining: est.quota ? est.quota - est.usage : NaN };
    }
  } catch {}
  try {
    const used = localStorage.length;
    return { used, remaining: NaN };
  } catch {
    return { used: 0, remaining: NaN };
  }
}
