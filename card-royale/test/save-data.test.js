import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage mock for Node
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const save = await import('../js/save.js');
const { getNextBoss, getAllBosses, getBoss } = await import('../data/bosses.js');
const { applyWeatherEffect, getSeason, WEATHER_TYPES } = await import('../data/weather.js');
const { getAllCompanions, getCompanion } = await import('../data/companions.js');
const { NATURE_ULTIMATE } = await import('../data/nature.js');
const { getCard } = await import('../js/card-engine.js');

beforeEach(() => store.clear());

test('loadStats returns defaults when nothing saved', () => {
  const s = save.loadStats();
  assert.equal(s.wins, 0);
  assert.ok(Array.isArray(s.currentDeck) && s.currentDeck.length > 0);
  assert.ok(Array.isArray(s.achievementsUnlocked));
});

test('loadStats merges defaults into legacy/corrupt saves', () => {
  store.set('enchanted_clash_stats', JSON.stringify({ wins: 3 }));
  const s = save.loadStats();
  assert.equal(s.wins, 3);
  assert.ok(s.essences && typeof s.essences === 'object', 'essences default missing');
  assert.ok(Array.isArray(s.currentDeck) && s.currentDeck.length > 0, 'deck default missing');
  assert.ok(Array.isArray(s.weatherTypes), 'weatherTypes default missing');
});

test('loadStats recovers from invalid JSON', () => {
  store.set('enchanted_clash_stats', '{not json');
  const s = save.loadStats();
  assert.equal(s.wins, 0);
});

test('win/loss counters increment safely from partial stats', () => {
  const s = { gamesPlayed: undefined, wins: undefined, losses: undefined };
  save.addWinToStats(s);
  save.addWinToStats(s);
  save.addLossToStats(s);
  assert.equal(s.wins, 2);
  assert.equal(s.losses, 1);
  assert.equal(s.gamesPlayed, 3);
});

test('trackCardPlay initializes cardsPlayed map', () => {
  const s = {};
  save.trackCardPlay(s, 'moon_fox');
  save.trackCardPlay(s, 'moon_fox');
  assert.equal(s.cardsPlayed.moon_fox, 2);
});

test('leaderboard keeps top 10 sorted desc', () => {
  for (let i = 1; i <= 15; i++) save.addToLeaderboard('P' + i, i * 10);
  const board = save.getLeaderboard();
  assert.equal(board.length, 10);
  assert.equal(board[0].score, 150);
  assert.equal(board[9].score, 60);
});

test('boss rotation only triggers on wins % 5 === 4', () => {
  assert.equal(getNextBoss(0), null);
  assert.ok(getNextBoss(4), 'boss expected at 4 wins');
  assert.equal(getNextBoss(5), null);
  assert.ok(getNextBoss(9));
  assert.equal(getAllBosses().length, 3);
});

test('boss data has required mechanics fields', () => {
  for (const b of getAllBosses()) {
    assert.ok(b.id && b.name && b.emoji);
    assert.ok(b.hp > 0 && b.attackDmg > 0);
    assert.ok(['thorn_shield', 'card_steal', 'power_doubling'].includes(b.ability));
    assert.ok(b.winDialogue && b.loseDialogue);
  }
  assert.equal(getBoss('thorn_king').id, 'thorn_king');
  assert.equal(getBoss('missing').id, 'thorn_king', 'falls back to first boss');
});

test('weather types and seasons are consistent', () => {
  assert.equal(Object.keys(WEATHER_TYPES).length, 6);
  assert.equal(getSeason(0), 'SPRING');
  assert.equal(getSeason(8), 'SUMMER');
  assert.equal(getSeason(16), 'AUTUMN');
  assert.equal(getSeason(24), 'WINTER');
  assert.equal(getSeason(32), 'SPRING');
});

test('applyWeatherEffect modifies damage/speed and keeps hp sane', () => {
  const card = getCard('moon_fox');
  const sunny = applyWeatherEffect(card, 'SUNNY');
  const moon = applyWeatherEffect(card, 'MOONLIGHT');
  assert.ok(sunny.dmg >= 1 && moon.dmg >= 1);
  assert.ok(sunny.speed >= 0.1);
  assert.ok(sunny.hp >= card.hp * 0.5);
  const unknown = applyWeatherEffect(card, 'NOT_A_WEATHER');
  assert.equal(unknown.dmg, card.dmg);
});

test('companions: 5 unique with abilities', () => {
  const comps = getAllCompanions();
  assert.equal(comps.length, 5);
  const ids = comps.map(c => c.id);
  assert.equal(new Set(ids).size, 5);
  for (const c of comps) {
    assert.ok(c.ability && c.desc && c.emoji);
  }
  assert.equal(getCompanion('missing').id, comps[0].id);
});

test('nature ultimate config is coherent', () => {
  assert.equal(NATURE_ULTIMATE.activationCost, 100);
  assert.ok(NATURE_ULTIMATE.effects.damage > 0);
  assert.ok(NATURE_ULTIMATE.effects.healAmount > 0);
  assert.ok(NATURE_ULTIMATE.cooldown > 0);
});
