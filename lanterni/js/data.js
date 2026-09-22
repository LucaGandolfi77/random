// js/data.js — Costanti e dati di gioco

export const COLORS = {
  skyTop: '#0a0e1a',
  skyBottom: '#1a1a3e',
  dawnTop: '#ff7e5f',
  dawnBottom: '#feb47b',
  lanternWarm: '#ff6b35',
  lanternCool: '#5b8cff',
  lanternGold: '#ffd700',
  lanternPink: '#ff6b9d',
  lanternGreen: '#4ecdc4',
  lanternViolet: '#9b59b6',
  lanternBlue: '#3498db',
  lanternRainbow: '#ff6b35',
  lightGlow: '#ffd700',
  cloudDark: '#2a2a4a',
  cloudLight: '#3d3d6b',
  net: '#8b7355',
  rope: '#a0845c',
  starWhite: '#ffffff',
  starBlue: '#aaccff',
  starGold: '#ffd700',
  paper: '#f5e6d3',
  paperShadow: '#c4a882',
  lilyPad: '#2ecc71',
  lilyPadGlow: '#1abc9c'
};

export const LANTERN_TYPES = [
  { id: 'warm', color: COLORS.lanternWarm, glow: '#ff8c5a', weight: 1.0 },
  { id: 'cool', color: COLORS.lanternCool, glow: '#7aa8ff', weight: 0.7 },
  { id: 'gold', color: COLORS.lanternGold, glow: '#ffe44d', weight: 0.5 },
  { id: 'pink', color: COLORS.lanternPink, glow: '#ff8eb8', weight: 0.4 },
  { id: 'green', color: COLORS.lanternGreen, glow: '#6ee6dc', weight: 0.3 },
  { id: 'violet', color: COLORS.lanternViolet, glow: '#bb7fd4', weight: 0.35 },
  { id: 'blue', color: COLORS.lanternBlue, glow: '#5dade2', weight: 0.45 },
  { id: 'rainbow', color: COLORS.lanternRainbow, glow: '#ffd700', weight: 0.2 }
];

export const INHABITANT_TYPES = [
  { id: 'cloud_cat', name: 'Gatto di Nuvola', emoji: '🐱', weight: 1.0, sound: 'meow', speed: 25 },
  { id: 'moth', name: 'Falene Luminosa', emoji: '🦋', weight: 0.6, sound: 'flutter', speed: 40 },
  { id: 'paper_mouse', name: 'Topo Cartaio', emoji: '🐭', weight: 0.4, sound: 'squeak', speed: 30 },
  { id: 'paper_crane', name: 'Gru di Carta', emoji: '🕊️', weight: 0.3, sound: 'whoosh', speed: 35 },
  { id: 'starfish', name: 'Stella di Mare', emoji: '⭐', weight: 0.2, sound: 'sparkle', speed: 15 },
  { id: 'jellyfish', name: 'Medusa di Vetro', emoji: '🪼', weight: 0.15, sound: 'pulse', speed: 20 }
];

export const FURNITURE_TYPES = [
  { id: 'table', name: 'Tavolo di Carta', emoji: '🪑', rarity: 0.3 },
  { id: 'lamp', name: 'Lampada di Carta', emoji: '💡', rarity: 0.25 },
  { id: 'book', name: 'Libro Volante', emoji: '📖', rarity: 0.2 },
  { id: 'flower', name: 'Fiori di Carta', emoji: '🌸', rarity: 0.15 },
  { id: 'star', name: 'Stella di Carta', emoji: '⭐', rarity: 0.1 },
  { id: 'bookshelf', name: 'Libreria di Carta', emoji: '📚', rarity: 0.08 },
  { id: 'clock', name: 'Orologio di Carta', emoji: '🕰️', rarity: 0.06 },
  { id: 'mirror', name: 'Specchio di Carta', emoji: '🪞', rarity: 0.05 }
];

export const PROGRESSION = [
  { level: 1, lanternsNeeded: 0, unlock: 'tutorial' },
  { level: 2, lanternsNeeded: 3, unlock: 'basic_lanterns' },
  { level: 3, lanternsNeeded: 6, unlock: 'cloud_cat' },
  { level: 4, lanternsNeeded: 10, unlock: 'colored_lanterns' },
  { level: 5, lanternsNeeded: 15, unlock: 'moth' },
  { level: 6, lanternsNeeded: 21, unlock: 'furniture' },
  { level: 7, lanternsNeeded: 28, unlock: 'paper_mouse' },
  { level: 8, lanternsNeeded: 36, unlock: 'giant_lanterns' },
  { level: 9, lanternsNeeded: 45, unlock: 'special_nights' },
  { level: 10, lanternsNeeded: 55, unlock: 'free_mode' },
  { level: 11, lanternsNeeded: 65, unlock: 'violet_lanterns' },
  { level: 12, lanternsNeeded: 78, unlock: 'paper_crane' },
  { level: 13, lanternsNeeded: 92, unlock: 'lily_pads' },
  { level: 14, lanternsNeeded: 108, unlock: 'blue_lanterns' },
  { level: 15, lanternsNeeded: 125, unlock: 'starfish' },
  { level: 16, lanternsNeeded: 145, unlock: 'advanced_furniture' },
  { level: 17, lanternsNeeded: 168, unlock: 'jellyfish' },
  { level: 18, lanternsNeeded: 195, unlock: 'rainbow_lanterns' },
  { level: 19, lanternsNeeded: 225, unlock: 'master_builder' },
  { level: 20, lanternsNeeded: 260, unlock: 'legendary' }
];

export const GRID = {
  cellSize: 70,
  snapRange: 40,
  offsets: [
    { dx: 0, dy: -1 },  // top
    { dx: 1, dy: 0 },   // right
    { dx: 0, dy: 1 },   // bottom
    { dx: -1, dy: 0 }   // left
  ]
};

export const NET = {
  chargeSpeed: 1.8,
  maxPower: 1.0,
  gravity: 600,
  drag: 0.98,
  throwMultiplier: 800,
  catchRadius: 35,
  retractSpeed: 400
};

export const SKY = {
  starCount: 120,
  dawnDuration: 8,
  nightDuration: 150,
  floatingLanterns: 5,
  spawnInterval: 3.0
};

export const PHYSICS = {
  lanternFloatSpeed: 20,
  lanternSwayAmplitude: 15,
  lanternSwayFrequency: 0.8,
  cloudSpeed: 8,
  mothSpeed: 40,
  catSpeed: 25
};
