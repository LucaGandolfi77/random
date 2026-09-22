const MUTATION_TYPES = {
  texture: {
    name: 'Texture',
    options: ['Crostoso', 'Morbido', 'Gommoso', 'Aereo', 'Compatto'],
    emojis: ['🔥', '🍞', '🍬', '☁️', '🪨'],
    colors: ['#d35400', '#e67e22', '#f39c12', '#ecf0f1', '#7f8c8d'],
  },
  flavor: {
    name: 'Sapore',
    options: ['Dolce', 'Salato', 'Amaro', 'Umami', 'Piccante'],
    emojis: ['🍯', '🧂', '☕', '🫒', '🌶️'],
    colors: ['#f1c40f', '#3498db', '#95a5a6', '#e67e22', '#e74c3c'],
  },
  color: {
    name: 'Colore',
    options: ['Dorato', 'Rosa', 'Blu', 'Verde', 'Nero'],
    emojis: ['✨', '🌸', '💎', '🌿', '⚫'],
    colors: ['#f1c40f', '#ff69b4', '#3498db', '#27ae60', '#2c3e50'],
  },
  scent: {
    name: 'Profumazione',
    options: ['Vaniglia', 'Rosmarino', 'Caffè', 'Fiori', 'Cocco'],
    emojis: ['🌸', '🌿', '☕', '🦋', '🥥'],
    colors: ['#e8daef', '#27ae60', '#6d4c41', '#f8e8e0', '#fce4b5'],
  },
};

const MUTATION_RARITIES = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare'];

const INHERIT_CHANCE = 0.6;
const MUTATE_CHANCE = 0.3;
const DOUBLE_MUTATE_CHANCE = 0.1;

let _mutationSeed = 0;

function getSeed() {
  return Math.floor(Date.now() / 1000);
}

function seededRand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function pickMutation(seed, type) {
  const rand = seededRand(seed);
  const rarityIndex = Math.floor(rand * MUTATION_RARITIES.length);
  const rarity = MUTATION_RARITIES[rarityIndex];
  const options = MUTATION_TYPES[type].options;
  const emojis = MUTATION_TYPES[type].emojis;
  const colors = MUTATION_TYPES[type].colors;
  const idx = Math.floor(seededRand(seed + 1) * options.length);
  return {
    type,
    name: options[idx],
    emoji: emojis[idx],
    color: colors[idx],
    rarity,
  };
}

function combineMutations(parentMutations) {
  const result = [];
  if (!parentMutations || parentMutations.length === 0) return result;

  const seed = getSeed();

  for (let i = 0; i < parentMutations.length; i++) {
    const rand = seededRand(seed + i);
    if (rand < INHERIT_CHANCE) {
      result.push({ ...parentMutations[i] });
    } else if (rand < INHERIT_CHANCE + MUTATE_CHANCE) {
      const types = Object.keys(MUTATION_TYPES);
      const newType = types[Math.floor(seededRand(seed + i + 100) * types.length)];
      result.push(pickMutation(seed + i + 200, newType));
    }
  }

  const rand = seededRand(seed + 999);
  if (rand < DOUBLE_MUTATE_CHANCE && result.length < 4) {
    const types = Object.keys(MUTATION_TYPES);
    const newType = types[Math.floor(seededRand(seed + 5000) * types.length)];
    result.push(pickMutation(seed + 6000, newType));
  }

  return result;
}

export function generateMutations(baseRecipeId, parentMutations) {
  const seed = getSeed();
  const rand = seededRand(seed);

  const mutationCount = rand < 0.4 ? 1 : rand < 0.75 ? 2 : 3;
  let mutations = [];

  if (parentMutations && parentMutations.length > 0) {
    mutations = combineMutations(parentMutations);
  }

  const types = Object.keys(MUTATION_TYPES);
  while (mutations.length < mutationCount) {
    const type = types[Math.floor(seededRand(seed + mutations.length + 1) * types.length)];
    const newMutation = pickMutation(seed + mutations.length + 2, type);
    const exists = mutations.some(m => m.type === newMutation.type);
    if (!exists) {
      mutations.push(newMutation);
    }
  }

  return mutations.slice(0, 4);
}

export function getMutationDisplay(mutations) {
  if (!mutations || mutations.length === 0) return null;
  return mutations.map(m => m.emoji + ' ' + m.name).join(' | ');
}

export function getMutationRarityColor(rarity) {
  const colors = { common: '#95a5a6', uncommon: '#3498db', rare: '#9b59b6', legendary: '#e74c3c' };
  return colors[rarity] || '#95a5a6';
}

export function getMutationTypes() {
  return MUTATION_TYPES;
}

export function getMutationCount(baseRecipeId) {
  const seed = getSeed();
  const rand = seededRand(seed);
  return rand < 0.4 ? 1 : rand < 0.75 ? 2 : 3;
}

export function hasMutations(mutations) {
  return mutations && mutations.length > 0;
}

export function isRareMutation(mutation) {
  return mutation.rarity === 'rare' || mutation.rarity === 'legendary';
}

export function getMutationEmojis(mutations) {
  if (!mutations) return '';
  return mutations.map(m => m.emoji).join('');
}
