const { shuffle } = require('../cards');

const SUIT_CONFIG = [
  { suit: 'parrots', label: 'Pappagalli', symbol: '🦜', color: '#2E7D32', isTrump: false },
  { suit: 'maps', label: 'Mappe', symbol: '🗺️', color: '#7B1FA2', isTrump: false },
  { suit: 'chests', label: 'Forzieri', symbol: '⚓', color: '#F9A825', isTrump: false },
  { suit: 'jolly_rogers', label: 'Jolly Roger', symbol: '☠️', color: '#212121', isTrump: true },
];

const SPECIALS = [
  { type: 'pirate', label: 'Pirata', symbol: '🏴‍☠️', color: '#D32F2F', count: 5 },
  { type: 'mermaid', label: 'Sirena', symbol: '🧜‍♀️', color: '#1976D2', count: 2 },
  { type: 'skullking', label: 'Skull King', symbol: '💀', color: '#4A148C', count: 1 },
  { type: 'tigress', label: 'Tigre', symbol: '🐅', color: '#FF6F00', count: 1 },
  { type: 'escape', label: 'Escape', symbol: '⏭️', color: '#607D8B', count: 5 },
];

const meta = {
  id: 'skullking',
  name: 'Skull King',
  description: 'Gioco di prese con pirati, sirene e il temuto Skull King! 10 round, punta le prese!',
  minPlayers: 2,
  maxPlayers: 6,
  deckType: 'skullking',
};

function createSkullKingDeck() {
  const deck = [];
  let uid = 0;
  for (const { suit, label, symbol, color, isTrump } of SUIT_CONFIG) {
    for (let n = 1; n <= 14; n++) {
      deck.push({
        id: `${suit}-${n}`, uid: uid++, type: 'number', suit,
        rank: String(n), value: n, isTrump,
        suitSymbol: symbol, suitColor: color, suitLabel: label,
      });
    }
  }
  for (const { type, label, symbol, color, count } of SPECIALS) {
    for (let i = 0; i < count; i++) {
      deck.push({
        id: `${type}-${i}`, uid: uid++, type, suit: type,
        rank: symbol, value: 0, isTrump: false,
        suitSymbol: symbol, suitColor: color, suitLabel: label,
      });
    }
  }
  return deck;
}

function create(players) {
  const deck = shuffle(createSkullKingDeck());
  const playerOrder = players.map(p => p.id);
  const n = playerOrder.length;
  const round = 1;
  const cardsPerPlayer = round;

  const hands = {};
  let idx = 0;
  for (const pid of playerOrder) {
    hands[pid] = deck.slice(idx, idx + cardsPerPlayer);
    idx += cardsPerPlayer;
  }
  deck.splice(0, idx);

  const bids = {};
  const tricksWon = {};
  const score = {};
  const gameScores = {};
  for (const pid of playerOrder) {
    bids[pid] = -1;
    tricksWon[pid] = 0;
    score[pid] = 0;
    gameScores[pid] = 0;
  }

  const dealerIndex = 0;
  const bidOrder = [];
  for (let i = 1; i <= n; i++) bidOrder.push(playerOrder[(dealerIndex + i) % n]);

  return {
    meta, deck, hands, playerOrder, dealerIndex,
    currentPlayer: bidOrder[0],
    turnIndex: playerOrder.indexOf(bidOrder[0]),
    bidOrder, bidIndex: 0,
    phase: 'bidding', round,
    bids, tricksWon, score, gameScores,
    playedThisTrick: [],
    lastLeadSuit: null,
    tigressPlayedAs: {},
    events: [], winner: null,
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase, round: state.round,
    currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    handSize: {}, bids: state.bids,
    tricksWon: state.tricksWon,
    score: state.score, gameScores: state.gameScores,
    playedThisTrick: state.playedThisTrick,
    lastLeadSuit: state.lastLeadSuit,
    events: state.events, winner: state.winner,
    dealerIndex: state.dealerIndex,
    deckSize: state.deck.length,
  };
  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
  }
  if (state.hands[playerId]) safe.hand = state.hands[playerId];
  return safe;
}

function isPlayerTurn(state, playerId) {
  return state.currentPlayer === playerId;
}

function getValidActions(state, playerId) {
  if (!isPlayerTurn(state, playerId)) return [];

  if (state.phase === 'bidding') {
    const handSize = (state.hands[playerId] || []).length;
    const actions = [];
    for (let i = 0; i <= handSize; i++) actions.push({ type: 'bid', amount: i });
    return actions;
  }

  if (state.phase === 'roundOver') {
    return [{ type: 'nextRound' }];
  }

  if (state.phase !== 'play') return [];

  const hand = state.hands[playerId] || [];
  if (hand.length === 0) return [];

  const led = state.playedThisTrick;

  if (led.length === 0) {
    return hand.map(c => {
      if (c.type === 'tigress') return { type: 'tigressChoice', cardId: c.id };
      return { type: 'play', cardId: c.id };
    });
  }

  const hasSuitLead = led.some(e => e.card.suit !== 'escape' && e.card.suit !== 'pirate' && e.card.suit !== 'mermaid' && e.card.suit !== 'skullking' && e.card.suit !== 'tigress');

  if (!hasSuitLead) {
    return hand.map(c => {
      if (c.type === 'tigress') return { type: 'tigressChoice', cardId: c.id };
      return { type: 'play', cardId: c.id };
    });
  }

  let firstNonEscape = null;
  for (const e of led) {
    if (e.card.suit !== 'escape') { firstNonEscape = e.card; break; }
  }
  if (!firstNonEscape) {
    return hand.map(c => {
      if (c.type === 'tigress') return { type: 'tigressChoice', cardId: c.id };
      return { type: 'play', cardId: c.id };
    });
  }

  if (firstNonEscape.suit === 'pirate' || firstNonEscape.suit === 'mermaid' || firstNonEscape.suit === 'skullking') {
    return hand.map(c => {
      if (c.type === 'tigress') return { type: 'tigressChoice', cardId: c.id };
      return { type: 'play', cardId: c.id };
    });
  }

  const ledSuit = firstNonEscape.suit;
  const canFollow = hand.some(c => c.suit === ledSuit);
  if (!canFollow) {
    return hand.map(c => {
      if (c.type === 'tigress') return { type: 'tigressChoice', cardId: c.id };
      return { type: 'play', cardId: c.id };
    });
  }

  const followCards = hand.filter(c => c.suit === ledSuit);
  return followCards.map(c => ({ type: 'play', cardId: c.id }));
}

function applyAction(state, playerId, action) {
  state.events = [];

  if (state.phase === 'bidding') {
    if (state.bids[playerId] !== -1) return { error: 'Hai già puntato' };
    if (action.type !== 'bid' || typeof action.amount !== 'number') return { error: 'Punta non valida' };
    const handSize = (state.hands[playerId] || []).length;
    if (action.amount < 0 || action.amount > handSize) return { error: 'Punta fuori range' };

    state.bids[playerId] = action.amount;
    state.events.push({ type: 'bid', playerId, amount: action.amount });

    state.bidIndex++;
    if (state.bidIndex >= state.bidOrder.length) {
      const n = state.playerOrder.length;
      const firstLead = state.playerOrder[(state.dealerIndex + 1) % n];
      state.phase = 'play';
      state.currentPlayer = firstLead;
      state.turnIndex = state.playerOrder.indexOf(firstLead);
      state.events.push({ type: 'deal' });
    } else {
      state.currentPlayer = state.bidOrder[state.bidIndex];
      state.turnIndex = state.playerOrder.indexOf(state.currentPlayer);
    }
    return { ok: true };
  }

  if (state.phase === 'roundOver' && action.type === 'nextRound') {
    startNextRound(state);
    return { ok: true };
  }

  if (state.phase !== 'play') return { error: 'Non è il momento di giocare' };
  if (state.currentPlayer !== playerId) return { error: 'Non è il tuo turno' };

  const hand = state.hands[playerId];
  if (!hand || hand.length === 0) return { error: 'Non hai carte' };

  let tigressSubtype = null;
  if (action.type === 'tigressChoice' && action.cardId) {
    if (!action.subtype) return { error: 'Scegli se giocare Tigre come Pirata o Escape' };
    tigressSubtype = action.subtype;
    action.type = 'play';
  }

  const cardIdx = hand.findIndex(c => c.id === action.cardId);
  if (cardIdx === -1) return { error: 'Carta non in mano' };

  if (hand[cardIdx].type === 'tigress' && !tigressSubtype) {
    return { error: 'Scegli il tipo per la Tigre' };
  }

  const card = hand[cardIdx];
  hand.splice(cardIdx, 1);

  const led = state.playedThisTrick;

  if (led.length === 0) {
    state.lastLeadSuit = card.suit;
    if (card.type === 'escape') state.lastLeadSuit = null;
    else if (card.suit === 'pirate' || card.suit === 'mermaid' || card.suit === 'skullking' || card.suit === 'tigress') state.lastLeadSuit = null;
    else state.lastLeadSuit = card.suit;
  } else {
    let firstNonEscape = null;
    for (const e of led) {
      if (e.card.type !== 'escape' && !(e.card.type === 'tigress' && state.tigressPlayedAs[e.card.id] === 'escape')) {
        firstNonEscape = e.card; break;
      }
    }
    if (firstNonEscape) {
      const specialSuits = ['pirate', 'mermaid', 'skullking', 'tigress'];
      if (!specialSuits.includes(firstNonEscape.suit)) {
        const ledSuit = firstNonEscape.suit;
        if (card.suit !== ledSuit && card.type !== 'escape' && card.suit !== 'pirate' && card.suit !== 'mermaid' && card.suit !== 'skullking' && card.suit !== 'tigress') {
          const canFollow = hand.some(c => c.suit === ledSuit);
          if (!canFollow) {
            if (card.suit !== ledSuit && card.type !== 'escape' && card.suit !== 'pirate' && card.suit !== 'mermaid' && card.suit !== 'skullking' && card.suit !== 'tigress') {
            }
          }
        }
      }
    }
  }

  if (card.type === 'tigress') {
    state.tigressPlayedAs[card.id] = tigressSubtype || action.subtype || 'escape';
  }

  state.playedThisTrick.push({
    playerId, card,
    tigressAs: card.type === 'tigress' ? (state.tigressPlayedAs[card.id] || 'escape') : null,
  });

  state.events.push({ type: 'play', playerId, card });

  const n = state.playerOrder.length;
  if (state.playedThisTrick.length === n) {
    resolveTrick(state);
  } else {
    const currentIdx = state.playerOrder.indexOf(state.currentPlayer);
    state.turnIndex = (currentIdx + 1) % n;
    state.currentPlayer = state.playerOrder[state.turnIndex];
  }

  return { ok: true };
}

function resolveTrick(state) {
  const trick = state.playedThisTrick;

  const cardType = (entry) => {
    if (entry.card.type === 'tigress') return state.tigressPlayedAs[entry.card.id] || 'escape';
    return entry.card.type;
  };

  const hasSkullKing = trick.some(e => cardType(e) === 'skullking');
  const hasMermaid = trick.some(e => cardType(e) === 'mermaid');
  const hasPirate = trick.some(e => cardType(e) === 'pirate');
  const hasEscape = trick.every(e => cardType(e) === 'escape');
  const allSpecial = trick.every(e => ['pirate', 'mermaid', 'skullking', 'escape'].includes(cardType(e)));

  let winnerEntry;

  if (hasSkullKing && hasMermaid) {
    winnerEntry = trick.find(e => cardType(e) === 'mermaid');
  } else if (hasSkullKing && !hasMermaid) {
    winnerEntry = trick.find(e => cardType(e) === 'skullking');
  } else if (hasPirate) {
    winnerEntry = trick.find(e => cardType(e) === 'pirate');
  } else if (hasMermaid) {
    winnerEntry = trick.find(e => cardType(e) === 'mermaid');
  } else if (hasEscape || allSpecial) {
    winnerEntry = trick[0];
  } else {
    let firstNonEscape = null;
    for (const e of trick) {
      if (cardType(e) === 'escape') continue;
      firstNonEscape = e; break;
    }
    const ledSuit = firstNonEscape.card.suit;
    winnerEntry = trick[0];
    for (let i = 1; i < trick.length; i++) {
      const e = trick[i];
      if (cardType(e) === 'escape') continue;
      const c = e.card;
      if (c.isTrump && !winnerEntry.card.isTrump) {
        winnerEntry = e;
      } else if (c.isTrump && winnerEntry.card.isTrump && c.value > winnerEntry.card.value) {
        winnerEntry = e;
      } else if (!c.isTrump && !winnerEntry.card.isTrump && c.suit === ledSuit && winnerEntry.card.suit === ledSuit && c.value > winnerEntry.card.value) {
        winnerEntry = e;
      } else if (!c.isTrump && !winnerEntry.card.isTrump && c.suit === ledSuit && winnerEntry.card.suit !== ledSuit) {
        winnerEntry = e;
      }
    }
  }

  const winnerId = winnerEntry.playerId;
  state.tricksWon[winnerId] = (state.tricksWon[winnerId] || 0) + 1;

  let bonusPoints = 0;
  const bonusEvents = [];

  for (const e of trick) {
    const c = e.card;
    if (c.type === 'number' && c.value === 14) {
      if (c.isTrump) {
        bonusPoints += 20;
        bonusEvents.push({ type: 'bonus', playerId: winnerId, reason: '14 Jolly Roger', points: 20 });
      } else {
        bonusPoints += 10;
        bonusEvents.push({ type: 'bonus', playerId: winnerId, reason: '14 ' + c.suitLabel, points: 10 });
      }
    }
  }

  if (hasSkullKing && hasMermaid && cardType(winnerEntry) === 'mermaid') {
    bonusPoints += 40;
    bonusEvents.push({ type: 'bonus', playerId: winnerId, reason: 'Sirena cattura Skull King!', points: 40 });
  }

  if (cardType(winnerEntry) === 'skullking') {
    const piratesInTrick = trick.filter(e => cardType(e) === 'pirate').length;
    if (piratesInTrick > 0) {
      const pts = piratesInTrick * 30;
      bonusPoints += pts;
      bonusEvents.push({ type: 'bonus', playerId: winnerId, reason: `${piratesInTrick} pirata/i catturati da Skull King`, points: pts });
    }
  }

  if (cardType(winnerEntry) === 'pirate') {
    const mermaidsInTrick = trick.filter(e => cardType(e) === 'mermaid').length;
    if (mermaidsInTrick > 0) {
      const pts = mermaidsInTrick * 20;
      bonusPoints += pts;
      bonusEvents.push({ type: 'bonus', playerId: winnerId, reason: `${mermaidsInTrick} sirena/e catturate da Pirata`, points: pts });
    }
  }

  state.score[winnerId] = (state.score[winnerId] || 0) + bonusPoints;
  state.events.push({ type: 'trick', winner: winnerId, cards: trick.map(t => ({ ...t })) });
  for (const be of bonusEvents) state.events.push(be);

  state.playedThisTrick = [];

  const allHandsEmpty = state.playerOrder.every(pid => (state.hands[pid] || []).length === 0);
  if (allHandsEmpty) {
    endRound(state);
    return;
  }

  state.turnIndex = state.playerOrder.indexOf(winnerId);
  state.currentPlayer = state.playerOrder[state.turnIndex];
  state.lastLeadSuit = null;
}

function endRound(state) {
  for (const pid of state.playerOrder) {
    const bid = state.bids[pid];
    const won = state.tricksWon[pid] || 0;
    const diff = Math.abs(won - bid);
    let roundPts = 0;

    if (bid === 0) {
      if (won === 0) roundPts = 10 * state.round;
      else roundPts = -(10 * state.round);
    } else {
      if (won === bid) roundPts = 20 * bid;
      else roundPts = -10 * diff;
    }

    roundPts += state.score[pid] || 0;
    state.score[pid] = roundPts;
    state.gameScores[pid] = (state.gameScores[pid] || 0) + roundPts;
    state.events.push({ type: 'roundScore', playerId: pid, bid, won, score: roundPts, total: state.gameScores[pid] });
  }

  state.phase = 'roundOver';
}

function startNextRound(state) {
  const n = state.playerOrder.length;
  const nextRoundNum = state.round + 1;

  if (nextRoundNum > 10) {
    state.phase = 'gameOver';
    const sorted = [...state.playerOrder].sort((a, b) => (state.gameScores[b] || 0) - (state.gameScores[a] || 0));
    state.winner = sorted[0];
    state.events = [{ type: 'gameOver', winner: state.winner, gameScores: { ...state.gameScores } }];
    return;
  }

  const deck = shuffle(createSkullKingDeck());
  const hands = {};
  let idx = 0;
  const cardsPerPlayer = nextRoundNum;
  const totalCards = n * cardsPerPlayer;
  for (const pid of state.playerOrder) {
    hands[pid] = deck.slice(idx, idx + cardsPerPlayer);
    idx += cardsPerPlayer;
  }
  deck.splice(0, idx);

  const bids = {};
  const tricksWon = {};
  const score = {};
  for (const pid of state.playerOrder) {
    bids[pid] = -1;
    tricksWon[pid] = 0;
    score[pid] = 0;
  }

  const dealerIndex = (state.dealerIndex + 1) % n;
  const bidOrder = [];
  for (let i = 1; i <= n; i++) bidOrder.push(state.playerOrder[(dealerIndex + i) % n]);

  const prevScores = { ...state.gameScores };

  state.deck = deck;
  state.hands = hands;
  state.bids = bids;
  state.tricksWon = tricksWon;
  state.score = score;
  state.playedThisTrick = [];
  state.tigressPlayedAs = {};
  state.lastLeadSuit = null;
  state.dealerIndex = dealerIndex;
  state.bidOrder = bidOrder;
  state.bidIndex = 0;
  state.currentPlayer = bidOrder[0];
  state.turnIndex = state.playerOrder.indexOf(bidOrder[0]);
  state.round = nextRoundNum;
  state.phase = 'bidding';
  state.events = [{ type: 'newRound', round: nextRoundNum, previousScores: prevScores }];
  state.winner = null;
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function nextRound(state) {
  if (state.phase !== 'roundOver') return { error: 'Round non finito' };
  startNextRound(state);
  return { ok: true };
}

function getBotAction(state, playerId) {
  if (state.phase === 'roundOver') {
    return { type: 'nextRound' };
  }

  if (state.phase === 'bidding') {
    const hand = state.hands[playerId] || [];
    const specials = hand.filter(c => c.type !== 'number');
    const numSpecials = specials.length;
    if (hand.length > 0) {
      const b = Math.max(0, Math.min(hand.length, Math.floor((hand.length - numSpecials * 0.2) / 2)) + (Math.random() < 0.3 ? 1 : 0));
      return { type: 'bid', amount: Math.round(b) };
    }
    return { type: 'bid', amount: 0 };
  }

  const actions = getValidActions(state, playerId);
  if (!actions || actions.length === 0) return null;

  for (const a of actions) {
    if (a.type === 'tigressChoice') return { ...a, subtype: 'escape' };
  }

  const cardActions = actions.filter(a => a.type === 'play');
  if (cardActions.length === 0) return actions[0];

  const led = state.playedThisTrick;
  if (led.length === 0) {
    const hand = state.hands[playerId] || [];
    const escapes = cardActions.filter(a => {
      const c = hand.find(h => h.id === a.cardId);
      return c && c.type === 'escape';
    });
    if (escapes.length > 0 && Math.random() < 0.3) return escapes[Math.floor(Math.random() * escapes.length)];

    const specials = cardActions.filter(a => {
      const c = hand.find(h => h.id === a.cardId);
      return c && ['pirate', 'mermaid', 'skullking'].includes(c.type);
    });
    if (specials.length > 0 && Math.random() < 0.4) return specials[Math.floor(Math.random() * specials.length)];

    return cardActions[Math.floor(Math.random() * cardActions.length)];
  }

  const trickSize = led.length;
  const totalPlayers = state.playerOrder.length;
  const cardsLeft = totalPlayers - trickSize;
  const hand = state.hands[playerId] || [];

  const lowestFirst = cardActions.slice().sort((a, b) => {
    const ca = hand.find(h => h.id === a.cardId);
    const cb = hand.find(h => h.id === b.cardId);
    return (cb ? cb.value || 0 : 0) - (ca ? ca.value || 0 : 0);
  });

  if (cardsLeft <= 1 && Math.random() < 0.5) {
    return cardActions[Math.floor(Math.random() * cardActions.length)];
  }

  return lowestFirst[Math.floor(Math.random() * lowestFirst.length)];
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => s.gameScores || {}, nextRound, getBotAction, createSkullKingDeck };
