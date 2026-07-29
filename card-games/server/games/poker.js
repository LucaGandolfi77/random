const { createDeck, shuffle } = require('../cards');
const { bestHand, cardRank, handRankName, compareHands } = require('./poker-hands');

const meta = {
  id: 'poker',
  name: 'Texas Hold\'em',
  description: 'Poker Texas Hold\'em con puntate, bluff e mani da 5 carte!',
  minPlayers: 2,
  maxPlayers: 8,
  deckType: 'french52',
};

function create(players) {
  const deck = shuffle(createDeck('french52'));
  const playerOrder = players.map(p => p.id);
  const chips = {};
  const hands = {};

  for (const pid of playerOrder) {
    chips[pid] = 1000;
    hands[pid] = [];
  }

  const state = {
    meta, deck, hands, chips, playerOrder,
    communityCards: [],
    currentPlayer: playerOrder[0],
    turnIndex: 0,
    dealerIndex: 0,
    phase: 'preflop',
    round: 1,
    pot: 0,
    currentBet: 0,
    playerBet: {},
    playerDone: {},
    playerFolded: {},
    playerAllIn: {},
    lastRaiser: null,
    actionsThisRound: 0,
    results: {},
    events: [],
    winner: null,
    handOver: false,
    sbAmount: 10,
    bbAmount: 20,
    minRaise: 20,
  };

  dealHoleCards(state);
  postBlinds(state);
  return state;
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    communityCards: state.communityCards,
    pot: state.pot,
    currentBet: state.currentBet,
    playerBet: state.playerBet,
    chips: state.chips,
    handSize: {},
    events: state.events,
    winner: state.winner,
    round: state.round,
    deckSize: state.deck.length,
    handOver: state.handOver,
    sbAmount: state.sbAmount,
    bbAmount: state.bbAmount,
    playerFolded: state.playerFolded,
    playerAllIn: state.playerAllIn,
    playerDone: state.playerDone,
    results: state.results,
  };

  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
  }
  if (state.hands[playerId]) safe.hand = state.hands[playerId];
  safe.myChips = state.chips[playerId] || 0;
  safe.myBet = state.playerBet[playerId] || 0;
  return safe;
}

function getActivePlayers(state) {
  return state.playerOrder.filter(pid => !state.playerFolded[pid]);
}

function getValidActions(state, playerId) {
  if (state.handOver) return [{ type: 'nextRound' }];
  if (state.currentPlayer !== playerId) return [];
  if (state.playerDone[playerId] || state.playerFolded[playerId] || state.playerAllIn[playerId]) return [];
  if (state.phase === 'showdown' || state.phase === 'resolve') return [];

  const myChips = state.chips[playerId] || 0;
  const toCall = state.currentBet - (state.playerBet[playerId] || 0);

  const actions = [];
  actions.push({ type: 'fold' });
  if (toCall === 0) {
    actions.push({ type: 'check' });
    if (myChips > 0) actions.push({ type: 'raise', amount: Math.min(state.minRaise, myChips) });
  } else {
    actions.push({ type: 'call', amount: Math.min(toCall, myChips) });
    const total = toCall + state.minRaise;
    if (myChips > toCall) actions.push({ type: 'raise', amount: Math.min(total, myChips) });
  }
  actions.push({ type: 'allIn', amount: myChips });

  return actions;
}

function applyAction(state, playerId, action) {
  state.events = [];
  if (state.handOver) {
    if (action.type === 'nextRound') { nextHand(state); return { ok: true }; }
    return { error: 'Mano finita' };
  }

  if (state.currentPlayer !== playerId) return { error: 'Non è il tuo turno' };
  if (state.playerDone[playerId] || state.playerFolded[playerId] || state.playerAllIn[playerId]) return { error: 'Già agito' };

  const myChips = state.chips[playerId] || 0;
  const currentBet = state.playerBet[playerId] || 0;
  const toCall = state.currentBet - currentBet;

  if (action.type === 'fold') {
    state.playerFolded[playerId] = true;
    state.events.push({ type: 'fold', playerId });
    advanceAction(state);
    return { ok: true };
  }

  if (action.type === 'check') {
    if (toCall > 0) return { error: 'Devi chiamare o lasciare' };
    state.playerDone[playerId] = true;
    state.events.push({ type: 'check', playerId });
    advanceAction(state);
    return { ok: true };
  }

  if (action.type === 'call') {
    const callAmount = Math.min(toCall, myChips);
    state.chips[playerId] -= callAmount;
    state.playerBet[playerId] = (state.playerBet[playerId] || 0) + callAmount;
    state.pot += callAmount;
    state.playerDone[playerId] = true;
    state.events.push({ type: 'call', playerId, amount: callAmount });
    if (myChips <= toCall) state.playerAllIn[playerId] = true;
    advanceAction(state);
    return { ok: true };
  }

  if (action.type === 'raise' || action.type === 'allIn') {
    let raiseAmount = action.amount;
    if (raiseAmount > myChips) raiseAmount = myChips;
    const totalBet = currentBet + raiseAmount;

    const newTotal = state.currentBet + (raiseAmount - toCall);
    if (totalBet > state.currentBet) {
      state.currentBet = totalBet;
      state.minRaise = totalBet - currentBet;
      state.lastRaiser = playerId;
    }

    state.chips[playerId] -= raiseAmount;
    state.playerBet[playerId] = (state.playerBet[playerId] || 0) + raiseAmount;
    state.pot += raiseAmount;

    for (const pid of state.playerOrder) {
      if (!state.playerFolded[pid] && pid !== playerId) state.playerDone[pid] = false;
    }
    state.playerDone[playerId] = true;
    if (myChips <= raiseAmount) state.playerAllIn[playerId] = true;
    state.actionsThisRound++;

    state.events.push({ type: 'raise', playerId, amount: raiseAmount, totalBet: state.playerBet[playerId] || 0 });
    advanceAction(state);
    return { ok: true };
  }

  return { error: 'Azione non valida' };
}

function advanceAction(state) {
  const active = getActivePlayers(state);
  if (active.length <= 1) {
    endHand(state);
    return;
  }

  const allDone = state.playerOrder.filter(pid => !state.playerFolded[pid]).every(pid => state.playerDone[pid] || state.playerAllIn[pid]);
  if (!allDone) {
    advanceTurn(state);
    return;
  }

  advancePhase(state);
}

function advanceTurn(state) {
  const n = state.playerOrder.length;
  for (let i = 0; i < n; i++) {
    state.turnIndex = (state.turnIndex + 1) % n;
    state.currentPlayer = state.playerOrder[state.turnIndex];
    if (!state.playerFolded[state.currentPlayer] && !state.playerDone[state.currentPlayer] && !state.playerAllIn[state.currentPlayer]) return;
  }
  advancePhase(state);
}

function advancePhase(state) {
  if (state.deck.length < 5) { endHand(state); return; }

  if (state.phase === 'preflop') {
    state.phase = 'flop';
    state.communityCards.push(state.deck.shift(), state.deck.shift(), state.deck.shift());
    state.events.push({ type: 'flop', cards: [...state.communityCards] });
  } else if (state.phase === 'flop') {
    state.phase = 'turn';
    state.communityCards.push(state.deck.shift());
    state.events.push({ type: 'turn', card: state.communityCards[state.communityCards.length - 1] });
  } else if (state.phase === 'turn') {
    state.phase = 'river';
    state.communityCards.push(state.deck.shift());
    state.events.push({ type: 'river', card: state.communityCards[state.communityCards.length - 1] });
  } else {
    state.phase = 'showdown';
    resolveShowdown(state);
    return;
  }

  state.currentBet = 0;
  state.playerBet = {};
  state.playerDone = {};
  for (const pid of state.playerOrder) {
    if (!state.playerFolded[pid]) state.playerDone[pid] = false;
  }
  state.minRaise = 20;
  state.lastRaiser = null;
  state.actionsThisRound = 0;

  state.turnIndex = state.dealerIndex;
  advanceTurn(state);
}

function resolveShowdown(state) {
  state.events.push({ type: 'showdown' });
  const active = getActivePlayers(state);
  let best = null;
  let bestPlayers = [];

  for (const pid of active) {
    const hand = bestHand([...state.hands[pid], ...state.communityCards]);
    state.results[pid] = hand;
    state.events.push({ type: 'hand', playerId: pid, handName: hand.name, cards: [...state.hands[pid]] });
    if (!best || compareHands(hand, best) > 0) {
      best = hand;
      bestPlayers = [pid];
    } else if (compareHands(hand, best) === 0) {
      bestPlayers.push(pid);
    }
  }

  const split = Math.floor(state.pot / bestPlayers.length);
  for (const pid of bestPlayers) {
    state.chips[pid] += split;
    state.events.push({ type: 'win', playerId: pid, amount: split, handName: best.name });
  }
  if (bestPlayers.length > 1) {
    const remainder = state.pot - split * bestPlayers.length;
    if (remainder > 0) state.chips[bestPlayers[0]] += remainder;
    state.events.push({ type: 'split', players: bestPlayers, each: split });
  }

  state.winner = bestPlayers[0];
  endHand(state);
}

function endHand(state) {
  state.handOver = true;
  state.events.push({ type: 'handOver', pot: state.pot });
  const active = getActivePlayers(state);
  if (active.length <= 1 && active.length > 0) {
    state.chips[active[0]] += state.pot;
    state.winner = active[0];
    state.events.push({ type: 'win', playerId: active[0], amount: state.pot, handName: 'Fold' });
    state.pot = 0;
  }
  state.phase = 'resolve';

  const stillIn = state.playerOrder.filter(pid => (state.chips[pid] || 0) > 0);
  if (stillIn.length <= 1) {
    state.phase = 'gameOver';
    state.winner = stillIn[0] || state.winner;
    state.events.push({ type: 'gameOver', winner: state.winner });
  }
}

function dealHoleCards(state) {
  for (const pid of state.playerOrder) {
    state.hands[pid] = [state.deck.shift(), state.deck.shift()];
  }
}

function postBlinds(state) {
  const n = state.playerOrder.length;
  const sbIdx = (state.dealerIndex + 1) % n;
  const bbIdx = (state.dealerIndex + 2) % n;
  const sbPlayer = state.playerOrder[sbIdx];
  const bbPlayer = state.playerOrder[bbIdx];

  const sbAmount = Math.min(state.sbAmount, state.chips[sbPlayer] || 0);
  state.chips[sbPlayer] -= sbAmount;
  state.playerBet[sbPlayer] = sbAmount;
  state.pot += sbAmount;
  if (state.chips[sbPlayer] <= 0) state.playerAllIn[sbPlayer] = true;
  state.events.push({ type: 'blind', playerId: sbPlayer, amount: sbAmount, blind: 'small' });

  const bbAmount = Math.min(state.bbAmount, state.chips[bbPlayer] || 0);
  state.chips[bbPlayer] -= bbAmount;
  state.playerBet[bbPlayer] = bbAmount;
  state.pot += bbAmount;
  state.currentBet = bbAmount;
  if (state.chips[bbPlayer] <= 0) state.playerAllIn[bbPlayer] = true;
  state.events.push({ type: 'blind', playerId: bbPlayer, amount: bbAmount, blind: 'big' });

  state.turnIndex = (bbIdx + 1) % n;
  state.currentPlayer = state.playerOrder[state.turnIndex];
}

function nextHand(state) {
  const stillIn = state.playerOrder.filter(pid => (state.chips[pid] || 0) > 0);
  if (stillIn.length <= 1) {
    state.phase = 'gameOver';
    state.winner = stillIn[0] || state.winner;
    state.events.push({ type: 'gameOver', winner: state.winner });
    return;
  }

  state.dealerIndex = (state.dealerIndex + 1) % state.playerOrder.length;
  repeatDealUntilActive(state);
}

function repeatDealUntilActive(state) {
  const stillIn = state.playerOrder.filter(pid => (state.chips[pid] || 0) > 0);
  if (stillIn.length <= 1) {
    state.phase = 'gameOver';
    state.winner = stillIn[0] || state.winner;
    state.events.push({ type: 'gameOver', winner: state.winner });
    return;
  }

  const deck = shuffle(createDeck('french52'));
  state.deck = deck;
  state.communityCards = [];
  state.pot = 0;
  state.currentBet = 0;
  state.playerBet = {};
  state.playerDone = {};
  state.playerFolded = {};
  state.playerAllIn = {};
  state.lastRaiser = null;
  state.actionsThisRound = 0;
  state.results = {};
  state.winner = null;
  state.handOver = false;
  state.minRaise = 20;
  state.phase = 'preflop';

  for (const pid of state.playerOrder) {
    state.hands[pid] = [];
    if ((state.chips[pid] || 0) <= 0) state.playerFolded[pid] = true;
  }

  dealHoleCards(state);
  postBlinds(state);
  state.events.push({ type: 'newHand', dealer: state.playerOrder[state.dealerIndex] });
}

function isOver(state) {
  return state.phase === 'gameOver';
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => s.chips, nextRound: nextHand, bestHand, handRankName };
