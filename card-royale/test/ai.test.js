import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIController } from '../js/ai-controller.js';
import { getAllCards } from '../js/card-engine.js';

test('AI builds a 20-card deck from valid card ids', () => {
  const ai = new AIController('medium');
  assert.equal(ai.deck.length, 20);
  const ids = new Set(getAllCards().map(c => c.id));
  for (const c of ai.deck) {
    assert.ok(ids.has(c.id), `AI deck has unknown card ${c.id}`);
  }
});

test('AI hand refills to 4 and rebuilds deck when empty', () => {
  const ai = new AIController('easy');
  ai.refillHand(ai.hand);
  assert.equal(ai.hand.length, 4);
  ai.deck = [];
  ai.hand = [];
  ai.refillHand(ai.hand);
  assert.equal(ai.hand.length, 4, 'deck should rebuild when empty');
});

test('AI canPlay and chooseCard use the AI elixir, not the player elixir', () => {
  const ai = new AIController('medium');
  ai.refillHand(ai.hand);
  ai.elixir = 0;
  const minCost = Math.min(...ai.hand.map(c => c.elixir));
  assert.equal(ai.canPlay(ai.hand, ai.elixir), minCost <= 0 ? true : false);
  assert.equal(ai.chooseCard(ai.hand, { enemyUnits: [], enemyTauntCount: 0, playedCards: [] }), null);

  ai.elixir = 10;
  assert.equal(ai.canPlay(ai.hand, ai.elixir), true);
  const chosen = ai.chooseCard(ai.hand, { enemyUnits: [], enemyTauntCount: 0, playedCards: [] });
  assert.ok(chosen, 'AI should choose a card with enough elixir');
  assert.ok(ai.elixir >= chosen.elixir);
});

test('AI chooseCard never returns an unaffordable card', () => {
  const ai = new AIController('hard');
  ai.refillHand(ai.hand);
  const affordable = ai.hand.filter(c => c.elixir <= 3);
  if (affordable.length === 0) return;
  ai.elixir = 3;
  for (let i = 0; i < 20; i++) {
    const c = ai.chooseCard(ai.hand, { enemyUnits: [], enemyTauntCount: 0, playedCards: [] });
    if (c) assert.ok(c.elixir <= 3, `chose unaffordable card ${c.id} cost ${c.elixir}`);
  }
});

test('AI emotion effects resolve for every emotion', () => {
  const ai = new AIController('medium');
  for (const emo of ['neutral', 'happy', 'sad', 'angry', 'bored', 'confused']) {
    ai.emotion = emo;
    const eff = ai.getEmotionEffect();
    assert.ok(eff && typeof eff.aggressionBonus === 'number', `missing effect for ${emo}`);
    assert.ok(ai.getEmotionColor().startsWith('#'));
    assert.ok(ai.getEmotionEmoji());
    assert.ok(ai.getEmotionDialogue().think);
  }
  ai.emotion = 'neutral';
});

test('AI dialogue exists for all difficulties', () => {
  for (const diff of ['easy', 'medium', 'hard']) {
    const ai = new AIController(diff);
    const d = ai.getDialogue();
    assert.ok(d.intro && d.win && d.lose, `missing dialogue for ${diff}`);
  }
  const bad = new AIController('nope');
  assert.ok(bad.getDialogue().intro, 'unknown difficulty falls back to medium dialogue');
});

test('AI chooseLane prefers empty lanes', () => {
  const ai = new AIController('medium');
  const lane = ai.chooseLane([0, 1, 2], {
    enemyUnits: [
      { lane: 0, alive: true, hp: 100 },
      { lane: 2, alive: true, hp: 100 }
    ],
    enemyTauntCount: 0,
    playedCards: []
  });
  assert.equal(lane, 1, 'empty lane 1 should be chosen');
});
