class Economy {
  constructor() {
    this.credits = parseInt(localStorage.getItem('stardock_credits') || '0');
    this.upgrades = JSON.parse(localStorage.getItem('stardock_upgrades') || '{}');
    this.starRatings = JSON.parse(localStorage.getItem('stardock_stars') || '{}');
    this.unlocks = JSON.parse(localStorage.getItem('stardock_unlocks') || '{"falco":true,"cobra":true,"titan":true,"ghost":true}');
    this.dailyChallenge = this.loadDailyChallenge();
    this.achievements = JSON.parse(localStorage.getItem('stardock_achievements') || '[]');
    this.bestTimes = JSON.parse(localStorage.getItem('stardock_bestTimes') || '{}');
    this.totalParks = parseInt(localStorage.getItem('stardock_totalParks') || '0');
    this.totalBumps = parseInt(localStorage.getItem('stardock_totalBumps') || '0');
    this.totalDistance = parseInt(localStorage.getItem('stardock_totalDistance') || '0');
  }

  save() {
    localStorage.setItem('stardock_credits', this.credits);
    localStorage.setItem('stardock_upgrades', JSON.stringify(this.upgrades));
    localStorage.setItem('stardock_stars', JSON.stringify(this.starRatings));
    localStorage.setItem('stardock_unlocks', JSON.stringify(this.unlocks));
    localStorage.setItem('stardock_achievements', JSON.stringify(this.achievements));
    localStorage.setItem('stardock_bestTimes', JSON.stringify(this.bestTimes));
    localStorage.setItem('stardock_totalParks', this.totalParks);
    localStorage.setItem('stardock_totalBumps', this.totalBumps);
    localStorage.setItem('stardock_totalDistance', this.totalDistance);
  }

  addCredits(amount) {
    this.credits += amount;
    this.save();
  }

  spendCredits(amount) {
    if (this.credits >= amount) {
      this.credits -= amount;
      this.save();
      return true;
    }
    return false;
  }

  getUpgrade(shipType, upgradeType) {
    return this.upgrades[`${shipType}_${upgradeType}`] || 0;
  }

  setUpgrade(shipType, upgradeType, level) {
    this.upgrades[`${shipType}_${upgradeType}`] = level;
    this.save();
  }

  getShipStats(shipType) {
    const baseStats = SHIP_TYPES[shipType];
    const speedMult = 1 + this.getUpgrade(shipType, 'engine') * 0.15;
    const sizeMult = 1 + this.getUpgrade(shipType, 'hull') * 0.1;
    const frictionMult = 1 + this.getUpgrade(shipType, 'brakes') * 0.03;
    const boostMult = 1 + this.getUpgrade(shipType, 'boost') * 0.2;
    return {
      ...baseStats,
      speed: baseStats.speed * speedMult,
      friction: baseStats.friction * frictionMult,
      size: baseStats.size * sizeMult,
      boostCapacity: baseStats.speed * boostMult
    };
  }

  getUpgradeCost(shipType, upgradeType, level) {
    const costs = { engine: 50, hull: 40, brakes: 30, boost: 60, paint: 20 };
    return (costs[upgradeType] || 30) * (level + 1) * 2;
  }

  canUpgrade(shipType, upgradeType) {
    const current = this.getUpgrade(shipType, upgradeType);
    return current < 5;
  }

  // Star rating system
  calculateStars(level, timeTaken, fuelRemaining, bumpCount, parked) {
    if (!parked) return 0;
    let stars = 1;
    const timeLimit = level.timeLimit || 180;
    const timeRatio = timeTaken / timeLimit;
    const fuelRatio = fuelRemaining / 100;

    if (timeRatio < 0.7 && fuelRatio > 0.3 && bumpCount < 2) stars = 3;
    else if (timeRatio < 0.9 && fuelRatio > 0.2 && bumpCount < 5) stars = 2;

    const key = `${level.id}`;
    if (!this.starRatings[key] || stars > this.starRatings[key]) {
      this.starRatings[key] = stars;
    }
    this.save();
    return stars;
  }

  // Achievements
  checkAchievements(levelId, stats) {
    const newAchievements = [];
    const ach = this.achievements;

    if (stats.parked && !ach.includes('first_park')) {
      ach.push('first_park');
      newAchievements.push('🏆 Primo Parcheggio!');
    }
    if (stats.totalParks >= 5 && !ach.includes('parking_5')) {
      ach.push('parking_5');
      newAchievements.push('⭐ Parcheggiatore 5 stelle!');
    }
    if (stats.totalParks >= 10 && !ach.includes('parking_10')) {
      ach.push('parking_10');
      newAchievements.push('🅿️ Parcheggiatore Professionista!');
    }
    if (stats.combo >= 20 && !ach.includes('combo_20')) {
      ach.push('combo_20');
      newAchievements.push('🔥 Combo Master!');
    }
    if (stats.totalBumps < 5 && stats.totalParks > 0 && !ach.includes('gentleman')) {
      ach.push('gentleman');
      newAchievements.push('🎩 Gentleman Driver!');
    }
    if (stats.stars >= 3 && !ach.includes('stars_3')) {
      ach.push('stars_3');
      newAchievements.push('🌟 Tre Stelle!');
    }
    if (stats.levelsCompleted >= 5 && !ach.includes('level_5')) {
      ach.push('level_5');
      newAchievements.push('🗺️ Esploratore!');
    }
    if (stats.boostUsed && !ach.includes('boost_user')) {
      ach.push('boost_user');
      newAchievements.push('🚀 Boost User!');
    }

    if (newAchievements.length > 0) {
      this.achievements = ach;
      this.save();
    }
    return newAchievements;
  }

  // Daily challenge
  loadDailyChallenge() {
    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem('stardock_daily') || '{}');
    if (saved.date === today) return saved;
    return this.generateDailyChallenge(today);
  }

  generateDailyChallenge(date) {
    const levelIdx = Math.floor(Math.random() * this.levels.length);
    const shipTypes = [0, 1, 2, 3];
    const shipType = shipTypes[Math.floor(Math.random() * shipTypes.length)];
    const challenge = {
      date,
      levelId: levelIdx,
      shipType,
      targetTime: 30 + Math.random() * 60,
      targetFuel: 50 + Math.random() * 30,
      targetStars: 2,
      bonusCredits: 100
    };
    localStorage.setItem('stardock_daily', JSON.stringify(challenge));
    return challenge;
  }

  unlockShip(shipType) {
    const names = ['falco', 'cobra', 'titan', 'ghost'];
    if (!this.unlocks[names[shipType]]) {
      this.unlocks[names[shipType]] = true;
      this.save();
      return true;
    }
    return false;
  }

  isShipUnlocked(shipType) {
    const names = ['falco', 'cobra', 'titan', 'ghost'];
    return !!this.unlocks[names[shipType]];
  }

  getBestTime(levelId) {
    return this.bestTimes[levelId] || Infinity;
  }

  setBestTime(levelId, time) {
    if (time < (this.bestTimes[levelId] || Infinity)) {
      this.bestTimes[levelId] = time;
      this.save();
    }
  }

  getStats() {
    return {
      totalParks: this.totalParks,
      totalBumps: this.totalBumps,
      totalDistance: this.totalDistance,
      credits: this.credits,
      achievements: this.achievements,
      starRatings: this.starRatings,
      bestTimes: this.bestTimes
    };
  }
}
