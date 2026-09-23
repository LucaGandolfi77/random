export const SAVE_VERSION = 1;
export const STORAGE_KEY = 'caffe-sospeso:save';

export const ORIGINS = [
  { id: 'arabica', nameKey: 'origin_arabica' },
  { id: 'robusta', nameKey: 'origin_robusta' },
  { id: 'decaf', nameKey: 'origin_decaf' },
];
export const MILKS = [
  { id: 'none', nameKey: 'milk_none' },
  { id: 'milk', nameKey: 'milk_milk' },
  { id: 'foam', nameKey: 'milk_foam' },
];
export const SWEETS = [
  { id: 'none', nameKey: 'sweet_none' },
  { id: 'sugar', nameKey: 'sweet_sugar' },
  { id: 'honey', nameKey: 'sweet_honey' },
];

export function recipeKey(originId, milkId, sweetId) {
  return `${originId}-${milkId}-${sweetId}`;
}
export function recipeLabel(key) {
  const [o, m, s] = key.split('-');
  const oName = ORIGINS.find((x) => x.id === o)?.nameKey ?? o;
  const mName = MILKS.find((x) => x.id === m)?.nameKey ?? m;
  const sName = SWEETS.find((x) => x.id === s)?.nameKey ?? s;
  return `${oName} · ${mName} · ${sName}`;
}

export const AROMAS = [
  { id: 'cioccolato', nameKey: 'aroma_cioccolato', recipe: 'robusta-milk-sugar' },
  { id: 'nocciola', nameKey: 'aroma_nocciola', recipe: 'arabica-milk-none' },
  { id: 'caramello', nameKey: 'aroma_caramello', recipe: 'robusta-foam-sugar' },
  { id: 'arancia', nameKey: 'aroma_arancia', recipe: 'arabica-none-honey' },
  { id: 'cannella', nameKey: 'aroma_cannella', recipe: 'decaf-milk-sugar' },
  { id: 'vaniglia', nameKey: 'aroma_vaniglia', recipe: 'arabica-foam-none' },
  { id: 'miele', nameKey: 'aroma_miele', recipe: 'decaf-none-honey' },
  { id: 'bosco', nameKey: 'aroma_bosco', recipe: 'robusta-none-sugar' },
];

export const CUSTOMERS = [
  { id: 'luca', nameKey: 'customer_luca' },
  { id: 'maria', nameKey: 'customer_maria' },
  { id: 'nonna', nameKey: 'customer_nonna' },
  { id: 'tommaso', nameKey: 'customer_tommaso' },
  { id: 'elena', nameKey: 'customer_elena' },
  { id: 'marco', nameKey: 'customer_marco' },
];

export const TIME_PHASES = [
  { id: 'alba', nameKey: 'phase_alba', menu: ['arancia', 'miele'], moodBias: 0.2 },
  { id: 'giorno', nameKey: 'phase_giorno', menu: ['nocciola', 'cioccolato', 'vaniglia'], moodBias: 0.0 },
  { id: 'tramonto', nameKey: 'phase_tramonto', menu: ['caramello', 'cioccolato'], moodBias: -0.1 },
  { id: 'sera', nameKey: 'phase_sera', menu: ['cannella', 'miele', 'bosco'], moodBias: -0.2 },
];

export const WEATHERS = [
  { id: 'sereno', nameKey: 'weather_sereno' },
  { id: 'pioggia', nameKey: 'weather_pioggia' },
  { id: 'nebbia', nameKey: 'weather_nebbia' },
  { id: 'vento', nameKey: 'weather_vento' },
];

export const EVENTS = [
  { id: 'pioggia', nameKey: 'event_pioggia', kind: 'weather' },
  { id: 'gatto', nameKey: 'event_gatto', kind: 'bonus' },
  { id: 'musica', nameKey: 'event_musica', kind: 'bonus' },
  { id: 'sacco', nameKey: 'event_sacco', kind: 'bonus' },
];

export const ACHIEVEMENTS = [
  { id: 'primi-dieci', nameKey: 'ach_primi_dieci', descKey: 'ach_primi_dieci_desc', check: (s) => s.stats.served >= 10 },
  { id: 'cuore-grande', nameKey: 'ach_cuore_grande', descKey: 'ach_cuore_grande_desc', check: (s) => s.sospesiLeft >= 5 },
  { id: 'collezionista', nameKey: 'ach_collezionista', descKey: 'ach_collezionista_desc', check: (s) => Object.values(s.aromi).filter(Boolean).length >= 6 },
];

export const UNLOCKABLES = [
  { id: 'angolo-piante', nameKey: 'unlock_angolo_piante', cost: 12, provides: 'plant' },
  { id: 'giradischi', nameKey: 'unlock_giradischi', cost: 18, provides: 'music' },
  { id: 'lavagna-sospeso', nameKey: 'unlock_lavagna_sospeso', cost: 10, provides: 'sospeso' },
];

export const DECORS = [
  { id: 'pianta', nameKey: 'decor_pianta' },
  { id: 'vaso', nameKey: 'decor_vaso' },
  { id: 'quadro', nameKey: 'decor_quadro' },
];

export const MESSAGES = [
  'il profumo del caff\u00e8 appena macinato',
  'una tazza calda per chi c\'\u00e8 sempre',
  'il bar \u00e8 aperto, siediti pure',
  'i chicchi son maturati all\'ombra',
  'la piazza sorride, il caff\u00e8 \u00e8 pronto',
];

export const LEVELS = [
  { level: 1, served: 0 },
  { level: 2, served: 8 },
  { level: 3, served: 20 },
  { level: 4, served: 40 },
  { level: 5, served: 70 },
];

export const LEVEL_REWARD_TOKENS = [5, 8, 12, 18];
export const MAX_BEANS = 20;
export const BEAN_REGEN_BASE = 1;
export const BEAN_REGEN_WEATHER = { sereno: 1, pioggia: 2, nebbia: 1, vento: 0 };

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;
export const MAX_AFFINITY = 5;
export const SERVE_TOKEN_BASE = 2;
export const SERVE_TOKEN_BONUS = 3;
export const SERVE_TOKEN_PERFECT = 6;
export const SOGGI_TOKEN_COST = 2;
export const SOGGI_BONUS = 3;
export const SOGGI_AFFINITY_BONUS = 2;
export const PLANT_TOKEN_COST = 1;
export const DECOR_TOKEN_COST = 20;
export const AROMA_DISCOVER_CHANCE = 0.6;

export const PREFERS_REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
