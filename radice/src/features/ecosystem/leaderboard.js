class Leaderboard {
  constructor() {
    this.scores = this._load();
    this.players = new Map();
  }

  _load() {
    try {
      const raw = localStorage.getItem('radice-leaderboard-v1');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  _save() {
    try {
      localStorage.setItem('radice-leaderboard-v1', JSON.stringify(this.scores));
    } catch (e) { /* ignore */ }
  }

  submitScore(playerId, score, metadata = {}) {
    const existing = this.scores.findIndex(s => s.playerId === playerId);
    const entry = {
      playerId,
      score: Math.max(score, this.scores[existing]?.score || 0),
      timestamp: Date.now(),
      metadata: {
        totalReads: metadata.totalReads || 0,
        chaptersCollected: metadata.chaptersCollected || 0,
        roomsUnlocked: metadata.roomsUnlocked || 0,
        streak: metadata.streak || 0,
        ...metadata
      }
    };

    if (existing >= 0) {
      this.scores[existing] = entry;
    } else {
      this.scores.push(entry);
    }

    this.scores.sort((a, b) => b.score - a.score);
    this._save();
    return entry;
  }

  getTop(limit = 10) {
    return this.scores.slice(0, limit);
  }

  getPlayerRank(playerId) {
    const index = this.scores.findIndex(s => s.playerId === playerId);
    return index >= 0 ? index + 1 : null;
  }

  getPlayerScore(playerId) {
    return this.scores.find(s => s.playerId === playerId) || null;
  }

  addPlayer(playerId, name, avatar) {
    this.players.set(playerId, { id: playerId, name, avatar, joinedAt: Date.now() });
    this._savePlayers();
  }

  getPlayers() {
    return Array.from(this.players.values());
  }

  _savePlayers() {
    try {
      localStorage.setItem('radice-players-v1', JSON.stringify(Array.from(this.players.entries())));
    } catch (e) { /* ignore */ }
  }

  _loadPlayers() {
    try {
      const raw = localStorage.getItem('radice-players-v1');
      if (raw) this.players = new Map(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }

  reset() {
    this.scores = [];
    this.players.clear();
    this._save();
  }
}

const leaderboard = new Leaderboard();
export default leaderboard;
export { Leaderboard };
