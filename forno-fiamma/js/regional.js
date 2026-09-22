const REGIONS = [
  {
    id: 'lazio', name: 'Lazio', emoji: '🏛️', capital: 'Roma',
    desc: 'Forno Romano — Pasta fresca e forni a legna',
    bonusIngredients: ['grano', 'rosmarino'],
    bonusAmounts: { grano: 0.4, rosmarino: 0.5 },
    bonusOvens: ['forno_legna'],
    bonusOvenSpeed: 0.15,
    regionalRecipes: ['pasta_fresca', 'pizza_romana', 'cacio_e_pepe', 'supplì'],
    color: '#e74c3c',
  },
  {
    id: 'campania', name: 'Campania', emoji: '🌋', capital: 'Napoli',
    desc: 'Forno Napoletano — Pizza e sfogliatella',
    bonusIngredients: ['farina', 'pomodoro', 'mozzarella'],
    bonusAmounts: { farina: 0.35, pomodoro: 0.5, mozzarella: 0.4 },
    bonusOvens: ['forno_napoletano'],
    bonusOvenSpeed: 0.2,
    regionalRecipes: ['pizza_margherita', 'sfogliatella', 'babà', 'pastiera'],
    color: '#f39c12',
  },
  {
    id: 'sicilia', name: 'Sicilia', emoji: '🌊', capital: 'Palermo',
    desc: 'Forno Siciliano — Cannoli e cassata',
    bonusIngredients: ['mandorle', 'ricotta', 'cannella'],
    bonusAmounts: { mandorle: 0.5, ricotta: 0.4, cannella: 0.3 },
    bonusOvens: ['forno_solare'],
    bonusOvenSpeed: 0.18,
    regionalRecipes: ['cannolo', 'cassata', 'arancino', 'crocetta'],
    color: '#9b59b6',
  },
  {
    id: 'toscana', name: 'Toscana', emoji: '🏇', capital: 'Firenze',
    desc: 'Forno Toscano — Bistecca e ribollita',
    bonusIngredients: ['cipolla', 'aglio', 'erbe'],
    bonusAmounts: { cipolla: 0.4, aglio: 0.5, erbe: 0.4 },
    bonusOvens: ['forno_marmo'],
    bonusOvenSpeed: 0.15,
    regionalRecipes: ['ribollita', 'pappa_al_pomodoro', 'cantucci', 'panzanella'],
    color: '#27ae60',
  },
  {
    id: 'veneto', name: 'Veneto', emoji: '🚤', capital: 'Venezia',
    desc: 'Forno Veneto — Risotto e tiramisù',
    bonusIngredients: ['riso', 'caffè', 'marsala'],
    bonusAmounts: { riso: 0.5, caffè: 0.4, marsala: 0.35 },
    bonusOvens: ['forno_forno'],
    bonusOvenSpeed: 0.17,
    regionalRecipes: ['risotto', 'tiramisù', 'baccalà', 'fegato_veneto'],
    color: '#2980b9',
  },
  {
    id: 'emilia_romagna', name: 'Emilia-Romagna', emoji: '🍝', capital: 'Bologna',
    desc: 'Forno Emiliano — Pasta all\'uovo e ragù',
    bonusIngredients: ['uova', 'parmigiano', 'burro'],
    bonusAmounts: { uova: 0.4, parmigiano: 0.5, burro: 0.4 },
    bonusOvens: ['forno_medievale'],
    bonusOvenSpeed: 0.18,
    regionalRecipes: ['tortellini', 'tagliatelle', 'ragù', 'piadina'],
    color: '#8e44ad',
  },
];

const REGIONAL_RECIPES = {
  pasta_fresca: { id: 'pasta_fresca', name: 'Pasta Fresca', emoji: '🥯', tier: 'common', bakeTime: 20, sellPrice: 12, xp: 10, ingredients: { farina: 3, uova: 2, olio: 1 } },
  pizza_romana: { id: 'pizza_romana', name: 'Pizza Romana', emoji: '🍕', tier: 'uncommon', bakeTime: 30, sellPrice: 20, xp: 18, ingredients: { farina: 4, acqua: 2, olio: 1, rosmarino: 1 } },
  cacio_e_pepe: { id: 'cacio_e_pepe', name: 'Cacio e Pepe', emoji: '🧀', tier: 'rare', bakeTime: 25, sellPrice: 25, xp: 22, ingredients: { farina: 3, parmigiano: 2, sale: 1 } },
  supplì: { id: 'supplì', name: 'Supplì', emoji: '🥘', tier: 'common', bakeTime: 15, sellPrice: 10, xp: 8, ingredients: { riso: 2, mozzarella: 1, farina: 2 } },
  pizza_margherita: { id: 'pizza_margherita', name: 'Pizza Margherita', emoji: '🇮🇹', tier: 'legendary', bakeTime: 45, sellPrice: 40, xp: 35, ingredients: { farina: 5, acqua: 3, pomodoro: 2, mozzarella: 2, basilico: 1 } },
  sfogliatella: { id: 'sfogliatella', name: 'Sfogliatella', emoji: '🥐', tier: 'rare', bakeTime: 50, sellPrice: 30, xp: 28, ingredients: { farina: 4, burro: 3, zucchero: 2, mandorle: 1 } },
  babà: { id: 'babà', name: 'Babà', emoji: '🍰', tier: 'rare', bakeTime: 40, sellPrice: 28, xp: 25, ingredients: { farina: 3, uova: 2, zucchero: 2, zucchero: 1 } },
  pastiera: { id: 'pastiera', name: 'Pastiera', emoji: '🥧', tier: 'legendary', bakeTime: 60, sellPrice: 35, xp: 30, ingredients: { farina: 4, mozzarella: 2, uova: 2, grano: 2, zucchero: 2 } },
  cannolo: { id: 'cannolo', name: 'Cannolo', emoji: '🔮', tier: 'rare', bakeTime: 35, sellPrice: 32, xp: 30, ingredients: { farina: 3, mozzarella: 2, zucchero: 2, mandorle: 1, cannella: 1 } },
  cassata: { id: 'cassata', name: 'Cassata', emoji: '🎂', tier: 'legendary', bakeTime: 70, sellPrice: 45, xp: 40, ingredients: { farina: 4, mozzarella: 3, zucchero: 3, mandorle: 2, cioccolato: 1 } },
  arancino: { id: 'arancino', name: 'Arancino', emoji: '🧆', tier: 'common', bakeTime: 20, sellPrice: 12, xp: 10, ingredients: { riso: 3, mozzarella: 1, farina: 2 } },
  crocetta: { id: 'crocetta', name: 'Crocetta', emoji: '🌺', tier: 'uncommon', bakeTime: 25, sellPrice: 18, xp: 15, ingredients: { farina: 2, mandorle: 1, zucchero: 1, rosmarino: 1 } },
  ribollita: { id: 'ribollita', name: 'Ribollita', emoji: '🍲', tier: 'uncommon', bakeTime: 45, sellPrice: 15, xp: 14, ingredients: { farina: 3, rosmarino: 1, rosmarino: 1, farina: 1 } },
  pappa_al_pomodoro: { id: 'pappa_al_pomodoro', name: 'Pappa al Pomodoro', emoji: '🍅', tier: 'common', bakeTime: 30, sellPrice: 14, xp: 12, ingredients: { farina: 2, pomodoro: 2, rosmarino: 1, olio: 1 } },
  cantucci: { id: 'cantucci', name: 'Cantucci', emoji: '🍪', tier: 'common', bakeTime: 30, sellPrice: 16, xp: 14, ingredients: { farina: 3, zucchero: 2, uova: 1, mandorle: 1 } },
  panzanella: { id: 'panzanella', name: 'Panzanella', emoji: '🥗', tier: 'uncommon', bakeTime: 15, sellPrice: 14, xp: 12, ingredients: { farina: 2, pomodoro: 1, rosmarino: 1, basilico: 1 } },
  risotto: { id: 'risotto', name: 'Risotto', emoji: '🍚', tier: 'uncommon', bakeTime: 35, sellPrice: 22, xp: 20, ingredients: { riso: 3, burro: 1, parmigiano: 1, rosmarino: 1 } },
  tiramisù: { id: 'tiramisù', name: 'Tiramisù', emoji: '☕', tier: 'rare', bakeTime: 40, sellPrice: 30, xp: 30, ingredients: { farina: 1, caffè: 2, burro: 2, uova: 2, zucchero: 2 } },
  baccalà: { id: 'baccalà', name: 'Baccalà', emoji: '🐟', tier: 'uncommon', bakeTime: 40, sellPrice: 20, xp: 18, ingredients: { sale: 2, olio: 1, rosmarino: 1 } },
  fegato_veneto: { id: 'fegato_veneto', name: 'Fegato alla Veneziana', emoji: '🧅', tier: 'uncommon', bakeTime: 25, sellPrice: 18, xp: 15, ingredients: { carne: 2, rosmarino: 2, olio: 1 } },
  tortellini: { id: 'tortellini', name: 'Tortellini', emoji: '🥟', tier: 'rare', bakeTime: 30, sellPrice: 25, xp: 25, ingredients: { farina: 3, uova: 2, parmigiano: 1, carne: 1 } },
  tagliatelle: { id: 'tagliatelle', name: 'Tagliatelle', emoji: '🍝', tier: 'common', bakeTime: 20, sellPrice: 14, xp: 12, ingredients: { farina: 3, uova: 1 } },
  ragù: { id: 'ragù', name: 'Ragù', emoji: '🍅', tier: 'uncommon', bakeTime: 60, sellPrice: 20, xp: 22, ingredients: { carne: 2, pomodoro: 2, rosmarino: 1, rosmarino: 1 } },
  piadina: { id: 'piadina', name: 'Piadina', emoji: '🫓', tier: 'common', bakeTime: 10, sellPrice: 8, xp: 6, ingredients: { farina: 2, olio: 1, sale: 1 } },
};

const GEO_LOOKUP = {
  '41.9028,12.4964': 'lazio',
  '40.8518,14.2681': 'campania',
  '38.1157,13.3613': 'sicilia',
  '43.7696,11.2558': 'toscana',
  '45.4408,12.3155': 'veneto',
  '44.4949,11.3426': 'emilia_romagna',
};

let _currentRegion = null;
let _detectedRegion = null;
let _regionalBonuses = {};
let _recipesCooked = {};
let _userSelectedRegion = null;
let _geolocationAttempted = false;

function detectRegionFromGeolocation() {
  if (!_geolocationAttempted) return null;
  const lat = parseFloat(navigator.geolocation?.latitude || '0');
  const lng = parseFloat(navigator.geolocation?.longitude || '0');
  if (lat === 0 && lng === 0) return null;

  const coords = lat.toFixed(4) + ',' + lng.toFixed(4);
  return GEO_LOOKUP[coords] || null;
}

function detectRegionFromTimezone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const europeRoma = 'Europe/Rome';
  if (tz === europeRoma) return 'lazio';
  const europeNaples = 'Europe/Naples';
  if (tz === europeNaples) return 'campania';
  const europeRome = 'Europe/Rome';
  if (tz === europeRome) return 'lazio';
  return null;
}

export function initRegional() {
  _currentRegion = null;
  _detectedRegion = null;
  _regionalBonuses = {};
  _recipesCooked = {};
  _userSelectedRegion = null;
  _geolocationAttempted = false;
}

export function detectRegion() {
  _geolocationAttempted = true;
  const geoRegion = detectRegionFromGeolocation();
  if (geoRegion) {
    _detectedRegion = geoRegion;
    return geoRegion;
  }
  const tzRegion = detectRegionFromTimezone();
  if (tzRegion) {
    _detectedRegion = tzRegion;
    return tzRegion;
  }
  return null;
}

export function setUserRegion(regionId) {
  if (!REGIONS.find(r => r.id === regionId)) return false;
  _userSelectedRegion = regionId;
  _currentRegion = regionId;
  _regionalBonuses = {};
  const region = REGIONS.find(r => r.id === regionId);
  if (region) {
    for (const ing of region.bonusIngredients) {
      _regionalBonuses[ing] = region.bonusAmounts[ing];
    }
  }
  return true;
}

export function getCurrentRegion() {
  if (_userSelectedRegion) return REGIONS.find(r => r.id === _userSelectedRegion) || null;
  if (_detectedRegion) return REGIONS.find(r => r.id === _detectedRegion) || null;
  return null;
}

export function getRegionById(id) {
  return REGIONS.find(r => r.id === id) || null;
}

export function getAllRegions() {
  return REGIONS;
}

export function getRegionalRecipe(recipeId) {
  return REGIONAL_RECIPES[recipeId] || null;
}

export function getAllRegionalRecipes() {
  return REGIONAL_RECIPES;
}

export function getRegionalRecipesForRegion(regionId) {
  const region = getRegionById(regionId);
  if (!region) return [];
  return region.regionalRecipes.map(id => REGIONAL_RECIPES[id]).filter(Boolean);
}

export function getRegionalBonus(ingredientId) {
  return _regionalBonuses[ingredientId] || 0;
}

export function getRegionalBonuses() {
  return _regionalBonuses;
}

export function getActiveRegion() {
  if (_userSelectedRegion) {
    return REGIONS.find(r => r.id === _userSelectedRegion) || null;
  }
  return null;
}

export function isRecipeRegional(recipeId) {
  return recipeId in REGIONAL_RECIPES;
}

export function getRegionalRecipeCount() {
  return Object.keys(REGIONAL_RECIPES).length;
}

export function recordRegionalBake(regionId, recipeId) {
  if (!_recipesCooked[regionId]) _recipesCooked[regionId] = {};
  _recipesCooked[regionId][recipeId] = (_recipesCooked[regionId][recipeId] || 0) + 1;
}

export function getRegionalBakes(regionId) {
  return _recipesCooked[regionId] || {};
}

export function getUserRegion() {
  return _userSelectedRegion;
}

export function getDetectedRegion() {
  return _detectedRegion;
}

export function getGeolocationAttempted() {
  return _geolocationAttempted;
}

export function getRegionColor(regionId) {
  const region = getRegionById(regionId);
  return region?.color || '#95a5a6';
}

export function getIngredientBonus(ingredientId, baseAmount) {
  const bonus = getRegionalBonus(ingredientId);
  return baseAmount * (1 + bonus);
}

export function loadRegionalState(saved) {
  if (!saved) return;
  if (saved._currentRegion) _currentRegion = saved._currentRegion;
  if (saved._detectedRegion) _detectedRegion = saved._detectedRegion;
  if (saved._regionalBonuses) _regionalBonuses = saved._regionalBonuses;
  if (saved._recipesCooked) _recipesCooked = saved._recipesCooked;
  if (saved._userSelectedRegion) _userSelectedRegion = saved._userSelectedRegion;
  if (saved._geolocationAttempted !== undefined) _geolocationAttempted = saved._geolocationAttempted;
}

export function getRegionalSaveState() {
  return { _currentRegion, _detectedRegion, _regionalBonuses, _recipesCooked, _userSelectedRegion, _geolocationAttempted };
}

export function resetRegional() {
  initRegional();
}

export function getRegionSummary() {
  const region = getCurrentRegion();
  const recipes = getRegionalRecipesForRegion(region?.id);
  const baked = _recipesCooked[region?.id] || {};
  return {
    region,
    recipeCount: recipes.length,
    recipesBaked: Object.keys(baked).length,
    totalBakes: Object.values(baked).reduce((a, b) => a + b, 0),
    bonuses: _regionalBonuses,
  };
}
