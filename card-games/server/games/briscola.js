const { createDeck, shuffle } = require('../cards');

const meta = {
  id: 'briscola',
  name: 'Briscola',
  description: 'Gioco di prese con la briscola! Il tre vale 10 punti, l\'asso 11.',
  minPlayers: 2,
  maxPlayers: 2,
  deckType: 'italian40',
};

function create(players) {
  const deck = shuffle(createDeck('italian40'));
  const playerOrder = players.map(p => p.id);
  if (playerOrder.length < 2) return { error: 'Need at least 2 players' };

  let idx = 0;
  const hands = {};
  for (const pid of playerOrder) {
    hands[pid] = deck.slice(idx, idx + 3);
    idx += 3;
  }
  const briscola = deck[idx];
  const remaining = [...deck.slice(idx + 1), briscola];

  const captured = {};
  for (const pid of playerOrder) captured[pid] = [];

  return {
    meta,
    deck: remaining,
    briscola,
    briscolaSuit: briscola.suit,
    hands,
    captured,
    playedThisTrick: [],
    currentPlayer: playerOrder[0],
    playerOrder,
    turnIndex: 0,
    trickNumber: 0,
  round: 1,
  points: {},
  phase: 'play',
    events: [],
    winner: null,
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    briscola: state.briscola,
    briscolaSuit: state.briscolaSuit,
    playedThisTrick: state.playedThisTrick,
    handSize: {},
    capturedCount: {},
    points: state.points,
    deckSize: state.deck ? state.deck.length : 0,
    events: state.events,
    winner: state.winner,
    trickNumber: state.trickNumber,
    round: state.round,
  };
  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
    safe.capturedCount[pid] = (state.captured[pid] || []).length;
  }
  if (state.hands[playerId]) safe.hand = state.hands[playerId];
  return safe;
}

function isPlayerTurn(state, playerId) {
  return state.currentPlayer === playerId && state.phase === 'play';
}

function getValidActions(state, playerId) {
  if (!isPlayerTurn(state, playerId)) return [];
  const hand = state.hands[playerId] || [];
  return hand.map(c => ({ cardId: c.id }));
}

function applyAction(state, playerId, action) {
  if (!isPlayerTurn(state, playerId)) return { error: 'Not your turn' };
  const hand = state.hands[playerId];
  const cardIdx = hand.findIndex(c => c.id === action.cardId);
  if (cardIdx === -1) return { error: 'Card not in hand' };
  const card = hand[cardIdx];
  hand.splice(cardIdx, 1);

  state.events = [];
  state.playedThisTrick.push({ playerId, card });
  state.events.push({ type: 'play', playerId, card });

  const n = state.playerOrder.length;
  if (state.playedThisTrick.length === n) {
    resolveTrick(state);
  } else {
    state.turnIndex = (state.turnIndex + 1) % n;
    state.currentPlayer = state.playerOrder[state.turnIndex];
  }

  return { ok: true };
}

function resolveTrick(state) {
  state.trickNumber++;
  const trick = state.playedThisTrick;
  const briscola = state.briscolaSuit;
  const leadingSuit = trick[0].card.suit;

  let best = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const t = trick[i];
    const bestBriscola = best.card.suit === briscola;
    const tBriscola = t.card.suit === briscola;
    if (tBriscola && !bestBriscola) { best = t; }
    else if (!tBriscola && !bestBriscola && t.card.suit === leadingSuit && t.card.briscolaValue > best.card.briscolaValue) { best = t; }
    else if (tBriscola && bestBriscola && t.card.briscolaValue > best.card.briscolaValue) { best = t; }
  }

  const winnerId = best.playerId;
  state.captured[winnerId].push(...trick.map(t => t.card));
  state.points[winnerId] = (state.points[winnerId] || 0) + trick.reduce((s, t) => s + t.card.briscolaValue, 0);
  state.events.push({ type: 'trick', winner: winnerId, cards: trick.map(t => ({ ...t })) });

  state.playedThisTrick = [];

  const allHandsEmpty = state.playerOrder.every(pid => (state.hands[pid] || []).length === 0);
  if (allHandsEmpty && state.deck.length === 0) {
    endGame(state);
    return;
  }

  if (state.deck.length > 0) {
    const winnerIdx = state.playerOrder.indexOf(winnerId);
    for (let i = 0; i < state.playerOrder.length; i++) {
      const pid = state.playerOrder[(winnerIdx + i) % state.playerOrder.length];
      if (state.deck.length > 0) {
        state.hands[pid].push(state.deck.shift());
      }
    }
  }

  state.turnIndex = state.playerOrder.indexOf(winnerId);
  state.currentPlayer = state.playerOrder[state.turnIndex];
}

function endGame(state) {
  const totalPoints = state.playerOrder.reduce((s, pid) => s + (state.points[pid] || 0), 0);
  const target = Math.ceil(120 / 2);
  const aboveTarget = state.playerOrder.filter(pid => (state.points[pid] || 0) > target);
  if (aboveTarget.length === 1) {
    state.winner = aboveTarget[0];
  } else if (state.playerOrder.length === 2) {
    const p0 = state.points[state.playerOrder[0]] || 0;
    const p1 = state.points[state.playerOrder[1]] || 0;
    state.winner = p0 >= p1 ? state.playerOrder[0] : state.playerOrder[1];
  } else {
    const sorted = [...state.playerOrder].sort((a, b) => (state.points[b] || 0) - (state.points[a] || 0));
    state.winner = sorted[0];
  }
  state.phase = 'gameOver';
  state.events.push({ type: 'gameOver', winner: state.winner, points: { ...state.points } });
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function nextRound(state) {
  const deck = shuffle(createDeck('italian40'));
  let idx = 0;
  const hands = {};
  for (const pid of state.playerOrder) {
    hands[pid] = deck.slice(idx, idx + 3);
    idx += 3;
  }
  const briscola = deck[idx];
  const remaining = [...deck.slice(idx + 1), briscola];
  const captured = {};
  for (const pid of state.playerOrder) captured[pid] = [];

  state.deck = remaining;
  state.briscola = briscola;
  state.briscolaSuit = briscola.suit;
  state.hands = hands;
  state.captured = captured;
  state.playedThisTrick = [];
  state.turnIndex = 0;
  state.currentPlayer = state.playerOrder[0];
  state.trickNumber = 0;
  state.points = {};
  state.phase = 'play';
  state.events = [{ type: 'newRound' }];
  state.winner = null;
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => s.points, nextRound };
