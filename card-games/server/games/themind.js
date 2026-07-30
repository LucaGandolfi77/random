const { shuffle } = require('../cards');

const LEVELS = { 2: 12, 3: 10, 4: 8, 5: 7, 6: 6 };
const LIVES = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
const STAR_REWARDS = { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };
const MAX_LIVES = 5;
const MAX_STARS = 3;
const REWARDS = { 2: { stars: 1 }, 3: { lives: 1 }, 5: { stars: 1 }, 6: { lives: 1 }, 8: { stars: 1 }, 9: { lives: 1 } };

const meta = {
  id: 'themind',
  name: 'The Mind',
  description: 'Gioco cooperativo! Giocate le carte in ordine crescente senza parlare. Sentite il momento giusto!',
  minPlayers: 2,
  maxPlayers: 6,
  deckType: 'themind',
};

function createNumberCards() {
  const cards = [];
  for (let n = 1; n <= 100; n++) {
    cards.push({
      id: `card-${n}`, uid: n, type: 'number', value: n,
      rank: String(n), suit: 'mind',
      suitSymbol: `${n}`, suitColor: '#1565C0', suitLabel: 'The Mind',
    });
  }
  return cards;
}

function create(players) {
  const playerOrder = players.map(p => p.id);
  const n = playerOrder.length;
  const maxLevel = LEVELS[n] || 6;
  const hands = {};
  for (const pid of playerOrder) hands[pid] = [];

  const ready = {};
  for (const pid of playerOrder) ready[pid] = false;

  const state = {
    meta,
    hands, playerOrder,
    level: 1, maxLevel,
    phase: 'ready',
    lives: LIVES[n] || 2,
    maxLives: MAX_LIVES,
    stars: STAR_REWARDS[n] || 1,
    maxStars: MAX_STARS,
    lastPlayedValue: 0,
    cardsPlayed: [],
    ready,
    events: [],
    winner: null,
  };

  dealLevel(state);
  return state;
}

function dealLevel(state) {
  const deck = shuffle(createNumberCards());
  const n = state.playerOrder.length;
  const cardsPerPlayer = state.level;
  const hands = {};
  let idx = 0;
  for (const pid of state.playerOrder) {
    hands[pid] = deck.slice(idx, idx + cardsPerPlayer).sort((a, b) => a.value - b.value);
    idx += cardsPerPlayer;
  }
  state.hands = hands;
  state.cardsPlayed = [];
  state.lastPlayedValue = 0;
  state.phase = 'ready';
  const ready = {};
  for (const pid of state.playerOrder) ready[pid] = false;
  state.ready = ready;
  state.events = [{ type: 'newLevel', level: state.level }];
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase, level: state.level, maxLevel: state.maxLevel,
    currentPlayer: state.playerOrder[0],
    playerOrder: state.playerOrder,
    lives: state.lives, maxLives: state.maxLives,
    stars: state.stars, maxStars: state.maxStars,
    lastPlayedValue: state.lastPlayedValue,
    cardsPlayed: state.cardsPlayed,
    handSize: {},
    ready: state.ready,
    events: state.events, winner: state.winner,
    remainingCards: 0,
  };
  let total = 0;
  for (const pid of state.playerOrder) {
    const h = state.hands[pid] || [];
    safe.handSize[pid] = h.length;
    total += h.length;
  }
  safe.remainingCards = total;
  if (state.hands[playerId]) safe.hand = state.hands[playerId];
  return safe;
}

function isPlayerTurn(state, playerId) {
  return state.playerOrder.includes(playerId);
}

function getValidActions(state, playerId) {
  if (!isPlayerTurn(state, playerId)) return [];
  const hand = state.hands[playerId] || [];

  if (state.phase === 'ready') {
    if (state.ready[playerId]) return [];
    return [{ type: 'ready' }];
  }

  if (state.phase === 'play') {
    const actions = [];
    if (hand.length > 0) actions.push({ type: 'play' });
    if (state.stars > 0) actions.push({ type: 'useStar' });
    return actions;
  }

  if (state.phase === 'levelComplete' || state.phase === 'gameOver') {
    if (state.phase === 'levelComplete') return [{ type: 'nextLevel' }];
    return [];
  }

  return [];
}

function applyAction(state, playerId, action) {
  state.events = [];

  const hand = state.hands[playerId] || [];

  if (state.phase === 'ready') {
    if (action.type !== 'ready') return { error: 'Devi confermare di essere pronto' };
    if (state.ready[playerId]) return { error: 'Già pronto' };
    state.ready[playerId] = true;
    state.events.push({ type: 'ready', playerId });

    const allReady = state.playerOrder.every(pid => state.ready[pid]);
    if (allReady) {
      state.phase = 'play';
      state.events.push({ type: 'startLevel', level: state.level });
    }
    return { ok: true };
  }

  if (state.phase === 'play') {
    if (hand.length === 0) return { error: 'Non hai carte' };

    if (action.type === 'useStar') {
      if (state.stars <= 0) return { error: 'Nessuna stella disponibile' };
      state.stars--;
      for (const pid of state.playerOrder) {
        const h = state.hands[pid];
        if (h && h.length > 0) {
          const lowest = h.shift();
          state.events.push({ type: 'discard', playerId: pid, value: lowest.value });
        }
      }
      state.events.push({ type: 'starUsed', playerId });

      const allEmpty = state.playerOrder.every(pid => (state.hands[pid] || []).length === 0);
      if (allEmpty) {
        completeLevel(state);
      } else {
        state.events.push({ type: 'continue' });
      }
      return { ok: true };
    }

    if (action.type !== 'play') return { error: 'Azione non valida' };

    const lowestCard = hand[0];
    if (!lowestCard) return { error: 'Errore interno' };

    hand.shift();

    if (lowestCard.value <= state.lastPlayedValue) {
      state.lives--;
      const errorVal = lowestCard.value;
      let discarded = 0;
      for (const pid of state.playerOrder) {
        const h = state.hands[pid];
        if (!h) continue;
        const toDiscard = h.filter(c => c.value < errorVal);
        for (const c of toDiscard) {
          const idx = h.indexOf(c);
          if (idx !== -1) { h.splice(idx, 1); discarded++; }
        }
      }
      state.events.push({ type: 'error', playerId, value: lowestCard.value, discarded, livesLeft: state.lives });

      if (state.lives <= 0) {
        state.phase = 'gameOver';
        state.winner = null;
        state.events.push({ type: 'gameOver', won: false, level: state.level });
        return { ok: true };
      }

      const allEmpty = state.playerOrder.every(pid => (state.hands[pid] || []).length === 0);
      if (allEmpty) {
        completeLevel(state);
      } else {
        state.events.push({ type: 'continue' });
      }
      return { ok: true };
    }

    state.lastPlayedValue = lowestCard.value;
    state.cardsPlayed.push(lowestCard);
    state.events.push({ type: 'play', playerId, value: lowestCard.value, card: lowestCard });

    const allEmpty = state.playerOrder.every(pid => (state.hands[pid] || []).length === 0);
    if (allEmpty) {
      completeLevel(state);
    }

    return { ok: true };
  }

  if (state.phase === 'levelComplete') {
    if (action.type !== 'nextLevel') return { error: 'Azione non valida' };
    startNextLevel(state);
    return { ok: true };
  }

  return { error: 'Fase non valida' };
}

function completeLevel(state) {
  const reward = REWARDS[state.level];
  if (reward) {
    if (reward.lives) {
      state.lives = Math.min(state.lives + reward.lives, MAX_LIVES);
      state.events.push({ type: 'reward', item: 'life', count: reward.lives });
    }
    if (reward.stars) {
      state.stars = Math.min(state.stars + reward.stars, MAX_STARS);
      state.events.push({ type: 'reward', item: 'star', count: reward.stars });
    }
  }
  state.events.push({ type: 'levelComplete', level: state.level });
  state.phase = 'levelComplete';
}

function startNextLevel(state) {
  const nextLevel = state.level + 1;
  if (nextLevel > state.maxLevel) {
    state.phase = 'gameOver';
    state.winner = state.playerOrder[0];
    state.events = [{ type: 'gameOver', won: true, level: state.maxLevel }];
    return;
  }
  state.level = nextLevel;
  dealLevel(state);
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function nextRound(state) {
  if (state.phase !== 'gameOver') return { error: 'Partita non finita' };
  const fresh = create(state.playerOrder.map(id => ({ id })));
  Object.assign(state, fresh);
  state.events = [{ type: 'newGame' }];
  return { ok: true };
}

function getBotAction(state, playerId) {
  if (state.phase === 'ready') return { type: 'ready' };

  if (state.phase === 'play') {
    const hand = state.hands[playerId] || [];
    if (hand.length === 0) return null;

    const lowest = hand[0];
    const delay = Math.max(500, lowest.value * 12 + (Math.random() * 2000 - 1000));

    return { type: 'play', _delay: delay };
  }

  if (state.phase === 'levelComplete') return { type: 'nextLevel' };
  return null;
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => ({ level: s.level, lives: s.lives }), nextRound, getBotAction };
