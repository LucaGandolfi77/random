export const SPIRIT_COMPANIONS = [
  {
    id: 'fox_spirit',
    name: 'Fox Spirit',
    emoji: '🦊',
    color: '#ff6b6b',
    desc: 'Grants +15% damage to all cards in the center lane',
    ability: 'center_boost',
    passive: (units) => {
      const centerUnits = units.filter(u => u.lane === 1);
      return centerUnits.map(u => ({ ...u, dmg: Math.floor(u.dmg * 1.15) }));
    }
  },
  {
    id: 'moss_spirit',
    name: 'Moss Spirit',
    emoji: '🌿',
    color: '#4ecdc4',
    desc: 'All units regenerate 2 HP per turn',
    ability: 'regen',
    passive: (units) => {
      return units.map(u => ({ ...u, hp: u.hp + 2, maxHp: u.maxHp + 2 }));
    }
  },
  {
    id: 'moon_spirit',
    name: 'Moon Spirit',
    emoji: '🌙',
    color: '#9b6dff',
    desc: 'First card played each turn costs 1 less elixir',
    ability: 'first_discount',
    passive: null
  },
  {
    id: 'thorn_spirit',
    name: 'Thorn Spirit',
    emoji: '🌵',
    color: '#ffd93d',
    desc: 'Enemy units take 5 damage when entering a lane with a taunt',
    ability: 'thorn_retaliation',
    passive: null
  },
  {
    id: 'star_spirit',
    name: 'Star Spirit',
    emoji: '⭐',
    color: '#ffe066',
    desc: 'Fusing cards creates a +1 level evolved form',
    ability: 'fusion_boost',
    passive: null
  }
];

export function getCompanion(id) {
  return SPIRIT_COMPANIONS.find(c => c.id === id) || SPIRIT_COMPANIONS[0];
}

export function getAllCompanions() {
  return SPIRIT_COMPANIONS;
}
