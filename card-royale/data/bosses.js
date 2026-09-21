export const BOSS_DATA = [
  {
    id: 'thorn_king',
    name: 'The Thorn King',
    emoji: '👑',
    color: '#2d9a46',
    desc: 'Has a shield absorbing the first 3 attacks. Use splash/area cards!',
    hp: 300,
    maxHp: 300,
    shield: 3,
    attackDmg: 15,
    ability: 'thorn_shield',
    winDialogue: 'The forest stands eternal! 🌿',
    loseDialogue: 'Even thorns can be cut... 🌸'
  },
  {
    id: 'shadow_queen',
    name: 'The Shadow Queen',
    emoji: '👸',
    color: '#9b6dff',
    desc: 'Steals a random card from your hand each turn!',
    hp: 200,
    maxHp: 200,
    attackDmg: 20,
    ability: 'card_steal',
    winDialogue: "The shadows are mine now. 🗡️",
    loseDialogue: "You took my cards... but not my heart 💜"
  },
  {
    id: 'ancient_dragon',
    name: 'The Ancient Dragon',
    emoji: '🐉',
    color: '#ff6b6b',
    desc: 'Doubles in power every 3 turns! You must rush or kite!',
    hp: 250,
    maxHp: 250,
    attackDmg: 12,
    ability: 'power_doubling',
    winDialogue: 'The dragon bows to the forest! 🔥',
    loseDialogue: 'Even dragons fear the forest... 🌿'
  }
];

export function getBoss(bossId) {
  return BOSS_DATA.find(b => b.id === bossId) || BOSS_DATA[0];
}

export function getAllBosses() {
  return BOSS_DATA;
}

export function getNextBoss(winCount) {
  if (winCount % 5 !== 4) return null;
  const index = Math.floor((winCount) / 5) % BOSS_DATA.length;
  return BOSS_DATA[index];
}
