export const WEATHER_TYPES = {
  SUNNY: { name: 'Sunny', emoji: '☀️', color: '#ffe066', damageBonus: 0.5, iceBonus: -0.5, healingBonus: 0 },
  MOONLIGHT: { name: 'Moonlight', emoji: '🌙', color: '#9b6dff', damageBonus: -0.5, iceBonus: 0.5, healingBonus: 0.3 },
  RAIN: { name: 'Rain', emoji: '🌧️', color: '#74b9ff', damageBonus: 0, iceBonus: 0, healingBonus: 0.5, speedBonus: 0.2 },
  STORM: { name: 'Storm', emoji: '⛈️', color: '#636e72', damageBonus: 0.3, iceBonus: 0.3, healingBonus: -0.3, randomEvent: true },
  FOG: { name: 'Fog', emoji: '🌫️', color: '#b2bec3', damageBonus: -0.2, iceBonus: 0, healingBonus: 0.2, dodgeBonus: 0.2 },
  DAWN: { name: 'Dawn', emoji: '🌅', color: '#ff7675', damageBonus: 0.2, iceBonus: 0, healingBonus: 0.3, speedBonus: 0.1 }
};

export const SEASONS = {
  SPRING: { name: 'Spring', emoji: '🌸', weatherWeight: { SUNNY: 0.4, RAIN: 0.4, FOG: 0.2 } },
  SUMMER: { name: 'Summer', emoji: '🔥', weatherWeight: { SUNNY: 0.6, STORM: 0.3, DAWN: 0.1 } },
  AUTUMN: { name: 'Autumn', emoji: '🍂', weatherWeight: { FOG: 0.4, RAIN: 0.3, DAWN: 0.3 } },
  WINTER: { name: 'Winter', emoji: '❄️', weatherWeight: { MOONLIGHT: 0.5, FOG: 0.3, RAIN: 0.2 } }
};

const TURNS_PER_CYCLE = 8;

export function getNextWeather(currentWeather, turn) {
  const season = getSeason(turn);
  const weights = SEASONS[season]?.weatherWeight || SEASONS.SPRING.weatherWeight;
  const roll = Math.random();
  let cumulative = 0;
  for (const [weather, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll <= cumulative) return weather;
  }
  return 'SUNNY';
}

export function getSeason(turn) {
  const cycleTurn = turn % (TURNS_PER_CYCLE * 4);
  if (cycleTurn < TURNS_PER_CYCLE) return 'SPRING';
  if (cycleTurn < TURNS_PER_CYCLE * 2) return 'SUMMER';
  if (cycleTurn < TURNS_PER_CYCLE * 3) return 'AUTUMN';
  return 'WINTER';
}

export function applyWeatherEffect(card, weather) {
  const w = WEATHER_TYPES[weather];
  if (!w) return { dmg: card.dmg, hp: card.hp, speed: card.speed };

  let dmg = card.dmg * (1 + w.damageBonus);
  let hp = card.hp;
  let speed = card.speed * (1 + (w.speedBonus || 0));

  // Ice cards get boosted at night
  if (w.iceBonus && card.ability && card.ability.includes('ice')) {
    dmg *= (1 + w.iceBonus);
  }

  // Healing cards get boosted in rain
  if (w.healingBonus && card.ability && (card.ability.includes('heal') || card.ability.includes('heal_radius'))) {
    hp = Math.floor(card.hp * (1 + w.healingBonus));
  }

  return { dmg: Math.max(1, Math.floor(dmg)), hp, speed: Math.max(0.1, speed) };
}

export function isWeatherActive(weather, turn) {
  const cycleTurn = turn % TURNS_PER_CYCLE;
  return cycleTurn === 0 ? weather : null;
}

export function getWeatherTransition(weather, turn) {
  const cycleTurn = turn % TURNS_PER_CYCLE;
  if (cycleTurn === 0) return { weather, text: `🌦️ Weather changes to ${WEATHER_TYPES[weather]?.name || weather}!` };
  const remaining = TURNS_PER_CYCLE - cycleTurn;
  return { weather, text: `⏳ ${remaining} turns until next weather...` };
}
