import store from '../../core/store.js';

const READING_HISTORY_KEY = 'radice-analytics-v1';

class AnalyticsEngine {
  constructor() {
    this.events = [];
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(READING_HISTORY_KEY);
      if (raw) {
        this.events = JSON.parse(raw);
      }
    } catch (e) {
      this.events = [];
    }
  }

  save() {
    try {
      localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(this.events));
    } catch (e) {
      console.warn('Analytics save failed:', e);
    }
  }

  track(eventType, data = {}) {
    this.events.push({
      type: eventType,
      data,
      timestamp: Date.now(),
      sessionId: this.getSessionId()
    });

    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
    this.save();
  }

  getSessionId() {
    if (!this._sessionId || Date.now() - this._sessionStart > 3600000) {
      this._sessionId = Math.random().toString(36).substring(2, 10);
      this._sessionStart = Date.now();
    }
    return this._sessionId;
  }

  getReadingPattern() {
    const bookReads = this.events.filter(e => e.type === 'book_read');
    const chapterReads = this.events.filter(e => e.type === 'chapter_found');

    const roomPreference = {};
    bookReads.forEach(e => {
      const room = e.data?.roomType || 'unknown';
      roomPreference[room] = (roomPreference[room] || 0) + 1;
    });

    const timePattern = {};
    bookReads.forEach(e => {
      const hour = new Date(e.timestamp).getHours();
      const slot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      timePattern[slot] = (timePattern[slot] || 0) + 1;
    });

    const totalReads = bookReads.length;
    return {
      totalReads,
      roomPreference,
      timePattern,
      chapterRate: totalReads > 0 ? chapterReads.length / totalReads : 0,
      lastReadAt: bookReads.length > 0 ? bookReads[bookReads.length - 1].timestamp : null,
      streak: this.calculateStreak(bookReads)
    };
  }

  calculateStreak(bookReads) {
    if (bookReads.length === 0) return 0;
    const dates = [...new Set(bookReads.map(e => new Date(e.timestamp).toDateString()))].sort();
    let streak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const diff = new Date(dates[i]) - new Date(dates[i - 1]);
      if (diff <= 86400000) streak++;
      else break;
    }
    return streak;
  }

  getRecommendations() {
    const pattern = this.getReadingPattern();
    const allBooks = window.BOOKS || [];
    const chapters = window.CHAPTERS || [];

    if (allBooks.length === 0) return [];

    const preferredRoom = Object.entries(pattern.roomPreference)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    let recommendations = [];

    if (preferredRoom) {
      recommendations = allBooks
        .filter(b => b.roomType === preferredRoom && !store.get('booksRead').includes(b.id))
        .sort((a, b) => b.rarity.localeCompare(a.rarity));
    }

    if (recommendations.length < 3) {
      const unreadChapters = chapters.filter(c => !store.get('chaptersCollected').includes(c.id));
      recommendations = [...recommendations, ...unreadChapters.slice(0, 3 - recommendations.length)];
    }

    return recommendations.slice(0, 5);
  }

  getSummary() {
    const pattern = this.getReadingPattern();
    return {
      totalReads: pattern.totalReads,
      favoriteRoom: Object.entries(pattern.roomPreference).sort((a, b) => b[1] - a[1])[0],
      favoriteTime: Object.entries(pattern.timePattern).sort((a, b) => b[1] - a[1])[0],
      chapterRate: `${Math.round(pattern.chapterRate * 100)}%`,
      streak: pattern.streak
    };
  }

  exportForSync() {
    return JSON.stringify({
      version: 1,
      events: this.events.slice(-100),
      exportedAt: Date.now()
    });
  }

  importFromSync(json) {
    try {
      const data = JSON.parse(json);
      this.events = [...this.events, ...data.events];
      this.save();
      return true;
    } catch (e) {
      return false;
    }
  }
}

const analytics = new AnalyticsEngine();
export default analytics;
export { AnalyticsEngine };
