const DOMINANCE_WEIGHTS = { dominant: 2, codominant: 1, recessive: 0 };
const MAX_GENERATIONS = 15;
const POWER_LEVELS = ['base', 'weak', 'standard', 'strong', 'legendary'];
const POWER_MULTIPLIERS = { base: 1, weak: 0.8, standard: 1, strong: 1.2, legendary: 1.5 };

const GENETIC_TRAITS = {
  size: { name: 'Taglia', options: ['Minima', 'Piccola', 'Media', 'Grande', 'Gigante'], emojis: ['🌱', '🍞', '🍞', '🍞', '🏔️'] },
  density: { name: 'Densità', options: ['Aerea', 'Leggera', 'Normale', 'Compatta', 'Solida'], emojis: ['☁️', '🍬', '🍞', '🪨', '💎'] },
  crustThickness: { name: 'Crosta', options: ['Nuda', 'Sottile', 'Media', 'Spessa', 'Corazzata'], emojis: ['❄️', '🥖', '🍞', '🔥', '🛡️'] },
  crumbColor: { name: 'Mollica', options: ['Bianca', 'Chiara', 'Dorata', 'Scura', 'Nera'], emojis: ['⚪', '🌾', '✨', '☕', '⚫'] },
  aromaIntensity: { name: 'Aroma', options: ['Nullo', 'Lieve', 'Intenso', 'Potente', 'Epico'], emojis: ['💨', '🌸', '🌿', '🔥', '⭐'] },
  shelfLife: { name: 'Conservazione', options: ['Fragile', 'Breve', 'Normale', 'Lunga', 'Eterna'], emojis: ['🕐', '⏰', '📅', '📆', '💎'] },
};

const RARITY_BONUSES = { common: 0, uncommon: 0.1, rare: 0.25, legendary: 0.5 };

let _catalog = {};
let _lineages = {};
let _catalogDiscoveryCount = 0;
let _geneticStats = { totalBakes: 0, mutationsDiscovered: 0, lineagesCreated: 0, legendaryMutations: 0 };

function computeDominance(parent1Dominance, parent2Dominance) {
  const w1 = DOMINANCE_WEIGHTS[parent1Dominance] || 1;
  const w2 = DOMINANCE_WEIGHTS[parent2Dominance] || 1;
  const total = w1 + w2;
  if (total === 0) return 'codominant';
  return w1 > w2 ? 'dominant' : w2 > w1 ? 'recessive' : 'codominant';
}

function rollPowerLevel(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  const r = x - Math.floor(x);
  if (r < 0.4) return 'base';
  if (r < 0.65) return 'weak';
  if (r < 0.85) return 'standard';
  if (r < 0.97) return 'strong';
  return 'legendary';
}

function rollDominance(seed) {
  const x = Math.sin(seed * 7301 + 49297) * 49297;
  const r = x - Math.floor(x);
  if (r < 0.3) return 'dominant';
  if (r < 0.7) return 'codominant';
  return 'recessive';
}

function inheritTrait(parent1Trait, parent2Trait) {
  const d1 = parent1Trait?.dominance || 'codominant';
  const d2 = parent2Trait?.dominance || 'codominant';
  const w1 = DOMINANCE_WEIGHTS[d1] || 1;
  const w2 = DOMINANCE_WEIGHTS[d2] || 1;

  if (w1 >= w2) return { ...parent1Trait, dominance: computeDominance(d1, d2) };
  return { ...parent2Trait, dominance: computeDominance(d1, d2) };
}

function mutateTrait(trait, seed) {
  const types = Object.keys(GENETIC_TRAITS);
  const type = types[Math.floor(Math.abs(Math.sin(seed * 31) * 10000) % types.length)];
  const options = GENETIC_TRAITS[type].options;
  const idx = Math.floor(Math.abs(Math.sin(seed * 73) * 10000) % options.length);
  return {
    type,
    value: options[idx],
    emoji: GENETIC_TRAITS[type].emojis[idx],
    dominance: rollDominance(seed),
    powerLevel: rollPowerLevel(seed),
    originalType: trait?.type,
    mutated: true,
  };
}

function applyPowerMultiplier(traits) {
  const result = [];
  for (const t of traits) {
    const power = t.powerLevel || 'base';
    const mult = POWER_MULTIPLIERS[power] || 1;
    result.push({ ...t, _multiplier: mult });
  }
  return result;
}

export function initMutationV2() {
  _catalog = {};
  _lineages = {};
  _catalogDiscoveryCount = 0;
  _geneticStats = { totalBakes: 0, mutationsDiscovered: 0, lineagesCreated: 0, legendaryMutations: 0 };
}

export function createLineage(parent1Id, parent2Id, childId) {
  const parent1 = _lineages[parent1Id];
  const parent2 = _lineages[parent2Id];

  const gen1 = parent1 ? parent1.generation : 0;
  const gen2 = parent2 ? parent2.generation : 0;
  const newGen = Math.max(gen1, gen2) + 1;

  if (newGen > MAX_GENERATIONS) return null;

  const ancestry = [];
  if (parent1) ancestry.push(...parent1.ancestry);
  if (parent2) ancestry.push(...parent2.ancestry);
  ancestry.push({ id: parent1Id, generation: gen1 });
  ancestry.push({ id: parent2Id, generation: gen2 });

  const lineage = {
    id: childId,
    parent1: parent1Id,
    parent2: parent2Id,
    generation: newGen,
    ancestry: ancestry.slice(-20),
    traits: [],
    createdAt: Date.now(),
  };

  _lineages[childId] = lineage;
  _geneticStats.lineagesCreated++;
  return lineage;
}

export function breed(parent1Id, parent2Id) {
  const parent1 = _lineages[parent1Id];
  const parent2 = _lineages[parent2Id];

  if (!parent1 && !parent2) return null;

  const childId = 'breed_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  const lineage = createLineage(parent1Id, parent2Id, childId);
  if (!lineage) return null;

  const childTraits = [];
  const seed = Math.floor(Date.now() / 1000);

  const parent1Traits = parent1 ? parent1.traits : [];
  const parent2Traits = parent2 ? parent2.traits : [];
  const maxTraits = 4;

  const traitTypes = Object.keys(GENETIC_TRAITS);
  const usedTypes = new Set();

  for (let i = 0; i < maxTraits && i < traitTypes.length; i++) {
    const type = traitTypes[i];
    usedTypes.add(type);

    if (parent1Traits.length > 0 && parent2Traits.length > 0) {
      const p1Trait = parent1Traits.find(t => t.type === type);
      const p2Trait = parent2Traits.find(t => t.type === type);

      if (p1Trait && p2Trait) {
        const inherited = inheritTrait(p1Trait, p2Trait);
        if (Math.random() < 0.15) {
          childTraits.push(mutateTrait(inherited, seed + i));
        } else {
          childTraits.push(inherited);
        }
      } else if (p1Trait) {
        childTraits.push({ ...p1Trait, dominance: rollDominance(seed + i) });
      } else if (p2Trait) {
        childTraits.push({ ...p2Trait, dominance: rollDominance(seed + i) });
      }
    } else if (parent1Traits.length > 0) {
      const t = parent1Traits[i % parent1Traits.length];
      childTraits.push({ ...t, dominance: rollDominance(seed + i) });
    } else if (parent2Traits.length > 0) {
      const t = parent2Traits[i % parent2Traits.length];
      childTraits.push({ ...t, dominance: rollDominance(seed + i) });
    } else {
      const newTrait = {
        type,
        value: GENETIC_TRAITS[type].options[Math.floor(Math.random() * GENETIC_TRAITS[type].options.length)],
        emoji: GENETIC_TRAITS[type].emojis[Math.floor(Math.random() * GENETIC_TRAITS[type].emojis.length)],
        dominance: rollDominance(seed + i),
        powerLevel: rollPowerLevel(seed + i),
        mutated: false,
      };
      childTraits.push(newTrait);
    }
  }

  const poweredTraits = applyPowerMultiplier(childTraits);
  lineage.traits = poweredTraits;
  _lineages[childId] = lineage;

  return { lineage, traits: poweredTraits };
}

export function recordMutationDiscovery(mutation) {
  if (!mutation) return;
  const key = mutation.type + '_' + mutation.value;
  if (!_catalog[key]) {
    _catalog[key] = { ...mutation, discoveredAt: Date.now() };
    _catalogDiscoveryCount++;
    _geneticStats.mutationsDiscovered++;
    if (mutation.powerLevel === 'legendary') _geneticStats.legendaryMutations++;
  }
}

export function recordMutationBakes(count) {
  _geneticStats.totalBakes += count;
}

export function getCatalog() {
  return _catalog;
}

export function getCatalogEntry(key) {
  return _catalog[key] || null;
}

export function getCatalogSize() {
  return _catalogDiscoveryCount;
}

export function getCatalogByRarity(rarity) {
  return Object.values(_catalog).filter(m => m.rarity === rarity);
}

export function getCatalogStats() {
  const stats = { ..._geneticStats };
  stats.catalogSize = _catalogDiscoveryCount;
  stats.uniqueTypes = Object.keys(_catalog).length;
  stats.totalTraits = Object.values(_catalog).length;

  const rarities = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
  for (const m of Object.values(_catalog)) {
    rarities[m.rarity] = (rarities[m.rarity] || 0) + 1;
  }
  stats.rarityBreakdown = rarities;
  return stats;
}

export function getLineage(breadId) {
  return _lineages[breadId] || null;
}

export function getAllLineages() {
  return _lineages;
}

export function getGeneticStats() {
  return { ..._geneticStats };
}

export function getGeneticTrait(traitType) {
  return GENETIC_TRAITS[traitType] || null;
}

export function getAllGeneticTraits() {
  return GENETIC_TRAITS;
}

export function getPowerMultiplier(powerLevel) {
  return POWER_MULTIPLIERS[powerLevel] || 1;
}

export function getMaxGenerations() {
  return MAX_GENERATIONS;
}

export function generateGeneticMutations(baseRecipeId, parentMutations) {
  const seed = Math.floor(Date.now() / 1000);
  const traitTypes = Object.keys(GENETIC_TRAITS);
  const mutations = [];

  const count = 2 + Math.floor(Math.abs(Math.sin(seed * 17) * 10000) % 2);

  for (let i = 0; i < count && i < traitTypes.length; i++) {
    const type = traitTypes[i];
    const options = GENETIC_TRAITS[type].options;
    const idx = Math.floor(Math.abs(Math.sin(seed + i * 31) * 10000) % options.length);

    const mutation = {
      type,
      value: options[idx],
      emoji: GENETIC_TRAITS[type].emojis[idx],
      dominance: rollDominance(seed + i * 7),
      powerLevel: rollPowerLevel(seed + i * 13),
      rarity: Math.random() < 0.1 ? 'legendary' : Math.random() < 0.25 ? 'rare' : Math.random() < 0.5 ? 'uncommon' : 'common',
      mutated: !parentMutations || parentMutations.length === 0,
    };

    mutations.push(mutation);
    recordMutationDiscovery(mutation);
  }

  return mutations;
}

export function getPowerLevel(breadId) {
  const lineage = _lineages[breadId];
  if (!lineage || lineage.traits.length === 0) return 'base';

  let totalPower = 0;
  for (const t of lineage.traits) {
    const power = t.powerLevel || 'base';
    totalPower += POWER_MULTIPLIERS[power] || 1;
  }
  const avg = totalPower / lineage.traits.length;

  if (avg >= 3.5) return 'legendary';
  if (avg >= 2.5) return 'strong';
  if (avg >= 1.5) return 'standard';
  if (avg >= 1.1) return 'weak';
  return 'base';
}

export function getLineageDisplay(lineageId) {
  const lineage = _lineages[lineageId];
  if (!lineage) return null;

  const parts = [];
  if (lineage.parent1) parts.push('← ' + lineage.parent1);
  if (lineage.parent2) parts.push('← ' + lineage.parent2);
  parts.push('Gen ' + lineage.generation);
  return parts.join(' | ');
}

export function getAncestryChain(breadId, maxDepth) {
  const lineage = _lineages[breadId];
  if (!lineage) return [];
  if (maxDepth === undefined) maxDepth = MAX_GENERATIONS;

  const chain = [];
  const visited = new Set();

  function traverse(id, depth) {
    if (depth > maxDepth || visited.has(id)) return;
    visited.add(id);
    const l = _lineages[id];
    if (!l) return;
    chain.push({ id, generation: l.generation, traits: l.traits });
    if (l.parent1) traverse(l.parent1, depth + 1);
    if (l.parent2) traverse(l.parent2, depth + 1);
  }

  traverse(breadId, 0);
  return chain;
}

export function loadMutationV2State(saved) {
  if (!saved) return;
  if (saved._catalog) _catalog = saved._catalog;
  if (saved._lineages) _lineages = saved._lineages;
  if (saved._catalogDiscoveryCount !== undefined) _catalogDiscoveryCount = saved._catalogDiscoveryCount;
  if (saved._geneticStats) _geneticStats = saved._geneticStats;
}

export function getMutationV2SaveState() {
  return { _catalog, _lineages, _catalogDiscoveryCount, _geneticStats };
}

export function resetMutationV2() {
  initMutationV2();
}

export function getCatalogEntries() {
  return Object.entries(_catalog).map(([key, mutation]) => ({ key, ...mutation }));
}

export function getLineageSummary(breadId) {
  const lineage = _lineages[breadId];
  if (!lineage) return null;
  return {
    id: lineage.id,
    generation: lineage.generation,
    traitCount: lineage.traits.length,
    ancestors: lineage.ancestry.length,
    powerLevel: getPowerLevel(breadId),
    hasLegendary: lineage.traits.some(t => t.powerLevel === 'legendary'),
  };
}
