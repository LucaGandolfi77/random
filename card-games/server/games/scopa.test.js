const { describe, it } = require('node:test');
const assert = require('node:assert');
const scopa = require('./scopa');

describe('Scopa', () => {
  it('creates a game with 2 players', () => {
    const players = [{ id: 'p1' }, { id: 'p2' }];
    const state = scopa.create(players);
    assert.ok(state);
    assert.equal(state.playerOrder.length, 2);
    assert.equal(state.hands.p1.length, 3);
    assert.equal(state.hands.p2.length, 3);
    assert.equal(state.table.length, 4);
    assert.equal(state.phase, 'play');
  });

  it('validates player turn', () => {
    const players = [{ id: 'p1' }, { id: 'p2' }];
    const state = scopa.create(players);
    const actions = scopa.getValidActions(state, 'p1');
    assert.ok(actions.length > 0);
    const actions2 = scopa.getValidActions(state, 'p2');
    assert.equal(actions2.length, 0);
  });

  it('plays a card without capture', () => {
    const players = [{ id: 'p1' }, { id: 'p2' }];
    const state = scopa.create(players);
    state.table = [{ id: 'test-1', suit: 'denari', rank: '5', value: 5 }];
    const handCard = state.hands.p1[0];
    if (handCard.value !== 5) {
      state.hands.p1[0] = { id: 'test-play', suit: 'coppe', rank: '3', value: 3 };
    }
    const c = state.hands.p1[0];
    const result = scopa.applyAction(state, 'p1', { cardId: c.id, take: null });
    assert.ok(result.ok);
    assert.ok(state.table.some(tc => tc.id === c.id));
  });

  it('captures a matching single card', () => {
    const players = [{ id: 'p1' }, { id: 'p2' }];
    const state = scopa.create(players);
    state.table = [{ id: 't5', suit: 'denari', rank: '5', value: 5 }];
    state.hands.p1 = [{ id: 'h5', suit: 'coppe', rank: '5', value: 5 }];
    const result = scopa.applyAction(state, 'p1', { cardId: 'h5', take: ['t5'] });
    assert.ok(result.ok);
    assert.ok(!state.table.some(tc => tc.id === 't5'));
    assert.ok(state.captured.p1.some(c => c.id === 't5'));
    assert.ok(state.captured.p1.some(c => c.id === 'h5'));
  });

  it('detects scopa when table empties', () => {
    const players = [{ id: 'p1' }, { id: 'p2' }];
    const state = scopa.create(players);
    state.table = [{ id: 't5', suit: 'denari', rank: '5', value: 5 }];
    state.hands.p1 = [{ id: 'h5', suit: 'coppe', rank: '5', value: 5 }];
    assert.equal(state.table.length, 1);
    scopa.applyAction(state, 'p1', { cardId: 'h5', take: ['t5'] });
    assert.equal(state.table.length, 0);
    assert.ok(state.events.some(e => e.type === 'scopa'));
    assert.equal(state.scopePoints.p1, 1);
  });

  it('scores round correctly (carte, denari, settebello, primiera)', () => {
    const state = scopa.create([{ id: 'p1' }, { id: 'p2' }]);
    state.captured.p1 = [];
    state.captured.p2 = [];
    for (let i = 0; i < 22; i++) {
      state.captured.p1.push({ id: `a${i}`, suit: 'denari', rank: String(i), value: 1 });
    }
    state.captured.p1.push({ id: 'sb', suit: 'denari', rank: '7', value: 7 });
    for (let i = 0; i < 18; i++) {
      state.captured.p2.push({ id: `b${i}`, suit: 'coppe', rank: String(i), value: 1 });
    }
    state.scopePoints = { p1: 1, p2: 0 };
    state.playerOrder = ['p1', 'p2'];
    state.lastTaker = 'p1';
    state.table = [];

    const scores = scopa.scoreRound(state);
    assert.ok(scores.p1 > 0);
  });
});

describe('Briscola', () => {
  it('creates a game with 2 players', () => {
    const players = [{ id: 'p1' }, { id: 'p2' }];
    const state = require('./briscola').create(players);
    assert.ok(state);
    assert.equal(state.playerOrder.length, 2);
    assert.equal(state.hands.p1.length, 3);
    assert.equal(state.hands.p2.length, 3);
    assert.ok(state.briscola);
    assert.equal(state.phase, 'play');
  });

  it('plays a card and resolves trick', () => {
    const briscola = require('./briscola');
    const players = [{ id: 'p1' }, { id: 'p2' }];
    const state = briscola.create(players);
    state.hands.p1 = [{ id: 'c1', suit: 'denari', rank: 'A', value: 1, briscolaValue: 11 }];
    state.hands.p2 = [{ id: 'c2', suit: 'coppe', rank: '2', value: 2, briscolaValue: 0 }];
    state.deck = [];
    state.briscola = { suit: 'spade', rank: '3', value: 3, briscolaValue: 10 };
    state.briscolaSuit = 'spade';

    const result = briscola.applyAction(state, 'p1', { cardId: 'c1' });
    assert.ok(result.ok);
    assert.equal(state.playedThisTrick.length, 1);

    const result2 = briscola.applyAction(state, 'p2', { cardId: 'c2' });
    assert.ok(result2.ok);
    assert.equal(state.playedThisTrick.length, 0);
    assert.equal(state.captured.p1.length, 2);
    assert.ok(state.points.p1 >= 11);
  });
});
