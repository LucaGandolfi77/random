import { CARD_DATA } from '../data/cards.js';
import { getFusionRecipe, FUSION_RECIPES } from '../data/fusions.js';

const RARITY_COLORS = {
  common: '#a0a0a0',
  uncommon: '#4ecdc4',
  rare: '#9b6dff',
  epic: '#ff6bff',
  legendary: '#ffd93d'
};

export function getAllCards() {
  return CARD_DATA;
}

export function getCard(id) {
  return CARD_DATA.find(c => c.id === id) || null;
}

export function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || '#a0a0a0';
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createUnit(card, owner, lane) {
  return {
    id: `${owner}_${card.id}_${Date.now()}_${Math.random()}`,
    cardId: card.id,
    name: card.name,
    emoji: card.emoji,
    elixir: card.elixir,
    hp: card.hp,
    maxHp: card.hp,
    dmg: card.dmg,
    speed: card.speed,
    range: card.range,
    target: card.target,
    ability: card.ability,
    rarity: card.rarity,
    color: card.color,
    owner,
    lane,
    alive: true,
    attacking: false,
    attacked: false,
    age: 0,
    x: 0,
    y: 0
  };
}

export function applyAbility(ability, unit, allUnits) {
  const allies = allUnits.filter(u => u.alive && u.owner === unit.owner);
  const enemies = allUnits.filter(u => u.alive && u.owner !== unit.owner);

  switch (ability) {
    case 'heal_ally': {
      const target = allies.find(a => a.hp < a.maxHp);
      if (target) {
        target.hp = Math.min(target.maxHp, target.hp + 15);
      }
      break;
    }
    case 'grow': {
      if (unit.age > 0) {
        unit.hp = Math.min(unit.maxHp, unit.hp + 5);
      }
      break;
    }
    case 'first_strike': {
      if (enemies.length > 0) {
        const target = enemies[0];
        target.hp -= unit.dmg * 2;
      }
      break;
    }
    case 'taunt': {
      break;
    }
    case 'reveal': {
      break;
    }
    case 'heal_radius': {
      allies.forEach(a => {
        a.hp = Math.min(a.maxHp, a.hp + 8);
      });
      break;
    }
    case 'spawn_spores': {
      const allyMushrooms = allies.filter(a => a.cardId === 'mushroom_circle');
      if (allyMushrooms.length > 0 && Math.random() > 0.5) {
        break;
      }
      break;
    }
    case 'phase': {
      unit.dmg += 10;
      break;
    }
    case 'aoe_stun': {
      enemies.forEach(e => { e.attacking = false; e.stunned = true; });
      break;
    }
    case 'ice_barrier': {
      unit.maxHp += 30;
      unit.hp += 30;
      break;
    }
    case 'double_damage': {
      allies.forEach(a => {
        if (!a.attacking) a.dmg *= 1.5;
      });
      break;
    }
    case 'life_link': {
      const enemy = enemies[0];
      if (enemy) {
        const dmg = Math.min(enemy.hp, 5);
        enemy.hp -= dmg;
        unit.hp -= dmg;
      }
      break;
    }
    case 'dodge': {
      unit.maxHp += 15;
      unit.hp += 15;
      break;
    }
    case 'luminance': {
      if (unit.age % 2 === 0 && enemies.length > 0) {
        enemies[0].hp -= unit.dmg;
      }
      break;
    }
    case 'ethereal': {
      unit.speed += 0.3;
      break;
    }
    case 'burn': {
      if (enemies.length > 0) {
        enemies[0].maxHp -= 5;
      }
      break;
    }
    case 'ward': {
      allies.forEach(a => { a.maxHp += 20; });
      break;
    }
    case 'refresh': {
      const aliveAllies = allies.filter(a => a.alive);
      if (aliveAllies.length > 0) {
        const weakest = aliveAllies.reduce((w, a) => a.hp / a.maxHp < w.hp / w.maxHp ? a : w, aliveAllies[0]);
        weakest.hp = Math.min(weakest.maxHp, weakest.hp + 10);
      }
      break;
    }
     case 'summon_moss': {
      break;
    }
    case 'supernova': {
      const allEnemies = allUnits.filter(u => u.alive && u.owner !== unit.owner);
      allEnemies.forEach(e => { e.hp -= unit.dmg * 0.5; });
      if (enemies.length > 0) { enemies[0].hp -= unit.dmg; }
      break;
    }
    case 'radiance': {
      allies.forEach(a => { a.hp = Math.min(a.maxHp, a.hp + unit.dmg); });
      break;
    }
    case 'earthquake': {
      allUnits.filter(u => u.alive && u.owner !== unit.owner).forEach(e => { e.hp -= Math.floor(unit.dmg * 0.7); });
      break;
    }
    case 'celestial_blink': {
      unit.dmg += 15;
      if (enemies.length > 0) { enemies[0].hp -= unit.dmg; }
      break;
    }
    case 'nature_surge': {
      allies.forEach(a => { a.hp = Math.min(a.maxHp, a.hp + 10); a.dmg += 5; });
      break;
    }
    case 'frost_shield': {
      unit.maxHp += 40; unit.hp += 40;
      break;
    }
    case 'dream_trap': {
      allUnits.filter(u => u.alive && u.owner !== unit.owner).forEach(e => { e.attacking = true; });
      break;
    }
    case 'fire_burst': {
      enemies.forEach(e => { e.hp -= unit.dmg; });
      break;
    }
    case 'life_wave': {
      allies.forEach(a => { a.hp = Math.min(a.maxHp, a.hp + 20); });
      break;
    }
    case 'phantom_strike': {
      enemies.forEach(e => { e.hp -= unit.dmg * 2; });
      break;
    }
    case 'splash': {
      if (enemies.length > 0) {
        enemies[0].hp -= unit.dmg;
        const idx = enemies.indexOf(enemies[0]);
        enemies.forEach((e, i) => {
          if (i !== idx) e.hp -= Math.floor(unit.dmg * 0.5);
        });
      }
      break;
    }
     case 'dreamscape': {
      allies.forEach(a => { a.dmg += 5; });
      break;
    }
    default:
      break;
  }
}

export function findNearestEnemy(unit, allUnits, lanes) {
  const enemies = allUnits.filter(u => u.alive && u.owner !== unit.owner && u.lane === unit.lane);
  if (enemies.length === 0) return null;
  return enemies.reduce((nearest, e) => {
    const d = Math.abs(e.x - unit.x);
    return d < nearest.dist ? { unit: e, dist: d } : nearest;
  }, { unit: enemies[0], dist: Infinity }).unit;
}

export function calculateDamage(attacker, target) {
  let damage = attacker.dmg;
  if (attacker.ability === 'first_strike' && !attacker.attacked) {
    damage *= 2;
  }
  return damage;
}

export function createEvolvedUnit(evolvedCard, owner, lane, card1X, card2X) {
  const unit = createUnit(evolvedCard, owner, lane);
  unit.x = (card1X + card2X) / 2;
  unit.y = owner === 'player' ? 420 : 140;
  unit.evolved = true;
  unit.fromCards = [card1X, card2X];
  return unit;
}

export function getFusablePairs(units) {
  const pairs = [];
  const alive = units.filter(u => u.alive);
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const recipe = getFusionRecipe(alive[i].cardId || alive[i].id, alive[j].cardId || alive[j].id);
      if (recipe) {
        pairs.push({ card1: alive[i], card2: alive[j], recipe });
      }
    }
  }
  return pairs;
}

export function hasFusableLane(units) {
  const fusable = getFusablePairs(units);
  return fusable.length > 0;
}
