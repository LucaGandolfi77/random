const WEATHER_TYPES = ['sunny', 'rainy', 'snowy', 'stormy', 'aurora'];

const WEATHER_EFFECTS = {
  sunny: {
    name: 'Soleggiato',
    emoji: '☀️',
    color: '#f1c40f',
    ovenBonus: { forno_solare: 0.2 },
    ingredientMult: { acqua: 1.5, grano: 1.3 },
    desc: 'Il forno solare cuoce il 20% più veloce',
  },
  rainy: {
    name: 'Piovoso',
    emoji: '🌧️',
    color: '#3498db',
    ovenPenalty: { forno_legna: -0.15 },
    ingredientMult: { acqua: 2.0 },
    desc: 'L\'acqua raccoglie il doppio',
  },
  snowy: {
    name: 'Nevicata',
    emoji: '❄️',
    color: '#ecf0f1',
    ovenPenalty: { forno_cotto: -0.1 },
    ingredientMult: { lievito: 1.4, farina: 1.3 },
    specialRecipe: 'pane_neve',
    desc: 'Pane speciale neve disponibile!',
  },
  stormy: {
    name: 'Tempesta',
    emoji: '⛈️',
    color: '#2c3e50',
    ovenRisk: true,
    ingredientMult: { sale: 1.5 },
    desc: 'Rischio che il forno si spenga!',
  },
  aurora: {
    name: 'Aurora Boreale',
    emoji: '🌌',
    color: '#9b59b6',
    legendaryUnlock: true,
    desc: 'Ricette leggendarie sbloccate per 1 ora!',
  },
};

let _currentWeather = null;
let _weatherSince = 0;
const WEATHER_DURATION = 6 * 3600 * 1000;

function getWeatherSeed() {
  const now = Date.now();
  const day = Math.floor(now / 86400000);
  return day;
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function getCurrentWeather() {
  const now = Date.now();
  const day = getWeatherSeed();

  if (_currentWeather && (now - _weatherSince) < WEATHER_DURATION) {
    return _currentWeather;
  }

  const rand = seededRandom(day);
  let weather;

  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) {
    weather = 'sunny';
  } else if (rand < 0.25) {
    weather = 'sunny';
  } else if (rand < 0.45) {
    weather = 'rainy';
  } else if (rand < 0.60) {
    weather = 'snowy';
  } else if (rand < 0.80) {
    weather = 'stormy';
  } else {
    weather = 'aurora';
  }

  _currentWeather = weather;
  _weatherSince = now;
  return weather;
}

export function getWeatherData() {
  const weather = getCurrentWeather();
  return WEATHER_EFFECTS[weather];
}

export function getWeatherType() {
  return getCurrentWeather();
}

export function isWeatherRisk() {
  return WEATHER_EFFECTS[getCurrentWeather()].ovenRisk || false;
}

export function getWeatherEmoji() {
  return WEATHER_EFFECTS[getCurrentWeather()].emoji;
}

export function getWeatherColor() {
  return WEATHER_EFFECTS[getCurrentWeather()].color;
}

export function getWeatherBonus(ovenType) {
  const data = WEATHER_EFFECTS[getCurrentWeather()];
  return data.ovenBonus?.[ovenType] || 0;
}

export function getWeatherIngredientMult(ingredientId) {
  const data = WEATHER_EFFECTS[getCurrentWeather()];
  return data.ingredientMult?.[ingredientId] || 1;
}

export function hasLegendaryUnlock() {
  return WEATHER_EFFECTS[getCurrentWeather()].legendaryUnlock || false;
}

export function hasSpecialRecipe() {
  return WEATHER_EFFECTS[getCurrentWeather()].specialRecipe || null;
}

export function getWeatherDesc() {
  return WEATHER_EFFECTS[getCurrentWeather()].desc;
}

export function getWeatherHoursRemaining() {
  const now = Date.now();
  const elapsed = now - _weatherSince;
  return Math.max(0, Math.ceil((WEATHER_DURATION - elapsed) / 3600000));
}
