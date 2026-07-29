const { shuffle } = require('../cards');

const UNO_COLORS = [
  { color: 'red', hex: '#D32F2F', symbol: 'R' },
  { color: 'yellow', hex: '#FFC107', symbol: 'G' },
  { color: 'green', hex: '#2E7D32', symbol: 'V' },
  { color: 'blue', hex: '#1565C0', symbol: 'B' },
];

const meta = {
  id: 'uno',
  name: 'UNO',
  description: 'Carte speciali: Salta, Inverti, Pesca Due, Jolly, Jolly Pesca Quattro!',
  minPlayers: 2,
  maxPlayers: 6,
  deckType: 'uno',
};

function createUnoDeck() {
  const deck = [];
  let uid = 0;
  for (const { color, hex, symbol } of UNO_COLORS) {
    deck.push({ id: `${color}-0`, uid: uid++, color, type: 'number', rank: '0', suit: color, suitColor: hex, suitSymbol: symbol });
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: `${color}-${n}a`, uid: uid++, color, type: 'number', rank: String(n), suit: color, suitColor: hex, suitSymbol: symbol });
      deck.push({ id: `${color}-${n}b`, uid: uid++, color, type: 'number', rank: String(n), suit: color, suitColor: hex, suitSymbol: symbol });
    }
    deck.push({ id: `${color}-skip-a`, uid: uid++, color, type: 'skip', rank: '🚫', suit: color, suitColor: hex, suitSymbol: symbol });
    deck.push({ id: `${color}-skip-b`, uid: uid++, color, type: 'skip', rank: '🚫', suit: color, suitColor: hex, suitSymbol: symbol });
    deck.push({ id: `${color}-reverse-a`, uid: uid++, color, type: 'reverse', rank: '🔄', suit: color, suitColor: hex, suitSymbol: symbol });
    deck.push({ id: `${color}-reverse-b`, uid: uid++, color, type: 'reverse', rank: '🔄', suit: color, suitColor: hex, suitSymbol: symbol });
    deck.push({ id: `${color}-draw2-a`, uid: uid++, color, type: 'draw2', rank: '+2', suit: color, suitColor: hex, suitSymbol: symbol });
    deck.push({ id: `${color}-draw2-b`, uid: uid++, color, type: 'draw2', rank: '+2', suit: color, suitColor: hex, suitSymbol: symbol });
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild-${i}`, uid: uid++, color: null, type: 'wild', rank: '★', suit: 'wild', suitColor: '#222', suitSymbol: 'W' });
    deck.push({ id: `wild4-${i}`, uid: uid++, color: null, type: 'wild4', rank: '★+4', suit: 'wild', suitColor: '#D32F2F', suitSymbol: 'W4' });
  }
  return deck;
}

function create(players) {
  let deck = shuffle(createUnoDeck());
  const playerOrder = players.map(p => p.id);
  const hands = {};
  for (const pid of playerOrder) hands[pid] = [];

  for (let i = 0; i < 7; i++) {
    for (const pid of playerOrder) hands[pid].push(deck.pop());
  }

  let discardTop = deck.pop();
  while (discardTop.type === 'wild' || discardTop.type === 'wild4') {
    deck.unshift(discardTop);
    deck = shuffle(deck);
    discardTop = deck.pop();
  }

  return {
    meta, deck, hands, playerOrder,
    discardPile: [discardTop],
    currentColor: discardTop.color,
    currentPlayer: playerOrder[0],
    turnIndex: 0,
    direction: 1,
    phase: 'play',
    pendingDraw: 0,
    unoCalled: {},
    events: [],
    winner: null,
    round: 1,
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    discardTop: state.discardPile[state.discardPile.length - 1],
    currentColor: state.currentColor,
    direction: state.direction,
    pendingDraw: state.pendingDraw,
    handSize: {},
    events: state.events,
    winner: state.winner,
    round: state.round,
    deckSize: state.deck.length,
    discardCount: state.discardPile.length,
  };
  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
  }
  if (state.hands[playerId]) safe.hand = state.hands[playerId];
  return safe;
}

function getValidActions(state, playerId) {
  if (state.phase === 'chooseColor' && state.currentPlayer === playerId) {
    return UNO_COLORS.map(c => ({ type: 'chooseColor', color: c.color }));
  }
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return [];
  if (state.pendingDraw > 0) {
    return [{ type: 'draw' }];
  }
  const hand = state.hands[playerId] || [];
  const top = state.discardPile[state.discardPile.length - 1];
  const playable = hand.filter(c =>
    c.color === state.currentColor ||
    c.type === top.type ||
    c.type === 'wild' ||
    c.type === 'wild4'
  );
  if (playable.length === 0) return [{ type: 'draw' }];
  return playable.map(c => ({ type: 'play', cardId: c.id }));
}

function applyAction(state, playerId, action) {
  state.events = [];
  if (state.phase === 'chooseColor' && state.currentPlayer === playerId) {
    if (action.type !== 'chooseColor') return { error: 'Scegli un colore' };
    state.currentColor = action.color;
    state.events.push({ type: 'colorChosen', color: action.color });
    state.phase = 'play';
    if (state.pendingDraw > 0) {
      drawCards(state, nextPlayerIndex(state));
      state.pendingDraw = 0;
      advanceTurn(state);
    } else {
      advanceTurn(state);
    }
    return { ok: true };
  }

  if (state.phase !== 'play' || state.currentPlayer !== playerId) return { error: 'Non è il tuo turno' };

  const hand = state.hands[playerId];
  if (!hand) return { error: 'Giocatore non trovato' };

  if (action.type === 'draw') {
    if (state.pendingDraw > 0) {
      drawCards(state, state.turnIndex, state.pendingDraw);
      state.pendingDraw = 0;
      advanceTurn(state);
    } else {
      const card = state.deck.pop();
      if (!card) return { error: 'Mazzo finito' };
      hand.push(card);
      state.events.push({ type: 'draw', playerId, count: 1 });
      const top = state.discardPile[state.discardPile.length - 1];
      if (card.color === state.currentColor || card.type === top.type || card.type === 'wild' || card.type === 'wild4') {
        state.events.push({ type: 'mayPlay' });
      }
      advanceTurn(state);
    }
    return { ok: true };
  }

  if (action.type === 'play') {
    const idx = hand.findIndex(c => c.id === action.cardId);
    if (idx === -1) return { error: 'Carta non in mano' };
    const card = hand[idx];
    const top = state.discardPile[state.discardPile.length - 1];
    const canPlay = card.color === state.currentColor || card.type === top.type || card.type === 'wild' || card.type === 'wild4';
    if (!canPlay) return { error: 'Carta non giocabile' };

    hand.splice(idx, 1);
    state.discardPile.push(card);
    state.events.push({ type: 'play', playerId, card });

    if (hand.length === 0) {
      state.winner = playerId;
      state.phase = 'gameOver';
      state.events.push({ type: 'gameOver', winner: playerId });
      return { ok: true };
    }

    if (card.type === 'wild' || card.type === 'wild4') {
      state.phase = 'chooseColor';
      if (card.type === 'wild4') state.pendingDraw = 4;
      state.events.push({ type: 'chooseColor', playerId });
      return { ok: true };
    }

    if (card.type === 'skip') {
      advanceTurn(state);
      advanceTurn(state);
      return { ok: true };
    }

    if (card.type === 'reverse') {
      if (state.playerOrder.length === 2) {
        advanceTurn(state);
        advanceTurn(state);
      } else {
        state.direction *= -1;
        advanceTurn(state);
      }
      state.events.push({ type: 'reverse' });
      return { ok: true };
    }

    if (card.type === 'draw2') {
      state.pendingDraw = 2;
      advanceTurn(state);
      drawCards(state, state.turnIndex, 2);
      state.pendingDraw = 0;
      advanceTurn(state);
      state.events.push({ type: 'drawPenalty', playerId: nextPlayerId(state), count: 2 });
      return { ok: true };
    }

    state.currentColor = card.color;
    advanceTurn(state);
    return { ok: true };
  }

  return { error: 'Azione non valida' };
}

function nextPlayerIndex(state) {
  const n = state.playerOrder.length;
  return (state.turnIndex + state.direction + n) % n;
}

function nextPlayerId(state) {
  return state.playerOrder[nextPlayerIndex(state)];
}

function advanceTurn(state) {
  state.turnIndex = nextPlayerIndex(state);
  state.currentPlayer = state.playerOrder[state.turnIndex];
}

function drawCards(state, idx, count) {
  const pid = state.playerOrder[idx];
  if (!state.hands[pid]) state.hands[pid] = [];
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) break;
    const card = state.deck.pop();
    state.hands[pid].push(card);
    drawn.push(card);
  }
  if (drawn.length > 0) state.events.push({ type: 'draw', playerId: pid, count: drawn.length });
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function nextRound(state) {
  const deck = shuffle(createUnoDeck());
  const hands = {};
  for (const pid of state.playerOrder) hands[pid] = [];
  for (let i = 0; i < 7; i++) {
    for (const pid of state.playerOrder) hands[pid].push(deck.pop());
  }
  let discardTop = deck.pop();
  while (discardTop.type === 'wild' || discardTop.type === 'wild4') {
    deck.unshift(discardTop);
    shuffle(deck);
    discardTop = deck.pop();
  }
  Object.assign(state, {
    deck, hands,
    discardPile: [discardTop],
    currentColor: discardTop.color,
    currentPlayer: state.playerOrder[0],
    turnIndex: 0,
    direction: 1,
    phase: 'play',
    pendingDraw: 0,
    unoCalled: {},
    events: [{ type: 'newRound', round: state.round + 1 }],
    winner: null, round: state.round + 1,
  });
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => { const r = {}; for (const pid of s.playerOrder) r[pid] = s.hands[pid] ? s.hands[pid].length : 0; return r; }, nextRound };
