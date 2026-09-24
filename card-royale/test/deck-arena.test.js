import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Deck, Arena } from '../js/arena.js';
import { getCard } from '../js/card-engine.js';

function makeDeck(n = 8) {
  const d = new Deck();
  d.cards = Array.from({ length: n }, (_, i) => ({ id: `card_${i}`, elixir: 1 }));
  return d;
}

test('drawInitial draws up to 4 cards', () => {
  const d = makeDeck(8);
  d.drawInitial();
  assert.equal(d.getHandSize(), 4);
  assert.equal(d.cards.length, 4);
});

test('play moves card to discard, draw recycles discard when empty', () => {
  const d = makeDeck(2);
  d.drawInitial();
  assert.equal(d.getHandSize(), 2);
  const played = d.play(0);
  assert.ok(played);
  assert.equal(d.discard.length, 1);
  assert.equal(d.getHandSize(), 1);
  // Empty the draw pile
  d.play(0);
  assert.equal(d.cards.length, 0);
  assert.equal(d.discard.length, 2);
  // Next draw must recycle from discard
  const drawn = d.draw();
  assert.ok(drawn, 'draw should recycle from discard');
  // Discard was moved wholesale into the draw pile, then one card popped to hand
  assert.equal(d.discard.length, 0);
  assert.equal(d.cards.length, 1);
  assert.equal(d.getHandSize(), 1);
});

test('unplay returns an unaffordable card back to hand, not the draw pile', () => {
  const d = makeDeck(4);
  d.drawInitial();
  const handBefore = d.getHandSize();
  const card = d.play(1);
  assert.equal(d.getHandSize(), handBefore - 1);
  d.unplay(1, card);
  assert.equal(d.getHandSize(), handBefore);
  assert.ok(d.hand.includes(card));
  assert.ok(!d.discard.includes(card));
});

test('play rejects invalid index', () => {
  const d = makeDeck(4);
  d.drawInitial();
  assert.equal(d.play(99), null);
  assert.equal(d.play(-1), null);
});

test('Arena structure damage and game over detection', () => {
  const a = new Arena();
  assert.equal(a.isGameOver(), false);
  a.damageStructure('enemy', 50);
  assert.equal(a.enemyStructure.hp, 150);
  a.damageStructure('enemy', 200);
  assert.equal(a.enemyStructure.hp, 0);
  assert.equal(a.enemyStructure.alive, false);
  assert.equal(a.isGameOver(), true);
  assert.equal(a.getWinner(), 'player');
});

test('Arena clearDead removes only dead units', () => {
  const a = new Arena();
  const alive = { alive: true, lane: 0 };
  const dead = { alive: false, lane: 1 };
  a.addUnit(alive, 'player');
  a.addUnit(dead, 'player');
  a.clearDead();
  assert.deepEqual(a.playerUnits, [alive]);
});

test('Arena reset restores full structures and empties units', () => {
  const a = new Arena();
  a.damageStructure('player', 100);
  a.addUnit({ alive: true }, 'enemy');
  a.reset();
  assert.equal(a.playerStructure.hp, 200);
  assert.equal(a.enemyStructure.hp, 200);
  assert.equal(a.playerUnits.length, 0);
  assert.equal(a.enemyUnits.length, 0);
});

test('getLaneSlots reports occupied lanes', () => {
  const a = new Arena();
  a.addUnit({ alive: true, lane: 1 }, 'player');
  const slots = a.getLaneSlots('player');
  assert.equal(slots[1].hasUnit, true);
  assert.equal(slots[0].hasUnit, false);
  assert.equal(slots[2].hasUnit, false);
});
