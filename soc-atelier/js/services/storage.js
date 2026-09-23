import { CONFIG } from '../config.js';
import { safeLocalStorage, safeJSON } from '../utils.js';
import { migrate, validateSave } from '../model.js';

const STORAGE = { get: (k) => safeLocalStorage('get', k), set: (k, v) => safeLocalStorage('set', k, v) };

export async function initStorage() {
  const testKey = 'soc-atelier-probe';
  try {
    STORAGE.set(testKey, '1');
    const v = STORAGE.get(testKey);
    STORAGE.set(testKey, null);
    STORAGE.set(testKey, v === '1' ? '1' : null);
    return v === '1';
  } catch { return false; }
}

export async function loadState() {
  const raw = STORAGE.get(CONFIG.storageKey);
  if (!raw) return null;
  const parsed = safeJSON(raw, null);
  if (!parsed || !validateSave(parsed)) {
    STORAGE.set(CONFIG.storageKey, null);
    return null;
  }
  return migrate(parsed);
}

export async function persistState(state) {
  return STORAGE.set(CONFIG.storageKey, JSON.stringify(state));
}

export async function clearState() {
  STORAGE.remove(CONFIG.storageKey);
}

export async function exportSave() {
  const raw = STORAGE.get(CONFIG.storageKey);
  if (!raw) return null;
  return { text: raw, name: `soc-atelier-save-${new Date().toISOString().slice(0, 10)}.json` };
}

export async function importFromFile(file) {
  const text = await file.text();
  const parsed = safeJSON(text, null);
  if (!parsed || !validateSave(parsed.payload || parsed)) return false;
  STORAGE.set(CONFIG.storageKey, JSON.stringify(migrate(parsed.payload || parsed)));
  return true;
}
