/* tiles.js — le 6 tazze-tessere */
'use strict';
const TILES = [
  { id: 0, name: 'Usucha',  emoji: '🍵', color: '#8fbf7a' },
  { id: 1, name: 'Koicha',  emoji: '🍃', color: '#4a6b4f' },
  { id: 2, name: 'Sakura',  emoji: '🌸', color: '#f4aebe' },
  { id: 3, name: 'Yuzu',    emoji: '🍋', color: '#e9c46a' },
  { id: 4, name: 'Kurogoma',emoji: '🖤', color: '#555555' },
  { id: 5, name: 'Mochi',   emoji: '🤍', color: '#f2ede2' },
];
const TILE_COUNT = 6;
/* skin Sakura Eterna: stessi nomi, emoji del mondo parallelo */
const SAKURA = [
  { id: 0, name: 'Usucha',  emoji: '🍵', color: '#a8c69a' },
  { id: 1, name: 'Koicha',  emoji: '🎋', color: '#6b8f71' },
  { id: 2, name: 'Sakura',  emoji: '🌸', color: '#f4aebe' },
  { id: 3, name: 'Yuzu',    emoji: '🍋', color: '#e9c46a' },
  { id: 4, name: 'Sumire',  emoji: '💜', color: '#9b7ed9' },
  { id: 5, name: 'Mochi',   emoji: '🤍', color: '#f7f1e5' },
];
const SKINS = { canon: TILES, sakura: SAKURA,
  yokai: [
    { id: 0, name: 'Usucha',  emoji: '🍵', color: '#8fbf7a' },
    { id: 1, name: 'Chōchin', emoji: '🏮', color: '#e07840' },
    { id: 2, name: 'Karuta',  emoji: '🎴', color: '#c44e6d' },
    { id: 3, name: 'Dango',   emoji: '🍡', color: '#e9c46a' },
    { id: 4, name: 'Yūrei',   emoji: '👻', color: '#b9b3e0' },
    { id: 5, name: 'Tsukimi', emoji: '🌙', color: '#f2ede2' },
  ],
  estate: [
    { id: 0, name: 'Usucha',    emoji: '🍵', color: '#8fbf7a' },
    { id: 1, name: 'Conchiglia',emoji: '🐚', color: '#e8b4a0' },
    { id: 2, name: 'Onda',      emoji: '🌊', color: '#3fa08a' },
    { id: 3, name: 'Yuzu',      emoji: '🍋', color: '#e9c46a' },
    { id: 4, name: 'Corallo',   emoji: '🪸', color: '#d95f6e' },
    { id: 5, name: 'Mochi',     emoji: '🤍', color: '#f2ede2' },
  ],
};
window.MHTiles = { TILES, TILE_COUNT, SAKURA, SKINS };
