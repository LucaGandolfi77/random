import store from '../../core/store.js';

class RecommendationEngine {
  constructor() {
    this.model = null;
    this.isReady = false;
    this.preferences = {};
  }

  async init() {
    try {
      if (typeof tensorflow !== 'undefined') {
        this.model = await this.loadModel();
        this.isReady = true;
        console.log('[Radice] TensorFlow.js model loaded');
      } else if (typeof webnn !== 'undefined') {
        await this.initWebNN();
        this.isReady = true;
        console.log('[Radice] WebNN adapter ready');
      } else {
        console.log('[Radice] No ML framework available, using heuristic');
        this.isReady = true;
      }
    } catch (e) {
      console.warn('[Radice] ML init failed, using heuristic:', e);
      this.isReady = true;
    }
  }

  async initWebNN() {
    if (typeof webnn === 'undefined') return;
    try {
      const adapter = await webnn.requestDevice();
      console.log('[Radice] WebNN device:', adapter);
    } catch (e) {
      console.warn('[Radice] WebNN not available:', e);
    }
  }

  async loadModel() {
    if (typeof tensorflow === 'undefined') return null;
    try {
      const model = await tensorflow.loadGraphModel('/models/gufo-recommender/model.json');
      return model;
    } catch (e) {
      console.warn('[Radice] Model load failed:', e);
      return null;
    }
  }

  getRecommendations() {
    const state = store.get();
    const allBooks = window.BOOKS || [];
    const unread = allBooks.filter(b => !state.booksRead.includes(b.id));

    const pattern = this.getReadingPattern();
    const preferredRoom = Object.entries(pattern.roomPreference || {})
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    let recommendations = [];

    if (preferredRoom) {
      recommendations = unread
        .filter(b => b.roomType === preferredRoom)
        .sort((a, b) => this.rarityScore(b) - this.rarityScore(a));
    }

    if (recommendations.length < 3) {
      const chapters = window.CHAPTERS || [];
      const unreadChapters = chapters.filter(c => !state.chaptersCollected.includes(c.id));
      recommendations = [...recommendations, ...unreadChapters.slice(0, 5 - recommendations.length)];
    }

    return recommendations.slice(0, 5);
  }

  getReadingPattern() {
    const state = store.get();
    const history = state.readingHistory || [];
    const roomPref = {};

    history.forEach(h => {
      const room = h.roomType || 'unknown';
      roomPref[room] = (roomPref[room] || 0) + 1;
    });

    const total = history.length || 1;
    const chapterRate = (state.chaptersCollected?.length || 0) / total;

    return {
      roomPreference: roomPref,
      totalReads: history.length,
      chapterRate: Math.min(chapterRate, 1),
      streak: this.calculateStreak(history)
    };
  }

  rarityScore(book) {
    const scores = { comune: 1, raro: 2, epico: 3, leggendario: 4 };
    return scores[book.rarity] || 1;
  }

  calculateStreak(history) {
    if (history.length === 0) return 0;
    const dates = [...new Set(history.map(h => new Date(h.time || Date.now()).toDateString()))].sort();
    let streak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const diff = new Date(dates[i]) - new Date(dates[i - 1]);
      if (diff <= 86400000) streak++;
      else break;
    }
    return streak;
  }

  async predictPreference(bookId) {
    if (this.model && typeof tensorflow !== 'undefined') {
      try {
        const input = this.buildInput(bookId);
        const prediction = this.model.predict(input);
        return prediction.dataSync();
      } catch (e) {
        return this.heuristicPrediction(bookId);
      }
    }
    return this.heuristicPrediction(bookId);
  }

  buildInput(bookId) {
    const state = store.get();
    const book = (window.BOOKS || []).find(b => b.id === bookId);
    return {
      roomType: book?.roomType || 'salottino',
      rarity: book?.rarity || 'comune',
      pages: book?.pages || 3,
      readingHistory: state.readingHistory?.length || 0,
      chaptersCollected: state.chaptersCollected?.length || 0,
      streak: this.calculateStreak(state.readingHistory || [])
    };
  }

  heuristicPrediction(bookId) {
    const state = store.get();
    const book = (window.BOOKS || []).find(b => b.id === bookId);
    if (!book) return { score: 0.5, recommended: false };

    const pref = this.getReadingPattern();
    const roomMatch = pref.roomPreference[book.roomType] > 2;
    const isUnread = !state.booksRead.includes(bookId);
    const rarityWeight = this.rarityScore(book);

    const score = (roomMatch ? 0.4 : 0) + (isUnread ? 0.3 : 0) + (rarityWeight * 0.1);
    return { score, recommended: score > 0.5 };
  }
}

const recommender = new RecommendationEngine();
export default recommender;
export { RecommendationEngine };
