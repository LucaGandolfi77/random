const { createDeck, shuffle } = require('../cards');

const meta = {
  id: 'scopa',
  name: 'Scopa',
  description: 'Pigiare le carte sul tavolo e fare la scopa! Obiettivo: 11 punti a partita.',
  minPlayers: 2,
  maxPlayers: 4,
  deckType: 'italian40',
  targetScore: 11,
};

const PRIMIERA_MAP = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 };

function findCombinations(cards, target) {
  const results = [];
  function bt(start, sel, sum) {
    if (sum === target) { results.push([...sel]); return; }
    if (sum > target) return;
    for (let i = start; i < cards.length; i++) {
      sel.push(cards[i]);
      bt(i + 1, sel, sum + cards[i].value);
      sel.pop();
    }
  }
  bt(0, [], 0);
  return results;
}

function getCaptureOptions(handCard, tableCards) {
  const singles = tableCards.filter(c => c.value === handCard.value);
  if (singles.length > 0) {
    return singles.map(c => ({ cardId: handCard.id, take: [c.id], autoCapture: c.id }));
  }
  const combos = findCombinations(tableCards, handCard.value);
  const opts = combos.map(c => ({ cardId: handCard.id, take: c.map(x => x.id), combo: true }));
  opts.push({ cardId: handCard.id, take: null });
  return opts;
}

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
  const table = deck.slice(idx, idx + 4);
  idx += 4;
  const remaining = deck.slice(idx);

  const captured = {};
  for (const pid of playerOrder) captured[pid] = [];

  return {
    meta,
    deck: remaining,
    hands,
    table,
    captured,
    scopePoints: {},
    roundScores: {},
    cumulativeScores: {},
    currentPlayer: playerOrder[0],
    playerOrder,
    turnIndex: 0,
    phase: 'play',
    round: 1,
    events: [],
    winner: null,
    lastTaker: null,
    lastCapture: null,
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    round: state.round,
    table: state.table,
    capturedCount: {},
    handSize: {},
    events: state.events,
    winner: state.winner,
    scores: state.cumulativeScores,
    roundScores: state.roundScores,
    scopePoints: state.scopePoints,
    deckSize: state.deck ? state.deck.length : 0,
  };
  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
    safe.capturedCount[pid] = (state.captured[pid] || []).length;
  }
  if (state.hands[playerId]) safe.hand = state.hands[playerId];
  safe.captured = state.captured[playerId] || [];
  return safe;
}

function isPlayerTurn(state, playerId) {
  return state.currentPlayer === playerId && state.phase === 'play';
}

function getValidActions(state, playerId) {
  if (!isPlayerTurn(state, playerId)) return [];
  const hand = state.hands[playerId] || [];
  const table = state.table || [];
  const actions = [];
  for (const card of hand) {
    actions.push(...getCaptureOptions(card, table));
  }
  return actions;
}

function applyAction(state, playerId, action) {
  if (!isPlayerTurn(state, playerId)) return { error: 'Not your turn' };
  const hand = state.hands[playerId];
  const cardIdx = hand.findIndex(c => c.id === action.cardId);
  if (cardIdx === -1) return { error: 'Card not in hand' };
  const card = hand[cardIdx];

  hand.splice(cardIdx, 1);
  state.events = [];
  const data = { card, playerId };

  if (action.take && action.take.length > 0) {
    const takeCards = [];
    for (const tid of action.take) {
      const ti = state.table.findIndex(tc => tc.id === tid);
      if (ti === -1) return { error: `Card ${tid} not on table` };
      takeCards.push(state.table.splice(ti, 1)[0]);
    }
    const sum = takeCards.reduce((s, c) => s + c.value, 0);
    if (sum !== card.value) return { error: 'Sum mismatch' };
    state.captured[playerId].push(card, ...takeCards);
    state.lastTaker = playerId;
    state.lastCapture = { card, taken: takeCards };
    data.taken = takeCards;
    state.events.push({ type: 'capture', ...data });

    if (state.table.length === 0) {
      state.scopePoints[playerId] = (state.scopePoints[playerId] || 0) + 1;
      state.events.push({ type: 'scopa', playerId });
    }
  } else {
    state.table.push(card);
    state.events.push({ type: 'play', ...data });
  }

  advanceTurn(state);
  return { ok: true };
}

function advanceTurn(state) {
  const n = state.playerOrder.length;
  state.turnIndex = (state.turnIndex + 1) % n;
  state.currentPlayer = state.playerOrder[state.turnIndex];

  const allHandsEmpty = state.playerOrder.every(pid => (state.hands[pid] || []).length === 0);
  if (allHandsEmpty) {
    if (state.deck && state.deck.length > 0) {
      dealNextHand(state);
    } else {
      endRound(state);
    }
  }
}

function dealNextHand(state) {
  for (const pid of state.playerOrder) {
    if (!state.hands[pid]) state.hands[pid] = [];
    if (state.deck.length > 0) {
      const cards = state.deck.splice(0, 3);
      state.hands[pid] = cards;
    }
  }
  state.events.push({ type: 'deal' });
}

function endRound(state) {
  if (state.lastTaker && state.table.length > 0) {
    const remaining = state.table.splice(0);
    state.captured[state.lastTaker].push(...remaining);
    state.events.push({ type: 'sweep', playerId: state.lastTaker, cards: remaining });
  }

  const scores = scoreRound(state);
  state.roundScores = scores;
  state.events.push({ type: 'roundScore', scores });

  for (const pid of state.playerOrder) {
    state.cumulativeScores[pid] = (state.cumulativeScores[pid] || 0) + (scores[pid] || 0);
  }

  const target = state.meta.targetScore;
  const reached = state.playerOrder.filter(pid => (state.cumulativeScores[pid] || 0) >= target);
  if (reached.length > 0) {
    reached.sort((a, b) => (state.cumulativeScores[b] || 0) - (state.cumulativeScores[a] || 0));
    state.winner = reached[0];
    state.phase = 'gameOver';
    state.events.push({ type: 'gameOver', winner: state.winner, finalScores: { ...state.cumulativeScores } });
  } else {
    state.phase = 'roundEnd';
    state.events.push({ type: 'roundEnd' });
  }
}

function scoreRound(state) {
  const scores = {};
  for (const pid of state.playerOrder) scores[pid] = 0;

  for (const pid of state.playerOrder) scores[pid] += (state.scopePoints[pid] || 0);

  const captCounts = {};
  for (const pid of state.playerOrder) captCounts[pid] = (state.captured[pid] || []).length;
  const maxCards = Math.max(...Object.values(captCounts));
  const cardLeaders = state.playerOrder.filter(pid => captCounts[pid] === maxCards);
  if (cardLeaders.length === 1) scores[cardLeaders[0]] += 1;

  const denariCounts = {};
  for (const pid of state.playerOrder) denariCounts[pid] = (state.captured[pid] || []).filter(c => c.suit === 'denari').length;
  const maxDenari = Math.max(...Object.values(denariCounts));
  const denariLeaders = state.playerOrder.filter(pid => denariCounts[pid] === maxDenari);
  if (denariLeaders.length === 1 && maxDenari > 0) scores[denariLeaders[0]] += 1;

  for (const pid of state.playerOrder) {
    if ((state.captured[pid] || []).some(c => c.rank === '7' && c.suit === 'denari')) {
      scores[pid] += 1;
      break;
    }
  }

  const primieraScores = {};
  for (const pid of state.playerOrder) {
    const captured = state.captured[pid] || [];
    const bySuit = {};
    for (const c of captured) {
      const pv = PRIMIERA_MAP[c.value] || 0;
      if (!bySuit[c.suit] || pv > (PRIMIERA_MAP[bySuit[c.suit].value] || 0)) {
        bySuit[c.suit] = c;
      }
    }
    const suits = Object.values(bySuit);
    if (suits.length === 4) {
      primieraScores[pid] = suits.reduce((s, c) => s + (PRIMIERA_MAP[c.value] || 0), 0);
    } else {
      primieraScores[pid] = 0;
    }
  }
  const maxPrim = Math.max(...Object.values(primieraScores));
  if (maxPrim > 0) {
    const primLeaders = state.playerOrder.filter(pid => primieraScores[pid] === maxPrim);
    if (primLeaders.length === 1) scores[primLeaders[0]] += 1;
  }

  return scores;
}

function nextRound(state) {
  const deck = shuffle(createDeck('italian40'));
  let idx = 0;
  const hands = {};
  for (const pid of state.playerOrder) {
    hands[pid] = deck.slice(idx, idx + 3);
    idx += 3;
  }
  const table = deck.slice(idx, idx + 4);
  idx += 4;
  const remaining = deck.slice(idx);

  const captured = {};
  for (const pid of state.playerOrder) captured[pid] = [];

  state.deck = remaining;
  state.hands = hands;
  state.table = table;
  state.captured = captured;
  state.scopePoints = {};
  state.roundScores = {};
  state.turnIndex = 0;
  state.currentPlayer = state.playerOrder[0];
  state.phase = 'play';
  state.round += 1;
  state.lastTaker = null;
  state.events = [{ type: 'newRound', round: state.round, previousScores: state.roundScores }];
}

function isOver(state) {
  return state.phase === 'gameOver';
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => s.roundScores, nextRound, scoreRound };
