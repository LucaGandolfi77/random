const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const md = require('./monopolydeal');

describe('Monopoly Deal', () => {
  it('creates a deck with 105 cards', () => {
    const deck = md.createDeck();
    assert.equal(deck.length, 105);
    // spot check counts
    const byType = {};
    for (const c of deck) byType[c.type] = (byType[c.type] || 0) + 1;
    assert.equal(byType.property, 28);
    assert.equal(byType.money, 20);
    assert.equal(byType.rent, 13);
  });

  it('creates a game with 5 starting cards + 2 drawn = 7 for first player', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    assert.equal(g.phase, 'play');
    assert.equal(g.currentPlayer, 'p1');
    assert.equal(g.playsLeft, 3);
    assert.equal(g.hands.p1.length, 7);
    assert.equal(g.hands.p2.length, 5);
    assert.equal(g.banks.p1.length, 0);
    assert.equal(g.properties.p1.length, 0);
  });

  it('enforces 2-5 players via registry meta', () => {
    assert.equal(md.meta.minPlayers, 2);
    assert.equal(md.meta.maxPlayers, 5);
  });

  it('banking a money card consumes one play', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    // force a money card into hand
    g.hands.p1 = [{ id: 'm1', type: 'money', value: 5, rank: '5M', suit: 'money' }];
    const before = g.playsLeft;
    const r = md.applyAction(g, 'p1', { type: 'bank', cardId: 'm1' });
    assert.equal(r.ok, true);
    assert.equal(g.banks.p1.length, 1);
    assert.equal(g.playsLeft, before - 1);
  });

  it('playing a property puts it on the table and decrements play', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.hands.p1 = [{ id: 'prop1', type: 'property', color: 'brown', name: 'Mediterranean Avenue', value: 1 }];
    g.playsLeft = 3;
    const r = md.applyAction(g, 'p1', { type: 'playProperty', cardId: 'prop1' });
    assert.equal(r.ok, true);
    assert.equal(g.properties.p1.length, 1);
    assert.equal(g.playsLeft, 2);
  });

  it('playing a wild property requires choosing a color', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.hands.p1 = [{ id: 'w1', type: 'wild', colors: ['red', 'yellow'], color: 'red', name: 'Jolly', value: 3 }];
    const r = md.applyAction(g, 'p1', { type: 'playProperty', cardId: 'w1', color: 'yellow' });
    assert.equal(r.ok, true);
    assert.equal(g.properties.p1[0].assignedColor, 'yellow');
  });

  it('pass go draws 2 cards', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    const deckBefore = g.deck.length;
    g.hands.p1 = [{ id: 'pg', type: 'action', subtype: 'passgo', name: 'Passa Via!', value: 1, rank: '➡️', suit: 'passgo' }];
    const handBefore = g.hands.p1.length;
    const r = md.applyAction(g, 'p1', { type: 'playAction', cardId: 'pg', action: 'passgo' });
    assert.equal(r.ok, true);
    assert.equal(g.hands.p1.length, handBefore - 1 + 2, 'net +1 (-1 played +2 drawn)');
    assert.ok(g.deck.length <= deckBefore, 'deck shrank or reshuffled');
  });

  it('completing 3 different-color sets wins', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.hands.p1 = []; g.banks.p1 = []; g.properties.p1 = [];
    // give p1 a 3rd card of brown (completing brown+lightblue+darkblue)
    g.properties.p1 = [
      { id: 'b0', type: 'property', color: 'brown', name: 'x', value: 1, assignedColor: 'brown' },
      { id: 'b1', type: 'property', color: 'brown', name: 'x', value: 1, assignedColor: 'brown' },
      { id: 'lb0', type: 'property', color: 'lightblue', name: 'x', value: 1, assignedColor: 'lightblue' },
      { id: 'lb1', type: 'property', color: 'lightblue', name: 'x', value: 1, assignedColor: 'lightblue' },
      { id: 'lb2', type: 'property', color: 'lightblue', name: 'x', value: 1, assignedColor: 'lightblue' },
      { id: 'db0', type: 'property', color: 'darkblue', name: 'x', value: 1, assignedColor: 'darkblue' },
    ];
    g.currentPlayer = 'p1'; g.phase = 'play'; g.playsLeft = 3;
    // play the final darkblue to complete the set
    g.hands.p1 = [{ id: 'db1', type: 'property', color: 'darkblue', name: 'Boardwalk', value: 4 }];
    const r = md.applyAction(g, 'p1', { type: 'playProperty', cardId: 'db1' });
    assert.equal(r.ok, true);
    assert.equal(g.phase, 'gameOver');
    assert.equal(g.winner, 'p1');
  });

  it('sly deal steals a property not in a complete set', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.hands.p1 = []; g.hands.p2 = [];
    g.properties.p1 = []; g.properties.p2 = [];
    g.properties.p2 = [{ id: 'tp', type: 'property', color: 'red', name: 'X', value: 3, assignedColor: 'red' }];
    g.hands.p1 = [{ id: 'sd', type: 'action', subtype: 'slydeal', name: 'Furto', value: 3, rank: '🥷', suit: 'slydeal' }];
    g.currentPlayer = 'p1'; g.phase = 'play'; g.playsLeft = 3;
    g.attempts = 0;
    // target p2 has no JSN, so action resolves immediately
    const r = md.applyAction(g, 'p1', { type: 'playAction', cardId: 'sd', action: 'slydeal', targetId: 'p2', targetCardId: 'tp' });
    assert.equal(r.ok, true);
    assert.equal(g.properties.p2.length, 0, 'stolen from p2');
    assert.ok(g.properties.p1.some(p => p.id === 'tp'), 'p1 now owns the stolen property');
  });

  it('sly deal cannot steal from a complete set', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.hands.p1 = []; g.hands.p2 = [];
    g.properties.p1 = []; g.properties.p2 = [];
    // p2 has a complete brown set
    g.properties.p2 = [
      { id: 'b0', type: 'property', color: 'brown', name: 'x', value: 1, assignedColor: 'brown' },
      { id: 'b1', type: 'property', color: 'brown', name: 'x', value: 1, assignedColor: 'brown' },
    ];
    g.hands.p1 = [{ id: 'sd', type: 'action', subtype: 'slydeal', name: 'Furto', value: 3, rank: '🥷', suit: 'slydeal' }];
    g.currentPlayer = 'p1'; g.phase = 'play'; g.playsLeft = 3;
    const r = md.applyAction(g, 'p1', { type: 'playAction', cardId: 'sd', action: 'slydeal', targetId: 'p2', targetCardId: 'b0' });
    assert.ok(r.error, 'should reject stealing from a complete set');
  });

  it('deal breaker steals a complete set including house', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.hands.p1 = []; g.hands.p2 = [];
    g.properties.p1 = []; g.properties.p2 = [
      { id: 'b0', type: 'property', color: 'brown', name: 'x', value: 1, assignedColor: 'brown' },
      { id: 'b1', type: 'property', color: 'brown', name: 'x', value: 1, assignedColor: 'brown' },
    ];
    g.setAddons.p2 = { brown: { house: { id: 'h0', type: 'action', subtype: 'house', name: 'Casa', value: 3 }, hotel: null } };
    g.hands.p1 = [{ id: 'db', type: 'action', subtype: 'dealbreaker', name: 'Rompi Patto', value: 5, rank: '💥', suit: 'dealbreaker' }];
    g.currentPlayer = 'p1'; g.phase = 'play'; g.playsLeft = 3;
    // p2 has no JSN
    const r = md.applyAction(g, 'p1', { type: 'playAction', cardId: 'db', action: 'dealbreaker', targetId: 'p2', color: 'brown' });
    assert.equal(r.ok, true);
    assert.equal(g.properties.p2.length, 0, 'p2 loses the set');
    assert.ok(g.properties.p1.filter(p => p.assignedColor === 'brown').length === 2, 'p1 gained the set');
    assert.ok(g.setAddons.p1 && g.setAddons.p1.brown && g.setAddons.p1.brown.house, 'house moved to p1');
  });

  it('just say no can cancel an action', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.hands.p1 = []; g.hands.p2 = [];
    g.properties.p1 = []; g.properties.p2 = [{ id: 'tp', type: 'property', color: 'red', name: 'X', value: 3, assignedColor: 'red' }];
    g.hands.p1 = [{ id: 'sd', type: 'action', subtype: 'slydeal', name: 'Furto', value: 3, rank: '🥷', suit: 'slydeal' }];
    // p2 has a JSN
    g.hands.p2 = [{ id: 'jsn', type: 'action', subtype: 'justsayno', name: 'Col Cavolo!', value: 4, rank: '🛑', suit: 'justsayno' }];
    g.currentPlayer = 'p1'; g.phase = 'play'; g.playsLeft = 3;
    const r = md.applyAction(g, 'p1', { type: 'playAction', cardId: 'sd', action: 'slydeal', targetId: 'p2', targetCardId: 'tp' });
    assert.equal(r.ok, true);
    assert.equal(g.phase, 'jsn', 'should prompt p2 for JSN');
    assert.equal(g.currentPlayer, 'p2');
    // p2 plays JSN
    const r2 = md.applyAction(g, 'p2', { type: 'playJSN', cardId: 'jsn' });
    assert.equal(r2.ok, true);
    assert.equal(g.pending.jsnCount, 1, 'jsn count incremented');
    assert.equal(g.currentPlayer, 'p1', 'back to p1 to respond');
    // p1 accepts → canceled (odd count)
    const r3 = md.applyAction(g, 'p1', { type: 'accept' });
    assert.equal(r3.ok, true);
    assert.equal(g.properties.p2.length, 1, 'p2 keeps the property (action canceled)');
    assert.equal(g.phase, 'play', 'back to play');
  });

  it('rent charges all opponents and the first pays', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.hands.p1 = []; g.hands.p2 = [];
    g.properties.p1 = [{ id: 'b0', type: 'property', color: 'brown', name: 'x', value: 1, assignedColor: 'brown' }, { id: 'b1', type: 'property', color: 'brown', name: 'x', value: 1, assignedColor: 'brown' }];
    g.properties.p2 = [];
    g.banks.p2 = [{ id: 'm5', type: 'money', value: 5, rank: '5M', suit: 'money' }];
    g.hands.p1 = [{ id: 'rent1', type: 'rent', colors: ['brown', 'lightblue'], color: 'brown', value: 1, rank: 'Affitto', suit: 'rent' }];
    g.hands.p2 = []; // no JSN
    g.currentPlayer = 'p1'; g.phase = 'play'; g.playsLeft = 3;
    const r = md.applyAction(g, 'p1', { type: 'playRent', cardId: 'rent1', color: 'brown' });
    assert.equal(r.ok, true);
    // p2 has full brown set on p1 → rent = 2M; p2 should be in pay phase
    assert.equal(g.phase, 'pay', 'p2 should be paying');
    assert.equal(g.pending.amount, 2);
    // p2 pays 2M from bank
    const r2 = md.applyAction(g, 'p2', { type: 'payCards', cardIds: ['m5'] });
    assert.equal(r2.ok, true);
    assert.equal(g.banks.p1.length, 1, 'p1 received the money');
    assert.equal(g.banks.p2.length, 0, 'p2 spent it');
    assert.equal(g.currentPlayer, 'p1', 'back to p1 play');
  });

  it('bot returns a valid action', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.currentPlayer = 'p1';
    const actions = md.getValidActions(g, 'p1');
    const botAction = md.getBotAction(g, 'p1', 'hard');
    assert.ok(botAction, 'bot should pick an action');
    assert.ok(actions.some(a => a.type === botAction.type), 'bot action type should be valid');
  });

  it('nextRound resets the game', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.phase = 'gameOver';
    g.round = 1;
    const r = md.nextRound(g);
    assert.equal(r.ok, true);
    assert.equal(g.round, 2);
    assert.equal(g.phase, 'play');
    assert.equal(g.hands.p1.length, 7);
  });

  it('end turn with too many cards enters discard phase', () => {
    const g = md.create([{ id: 'p1' }, { id: 'p2' }]);
    g.playsLeft = 3;
    // give p1 9 cards
    g.hands.p1 = [];
    for (let i = 0; i < 9; i++) g.hands.p1.push({ id: `h${i}`, type: 'money', value: 1, rank: '1M', suit: 'money' });
    const r = md.applyAction(g, 'p1', { type: 'endTurn' });
    assert.equal(r.ok, true);
    assert.equal(g.phase, 'discard', 'should enter discard phase');
  });
});