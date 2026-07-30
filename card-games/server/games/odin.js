const { shuffle } = require('../cards');

const COLORS = [
  { name: 'red', symbol: '🔴', color: '#D32F2F' },
  { name: 'blue', symbol: '🔵', color: '#1976D2' },
  { name: 'green', symbol: '🟢', color: '#2E7D32' },
  { name: 'yellow', symbol: '🟡', color: '#F9A825' },
  { name: 'purple', symbol: '🟣', color: '#9C27B0' },
  { name: 'orange', symbol: '🟠', color: '#FF6F00' },
];

const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const VIKING_ARCHETYPES = {
  1: 'Healer (Guaritore)',
  2: 'Skald (Bardo)',
  3: 'Spy (Spia)',
  4: 'Seidmadr (Saggio)',
  5: 'Völva (Veggente)',
  6: 'Hirdmen (Guardia)',
  7: 'Berserker',
  8: 'Styrimadr (Capitano)',
  9: 'Jarl (Nobile)',
};

const meta = {
  id: 'odin',
  name: 'Odin',
  description: 'Sii il primo a scartare tutte le tue carte! Gioca carte di valore sempre maggiore. 54 carte numerate 1-9 in 6 colori.',
  minPlayers: 2,
  maxPlayers: 6,
  deckType: 'odin',
};

function createDeck() {
  const deck = [];
  let uid = 0;
  for (const { name, symbol, color } of COLORS) {
    for (const value of VALUES) {
      deck.push({
        id: `${name}-${value}`,
        uid: uid++,
        type: 'number',
        value,
        color: name,
        colorSymbol: symbol,
        colorHex: color,
        archetype: VIKING_ARCHETYPES[value],
      });
    }
  }
  return deck;
}

function calculateSetValue(cards) {
  // Sort digits descending to form the highest number
  const digits = cards.map(c => c.value).sort((a, b) => b - a);
  return parseInt(digits.join(''), 10);
}

function create(players) {
  const deck = shuffle(createDeck());
  const playerOrder = players.map(p => p.id);
  const n = playerOrder.length;
  const hands = {};
  const scores = {};
  const handScores = {};

  for (const pid of playerOrder) {
    hands[pid] = [];
    scores[pid] = 0;
    handScores[pid] = 0;
  }

  // Deal 9 cards to each player
  let idx = 0;
  for (const pid of playerOrder) {
    hands[pid] = deck.slice(idx, idx + 9);
    idx += 9;
  }
  deck.splice(0, idx);

  return {
    meta, deck, hands, playerOrder,
    scores, handScores,
    currentPlayer: playerOrder[0],
    turnIndex: 0,
    phase: 'play',
    centerCards: [],
    centerValue: 0,
    centerCount: 0,
    roundFirstPlayer: playerOrder[0],
    passCount: 0,
    roundNumber: 1,
    handNumber: 1,
    lastPlayerToPlay: null,
    events: [],
    winner: null,
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    handSize: {},
    events: state.events,
    winner: state.winner,
    roundNumber: state.roundNumber,
    handNumber: state.handNumber,
    scores: state.scores,
    centerCards: state.centerCards.map(c => ({ value: c.value, color: c.color, colorSymbol: c.colorSymbol })),
    centerValue: state.centerValue,
    centerCount: state.centerCount,
    passCount: state.passCount,
    lastPlayerToPlay: state.lastPlayerToPlay,
  };
  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
  }
  if (state.hands[playerId]) {
    safe.hand = state.hands[playerId];
  }
  return safe;
}

function getValidActions(state, playerId) {
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return [];
  const hand = state.hands[playerId] || [];
  if (hand.length === 0) return [];

  const actions = [];

  // Pass is always available (unless you're the first player of the round)
  if (state.centerCards.length > 0) {
    actions.push({ type: 'pass' });
  }

  // Play actions
  const centerCount = state.centerCards.length;
  const centerValue = state.centerValue;

  // Can play same number of cards or 1 more
  const allowedCounts = [];
  if (centerCount === 0) {
    // First player of round: must play exactly 1 card
    allowedCounts.push(1);
  } else {
    allowedCounts.push(centerCount);
    allowedCounts.push(centerCount + 1);
  }

  for (const count of allowedCounts) {
    if (count > hand.length) continue;

    if (count === 1) {
      // Single card: value must be > centerValue
      for (const c of hand) {
        if (centerCount === 0 || c.value > centerValue) {
          actions.push({ type: 'play', cardIds: [c.id] });
        }
      }
    } else {
      // Multiple cards: must be same value or same color
      // Same value
      const valueGroups = {};
      for (const c of hand) {
        if (!valueGroups[c.value]) valueGroups[c.value] = [];
        valueGroups[c.value].push(c);
      }
      for (const val in valueGroups) {
        const group = valueGroups[val];
        if (group.length >= count) {
          const combo = group.slice(0, count);
          const comboValue = calculateSetValue(combo);
          if (centerCount === 0 || comboValue > centerValue) {
            actions.push({ type: 'play', cardIds: combo.map(c => c.id) });
          }
        }
      }

      // Same color
      const colorGroups = {};
      for (const c of hand) {
        if (!colorGroups[c.color]) colorGroups[c.color] = [];
        colorGroups[c.color].push(c);
      }
      for (const col in colorGroups) {
        const group = colorGroups[col];
        if (group.length >= count) {
          const combo = group.slice(0, count);
          const comboValue = calculateSetValue(combo);
          if (centerCount === 0 || comboValue > centerValue) {
            actions.push({ type: 'play', cardIds: combo.map(c => c.id) });
          }
        }
      }
    }
  }

  return actions;
}

function applyAction(state, playerId, action) {
  state.events = [];
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return { error: 'Non è il tuo turno' };

  const hand = state.hands[playerId];

  if (action.type === 'pass') {
    if (state.centerCards.length === 0) return { error: 'Non puoi passare, sei il primo a giocare' };
    state.passCount++;
    state.events.push({ type: 'pass', playerId });

    // Check if all but 1 player passed
    const aliveCount = state.playerOrder.length;
    if (state.passCount >= aliveCount - 1) {
      // Round ends
      state.events.push({ type: 'roundEnd', lastPlayer: state.lastPlayerToPlay });
      // Discard remaining center cards
      state.centerCards = [];
      state.centerValue = 0;
      state.centerCount = 0;
      state.passCount = 0;
      state.roundFirstPlayer = state.lastPlayerToPlay;
      state.currentPlayer = state.lastPlayerToPlay;
      state.turnIndex = state.playerOrder.indexOf(state.lastPlayerToPlay);
      state.roundNumber++;
      // Check for hand end conditions
      checkHandEnd(state);
    } else {
      advanceToNext(state);
    }
    return { ok: true };
  }

  if (action.type === 'play') {
    const cardIds = action.cardIds || [action.cardId].filter(Boolean);
    if (!cardIds || cardIds.length === 0) return { error: 'Nessuna carta specificata' };

    const cards = [];
    for (const cid of cardIds) {
      const idx = hand.findIndex(c => c.id === cid);
      if (idx === -1) return { error: `Carta ${cid} non in mano` };
      cards.push(hand.splice(idx, 1)[0]);
    }

    const count = cards.length;
    const allowedCounts = [];
    if (state.centerCards.length === 0) {
      allowedCounts.push(1);
    } else {
      allowedCounts.push(state.centerCards.length);
      allowedCounts.push(state.centerCards.length + 1);
    }
    if (!allowedCounts.includes(count)) {
      // Put cards back
      hand.push(...cards);
      return { error: `Devi giocare ${allowedCounts.join(' o ')} carte` };
    }

    // Validate same value or same color for multi-card plays
    if (count > 1) {
      const allSameValue = cards.every(c => c.value === cards[0].value);
      const allSameColor = cards.every(c => c.color === cards[0].color);
      if (!allSameValue && !allSameColor) {
        hand.push(...cards);
        return { error: 'Le carte devono essere dello stesso valore o stesso colore' };
      }
    }

    const comboValue = calculateSetValue(cards);
    if (state.centerCards.length > 0 && comboValue <= state.centerValue) {
      hand.push(...cards);
      return { error: `Il valore (${comboValue}) deve essere maggiore del valore al centro (${state.centerValue})` };
    }

    // Valid play!
    state.events.push({
      type: 'play',
      playerId,
      cards: cards.map(c => ({ value: c.value, color: c.color, colorSymbol: c.colorSymbol })),
      comboValue,
    });

    // Pick up 1 card from the center (not one just played)
    if (state.centerCards.length > 0) {
      const pickable = state.centerCards.filter(c => !cardIds.includes(c.id));
      if (pickable.length > 0) {
        const picked = pickable[0];
        const pickIdx = state.centerCards.findIndex(c => c.id === picked.id);
        state.centerCards.splice(pickIdx, 1);
        hand.push(picked);
        state.events.push({ type: 'pickup', playerId, card: { value: picked.value, color: picked.color } });
      }
    }

    // Place new cards in center
    state.centerCards.push(...cards);
    state.centerValue = comboValue;
    state.centerCount = state.centerCards.length;
    state.passCount = 0;
    state.lastPlayerToPlay = playerId;

    // Check if hand ended (player emptied hand)
    if (hand.length === 0) {
      state.events.push({ type: 'handEnd', playerId, reason: 'Mano vuota' });
      endHand(state);
      return { ok: true };
    }

    advanceToNext(state);
    return { ok: true };
  }

  return { error: 'Azione non valida' };
}

function advanceToNext(state) {
  const idx = state.playerOrder.indexOf(state.currentPlayer);
  state.currentPlayer = state.playerOrder[(idx + 1) % state.playerOrder.length];
  state.turnIndex = state.playerOrder.indexOf(state.currentPlayer);
}

function checkHandEnd(state) {
  // Check if current player (who starts the new round) has all same value or same color
  const hand = state.hands[state.currentPlayer];
  if (!hand || hand.length === 0) return;

  const allSameValue = hand.every(c => c.value === hand[0].value);
  const allSameColor = hand.every(c => c.color === hand[0].color);

  if (allSameValue || allSameColor) {
    // Auto-play all cards - hand ends
    state.events.push({ type: 'handEnd', playerId: state.currentPlayer, reason: 'Tutte le carte stesso valore/colore' });
    state.hands[state.currentPlayer] = [];
    endHand(state);
  }
}

function endHand(state) {
  // Score: 1 point per card remaining in hand
  for (const pid of state.playerOrder) {
    const hand = state.hands[pid] || [];
    state.handScores[pid] = hand.length;
    state.scores[pid] += hand.length;
  }

  state.events.push({ type: 'scoring', scores: { ...state.handScores } });

  // Check for game end (first to reach 15+ points)
  for (const pid of state.playerOrder) {
    if (state.scores[pid] >= 15) {
      // Find player with fewest points
      const minScore = Math.min(...state.playerOrder.map(p => state.scores[p]));
      const winners = state.playerOrder.filter(p => state.scores[p] === minScore);
      state.winner = winners[0];
      state.phase = 'gameOver';
      state.events.push({ type: 'gameOver', winner: state.winner, scores: { ...state.scores } });
      return;
    }
  }

  state.phase = 'handOver';
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function nextRound(state) {
  if (state.phase !== 'handOver') return { error: 'Mano non finita' };
  startNewHand(state);
  return { ok: true };
}

function startNewHand(state) {
  const deck = shuffle(createDeck());
  const n = state.playerOrder.length;

  // Deal 9 cards to each player
  let idx = 0;
  for (const pid of state.playerOrder) {
    state.hands[pid] = deck.slice(idx, idx + 9);
    idx += 9;
  }
  state.deck = deck.slice(0, 0);

  // Next player after the one who ended the hand starts
  const lastPlayerIdx = state.playerOrder.indexOf(state.lastPlayerToPlay || state.playerOrder[0]);
  const newFirstPlayer = state.playerOrder[(lastPlayerIdx + 1) % n];

  state.currentPlayer = newFirstPlayer;
  state.turnIndex = state.playerOrder.indexOf(newFirstPlayer);
  state.roundFirstPlayer = newFirstPlayer;
  state.centerCards = [];
  state.centerValue = 0;
  state.centerCount = 0;
  state.passCount = 0;
  state.lastPlayerToPlay = null;
  state.roundNumber = 1;
  state.handNumber++;
  state.phase = 'play';
  state.events = [{ type: 'newHand', handNumber: state.handNumber, scores: { ...state.scores } }];
  state.winner = null;
}

function getRoundScores(state) {
  return state.scores || {};
}

function getBotAction(state, playerId, difficulty) {
  difficulty = difficulty || 'medium';

  if (state.phase === 'handOver') {
    return { type: 'nextRound' };
  }

  const actions = getValidActions(state, playerId);
  if (!actions || actions.length === 0) return null;

  const hand = state.hands[playerId] || [];
  const playActions = actions.filter(a => a.type === 'play');
  const passAction = actions.find(a => a.type === 'pass');

  // Easy bot: 40% chance of random play
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return actions[Math.floor(Math.random() * actions.length)];
  }

  // Medium bot: 15% chance of random play
  if (difficulty === 'medium' && Math.random() < 0.15) {
    return actions[Math.floor(Math.random() * actions.length)];
  }

  // Hard bot: always plays optimally

  if (playActions.length > 0) {
    // Calculate actual combo values for each play action
    const scored = playActions.map(a => {
      if (!a.cardIds) return { action: a, score: -Infinity, cardCount: 1 };
      const cards = a.cardIds.map(cid => {
        const parts = cid.split('-');
        return { value: parseInt(parts[parts.length - 1]), color: parts[0], id: cid };
      });
      const comboValue = calculateSetValue(cards);

      // Score: prefer playing cards that:
      // 1. Remove high-value cards (9,8,7) — they're hard to get rid of later
      // 2. Use combos (multiple cards) to clear hand faster
      // 3. Don't waste extremely high combos unnecessarily
      let score = 0;
      score += cards.length * 10; // favor multi-card combos

      // Favor getting rid of high-value cards
      for (const c of cards) {
        score += c.value * 2; // higher value cards more important to discard
      }

      // Penalty for playing too high when center is low (wasteful)
      const centerVal = state.centerValue || 0;
      const excess = comboValue - centerVal;
      if (excess > 50 && difficulty === 'hard') {
        score -= excess * 0.5; // hard bot avoids wasting high combos
      }

      // If it's the first play of the round, prefer playing a single low card
      if (state.centerCards.length === 0) {
        score -= comboValue * 0.5; // prefer lowest first
      }

      return { action: a, score, cardCount: cards.length, comboValue };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Hard bot: pick the best play
    if (difficulty === 'hard') {
      return scored[0].action;
    }

    // Medium bot: pick top 3 random, weighted
    if (difficulty === 'medium') {
      const topN = scored.slice(0, Math.min(3, scored.length));
      return topN[Math.floor(Math.random() * topN.length)].action;
    }

    // Easy bot: pick top 5 random, weighted
    const topN = scored.slice(0, Math.min(5, scored.length));
    return topN[Math.floor(Math.random() * topN.length)].action;
  }

  // No play actions available, must pass
  if (passAction) return passAction;
  return actions[0];
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores, nextRound, getBotAction, createDeck };