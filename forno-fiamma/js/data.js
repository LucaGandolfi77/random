export const INGREDIENTS = {
  grano:       { name: 'Grano',       emoji: '🌾', regenTime: 1800, maxStock: 30 },
  farina:      { name: 'Farina',      emoji: '🥜', regenTime: 2400, maxStock: 25 },
  acqua:       { name: 'Acqua',       emoji: '💧', regenTime: 900,  maxStock: 40 },
  lievito:     { name: 'Lievito',     emoji: '🫧', regenTime: 3600, maxStock: 15 },
  sale:        { name: 'Sale',        emoji: '🧂', regenTime: 5400, maxStock: 20 },
  olio:        { name: 'Olio',        emoji: '🫒', regenTime: 4800, maxStock: 15 },
  zucchero:    { name: 'Zucchero',    emoji: '🍬', regenTime: 3000, maxStock: 20 },
  burro:       { name: 'Burro',       emoji: '🧈', regenTime: 3600, maxStock: 12 },
  uova:        { name: 'Uova',        emoji: '🥚', regenTime: 2700, maxStock: 18 },
  miele:       { name: 'Miele',       emoji: '🍯', regenTime: 7200, maxStock: 8  },
  cioccolato:  { name: 'Cioccolato',  emoji: '🍫', regenTime: 5400, maxStock: 10 },
  mandorle:    { name: 'Mandorle',    emoji: '🌰', regenTime: 6000, maxStock: 10 },
  romano:      { name: 'Pecorino',    emoji: '🧀', regenTime: 4200, maxStock: 10 },
  rosmarino:   { name: 'Rosmarino',   emoji: '🌿', regenTime: 2100, maxStock: 15 },
  scorza:      { name: 'Scorza Limone', emoji: '🍋', regenTime: 5400, maxStock: 8 },
  mattoni:     { name: 'Mattoni',     emoji: '🧱', regenTime: 7200, maxStock: 15 },
  legno:       { name: 'Legno',       emoji: '🪵', regenTime: 5400, maxStock: 20 },
  pietra:      { name: 'Pietra',      emoji: '🪨', regenTime: 10800, maxStock: 12 },
  stoffa:      { name: 'Stoffa',      emoji: '🧵', regenTime: 9000, maxStock: 10 },
  pomodoro:    { name: 'Pomodoro',    emoji: '🍅', regenTime: 1800, maxStock: 15 },
  mozzarella:  { name: 'Mozzarella',  emoji: '🧀', regenTime: 3600, maxStock: 10 },
  parmigiano:  { name: 'Parmigiano', emoji: '🧀', regenTime: 7200, maxStock: 8  },
  caffè:       { name: 'Caffè',       emoji: '☕', regenTime: 3600, maxStock: 12 },
  cannella:    { name: 'Cannella',    emoji: '🌿', regenTime: 5400, maxStock: 8  },
  basilico:    { name: 'Basilico',    emoji: '🌿', regenTime: 2100, maxStock: 10 },
  riso:        { name: 'Riso',        emoji: '🍚', regenTime: 3600, maxStock: 15 },
  carne:       { name: 'Carne',       emoji: '🥩', regenTime: 5400, maxStock: 8  },
  pecorino:    { name: 'Pecorino',    emoji: '🧀', regenTime: 4200, maxStock: 10 },
};

export const RECIPES = [
  // === COMMON (livello 1+) ===
  { id: 'pane_base',      name: 'Pane Base',        emoji: '🍞', tier: 'common',   level: 1,  bakeTime: 30,  sellPrice: 8,   xp: 5,   ingredients: { farina: 3, acqua: 2, lievito: 1 } },
  { id: 'pane_sacca',     name: 'Pane Sacca',       emoji: '🫓', tier: 'common',   level: 1,  bakeTime: 35,  sellPrice: 10,  xp: 6,   ingredients: { farina: 4, acqua: 2, sale: 1 } },
  { id: 'focaccia',       name: 'Focaccia',         emoji: '🫓', tier: 'common',   level: 3,  bakeTime: 40,  sellPrice: 12,  xp: 8,   ingredients: { farina: 3, acqua: 2, olio: 2, rosmarino: 1 } },
  { id: 'grissini',       name: 'Grissini',         emoji: '🥖', tier: 'common',   level: 3,  bakeTime: 25,  sellPrice: 7,   xp: 4,   ingredients: { farina: 3, olio: 1, sale: 1 } },
  { id: 'pane橄榄',       name: 'Pane alle Olive',   emoji: '🫒', tier: 'common',   level: 5,  bakeTime: 45,  sellPrice: 14,  xp: 9,   ingredients: { farina: 4, acqua: 2, olio: 2, sale: 1 } },

  // === UNCOMMON (livello 5+) ===
  { id: 'ciabatta',       name: 'Ciabatta',         emoji: '🍞', tier: 'uncommon', level: 5,  bakeTime: 50,  sellPrice: 16,  xp: 10,  ingredients: { farina: 5, acqua: 3, lievito: 2, olio: 1 } },
  { id: 'pane_segale',    name: 'Pane Segale',      emoji: '🍞', tier: 'uncommon', level: 7,  bakeTime: 55,  sellPrice: 18,  xp: 12,  ingredients: { farina: 5, acqua: 3, lievito: 1, miele: 1 } },
  { id: 'torta_mela',     name: 'Torta di Mele',    emoji: '🥧', tier: 'uncommon', level: 8,  bakeTime: 60,  sellPrice: 22,  xp: 15,  ingredients: { farina: 4, uova: 3, zucchero: 3, burro: 2 } },
  { id: 'cornetti',       name: 'Cornetti',         emoji: '🥐', tier: 'uncommon', level: 8,  bakeTime: 55,  sellPrice: 20,  xp: 14,  ingredients: { farina: 4, burro: 3, uova: 2, zucchero: 1 } },
  { id: 'pane_aglio',     name: 'Pane all\'Aglio',   emoji: '🧄', tier: 'uncommon', level: 10, bakeTime: 45,  sellPrice: 18,  xp: 11,  ingredients: { farina: 4, acqua: 2, olio: 2, rosmarino: 2 } },

  // === RARE (livello 12+) ===
  { id: 'brioche',        name: 'Brioche',          emoji: '🥐', tier: 'rare',     level: 12, bakeTime: 70,  sellPrice: 28,  xp: 20,  ingredients: { farina: 5, burro: 4, uova: 3, zucchero: 2, lievito: 1 } },
  { id: 'focaccia_reale', name: 'Focaccia Reale',   emoji: '👑', tier: 'rare',     level: 14, bakeTime: 75,  sellPrice: 32,  xp: 22,  ingredients: { farina: 5, miele: 3, mandorle: 2, burro: 2 } },
  { id: 'pizza_bianca',   name: 'Pizza Bianca',     emoji: '🍕', tier: 'rare',     level: 14, bakeTime: 40,  sellPrice: 25,  xp: 18,  ingredients: { farina: 5, acqua: 3, olio: 2, romano: 3, rosmarino: 1 } },
  { id: 'torta_nocciola', name: 'Torta Nocciola',   emoji: '🍫', tier: 'rare',     level: 16, bakeTime: 80,  sellPrice: 35,  xp: 25,  ingredients: { farina: 4, cioccolato: 4, uova: 3, burro: 3, zucchero: 2 } },

  // === EPIC (livello 20+) ===
  { id: 'panettone',      name: 'Panettone',        emoji: '🎄', tier: 'epic',     level: 20, bakeTime: 120, sellPrice: 55,  xp: 40,  ingredients: { farina: 6, burro: 5, uova: 4, zucchero: 4, miele: 2, scorza: 2 } },
  { id: 'colomba',        name: 'Colomba Pasquale',  emoji: '🕊️', tier: 'epic',     level: 22, bakeTime: 110, sellPrice: 50,  xp: 38,  ingredients: { farina: 6, burro: 4, uova: 4, zucchero: 3, mandorle: 3 } },
  { id: 'torta_3ciocco',  name: 'Torta 3 Cioccolati', emoji: '🎂', tier: 'epic', level: 24, bakeTime: 100, sellPrice: 60,  xp: 45,  ingredients: { farina: 5, cioccolato: 6, uova: 4, burro: 4, zucchero: 3 } },

  // === LEGENDARY (livello 30+) ===
  { id: 'paneDivino',     name: 'Pane Divino',      emoji: '✨', tier: 'legendary', level: 30, bakeTime: 180, sellPrice: 100, xp: 80,  ingredients: { farina: 8, acqua: 4, lievito: 3, miele: 4, mandorle: 4, scorza: 3 } },
];

export const OVENS = [
  { id: 'forno_cotto',      name: 'Forno di Cotto',       emoji: '🫕', tier: 'common',   speed: 1.0, bonusXp: 0,   cost: 0 },
  { id: 'forno_legna',      name: 'Forno a Legna',        emoji: '🔥', tier: 'common',   speed: 1.1, bonusXp: 1,   cost: 80 },
  { id: 'forno_pietra',     name: 'Forno a Pietra',       emoji: '🪨', tier: 'uncommon', speed: 1.2, bonusXp: 2,   cost: 200 },
  { id: 'forno_napoletano', name: 'Forno Napoletano',     emoji: '🌋', tier: 'rare',     speed: 1.35, bonusXp: 3,  cost: 450 },
  { id: 'forno_medievale',  name: 'Forno Medievale',      emoji: '🏰', tier: 'rare',     speed: 1.3, bonusXp: 5,   cost: 400 },
  { id: 'forno_marmo',      name: 'Forno di Marmo',       emoji: '🏛️', tier: 'rare',     speed: 1.4, bonusXp: 4,   cost: 500 },
  { id: 'forno_biscotti',   name: 'Forno Biscotti',       emoji: '🍪', tier: 'uncommon', speed: 1.15, bonusXp: 3,  cost: 250 },
  { id: 'forno_forno',      name: 'Il Forno dei Forni',   emoji: '⭐', tier: 'epic',     speed: 1.6, bonusXp: 6,   cost: 800 },
  { id: 'forno_solare',     name: 'Forno Solare',         emoji: '☀️', tier: 'epic',     speed: 1.7, bonusXp: 8,   cost: 1000 },
  { id: 'forno_volcanico',  name: 'Forno Vulcanico',      emoji: '💎', tier: 'legendary', speed: 2.0, bonusXp: 10, cost: 2000 },
];

export const HELPERS = [
  { id: 'gattino',      name: 'Gattino Impastatore',  emoji: '🐱', tier: 'uncommon', effect: 'speed',     value: 0.15, desc: '+15% velocità cottura' },
  { id: 'volpe',        name: 'Volpe Infarinata',     emoji: '🦊', tier: 'uncommon', effect: 'flour',     value: 0.20, desc: '+20% fiocchi di farina' },
  { id: 'coniglio',     name: 'Coniglio Panettiere',  emoji: '🐰', tier: 'rare',     effect: 'slot',      value: 1,    desc: '+1 slot forno' },
  { id: 'gallina',      name: 'Gallina Ovaiola',      emoji: '🐔', tier: 'common',   effect: 'egg_regen', value: 0.25, desc: '+25% rigenerazione uova' },
  { id: 'cane',         name: 'Cane da Guardia',      emoji: '🐕', tier: 'rare',     effect: 'protect',   value: 1,    desc: 'Protegge i pani' },
  { id: 'owl',          name: 'Owl Pasticciere',      emoji: '🦉', tier: 'epic',     effect: 'unlock',    value: -2,   desc: 'Ricette rare -2 livelli' },
  { id: 'maiale',       name: 'Maialino Tavola',      emoji: '🐷', tier: 'uncommon', effect: 'sell',      value: 0.10, desc: '+10% prezzo vendita' },
  { id: 'farfalla',     name: 'Farfalla Dolce',       emoji: '🦋', tier: 'legendary', effect: 'gacha',    value: 0.15, desc: '+15% chance raro gacha' },
];

export const GACHA_COSTS = { single: 10, multi: 30, guaranteed: 50 };
export const GACHA_PITY = 20;

export const UPGRADES = [
  { id: 'oven_slot_1',   name: 'Slot Forno Extra',    emoji: '🫕', cost: 150,  effect: 'slot',  value: 1, desc: '+1 forno disponibile' },
  { id: 'oven_slot_2',   name: 'Slot Forno Extra II', emoji: '🫕', cost: 400,  effect: 'slot',  value: 1, desc: '+1 forno disponibile' },
  { id: 'oven_slot_3',   name: 'Slot Forno Extra III',emoji: '🫕', cost: 800,  effect: 'slot',  value: 1, desc: '+1 forno disponibile' },
  { id: 'knead_master',  name: 'Maestro Impastatore', emoji: '🫳', cost: 300,  effect: 'knead', value: 0.3, desc: '+30% fiocchi da impasto perfetto' },
  { id: 'quick_bake',    name: 'Cottura Veloce',      emoji: '⚡', cost: 500,  effect: 'speed', value: 0.1, desc: '+10% velocità tutti i forni' },
  { id: 'field_wheat',   name: 'Campo Grano',         emoji: '🌾', cost: 200,  effect: 'field_grano', value: 0.3, desc: '+30% rigenerazione grano' },
  { id: 'field_flour',   name: 'Mulino',              emoji: '⚙️', cost: 350,  effect: 'field_farina', value: 0.3, desc: '+30% rigenerazione farina' },
  { id: 'gacha_discount',name: 'Sconto Gacha',        emoji: '🎰', cost: 600,  effect: 'gacha_discount', value: 2, desc: '-2 fiocchi per tiro singolo' },
];

export const VILLAGE_BUILDINGS = {
  forno:     { name: 'Forno',          emoji: '🔥', width: 2, height: 2 },
  bottega:   { name: 'Bottega',        emoji: '🏪', width: 2, height: 2 },
  campo:     { name: 'Campo',          emoji: '🌾', width: 3, height: 2 },
  mulino:    { name: 'Mulino',         emoji: '⚙️', width: 2, height: 3 },
  deposito:  { name: 'Deposito',       emoji: '📦', width: 2, height: 1 },
  decorazione:{ name: 'Decorazione',   emoji: '🌸', width: 1, height: 1 },
};

export const MUTATION_TYPES = {
  texture: { name: 'Texture', options: ['Crostoso', 'Morbido', 'Gommoso', 'Aereo', 'Compatto'], emojis: ['🔥', '🍞', '🍬', '☁️', '🪨'] },
  flavor:  { name: 'Sapore',  options: ['Dolce', 'Salato', 'Amaro', 'Umami', 'Piccante'], emojis: ['🍯', '🧂', '☕', '🫒', '🌶️'] },
  color:   { name: 'Colore',  options: ['Dorato', 'Rosa', 'Blu', 'Verde', 'Nero'], emojis: ['✨', '🌸', '💎', '🌿', '⚫'] },
  scent:   { name: 'Profumo', options: ['Vaniglia', 'Rosmarino', 'Caffè', 'Fiori', 'Cocco'], emojis: ['🌸', '🌿', '☕', '🦋', '🥥'] },
};

export function getRecipeMutationData(recipeId) {
  const baseMap = {
    pane_base: { texture: 'Crostoso', flavor: 'Salato' },
    ciabatta: { texture: 'Aereo', flavor: 'Dolce' },
    focaccia: { texture: 'Gommoso', flavor: 'Umami' },
    brioche: { texture: 'Morbido', flavor: 'Dolce', color: 'Dorato' },
    panettone: { texture: 'Aereo', flavor: 'Dolce', color: 'Dorato', scent: 'Vaniglia' },
    paneDivino: { texture: 'Compatto', flavor: 'Umami', color: 'Dorato', scent: 'Vaniglia' },
  };
  return baseMap[recipeId] || null;
}
