// js/leaderboard.js — Star leaderboard (local storage, extensible to backend)

const LEADERBOARD_KEY = 'lanterni_leaderboard';
const MAX_ENTRIES = 100;

export class Leaderboard {
  constructor() {
    this.entries = [];
    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(LEADERBOARD_KEY);
      this.entries = data ? JSON.parse(data) : [];
    } catch {
      this.entries = [];
    }
  }

  save() {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.entries));
    } catch {}
  }

  addEntry(name, stars, level, screenshot) {
    const entry = {
      id: Date.now() + Math.random(),
      name: name || 'Anonimo',
      stars,
      level,
      screenshot: screenshot || null,
      timestamp: Date.now()
    };

    this.entries.push(entry);
    this.entries.sort((a, b) => b.stars - a.stars);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }
    this.save();
    return entry;
  }

  getTop(count = 10) {
    return this.entries.slice(0, count);
  }

  getRank(stars) {
    let rank = 1;
    for (const entry of this.entries) {
      if (entry.stars > stars) rank++;
      else break;
    }
    return rank;
  }

  getPlayerBest(name) {
    return this.entries.find(e => e.name === name) || null;
  }

  clear() {
    this.entries = [];
    this.save();
  }

  async submitToBackend(score) {
    // Stub for future Firebase/Supabase integration
    // POST /api/leaderboard { name, stars, level, timestamp }
    return true;
  }

  async fetchFromBackend() {
    // Stub for future Firebase/Supabase integration
    // GET /api/leaderboard?limit=100
    return this.entries;
  }
}
