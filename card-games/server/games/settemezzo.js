const { createDeck, shuffle } = require('../cards');

const meta = {
  id: 'settenmezzo',
  name: 'Sette e Mezzo',
  description: 'Arriva a 7½ senza superare! Le figure valgono mezzo punto.',
  minPlayers: 1,
  maxPlayers: 6,
  deckType: 'italian40',
};

function handValue(cards) {
  let total = 0;
  for (const c of cards) {
    if (['J', 'Q', 'K'].includes(c.rank)) total += 0.5;
    else if (c.rank === 'A' || c.rank === '1') total += 1;
    else total += parseInt(c.rank) || 0;
  }
  return total;
}

function create(players) {
  const deck = shuffle(createDeck('italian40'));
  const playerOrder = players.map(p => p.id);
  const hands = {};
  const chips = {};
  const bets = {};

  for (const pid of playerOrder) {
    hands[pid] = [];
    chips[pid] = 1000;
    bets[pid] = 0;
  }

  return {
    meta, deck, hands, chips, bets, playerOrder,
    dealerHand: [],
    currentPlayer: playerOrder[0],
    turnIndex: 0,
    phase: 'bet',
    results: {},
    events: [],
    winner: null, round: 1,
    playerDone: {},
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    dealerHand: state.phase === 'dealer' || state.phase === 'resolve' || state.phase === 'gameOver' ? state.dealerHand : [state.dealerHand[0]],
    dealerHidden: state.phase === 'dealer' || state.phase === 'resolve' || state.phase === 'gameOver' ? state.dealerHidden : null,
    chips: state.chips,
    bets: state.bets,
    results: state.results,
    handSize: {},
    events: state.events,
    winner: state.winner,
    round: state.round,
    deckSize: state.deck.length,
  };

  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
  }
  if (state.hands[playerId]) safe.hand = state.hands[playerId];
  safe.myChips = state.chips[playerId] || 0;
  safe.myBet = state.bets[playerId] || 0;
  safe.myResult = state.results[playerId] || null;
  return safe;
}

function getValidActions(state, playerId) {
  if (state.phase === 'bet' && state.currentPlayer === playerId) {
    const c = state.chips[playerId] || 0;
    if (c <= 0) return [{ type: 'bet', amount: 0 }];
    const maxBet = Math.min(c, 100);
    return [{ type: 'bet', amount: 10 }, { type: 'bet', amount: 25 }, { type: 'bet', amount: 50 }, { type: 'bet', amount: Math.min(100, c) }, { type: 'bet', amount: c }];
  }
  if (state.phase === 'play' && state.currentPlayer === playerId && !state.playerDone[playerId]) {
    return [{ type: 'hit' }, { type: 'stand' }];
  }
  if (state.phase === 'resolve' || state.phase === 'dealer') {
    return [{ type: 'nextRound' }];
  }
  return [];
}

function applyAction(state, playerId, action) {
  state.events = [];
  if (state.phase === 'bet' && state.currentPlayer === playerId) {
    if (action.type !== 'bet') return { error: 'Piazza una puntata' };
    const amount = action.amount;
    if (amount < 10 || amount > (state.chips[playerId] || 0)) return { error: 'Puntata non valida' };
    state.bets[playerId] = amount;
    state.chips[playerId] -= amount;
    state.events.push({ type: 'bet', playerId, amount });
    advanceBettor(state);
    return { ok: true };
  }

  if (state.phase === 'play' && state.currentPlayer === playerId) {
    if (action.type === 'hit') {
      if (state.deck.length === 0) return { error: 'Mazzo finito' };
      const card = state.deck.shift();
      state.hands[playerId].push(card);
      state.events.push({ type: 'hit', playerId, card });
      const hv = handValue(state.hands[playerId]);
      if (hv > 7.5) {
        state.playerDone[playerId] = true;
        state.events.push({ type: 'bust', playerId, value: hv });
        advancePlayer(state);
      } else if (hv === 7.5) {
        state.playerDone[playerId] = true;
        state.events.push({ type: 'stand', playerId, note: '7½!' });
        advancePlayer(state);
      }
      return { ok: true };
    }
    if (action.type === 'stand') {
      state.playerDone[playerId] = true;
      state.events.push({ type: 'stand', playerId });
      advancePlayer(state);
      return { ok: true };
    }
  }
  if (action.type === 'nextRound' && state.phase !== 'gameOver') {
    nextRound(state);
    return { ok: true };
  }
  return { error: 'Azione non valida' };
}

function advanceBettor(state) {
  const allBet = state.playerOrder.every(pid => state.bets[pid] > 0 || (state.chips[pid] || 0) <= 0);
  if (allBet) { dealCards(state); return; }
  const n = state.playerOrder.length;
  state.turnIndex = (state.turnIndex + 1) % n;
  state.currentPlayer = state.playerOrder[state.turnIndex];
  if (state.bets[state.currentPlayer] > 0 || (state.chips[state.currentPlayer] || 0) <= 0) {
    if ((state.chips[state.currentPlayer] || 0) <= 0) state.bets[state.currentPlayer] = 0;
    advanceBettor(state);
  }
}

function dealCards(state) {
  const deck = state.deck;
  let idx = 0;
  for (const pid of state.playerOrder) {
    if (!state.hands[pid]) state.hands[pid] = [];
    state.hands[pid].push(deck[idx++]);
  }
  state.dealerHand = [deck[idx++]];
  state.dealerHidden = null;
  state.deck = deck.slice(idx);

  state.currentPlayer = state.playerOrder[0];
  state.turnIndex = 0;
  state.phase = 'play';
  state.events.push({ type: 'deal' });
}

function advancePlayer(state) {
  const n = state.playerOrder.length;
  state.turnIndex = (state.turnIndex + 1) % n;
  state.currentPlayer = state.playerOrder[state.turnIndex];

  const allDone = state.playerOrder.every(pid => state.playerDone[pid]);
  if (!allDone) return;

  state.phase = 'dealer';
  state.events.push({ type: 'dealerTurn' });

  while (handValue(state.dealerHand) < 5) {
    if (state.deck.length === 0) break;
    state.dealerHand.push(state.deck.shift());
  }
  resolveRound(state);
}

function resolveRound(state) {
  state.phase = 'resolve';
  const dValue = handValue(state.dealerHand);
  const dBust = dValue > 7.5;

  for (const pid of state.playerOrder) {
    const pValue = handValue(state.hands[pid]);
    const pBust = pValue > 7.5;

    let result;
    if (pBust) result = 'bust';
    else if (dBust) result = 'win';
    else if (pValue > dValue) result = 'win';
    else if (pValue < dValue) result = 'lose';
    else result = 'push';

    state.results[pid] = result;

    const bet = state.bets[pid] || 0;
    if (result === 'win') state.chips[pid] += bet * 2;
    else if (result === 'push') state.chips[pid] += bet;
  }

  state.events.push({ type: 'resolve', results: state.results, dValue });
}

function nextRound(state) {
  if (state.playerOrder.length === 0) return;
  const deck = shuffle(createDeck('italian40'));
  const hands = {};
  const bets = {};
  for (const pid of state.playerOrder) {
    hands[pid] = [];
    bets[pid] = 0;
  }
  Object.assign(state, {
    deck, hands, dealerHand: [],
    currentPlayer: state.playerOrder[0], turnIndex: 0,
    phase: 'bet', results: {}, playerDone: {},
    events: [{ type: 'newRound', round: state.round + 1 }],
    winner: null, round: state.round + 1, bets,
  });
}

function isOver(state) {
  return state.phase === 'gameOver';
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => s.chips, nextRound, handValue };
