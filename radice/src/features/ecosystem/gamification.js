class AchievementSystem {
  constructor() {
    this.achievements = this._load();
    this.badgeDefs = [
      { id: 'first_read', name: 'Prima Lettura', desc: 'Hai letto il tuo primo libro', icon: '📖' },
      { id: 'reader_5', name: 'Lettore Frequente', desc: '5 storie lette', icon: '📚' },
      { id: 'reader_20', name: 'Bibliotecario', desc: '20 storie lette', icon: '📖' },
      { id: 'reader_50', name: 'Maestro delle Pagine', desc: '50 storie lette', icon: '🏛️' },
      { id: 'chapter_first', name: 'Capitolo Raro', desc: 'Hai trovato il tuo primo capitolo raro', icon: '⭐' },
      { id: 'chapter_5', name: 'Collezionista', desc: '5 capitoli rari', icon: '🌟' },
      { id: 'chapter_10', name: 'Cacciatore di Capitoli', desc: '10 capitoli rari', icon: '💎' },
      { id: 'room_salottino', name: 'Salottino', desc: 'Sblocca il salottino', icon: '🛋️' },
      { id: 'room_atrio', name: 'Atrio', desc: 'Sblocca l\'atrio', icon: '🏛️' },
      { id: 'room_serra', name: 'Serra', desc: 'Sblocca la serra', icon: '🌿' },
      { id: 'streak_3', name: 'Diligente', desc: '3 giorni di lettura consecutivi', icon: '🔥' },
      { id: 'streak_7', name: 'Dedizione', desc: '7 giorni di lettura consecutivi', icon: '🔥🔥' },
      { id: 'streak_30', name: 'Passione', desc: '30 giorni di lettura consecutivi', icon: '🔥🔥🔥' },
      { id: 'legendary_found', name: 'Leggendario!', desc: 'Trova un capitolo leggendario', icon: '🏆' },
      { id: 'share_first', name: 'Condiviso', desc: 'Condividi la tua prima storia', icon: '📤' },
      { id: 'owl_meet', name: 'Incontro', desc: 'Incontra il gufo per la prima volta', icon: '🦉' },
      { id: 'tree_3', name: 'Albero Piccolo', desc: '3 stanze nell\'albero', icon: '🌳' },
      { id: 'tree_all', name: 'Biblioteca Completa', desc: 'Tutte le stanze sbloccate', icon: '🌲' }
    ];
  }

  _load() {
    try {
      const raw = localStorage.getItem('radice-achievements-v1');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  _save() {
    try {
      localStorage.setItem('radice-achievements-v1', JSON.stringify(this.achievements));
    } catch (e) { /* ignore */ }
  }

  checkAll() {
    let state = {};
    try { state = (typeof window.getState === 'function') ? window.getState() : {}; } catch(e) {}
    if (Object.keys(state).length === 0) {
      try {
        const raw = localStorage.getItem('radice-state-v1');
        state = raw ? JSON.parse(raw) : {};
      } catch(e) { state = {}; }
    }
    const booksRead = state?.booksRead || [];
    const chaptersCollected = state?.chaptersCollected || [];
    const roomsUnlocked = state?.roomsUnlocked || [];
    const totalReads = state?.totalReads || 0;
    const readingHistory = state?.readingHistory || [];

    // Calculate streak
    const dates = [...new Set(readingHistory.map(h => new Date(h.time || Date.now()).toDateString()))].sort();
    let streak = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      const diff = new Date(dates[i]) - new Date(i === dates.length - 1 ? dates[i] : dates[i + 1]);
      if (diff <= 86400000) streak++;
      else break;
    }

    const checks = {
      'first_read': totalReads >= 1,
      'reader_5': totalReads >= 5,
      'reader_20': totalReads >= 20,
      'reader_50': totalReads >= 50,
      'chapter_first': chaptersCollected.length >= 1,
      'chapter_5': chaptersCollected.length >= 5,
      'chapter_10': chaptersCollected.length >= 10,
      'room_salottino': roomsUnlocked.includes('salottino'),
      'room_atrio': roomsUnlocked.includes('atrio'),
      'room_serra': roomsUnlocked.includes('serra'),
      'streak_3': streak >= 3,
      'streak_7': streak >= 7,
      'streak_30': streak >= 30,
      'legendary_found': chaptersCollected.some(c => {
        const ch = window.CHAPTERS?.find(x => x.id === c);
        return ch?.rarity === 'leggendario';
      }),
      'share_first': false, // Set on share
      'owl_meet': roomsUnlocked.length >= 1,
      'tree_3': roomsUnlocked.length >= 3,
      'tree_all': roomsUnlocked.length >= 3
    };

    const newlyUnlocked = [];
    this.badgeDefs.forEach(badge => {
      if (checks[badge.id] && !this.achievements[badge.id]) {
        this.achievements[badge.id] = {
          ...badge,
          unlockedAt: Date.now()
        };
        newlyUnlocked.push(badge);
      }
    });

    this._save();
    return newlyUnlocked;
  }

  getAchievements() {
    return Object.values(this.achievements);
  }

  getAllBadgeDefs() {
    return this.badgeDefs;
  }

  getProgress() {
    const total = this.badgeDefs.length;
    const unlocked = Object.keys(this.achievements).length;
    return { unlocked, total, percentage: Math.round((unlocked / total) * 100) };
  }

  reset() {
    this.achievements = {};
    this._save();
  }
}

const achievements = new AchievementSystem();
export default achievements;
export { AchievementSystem };
