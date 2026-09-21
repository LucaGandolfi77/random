export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Victory', desc: 'Win your first battle', icon: '🌱', check: (s) => s.wins >= 1 },
  { id: 'three_star', name: 'Perfectionist', desc: 'Win with 3 stars', icon: '⭐', check: (s) => s.threeStarWins >= 1 },
  { id: 'win_5', name: 'Forest Guardian', desc: 'Win 5 battles', icon: '🛡', check: (s) => s.wins >= 5 },
  { id: 'win_10', name: 'Enchanted Hero', desc: 'Win 10 battles', icon: '🗡', check: (s) => s.wins >= 10 },
  { id: 'win_25', name: 'Legendary Warrior', desc: 'Win 25 battles', icon: '👑', check: (s) => s.wins >= 25 },
  { id: 'fuse_1', name: 'Fusion Master', desc: 'Perform your first fusion', icon: '🔥', check: (s) => s.fusions >= 1 },
  { id: 'fuse_10', name: 'Fusion Legend', desc: 'Perform 10 fusions', icon: '💎', check: (s) => s.fusions >= 10 },
  { id: 'boss_1', name: 'Boss Slayer', desc: 'Defeat a boss', icon: '⚔', check: (s) => s.bossesDefeated >= 1 },
  { id: 'boss_3', name: 'Boss Slayer Elite', desc: 'Defeat all 3 bosses', icon: '💀', check: (s) => s.bossesDefeated >= 3 },
 { id: 'weather_6', name: 'Weather Wizard', desc: 'Experience all 6 weather types', icon: '🌦', check: (s) => (s.weatherTypes || []).length >= 6 },
 { id: 'nature_1', name: "Nature's Chosen", desc: 'Use Nature\'s Wrath', icon: '🌿', check: (s) => (s.ultimateUses || 0) >= 1 },
 { id: 'comp_5', name: 'Spirit Collector', desc: 'Use all 5 companions', icon: '🦊', check: (s) => (s.companionsUsed || []).length >= 5 }
];

export function getUnlockedAchievements(stats) {
  return ACHIEVEMENTS.filter(a => a.check(stats));
}

export function getNewAchievements(stats, unlockedIds) {
  return ACHIEVEMENTS.filter(a => a.check(stats) && !unlockedIds.includes(a.id));
}
