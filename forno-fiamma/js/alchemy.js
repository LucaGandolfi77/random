const ALCHEMY_CAULDRON_MAX = 5;
const ALCHEMY_COOLDOWN = 30000;

let _cauldron = [];
let _lastAlchemyTime = 0;
let _discoveredRecipes = {};

const INGREDIENT_CATALOG = [
  'grano', 'farina', 'acqua', 'lievito', 'sale', 'olio', 'zucchero',
  'burro', 'uova', 'miele', 'cioccolato', 'mandorle', 'romano',
  'rosmarino', 'scorza'
];

const BASE_INGREDIENT_WEIGHT = {
  grano: 1, farina: 1, acqua: 1, lievito: 1, sale: 1, olio: 1,
  zucchero: 2, burro: 3, uova: 2, miele: 4, cioccolato: 5,
  mandorle: 3, romano: 3, rosmarino: 2, scorza: 2
};

const ALCHEMY_RULES = [
  { ingredients: ['farina', 'acqua', 'lievito'], result: 'impasto_base', name: 'Impasto Base', emoji: '🥣' },
  { ingredients: ['impasto_base', 'miele'], result: 'brioche_dolce', name: 'Brioche Dolce', emoji: '🧁' },
  { ingredients: ['impasto_base', 'zucchero'], result: 'dolce_fritto', name: 'Dolce Fritto', emoji: '🍩' },
  { ingredients: ['impasto_base', 'cioccolato'], result: 'cioccolatini', name: 'Cioccolatini', emoji: '🍫' },
  { ingredients: ['impasto_base', 'mandorle'], result: 'paste_almonda', name: 'Paste di Mandorla', emoji: '🥜' },
  { ingredients: ['farina', 'uova', 'burro'], result: 'pasta_frolla', name: 'Pasta Frolla', emoji: '🥧' },
  { ingredients: ['pasta_frolla', 'miele'], result: 'torta_miele', name: 'Torta al Miele', emoji: '🍯' },
  { ingredients: ['pasta_frolla', 'cioccolato'], result: 'torta_ciocco', name: 'Torta al Cioccolato', emoji: '🎂' },
  { ingredients: ['impasto_base', 'rosmarino'], result: 'focaccia_erbe', name: 'Focaccia alle Erbe', emoji: '🌿' },
  { ingredients: ['impasto_base', 'sale', 'olio'], result: 'focaccia_classica', name: 'Focaccia Classica', emoji: '🫓' },
  { ingredients: ['impasto_base', 'scorza', 'zucchero'], result: 'panettone', name: 'Panettone Aromatico', emoji: '🎄' },
  { ingredients: ['farina', 'acqua', 'sale'], result: 'pasta_secca', name: 'Pasta Secca', emoji: '🍝' },
  { ingredients: ['pasta_secca', 'olio', 'rosmarino'], result: 'bruschetta', name: 'Bruschetta', emoji: '🫒' },
  { ingredients: ['impasto_base', 'uova', 'zucchero'], result: 'biscotti', name: 'Biscotti Dorati', emoji: '🍪' },
  { ingredients: ['miele', 'burro'], result: 'crema_miele', name: 'Crema al Miele', emoji: '🍯' },
  { ingredients: ['cioccolato', 'burro'], result: 'ganache', name: 'Ganache al Cioccolato', emoji: '🍫' },
  { ingredients: ['ganache', 'farina'], result: 'torta_nocciola', name: 'Torta alle Nocciole', emoji: '🍫' },
  { ingredients: ['uova', 'zucchero', 'miele'], result: 'crema_pasticciera', name: 'Crema Pasticciera', emoji: '🥧' },
  { ingredients: ['crema_pasticciera', 'cioccolato'], result: 'profiterole', name: 'Profiterole', emoji: '🧁' },
  { ingredients: ['miele', 'rosmarino'], result: 'miele_erbe', name: 'Miele alle Erbe', emoji: '🌿' },
  { ingredients: ['farina', 'mandorle', 'uova'], result: 'marzipan', name: 'Marzapane', emoji: '🎭' },
  { ingredients: ['marzipan', 'cioccolato'], result: 'pannello', name: 'Pannello di Cioccolato', emoji: '🍫' },
  { ingredients: ['impasto_base', 'sale', 'mandorle'], result: 'pane_sale', name: 'Pane al Sale', emoji: '🫓' },
  { ingredients: ['impasto_base', 'scorza'], result: 'pane_arancio', name: 'Pane all\'Arancia', emoji: '🍊' },
  { ingredients: ['impasto_base', 'uova', 'miele'], result: 'panettone_classico', name: 'Panettone Classico', emoji: '🎄' },
];

const RARITY_MAP = {
  common: { min: 1, max: 3 },
  uncommon: { min: 4, max: 7 },
  rare: { min: 8, max: 11 },
  legendary: { min: 12, max: 15 },
};

function getIngredientWeight(ingredientId) {
  return BASE_INGREDIENT_WEIGHT[ingredientId] || 1;
}

function getRuleByResult(resultId) {
  return ALCHEMY_RULES.find(r => r.result === resultId) || null;
}

function isBaseIngredient(id) {
  return INGREDIENT_CATALOG.includes(id);
}

function isIntermediate(id) {
  return ALCHEMY_RULES.some(r => r.result === id);
}

function getIngredientStock(state, ingredientId) {
  return state.ingredients[ingredientId]?.stock || 0;
}

export function getCauldron() {
  return _cauldron;
}

export function getDiscoveredRecipes() {
  return _discoveredRecipes;
}

export function getLastAlchemyTime() {
  return _lastAlchemyTime;
}

export function getAlchemyCooldown() {
  return ALCHEMY_COOLDOWN;
}

export function addToCauldron(ingredientId) {
  if (!isBaseIngredient(ingredientId) && !isIntermediate(ingredientId)) return false;
  if (_cauldron.length >= ALCHEMY_CAULDRON_MAX) return false;
  _cauldron.push(ingredientId);
  return true;
}

export function removeFromCauldron(index) {
  if (index < 0 || index >= _cauldron.length) return null;
  return _cauldron.splice(index, 1)[0];
}

export function clearCauldron() {
  _cauldron = [];
}

export function getCauldronSize() {
  return _cauldron.length;
}

export function isCauldronFull() {
  return _cauldron.length >= ALCHEMY_CAULDRON_MAX;
}

export function isAlchemyReady() {
  const now = Date.now();
  return now - _lastAlchemyTime >= ALCHEMY_COOLDOWN;
}

export function getAlchemyTimeRemaining() {
  const now = Date.now();
  const elapsed = now - _lastAlchemyTime;
  return Math.max(0, ALCHEMY_COOLDOWN - elapsed);
}

export function discoverRecipe(resultId, recipeData) {
  if (!_discoveredRecipes[resultId]) {
    _discoveredRecipes[resultId] = {
      ...recipeData,
      discoveredAt: Date.now(),
      count: 0,
    };
    return true;
  }
  _discoveredRecipes[resultId].count++;
  return false;
}

export function isRecipeDiscovered(resultId) {
  return !!_discoveredRecipes[resultId];
}

export function getAllPossibleResults() {
  return ALCHEMY_RULES.map(r => ({
    result: r.result,
    name: r.name,
    emoji: r.emoji,
    ingredients: r.ingredients,
  }));
}

export function getAlchemyRules() {
  return ALCHEMY_RULES;
}

export function findMatchingRules(cauldron) {
  const results = [];
  for (const rule of ALCHEMY_RULES) {
    if (rule.ingredients.length !== cauldron.length) continue;
    const sortedRule = [...rule.ingredients].sort();
    const sortedCauldron = [...cauldron].sort();
    let match = true;
    for (let i = 0; i < sortedRule.length; i++) {
      if (sortedRule[i] !== sortedCauldron[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      results.push(rule);
    }
  }
  return results;
}

export function getRecipeRarity(ingredientList) {
  let rarityScore = 0;
  for (const ing of ingredientList) {
    rarityScore += getIngredientWeight(ing);
  }
  if (rarityScore <= 5) return 'common';
  if (rarityScore <= 10) return 'uncommon';
  if (rarityScore <= 15) return 'rare';
  return 'legendary';
}

export function getIngredientName(ingredientId) {
  const map = {
    grano: 'Grano', farina: 'Farina', acqua: 'Acqua', lievito: 'Lievito',
    sale: 'Sale', olio: 'Olio', zucchero: 'Zucchero', burro: 'Burro',
    uova: 'Uova', miele: 'Miele', cioccolato: 'Cioccolato', mandorle: 'Mandorle',
    romano: 'Pecorino', rosmarino: 'Rosmarino', scorza: 'Scorza Limone'
  };
  return map[ingredientId] || ingredientId;
}

export function getIngredientEmoji(ingredientId) {
  const map = {
    grano: '🌾', farina: '🥜', acqua: '💧', lievito: '🫧',
    sale: '🧂', olio: '🫒', zucchero: '🍬', burro: '🧈',
    uova: '🥚', miele: '🍯', cioccolato: '🍫', mandorle: '🌰',
    romano: '🧀', rosmarino: '🌿', scorza: '🍋'
  };
  return map[ingredientId] || '❓';
}

export function canAffordIngredients(state, ingredientList) {
  const stockMap = {};
  for (const ing of ingredientList) {
    stockMap[ing] = (stockMap[ing] || 0) + 1;
  }
  for (const [ing, qty] of Object.entries(stockMap)) {
    if ((state.ingredients[ing]?.stock || 0) < qty) return false;
  }
  return true;
}

export function deductIngredients(state, ingredientList) {
  const stockMap = {};
  for (const ing of ingredientList) {
    stockMap[ing] = (stockMap[ing] || 0) + 1;
  }
  for (const [ing, qty] of Object.entries(stockMap)) {
    state.ingredients[ing].stock -= qty;
  }
}

export function performAlchemy(state) {
  if (_cauldron.length < 2) return null;
  if (!isAlchemyReady()) return null;

  const matchingRules = findMatchingRules(_cauldron);
  if (matchingRules.length === 0) return null;

  const rule = matchingRules[0];
  const rarity = getRecipeRarity(_cauldron);
  const ruleRarity = getRecipeRarity(rule.ingredients);

  const finalRarity = rarity > ruleRarity ? rarity : ruleRarity;

  _lastAlchemyTime = Date.now();
  const cauldronCopy = [..._cauldron];
  clearCauldron();

  const discovered = discoverRecipe(rule.result, {
    name: rule.name,
    emoji: rule.emoji,
    ingredients: rule.ingredients,
    rarity: finalRarity,
  });

  return {
    rule,
    rarity: finalRarity,
    discovered,
    ingredients: cauldronCopy,
  };
}

export function resetAlchemy() {
  _cauldron = [];
  _lastAlchemyTime = 0;
}

export function loadAlchemyState(saved) {
  if (saved && saved._cauldron) _cauldron = saved._cauldron;
  if (saved && saved._lastAlchemyTime) _lastAlchemyTime = saved._lastAlchemyTime;
  if (saved && saved._discoveredRecipes) _discoveredRecipes = saved._discoveredRecipes;
}

export function getAlchemySaveState() {
  return { _cauldron, _lastAlchemyTime, _discoveredRecipes };
}

export function getCauldronDisplay() {
  return _cauldron.map(ing => ({
    id: ing,
    name: getIngredientName(ing),
    emoji: getIngredientEmoji(ing),
  }));
}
