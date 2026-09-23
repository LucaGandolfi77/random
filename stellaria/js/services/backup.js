// services/backup.js — File System Access + OPFS fallback. Nessun backend.
import { serializeState, deserializeState, storageKey } from '../core/state.js';

async function opfsRoot() {
  try {
    const root = await navigator.storage.getDirectory();
    return root;
  } catch { return null; }
}

async function opfsFile(name, create) {
  const root = await opfsRoot();
  if (!root) return null;
  try {
    return await root.getFileHandle(name, create ? { create: true } : {});
  } catch { return null; }
}

export async function exportToFS(state) {
  // Prefer File System Access (user picks location).
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${storageKey()}.json`,
        types: [{ description: 'JSON Stellaria', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(serializeState(state));
      await writable.close();
      return { ok: true, via: 'fssync' };
    } catch { /* user cancelled */ }
  }
  // OPFS fallback (headless / Chrome)
  const handle = await opfsFile(`${storageKey()}.json`, true);
  if (handle) {
    try {
      const writable = await handle.createWritable();
      await writable.write(serializeState(state));
      await writable.close();
      return { ok: true, via: 'opfs' };
    } catch { /* continue */ }
  }
  return { ok: false, reason: 'unsupported' };
}

export async function importFromFS() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON Stellaria', accept: { 'application/json': ['.json'] } }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      const parsed = deserializeState(text);
      if (parsed) return { ok: true, state: parsed, via: 'fssync' };
      return { ok: false, reason: 'invalid' };
    } catch { /* cancelled */ }
  }
  const handle = await opfsFile(`${storageKey()}.json`);
  if (handle) {
    try {
      const file = await handle.getFile();
      const text = await file.text();
      const parsed = deserializeState(text);
      if (parsed) return { ok: true, state: parsed, via: 'opfs' };
      return { ok: false, reason: 'invalid' };
    } catch { /* continue */ }
  }
  return { ok: false, reason: 'unsupported' };
}

export async function opfsAvailable() {
  return !!(navigator.storage && navigator.storage.getDirectory);
}
