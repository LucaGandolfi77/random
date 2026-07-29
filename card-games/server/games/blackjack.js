const { createDeck, shuffle } = require('../cards');

const meta = {
  id: 'blackjack',
  name: 'Blackjack',
  description: 'Arriva a 21 senza superare il banco! Paga 3:2 per il blackjack.',
  minPlayers: 1,
  maxPlayers: 6,
  deckType: 'french52',
};

function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; total += 11; }
    else if (['K', 'Q', 'J', '10'].includes(c.rank)) total += 10;
    else total += parseInt(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

function create(players) {
  const deck = shuffle(createDeck('french52'));
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
    dealerHidden: null,
    currentPlayer: playerOrder[0],
    turnIndex: 0,
    phase: 'bet',
    results: {},
    events: [],
    winner: null, round: 1,
    playerDone: {},
    blackjacks: {},
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
    if (state.blackjacks[playerId]) return [{ type: 'stand' }];
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
    if (action.type !== 'bet') return { error: 'Place a bet' };
    const amount = action.amount;
    if (amount < 10 || amount > (state.chips[playerId] || 0)) return { error: 'Invalid bet amount' };
    state.bets[playerId] = amount;
    state.chips[playerId] -= amount;
    state.events.push({ type: 'bet', playerId, amount });
    advanceBettor(state);
    return { ok: true };
  }

  if (state.phase === 'play' && state.currentPlayer === playerId) {
    if (action.type === 'hit') {
      if (state.deck.length === 0) return { error: 'No cards left' };
      const card = state.deck.shift();
      state.hands[playerId].push(card);
      state.events.push({ type: 'hit', playerId, card });
      const hv = handValue(state.hands[playerId]);
      if (hv > 21) {
        state.playerDone[playerId] = true;
        state.events.push({ type: 'bust', playerId, value: hv });
        advancePlayer(state);
      } else if (hv === 21) {
        state.playerDone[playerId] = true;
        state.events.push({ type: 'stand', playerId, note: '21' });
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
  return { error: 'Invalid action' };
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
  for (let i = 0; i < 2; i++) {
    for (const pid of state.playerOrder) {
      if (!state.hands[pid]) state.hands[pid] = [];
      state.hands[pid].push(deck[idx++]);
    }
    if (i === 0) state.dealerHand = [deck[idx++]];
    else state.dealerHidden = deck[idx++];
  }
  state.dealerHand.push(state.dealerHidden);
  state.deck = deck.slice(idx);

  for (const pid of state.playerOrder) {
    if (isBlackjack(state.hands[pid])) {
      state.blackjacks[pid] = true;
      state.events.push({ type: 'blackjack', playerId: pid });
    }
  }

  if (isBlackjack(state.dealerHand)) {
    state.phase = 'dealer';
    state.events.push({ type: 'dealerBlackjack' });
    resolveRound(state);
    return;
  }

  state.currentPlayer = state.playerOrder[0];
  state.turnIndex = 0;
  state.phase = 'play';
  state.events.push({ type: 'deal' });

  const first = state.currentPlayer;
  if (state.blackjacks[first]) {
    state.playerDone[first] = true;
    advancePlayer(state);
  }
}

function advancePlayer(state) {
  const n = state.playerOrder.length;
  state.turnIndex = (state.turnIndex + 1) % n;
  state.currentPlayer = state.playerOrder[state.turnIndex];

  const allDone = state.playerOrder.every(pid => state.playerDone[pid]);
  if (!allDone) {
    if (state.blackjacks[state.currentPlayer]) {
      state.playerDone[state.currentPlayer] = true;
      advancePlayer(state);
    }
    return;
  }

  state.phase = 'dealer';
  state.events.push({ type: 'dealerTurn' });
  state.dealerHand = [state.dealerHand[0], state.dealerHidden];

  while (handValue(state.dealerHand) < 17) {
    if (state.deck.length === 0) break;
    state.dealerHand.push(state.deck.shift());
    state.events.push({ type: 'dealerHit', card: state.dealerHand[state.dealerHand.length - 1] });
  }
  resolveRound(state);
}

function resolveRound(state) {
  state.phase = 'resolve';
  const dValue = handValue(state.dealerHand);
  const dBJ = isBlackjack(state.dealerHand);
  const dBust = dValue > 21;

  for (const pid of state.playerOrder) {
    const pValue = handValue(state.hands[pid]);
    const pBJ = isBlackjack(state.hands[pid]);
    const pBust = pValue > 21;

    let result;
    if (pBJ) result = dBJ ? 'push' : 'blackjack';
    else if (pBust) result = 'bust';
    else if (dBust) result = 'win';
    else if (pValue > dValue) result = 'win';
    else if (pValue < dValue) result = 'lose';
    else result = 'push';

    state.results[pid] = result;

    const bet = state.bets[pid] || 0;
    if (result === 'blackjack') state.chips[pid] += bet + Math.floor(bet * 1.5);
    else if (result === 'win') state.chips[pid] += bet * 2;
    else if (result === 'push') state.chips[pid] += bet;
    else if (bet > 0) state.chips[pid] -= 0;
  }

  state.events.push({ type: 'resolve', results: state.results, dValue, dHand: state.dealerHand.map(c => c.id) });
}

function nextRound(state) {
  if (state.playerOrder.length === 0) return;
  const deck = shuffle(createDeck('french52'));
  const hands = {};
  const bets = {};
  for (const pid of state.playerOrder) {
    hands[pid] = [];
    bets[pid] = 0;
  }
  Object.assign(state, {
    deck, hands, dealerHand: [], dealerHidden: null,
    currentPlayer: state.playerOrder[0], turnIndex: 0,
    phase: 'bet', results: {}, playerDone: {}, blackjacks: {},
    events: [{ type: 'newRound', round: state.round + 1 }],
    winner: null, round: state.round + 1, bets,
  });
}

function isOver(state) {
  return state.phase === 'gameOver';
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => s.chips, nextRound, handValue };
