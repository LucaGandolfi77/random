const STORAGE_KEY = 'radice-save-v2';
const SAVE_VERSION = 2;

class Store {
  constructor() {
    this.state = this._load();
    this._listeners = new Set();
  }

  get(key) {
    return key ? this.state[key] : this.state;
  }

  set(updates) {
    Object.assign(this.state, updates);
    this.state.lastPlay = Date.now();
    this._save();
    this._notify(updates);
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify(updates) {
    this._listeners.forEach(fn => {
      try { fn(updates); } catch (e) { console.warn('Listener error:', e); }
    });
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.version === SAVE_VERSION) return data.state;
        return this._migrate(data.state);
      }
    } catch (e) {
      console.warn('State load failed:', e);
    }
    return this._default();
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, state: this.state }));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded. Attempting cleanup...');
        this._cleanup();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, state: this.state }));
        } catch (e2) {
          console.error('Save failed after cleanup:', e2);
        }
      }
    }
  }

  _cleanup() {
    const keys = ['radice-save-v1', 'radice-save-v2'];
    keys.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
    });
  }

  _migrate(oldState) {
    const migrated = { ...this._default(), ...oldState };
    migrated.version = SAVE_VERSION;
    if (!migrated.stats) migrated.stats = {};
    if (!migrated.stats.booksPerRoom) migrated.stats.booksPerRoom = { salottino: 0, atrio: 0, serra: 0 };
    if (!migrated.stats.totalPagesRead) migrated.stats.totalPagesRead = 0;
    if (!migrated.stats.longestReading) migrated.stats.longestReading = 0;
    return migrated;
  }

  _default() {
    return {
      version: SAVE_VERSION,
      seeds: 20,
      booksRead: [],
      chaptersCollected: [],
      roomsUnlocked: [],
      readingHistory: [],
      totalReads: 0,
      lastPlay: null,
      stats: {
        totalPagesRead: 0,
        longestReading: 0,
        booksPerRoom: { salottino: 0, atrio: 0, serra: 0 }
      }
    };
  }
}

const store = new Store();
export default store;
