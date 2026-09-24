import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAllCards, getCard, createUnit, getFusablePairs, shuffle } from '../js/card-engine.js';
import { FUSION_RECIPES, getFusionRecipe, canFuse } from '../data/fusions.js';

test('all card ids are unique and valid', () => {
  const cards = getAllCards();
  assert.ok(cards.length >= 20, 'expected at least 20 cards');
  const ids = cards.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length, 'card ids must be unique');
  for (const c of cards) {
    assert.ok(c.name && c.emoji, `card ${c.id} missing name/emoji`);
    assert.ok(['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(c.rarity), `card ${c.id} bad rarity ${c.rarity}`);
    assert.ok(c.elixir >= 1 && c.hp > 0 && c.dmg >= 0, `card ${c.id} bad stats`);
  }
});

test('default deck ids all exist', () => {
  const deckIds = [
    'moss_wisp', 'spore_sprout', 'dartling', 'starling_scout',
    'elder_tree', 'moon_fox', 'acorn_bomber', 'breeze_lark'
  ];
  for (const id of deckIds) {
    assert.ok(getCard(id), `missing card ${id}`);
  }
});

test('every fusion recipe references existing cards and has valid output stats', () => {
  const ids = new Set(getAllCards().map(c => c.id));
  // Some recipes chain off other fusion results (e.g. moon_serpent)
  const fusionOutputs = new Set(FUSION_RECIPES.map(r => r.id));
  const known = new Set([...ids, ...fusionOutputs]);
  assert.ok(FUSION_RECIPES.length >= 10, 'expected at least 10 fusion recipes');
  for (const r of FUSION_RECIPES) {
    assert.ok(known.has(r.card1), `recipe ${r.id} references missing card1 ${r.card1}`);
    assert.ok(known.has(r.card2), `recipe ${r.id} references missing card2 ${r.card2}`);
    assert.notEqual(r.card1, r.card2, `recipe ${r.id} fuses a card with itself`);
    assert.ok(r.elixir >= 0, `recipe ${r.id} bad elixir`);
    assert.ok(r.hp > 0 && r.dmg > 0, `recipe ${r.id} bad output stats`);
  }
});

test('getFusionRecipe matches pairs in both orders', () => {
  const r = getFusionRecipe('moss_wisp', 'dartling');
  assert.ok(r, 'expected moss_wisp+dartling recipe');
  const r2 = getFusionRecipe('dartling', 'moss_wisp');
  assert.equal(r.id, r2.id, 'recipe must be order-independent');
  assert.equal(canFuse('moss_wisp', 'dartling'), true);
  assert.equal(canFuse('moss_wisp', 'elder_tree'), false);
});

test('getFusablePairs works with unit objects (uses cardId)', () => {
  const moss = getCard('moss_wisp');
  const dart = getCard('dartling');
  const u1 = createUnit(moss, 'player', 0);
  const u2 = createUnit(dart, 'player', 1);
  const u3 = createUnit(getCard('elder_tree'), 'player', 2);
  const pairs = getFusablePairs([u1, u2, u3]);
  assert.equal(pairs.length, 1, 'expected exactly one fusable pair');
  assert.equal(pairs[0].recipe.id, 'phoenix_sprite');
  assert.equal(pairs[0].card1, u1);
  assert.equal(pairs[0].card2, u2);
});

test('getFusablePairs ignores dead units', () => {
  const u1 = createUnit(getCard('moss_wisp'), 'player', 0);
  const u2 = createUnit(getCard('dartling'), 'player', 1);
  u2.alive = false;
  assert.equal(getFusablePairs([u1, u2]).length, 0);
});

test('shuffle returns a new array without losing elements', () => {
  const a = [1, 2, 3, 4, 5];
  const b = shuffle(a);
  assert.notEqual(a, b);
  assert.deepEqual([...b].sort((x, y) => x - y), a);
});

test('createUnit copies stats and marks alive', () => {
  const card = getCard('moon_fox');
  const u = createUnit(card, 'enemy', 2);
  assert.equal(u.hp, card.hp);
  assert.equal(u.maxHp, card.hp);
  assert.equal(u.dmg, card.dmg);
  assert.equal(u.owner, 'enemy');
  assert.equal(u.lane, 2);
  assert.equal(u.alive, true);
  assert.equal(u.cardId, card.id);
});
