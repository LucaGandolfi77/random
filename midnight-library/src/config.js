// Configurazione condivisa: costanti di gioco, persistenza e timing.
// Nessuna logica, nessun accesso a DOM/storage.

export const MAX = { luce: 10, calma: 10, inchiostro: 10 };

export const CATALOG_COST = 3;
export const SERVE_COST = 1;

export const SAVE_VERSION = 6;
export const SAVE_KEY = 'lumina-save-v1';

export const MAX_LETTERS = 20;
export const LETTER_MAX_LEN = 280;
// Archivio lettere esteso su IndexedDB (opzionale, fallback localStorage)
export const LETTER_ARCHIVE_MAX = 200;
export const IDB_NAME = 'lumina-archive';
export const IDB_STORE = 'kv';
export const IDB_SAVE_KEY = 'save';
export const IDB_LETTERS_KEY = 'letters';

// Fase 3 · Ecosistema
export const MAX_MODS = 8;
export const MAX_PACK_BYTES = 512 * 1024;

// Timing (ms)
export const TICK_MS = 5000;
export const AUTOSAVE_MS = 15000;
export const TOAST_MS = 4000;
export const AMBIENT_MS = 22000;
export const PASSIVE_CAP_MS = 60 * 60 * 1000; // max 1h di rigenerazione offline per ciclo

// Probabilità per tick di spegnimento di una lanterna accesa
// (sostituisce il vecchio gate opaco `now % 1000 < 40 && random < 0.05`).
export const LANTERN_DIM_CHANCE = 0.003;

export function clamp(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
