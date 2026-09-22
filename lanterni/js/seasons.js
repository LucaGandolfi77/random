// js/seasons.js — Seasonal events system

const SEASONS = {
  halloween: {
    name: 'Halloween',
    months: [9], // October (0-indexed)
    days: [[25, 31]], // Oct 25-31
    colors: {
      lantern: '#ff6600',
      glow: '#ff9933',
      sky: '#1a0a2e'
    },
    specialLanterns: [
      { id: 'pumpkin', color: '#ff6600', glow: '#ff9933', weight: 0.6, emoji: '🎃' },
      { id: 'ghost', color: '#ffffff', glow: '#ccccff', weight: 0.3, emoji: '👻' },
      { id: 'bat', color: '#4a0080', glow: '#7700cc', weight: 0.4, emoji: '🦇' }
    ],
    effects: ['fog', 'spookyParticles'],
    music: 'spooky'
  },
  christmas: {
    name: 'Natale',
    months: [11], // December
    days: [[20, 26]], // Dec 20-26
    colors: {
      lantern: '#ff0000',
      glow: '#ff4444',
      sky: '#0a1a2e'
    },
    specialLanterns: [
      { id: 'ornament', color: '#ff0000', glow: '#ff4444', weight: 0.5, emoji: '🎄' },
      { id: 'star', color: '#ffd700', glow: '#ffeb3b', weight: 0.3, emoji: '⭐' },
      { id: 'gift', color: '#4caf50', glow: '#66bb6a', weight: 0.4, emoji: '🎁' }
    ],
    effects: ['snow', 'twinkleParticles'],
    music: 'festive'
  },
  carnival: {
    name: 'Carnevale',
    months: [1], // February
    days: [[10, 17]], // Carnival week
    colors: {
      lantern: '#ff6b9d',
      glow: '#ff8eb8',
      sky: '#1a1a3e'
    },
    specialLanterns: [
      { id: 'mask', color: '#9b59b6', glow: '#bb7fd4', weight: 0.5, emoji: '🎭' },
      { id: 'confetti', color: '#ffd700', glow: '#ffeb3b', weight: 0.2, emoji: '🎊' },
      { id: 'jester', color: '#e74c3c', glow: '#ff6b6b', weight: 0.4, emoji: '🃏' }
    ],
    effects: ['confetti', 'colorBurst'],
    music: 'festive'
  },
  summer: {
    name: 'Estate',
    months: [5, 6, 7], // June-August
    days: [[1, 31]],
    colors: {
      lantern: '#ffd700',
      glow: '#ffeb3b',
      sky: '#0a0e1a'
    },
    specialLanterns: [
      { id: 'firefly', color: '#ffff00', glow: '#ffff66', weight: 0.1, emoji: '✨' },
      { id: 'sun', color: '#ff9800', glow: '#ffb74d', weight: 0.7, emoji: '☀️' },
      { id: 'wave', color: '#00bcd4', glow: '#4dd0e1', weight: 0.3, emoji: '🌊' }
    ],
    effects: ['fireflies', 'warmGlow'],
    music: 'ambient'
  },
  winter: {
    name: 'Inverno',
    months: [0, 1, 11], // Dec-Feb
    days: [[1, 28]],
    colors: {
      lantern: '#aaccff',
      glow: '#ccddff',
      sky: '#0a0e1a'
    },
    specialLanterns: [
      { id: 'snowflake', color: '#ffffff', glow: '#eeeeff', weight: 0.2, emoji: '❄️' },
      { id: 'ice', color: '#00bcd4', glow: '#4dd0e1', weight: 0.4, emoji: '🧊' },
      { id: 'aurora', color: '#7c4dff', glow: '#b388ff', weight: 0.3, emoji: '🌌' }
    ],
    effects: ['snow', 'auroraGlow'],
    music: 'calm'
  }
};

export class SeasonManager {
  constructor() {
    this.currentSeason = null;
    this.specialLanterns = [];
    this.activeEffects = [];
    this.lastCheck = 0;
    this.checkInterval = 60000; // Check every minute
  }

  update(dt, time) {
    this.lastCheck += dt * 1000;
    if (this.lastCheck >= this.checkInterval) {
      this.lastCheck = 0;
      this.checkSeason();
    }
  }

  checkSeason() {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    for (const [key, season] of Object.entries(SEASONS)) {
      if (season.months.includes(month)) {
        for (const [start, end] of season.days) {
          if (day >= start && day <= end) {
            if (this.currentSeason !== key) {
              this.currentSeason = key;
              this.specialLanterns = season.specialLanterns;
              this.activeEffects = season.effects;
              return true; // Season changed
            }
            return false;
          }
        }
      }
    }

    if (this.currentSeason !== null) {
      this.currentSeason = null;
      this.specialLanterns = [];
      this.activeEffects = [];
      return true; // Season ended
    }
    return false;
  }

  getSeasonData() {
    if (!this.currentSeason) return null;
    return SEASONS[this.currentSeason];
  }

  getSpecialLanternType() {
    if (this.specialLanterns.length === 0) return null;
    const idx = Math.floor(Math.random() * this.specialLanterns.length);
    return this.specialLanterns[idx];
  }

  hasEffect(effect) {
    return this.activeEffects.includes(effect);
  }

  isActive() {
    return this.currentSeason !== null;
  }

  serialize() {
    return {
      currentSeason: this.currentSeason,
      specialLanterns: this.specialLanterns,
      activeEffects: this.activeEffects
    };
  }

  deserialize(data) {
    if (data) {
      this.currentSeason = data.currentSeason;
      this.specialLanterns = data.specialLanterns || [];
      this.activeEffects = data.activeEffects || [];
    }
  }
}
