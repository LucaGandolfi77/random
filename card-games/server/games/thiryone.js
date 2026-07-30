const { shuffle } = require('../cards');

const CARD_VALUES = { A: 11, K: 10, Q: 10, J: 10, '10': 10, '9': 9, '8': 8, '7': 7 };
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: '#D32F2F', diamonds: '#D4A017', clubs: '#212121', spades: '#212121' };

const INITIAL_LIVES = 3;
const DECK_RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const meta = {
  id: 'thiryone',
  name: '31',
  description: 'Carte dello stesso seme per fare 31! Scambia, chiudi, o dichiara 31.',
  minPlayers: 2,
  maxPlayers: 6,
  deckType: 'french32',
};

function createDeck32() {
  const deck = [];
  let uid = 0;
  for (const suit of SUITS) {
    for (const rank of DECK_RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        uid: uid++,
        suit, rank,
        value: CARD_VALUES[rank],
        deckType: 'french32',
        suitSymbol: SUIT_SYMBOLS[suit],
        suitColor: SUIT_COLORS[suit],
        suitLabel: suit,
      });
    }
  }
  return deck;
}

function handValue(cards) {
  if (!cards || cards.length !== 3) return 0;
  const v = cards[0].value;
  if (cards.every(c => c.rank === cards[0].rank)) {
    if (cards[0].rank === 'A') return 32;
    return 30.5;
  }
  let best = 0;
  for (const suit of SUITS) {
    const total = cards.filter(c => c.suit === suit).reduce((s, c) => s + c.value, 0);
    if (total > best) best = total;
  }
  return best;
}

function create(players) {
  Object.keys(botMemory).forEach(k => delete botMemory[k]);
  const deck = shuffle(createDeck32());
  const playerOrder = players.map(p => p.id);
  const n = playerOrder.length;

  const hands = {};
  const lives = {};
  for (const pid of playerOrder) {
    hands[pid] = deck.splice(0, 3);
    lives[pid] = INITIAL_LIVES;
  }

  const pool = deck.splice(0, 3);

  return {
    meta, deck, pool, hands, playerOrder, lives,
    currentPlayer: playerOrder[0],
    turnIndex: 0, dealerIndex: 0,
    phase: 'play',
    knocked: false, knocker: null, turnsAfterKnock: 0,
  round: 1,
  events: [], winner: null,
};
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase, currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    pool: state.pool,
    handSize: {},
    lives: state.lives,
    knocked: state.knocked, knocker: state.knocker,
    deckSize: state.deck.length,
    events: state.events, winner: state.winner,
    round: state.round,
  };
  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
  }
  if (state.hands[playerId]) {
    safe.hand = state.hands[playerId];
    safe.handValue = handValue(state.hands[playerId]);
  }
  return safe;
}

function isPlayerTurn(state, playerId) {
  return state.currentPlayer === playerId && state.phase === 'play';
}

function getValidActions(state, playerId) {
  if (!isPlayerTurn(state, playerId)) return [];

  const actions = [];

  if (state.knocked) {
    actions.push({ type: 'pass' });
    if (state.pool.length > 0) {
      for (const c of state.pool) {
        for (let i = 0; i < (state.hands[playerId] || []).length; i++) {
          actions.push({ type: 'swap', cardIndex: i, poolCardId: c.id });
        }
      }
    }
    return actions;
  }

  actions.push({ type: 'pass' });

  if (state.pool.length > 0) {
    for (const c of state.pool) {
      for (let i = 0; i < (state.hands[playerId] || []).length; i++) {
        actions.push({ type: 'swap', cardIndex: i, poolCardId: c.id });
      }
    }
    actions.push({ type: 'swapAll' });
  }

  if (!state.knocked) {
    const hv = handValue(state.hands[playerId]);
    if (hv === 31) actions.push({ type: 'declare31' });
    if (hv === 32) actions.push({ type: 'declareFeuer' });
    actions.push({ type: 'knock' });
  }

  return actions;
}

function applyAction(state, playerId, action) {
  state.events = [];

  if (state.phase !== 'play' || state.currentPlayer !== playerId) {
    return { error: 'Non è il tuo turno' };
  }

  const hand = state.hands[playerId];
  if (!hand || hand.length !== 3) return { error: 'Mano non valida' };

  if (action.type === 'declare31' || action.type === 'declareFeuer') {
    const hv = handValue(hand);
    if (action.type === 'declare31' && hv !== 31) return { error: 'Non hai 31!' };
    if (action.type === 'declareFeuer' && hv !== 32) return { error: 'Non hai 3 Assi!' };
    const name = action.type === 'declare31' ? '31!' : 'Fuoco!';
    state.events.push({ type: 'declare', playerId, value: hv, name });
    endRoundPlayerWin(state, playerId);
    return { ok: true };
  }

  if (action.type === 'knock') {
    if (state.knocked) return { error: 'Qualcuno ha già chiuso' };
    state.knocked = true;
    state.knocker = playerId;
    state.turnsAfterKnock = 0;
    state.events.push({ type: 'knock', playerId });
    advanceTurn(state);
    return { ok: true };
  }

  if (action.type === 'pass') {
    state.events.push({ type: 'pass', playerId });
    if (afterTurnCheck(state, playerId)) return { ok: true };
    advanceTurn(state);
    return { ok: true };
  }

  if (action.type === 'swap') {
    const cardIdx = action.cardIndex;
    if (cardIdx === undefined || cardIdx < 0 || cardIdx >= hand.length) return { error: 'Indice carta non valido' };
    const poolCard = state.pool.find(c => c.id === action.poolCardId);
    if (!poolCard) return { error: 'Carta del pool non trovata' };

    const playerCard = hand[cardIdx];
    hand[cardIdx] = poolCard;
    state.pool[state.pool.indexOf(poolCard)] = playerCard;
    state.events.push({ type: 'swap', playerId, cardValue: poolCard.value, gaveValue: playerCard.value });
    if (afterTurnCheck(state, playerId)) return { ok: true };
    advanceTurn(state);
    return { ok: true };
  }

  if (action.type === 'swapAll') {
    if (state.knocked) return { error: 'Non puoi scambiare tutto dopo una chiusura' };
    if (state.pool.length !== 3) return { error: 'Pool non completo' };
    const oldHand = [...hand];
    for (let i = 0; i < 3; i++) hand[i] = state.pool[i];
    state.pool = oldHand;
    state.events.push({ type: 'swapAll', playerId });
    if (afterTurnCheck(state, playerId)) return { ok: true };
    advanceTurn(state);
    return { ok: true };
  }

  return { error: 'Azione non valida' };
}

function afterTurnCheck(state, playerId) {
  const hv = handValue(state.hands[playerId]);
  if (hv === 31) {
    state.events.push({ type: 'declare', playerId, value: 31, name: '31!' });
    endRoundPlayerWin(state, playerId);
    return true;
  }
  if (hv === 32) {
    state.events.push({ type: 'declare', playerId, value: 32, name: 'Fuoco!' });
    endRoundPlayerWin(state, playerId);
    return true;
  }
  if (state.knocked) {
    state.turnsAfterKnock++;
    if (state.turnsAfterKnock >= state.playerOrder.length - 1) {
      endRoundLowestLoses(state);
      return true;
    }
  }
  return false;
}

function advanceTurn(state) {
  const n = state.playerOrder.length;
  state.turnIndex = (state.turnIndex + 1) % n;
  state.currentPlayer = state.playerOrder[state.turnIndex];
  if (!state.roundInProgress) return;
  if (state.knocked && state.currentPlayer === state.knocker) {
    endRoundLowestLoses(state);
  }
}

function endRoundPlayerWin(state, winnerId) {
  state.phase = 'roundOver';
  state.winner = winnerId;
  const loserId = findLoser(state, winnerId);
  if (loserId) {
    state.lives[loserId]--;
    state.events.push({ type: 'roundOver', winner: winnerId, loser: loserId, livesLeft: state.lives[loserId] });
    if (state.lives[loserId] <= 0) {
      state.events.push({ type: 'eliminated', playerId: loserId });
    }
  }
  checkGameOver(state);
}

function endRoundLowestLoses(state) {
  state.phase = 'roundOver';
  const values = {};
  for (const pid of state.playerOrder) {
    values[pid] = handValue(state.hands[pid]);
  }
  state.events.push({ type: 'reveal', values });

  const sorted = [...state.playerOrder].sort((a, b) => values[b] - values[a]);
  const lowest = sorted[sorted.length - 1];

  if (sorted.length > 1 && values[sorted[sorted.length - 1]] === values[sorted[sorted.length - 2]]) {
    const ties = state.playerOrder.filter(pid => values[pid] === values[lowest]);
    for (const tid of ties) {
      state.lives[tid]--;
      state.events.push({ type: 'tieLowest', players: ties });
    }
    for (const tid of ties) {
      if (state.lives[tid] <= 0) state.events.push({ type: 'eliminated', playerId: tid });
    }
  } else {
    state.lives[lowest]--;
    state.events.push({ type: 'roundOver', loser: lowest, livesLeft: state.lives[lowest], values });
    if (state.lives[lowest] <= 0) {
      state.events.push({ type: 'eliminated', playerId: lowest });
    }
  }

  if (state.knocker) state.events.push({ type: 'knockResult', knocker: state.knocker, values: values });
  checkGameOver(state);
}

function findLoser(state, winnerId) {
  const others = state.playerOrder.filter(p => p !== winnerId);
  if (others.length === 0) return null;
  const values = {};
  for (const pid of others) values[pid] = handValue(state.hands[pid]);
  const sorted = others.sort((a, b) => values[a] - values[b]);
  const lowest = sorted[0];
  const tied = others.filter(p => values[p] === values[lowest]);
  return tied[Math.floor(Math.random() * tied.length)];
}

function checkGameOver(state) {
  const alive = state.playerOrder.filter(pid => (state.lives[pid] || 0) > 0);
  if (alive.length <= 1) {
    state.phase = 'gameOver';
    state.winner = alive[0] || null;
    state.events.push({ type: 'gameOver', winner: state.winner });
  }
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function nextRound(state) {
  if (state.phase !== 'roundOver' && state.phase !== 'gameOver') return { error: 'Round non finito' };

  const prevScores = { ...state.lives };
  const alive = state.playerOrder.filter(pid => (state.lives[pid] || 0) > 0);
  if (alive.length <= 1) {
    state.phase = 'gameOver';
    state.winner = alive[0] || null;
    state.events = [{ type: 'gameOver', winner: state.winner }];
    return { ok: true };
  }

  const n = alive.length;
  const deck = shuffle(createDeck32());
  const hands = {};
  for (const pid of alive) {
    hands[pid] = deck.splice(0, 3);
  }
  const pool = deck.splice(0, 3);
  const newPlayerOrder = alive;

  const dealerIdx = (state.dealerIndex + 1) % n;
  const firstPlayer = newPlayerOrder[(dealerIdx + 1) % n];

  state.deck = deck;
  state.pool = pool;
  state.hands = hands;
  state.playerOrder = newPlayerOrder;
  state.currentPlayer = firstPlayer;
  state.turnIndex = newPlayerOrder.indexOf(firstPlayer);
  state.dealerIndex = dealerIdx;
  state.phase = 'play';
  state.knocked = false;
  state.knocker = null;
  state.turnsAfterKnock = 0;
  state.round++;
  state.events = [{ type: 'newRound', round: state.round, previousScores: prevScores }];
  state.winner = null;
  return { ok: true };
}

const botMemory = {};

function getBotAction(state, playerId) {
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return null;

  const hand = state.hands[playerId];
  if (!hand || hand.length !== 3) return null;

  const hv = handValue(hand);
  const actions = getValidActions(state, playerId);

  if (hv === 31) return { type: 'declare31' };
  if (hv === 32) return { type: 'declareFeuer' };

  if (!botMemory[playerId]) botMemory[playerId] = { passCount: 0, round: state.round };
  if (botMemory[playerId].round !== state.round) {
    botMemory[playerId] = { passCount: 0, round: state.round };
  }

  let bestNewValue = hv;
  let bestSwapAction = null;
  let bestAllSwap = null;

  for (const a of actions) {
    if (a.type === 'swap') {
      const trialHand = hand.map((c, i) => i === a.cardIndex ? state.pool.find(pc => pc.id === a.poolCardId) : c);
      const nv = handValue(trialHand);
      if (nv > bestNewValue) {
        bestNewValue = nv;
        bestSwapAction = a;
      }
    }
    if (a.type === 'swapAll') bestAllSwap = a;
  }

  if (bestAllSwap) {
    const poolValue = handValue(state.pool);
    if (poolValue > hv) bestNewValue = Math.max(bestNewValue, poolValue);
    else bestAllSwap = null;
  }

  if (state.knocked && bestSwapAction) return bestSwapAction;

  if (bestNewValue > hv + 2) {
    botMemory[playerId].passCount = 0;
    if (bestSwapAction) return bestSwapAction;
    if (bestAllSwap) return bestAllSwap;
  }

  if (hv >= 28 && !state.knocked) {
    const knockAction = actions.find(a => a.type === 'knock');
    if (knockAction && Math.random() < 0.6) return knockAction;
  }

  if (hv >= 26 && !state.knocked && hv < 28) {
    if (bestSwapAction && bestNewValue > hv) {
      botMemory[playerId].passCount = 0;
      return bestSwapAction;
    }
    if (Math.random() < 0.35) {
      const knockAction = actions.find(a => a.type === 'knock');
      if (knockAction) return knockAction;
    }
  }

  if (hv >= 24 && !state.knocked && hv < 26) {
    if (bestSwapAction && bestNewValue > hv) {
      botMemory[playerId].passCount = 0;
      return bestSwapAction;
    }
    if (Math.random() < 0.2) {
      const knockAction = actions.find(a => a.type === 'knock');
      if (knockAction) return knockAction;
    }
  }

  if (bestSwapAction && bestNewValue > hv) {
    botMemory[playerId].passCount = 0;
    return bestSwapAction;
  }

  if (bestAllSwap && handValue(state.pool) > hv) {
    botMemory[playerId].passCount = 0;
    return bestAllSwap;
  }

  botMemory[playerId].passCount++;

  if (botMemory[playerId].passCount >= 3 && !state.knocked) {
    const knockAction = actions.find(a => a.type === 'knock');
    if (knockAction) {
      botMemory[playerId].passCount = 0;
      return knockAction;
    }
  }

  if (botMemory[playerId].passCount >= 5) {
    botMemory[playerId].passCount = 0;
    if (bestSwapAction) return bestSwapAction;
    if (bestAllSwap) return bestAllSwap;
    const knockAction = actions.find(a => a.type === 'knock');
    if (knockAction) return knockAction;
  }

  return { type: 'pass' };
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => s.lives, nextRound, getBotAction, handValue };
