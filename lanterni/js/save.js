// js/save.js — Persistence with IndexedDB + localStorage fallback

const DB_NAME = 'lanterni_db';
const DB_VERSION = 2;
const STORE_NAME = 'gamestate';
const SAVE_KEY = 'current';

export class SaveManager {
  constructor() {
    this.data = null;
    this._db = null;
    this._ready = this._initDB();
  }

  _initDB() {
    return new Promise(resolve => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
          if (!db.objectStoreNames.contains('screenshots')) {
            db.createObjectStore('screenshots', { keyPath: 'id' });
          }
        };
        req.onsuccess = e => {
          this._db = e.target.result;
          resolve();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async hasSave() {
    await this._ready;
    if (!this._db) return this._hasSaveFallback();
    return new Promise(resolve => {
      try {
        const tx = this._db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
        req.onsuccess = () => resolve(req.result !== undefined);
        req.onerror = () => resolve(this._hasSaveFallback());
      } catch {
        resolve(this._hasSaveFallback());
      }
    });
  }

  async save(state) {
    await this._ready;
    if (!this._db) { this._saveFallback(state); return; }
    return new Promise(resolve => {
      try {
        const tx = this._db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(state, SAVE_KEY);
        tx.oncomplete = () => { this.data = state; resolve(); };
        tx.onerror = () => { this._saveFallback(state); resolve(); };
      } catch {
        this._saveFallback(state);
        resolve();
      }
    });
  }

  async load() {
    await this._ready;
    if (!this._db) return this._loadFallback();
    return new Promise(resolve => {
      try {
        const tx = this._db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
        req.onsuccess = () => {
          this.data = req.result || null;
          resolve(this.data);
        };
        req.onerror = () => resolve(this._loadFallback());
      } catch {
        resolve(this._loadFallback());
      }
    });
  }

  async clear() {
    await this._ready;
    if (!this._db) { this._clearFallback(); return; }
    try {
      const tx = this._db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(SAVE_KEY);
      this.data = null;
    } catch {
      this._clearFallback();
    }
  }

  async saveScreenshot(blob) {
    await this._ready;
    if (!this._db) return;
    return new Promise(resolve => {
      try {
        const tx = this._db.transaction('screenshots', 'readwrite');
        const ts = Date.now();
        tx.objectStore('screenshots').put({ blob, ts, id: ts });
        tx.oncomplete = () => resolve(ts);
        tx.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  async getScreenshots(limit = 10) {
    await this._ready;
    if (!this._db) return [];
    return new Promise(resolve => {
      try {
        const tx = this._db.transaction('screenshots', 'readonly');
        const req = tx.objectStore('screenshots').getAll();
        req.onsuccess = () => {
          const results = req.result || [];
          results.sort((a, b) => b.ts - a.ts);
          resolve(results.slice(0, limit));
        };
        req.onerror = () => resolve([]);
      } catch { resolve([]); }
    });
  }

  // localStorage fallback
  _hasSaveFallback() {
    try { return localStorage.getItem(SAVE_KEY) !== null; }
    catch { return false; }
  }

  _saveFallback(state) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      this.data = state;
    } catch (e) { console.warn('Save failed:', e); }
  }

  _loadFallback() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) { this.data = JSON.parse(raw); return this.data; }
    } catch (e) { console.warn('Load failed:', e); }
    return null;
  }

  _clearFallback() {
    try { localStorage.removeItem(SAVE_KEY); this.data = null; }
    catch {}
  }

  _queueSync(state) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'QUEUE_SAVE',
        key: SAVE_KEY,
        value: state
      });
    }
  }
}
