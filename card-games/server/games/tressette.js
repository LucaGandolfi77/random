const { createDeck, shuffle } = require('../cards');

const TRESETTE_RANK = { '3': 10, '2': 9, 'A': 8, 'R': 7, 'J': 6, 'C': 5, '7': 4, '6': 3, '5': 2, '4': 1 };

const meta = {
  id: 'tressette',
  name: 'Tressette',
  description: 'Gioco di prese all\'italiana! Segui seme se puoi. Ogni presa vale 1 punto.',
  minPlayers: 2,
  maxPlayers: 2,
  deckType: 'italian40',
};

function cardRankWeight(card) {
  return TRESETTE_RANK[card.rank] || 0;
}

function create(players) {
  const deck = shuffle(createDeck('italian40'));
  const playerOrder = players.map(p => p.id);

  let idx = 0;
  const hands = {};
  for (const pid of playerOrder) {
    hands[pid] = deck.slice(idx, idx + 10);
    idx += 10;
  }

  const captured = {};
  const points = {};
  for (const pid of playerOrder) {
    captured[pid] = [];
    points[pid] = 0;
  }

  return {
    meta,
    deck: deck.slice(idx),
    hands,
    captured,
    points,
    playedThisTrick: [],
    currentPlayer: playerOrder[0],
    playerOrder,
    turnIndex: 0,
    trickNumber: 0,
    round: 1,
    phase: 'play',
    events: [],
    winner: null,
    gamePoints: {},
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    playedThisTrick: state.playedThisTrick,
    handSize: {},
    capturedCount: {},
    points: state.points,
    gamePoints: state.gamePoints,
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
  if (state.playedThisTrick.length === 0) {
    return hand.map(c => ({ cardId: c.id }));
  }
  const ledSuit = state.playedThisTrick[0].card.suit;
  const follow = hand.filter(c => c.suit === ledSuit);
  if (follow.length > 0) return follow.map(c => ({ cardId: c.id }));
  return hand.map(c => ({ cardId: c.id }));
}

function applyAction(state, playerId, action) {
  if (!isPlayerTurn(state, playerId)) return { error: 'Non è il tuo turno' };
  const hand = state.hands[playerId];
  const cardIdx = hand.findIndex(c => c.id === action.cardId);
  if (cardIdx === -1) return { error: 'Carta non in mano' };

  if (state.playedThisTrick.length > 0) {
    const ledSuit = state.playedThisTrick[0].card.suit;
    const canFollow = hand.some(c => c.suit === ledSuit);
    const playing = hand[cardIdx];
    if (canFollow && playing.suit !== ledSuit) return { error: 'Devi rispondere al seme!' };
  }

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
  const leadingSuit = trick[0].card.suit;

  let best = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const t = trick[i];
    if (t.card.suit === leadingSuit && cardRankWeight(t.card) > cardRankWeight(best.card)) {
      best = t;
    }
  }

  const winnerId = best.playerId;
  state.captured[winnerId].push(...trick.map(t => t.card));
  state.points[winnerId] = (state.points[winnerId] || 0) + 1;
  state.events.push({ type: 'trick', winner: winnerId, cards: trick.map(t => ({ ...t })) });

  state.playedThisTrick = [];

  const allHandsEmpty = state.playerOrder.every(pid => (state.hands[pid] || []).length === 0);
  if (allHandsEmpty) {
    state.points[winnerId] = (state.points[winnerId] || 0) + 1;
    state.events.push({ type: 'lastTrick', winner: winnerId });
    endGame(state);
    return;
  }

  state.turnIndex = state.playerOrder.indexOf(winnerId);
  state.currentPlayer = state.playerOrder[state.turnIndex];
}

function endGame(state) {
  state.phase = 'gameOver';
  const gp = state.gamePoints || {};
  for (const pid of state.playerOrder) {
    gp[pid] = (gp[pid] || 0) + (state.points[pid] || 0);
  }
  state.gamePoints = gp;
  const sorted = [...state.playerOrder].sort((a, b) => (gp[b] || 0) - (gp[a] || 0));
  state.winner = sorted[0];
  state.events.push({ type: 'gameOver', winner: state.winner, points: { ...state.points }, gamePoints: { ...gp } });
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function nextRound(state) {
  const deck = shuffle(createDeck('italian40'));
  let idx = 0;
  const hands = {};
  for (const pid of state.playerOrder) {
    hands[pid] = deck.slice(idx, idx + 10);
    idx += 10;
  }
  const captured = {};
  const points = {};
  for (const pid of state.playerOrder) {
    captured[pid] = [];
    points[pid] = 0;
  }

  const prevScores = { ...(state.gamePoints || {}) };
  state.deck = deck.slice(idx);
  state.hands = hands;
  state.captured = captured;
  state.points = points;
  state.playedThisTrick = [];
  state.turnIndex = 0;
  state.currentPlayer = state.playerOrder[0];
  state.trickNumber = 0;
  state.phase = 'play';
  state.events = [{ type: 'newRound', previousScores: prevScores }];
  state.winner = null;
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => s.gamePoints || s.points, nextRound };
