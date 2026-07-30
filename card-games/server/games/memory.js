const SYMBOLS = [
  '🍎','🍊','🍋','🍇','🍓','🍒','🍑','🍍','🥝','🌽','🥕','🍄','🌺','🌸','🌻','🌷','🌹','🍀','🌿','🍁',
  '🍂','🌊','🌈','⚡','🔥','💧','❄️','🌙','⭐','☀️','🎵','🎶','🎸','🎺','🎻','🎯','🎲','🎳','🎨','🎭',
  '🎪','🎠','🎡','🎢','🎟️','🎫','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎲','♟️','🎯','🎳',
  '🎮','🕹️','🎰','🚀','🛸','🚁','🛶','⛵','🚤','🛳️','⚓','🪂','🏔️','🏖️','🏜️','🏝️','🏗️','🏘️','🏡','🏠',
  '🏢','🏣','🏥','🏦','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛲','🛕','⛩️','🕍','🕌','🕋','⛪',
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🦄','🐴','🐔','🐧','🐦','🐤','🦆','🦅',
];

const meta = {
  id: 'memory',
  name: 'Memory',
  description: 'Gira le coppie di carte con lo stesso simbolo! Griglia da 5×5 a 15×15.',
  minPlayers: 2,
  maxPlayers: 6,
  deckType: 'memory',
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function create(players, options) {
  const opts = options || {};
  let rows = Math.min(Math.max(opts.rows || 6, 5), 15);
  let cols = Math.min(Math.max(opts.cols || 6, 5), 15);
  if (rows * cols > 225) { rows = 15; cols = 15; }
  const total = rows * cols;
  const hasJoker = total % 2 !== 0;
  const pairsCount = Math.floor(total / 2);

  const symbols = shuffle(SYMBOLS);
  let cards = [];
  let uid = 0;

  for (let pi = 0; pi < pairsCount; pi++) {
    const sym = symbols[pi % symbols.length];
    const pairId = pi;
    cards.push({ id: `c-${uid++}`, pairId, symbol: sym, flipped: false, matched: false });
    cards.push({ id: `c-${uid++}`, pairId, symbol: sym, flipped: false, matched: false });
  }

  if (hasJoker) {
    cards.push({ id: `c-${uid++}`, pairId: -1, symbol: '⭐', flipped: false, matched: false, isJoker: true });
  }

  cards = shuffle(cards);

  const grid = [];
  let ci = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (ci < cards.length) {
        grid.push({ ...cards[ci], row: r, col: c });
        ci++;
      }
    }
  }

  const playerOrder = players.map(p => p.id);
  return {
    meta, grid, rows, cols,
    playerOrder, currentPlayer: playerOrder[0],
    turnIndex: 0, pairsCount,
    hasJoker,
    phase: 'pickFirst',
    firstPick: null, secondPick: null,
    pairsFound: {},
    jokerFound: false,
    movesCount: 0,
    round: 1,
    events: [],
    winner: null, scores: {},
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase, currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    rows: state.rows, cols: state.cols,
    pairsCount: state.pairsCount,
    hasJoker: state.hasJoker,
    pairsFound: state.pairsFound,
    movesCount: state.movesCount,
    events: state.events,
    winner: state.winner, scores: state.scores,
    round: state.round,
    firstPick: state.firstPick,
    secondPick: state.secondPick,
  };
  safe.grid = state.grid.map(c => {
    if (c.matched || c.flipped) {
      return { ...c, visible: true };
    }
    return { id: c.id, row: c.row, col: c.col, matched: false, flipped: false, visible: false };
  });
  return safe;
}

function isPlayerTurn(state, playerId) {
  return state.currentPlayer === playerId &&
    (state.phase === 'pickFirst' || state.phase === 'pickSecond' || state.phase === 'mismatch');
}

function getValidActions(state, playerId) {
  if (state.phase === 'mismatch' && state.currentPlayer === playerId) {
    return [{ type: 'resolveMismatch' }];
  }
  if (!isPlayerTurn(state, playerId)) return [];
  const actions = [];

  if (state.phase === 'pickFirst' || state.phase === 'pickSecond') {
    for (const card of state.grid) {
      if (card.matched || card.flipped) continue;
      if (state.phase === 'pickSecond' && state.firstPick && state.firstPick.id === card.id) continue;
      actions.push({ type: 'pickCard', cardId: card.id });
    }
  }

  return actions;
}

function applyAction(state, playerId, action) {
  state.events = [];

  if (action.type === 'resolveMismatch') {
    if (state.phase !== 'mismatch') return { error: 'Fase sbagliata' };
    if (state.firstPick) {
      const c1 = state.grid.find(c => c.id === state.firstPick.id);
      if (c1) c1.flipped = false;
    }
    if (state.secondPick) {
      const c2 = state.grid.find(c => c.id === state.secondPick.id);
      if (c2) c2.flipped = false;
    }
    state.firstPick = null;
    state.secondPick = null;
    advanceTurn(state);
    return { ok: true };
  }

  if (!isPlayerTurn(state, playerId)) return { error: 'Non è il tuo turno' };

  if (action.type === 'pickCard') {
    const card = state.grid.find(c => c.id === action.cardId);
    if (!card) return { error: 'Carta non trovata' };
    if (card.matched || card.flipped) return { error: 'Carta già scoperta' };

    card.flipped = true;

    if (state.phase === 'pickFirst') {
      state.firstPick = { id: card.id, pairId: card.pairId };

      if (card.isJoker) {
        card.matched = true;
        state.jokerFound = true;
        state.firstPick = null;
        state.events.push({ type: 'memJoker', playerId });
        state.movesCount++;
        if (checkAllFound(state)) return { ok: true };
        return { ok: true };
      }

      state.phase = 'pickSecond';
      state.events.push({ type: 'memFlipFirst', playerId, cardId: card.id });
      return { ok: true };
    } else {
      state.secondPick = { id: card.id, pairId: card.pairId };
      state.movesCount++;

      if (card.isJoker) {
        card.flipped = false;
        const fc = state.grid.find(c => c.id === state.firstPick.id);
        if (fc) fc.flipped = false;
        state.events.push({ type: 'memMismatch', playerId, firstId: state.firstPick.id, secondId: card.id });
        state.firstPick = null;
        state.secondPick = null;
        advanceTurn(state);
        return { ok: true };
      }

      if (card.pairId === state.firstPick.pairId) {
        card.matched = true;
        const fc = state.grid.find(c => c.id === state.firstPick.id);
        if (fc) fc.matched = true;
        state.pairsFound[playerId] = (state.pairsFound[playerId] || 0) + 1;
        state.events.push({ type: 'memMatch', playerId, symbol: card.symbol });
        state.firstPick = null;
        state.secondPick = null;
        state.phase = 'pickFirst';
        if (checkAllFound(state)) return { ok: true };
        return { ok: true };
      }

      state.phase = 'mismatch';
      state.events.push({ type: 'memMismatch', playerId, firstId: state.firstPick.id, secondId: card.id });
      return { ok: true };
    }
  }

  return { error: 'Azione non valida' };
}

function checkAllFound(state) {
  const total = state.pairsCount;
  let found = 0;
  for (const pid of state.playerOrder) {
    found += state.pairsFound[pid] || 0;
  }
  if (found >= total) {
    state.phase = 'roundOver';
    state.scores = { ...state.pairsFound };
    const best = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
    state.winner = best[0][0];
    state.events.push({ type: 'roundOver', winner: state.winner, scores: state.scores });
    return true;
  }
  return false;
}

function advanceTurn(state) {
  const n = state.playerOrder.length;
  state.turnIndex = (state.turnIndex + 1) % n;
  state.currentPlayer = state.playerOrder[state.turnIndex];
  state.phase = 'pickFirst';
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function getRoundScores(state) {
  return state.pairsFound || {};
}

function nextRound(state) {
  if (state.phase !== 'roundOver' && state.phase !== 'gameOver') return { error: 'Round non finito' };

  const opts = { rows: state.rows, cols: state.cols };
  const players = state.playerOrder.map(pid => ({ id: pid }));
  const ns = create(players, opts);
  ns.round = state.round + 1;
  state.grid = ns.grid;
  state.rows = ns.rows;
  state.cols = ns.cols;
  state.pairsCount = ns.pairsCount;
  state.hasJoker = ns.hasJoker;
  state.currentPlayer = ns.currentPlayer;
  state.turnIndex = ns.turnIndex;
  state.phase = 'pickFirst';
  state.firstPick = null;
  state.secondPick = null;
  state.pairsFound = {};
  state.jokerFound = false;
  state._botMemory = [];
  state.movesCount = 0;
  state.round = ns.round;
  state.events = [{ type: 'newRound', round: state.round }];
  state.winner = null;
  state.scores = {};
  return { ok: true };
}

function getBotAction(state, playerId, difficulty) {
  if (state.phase === 'mismatch' && state.currentPlayer === playerId) {
    return { type: 'resolveMismatch' };
  }
  if (!isPlayerTurn(state, playerId)) return null;

  const unknowns = state.grid.filter(c => !c.matched && !c.flipped);
  if (unknowns.length === 0) return null;

  if (!state._botMemory) state._botMemory = [];

  // Track newly flipped cards (from this turn)
  const flippedUnknowns = state.grid.filter(c => c.flipped && !c.matched);
  for (const c of flippedUnknowns) {
    if (!state._botMemory.find(m => m.id === c.id)) {
      state._botMemory.push({ id: c.id, pairId: c.pairId, symbol: c.symbol });
    }
  }

  // Cap memory by difficulty (easy: ~2 pairs, medium: ~6 pairs, hard: unlimited)
  if (difficulty === 'easy' && state._botMemory.length > 4) {
    state._botMemory = state._botMemory.slice(-4);
  } else if (difficulty === 'medium' && state._botMemory.length > 12) {
    state._botMemory = state._botMemory.slice(-12);
  }

  if (state.phase === 'pickSecond' && state.firstPick) {
    const seen = state._botMemory.filter(m => m.id !== state.firstPick.id);
    const match = seen.find(m => {
      const card = state.grid.find(c => c.id === m.id);
      return m.pairId === state.firstPick.pairId && card && !card.matched && !card.flipped;
    });
    if (match) {
      return { type: 'pickCard', cardId: match.id };
    }
    if (unknowns.length > 0) {
      const target = unknowns[Math.floor(Math.random() * unknowns.length)];
      return { type: 'pickCard', cardId: target.id };
    }
  }

  if (state.phase === 'pickFirst') {
    const pairMap = {};
    for (const m of state._botMemory) {
      if (!pairMap[m.pairId]) pairMap[m.pairId] = [];
      pairMap[m.pairId].push(m.id);
    }
    for (const [pairId, ids] of Object.entries(pairMap)) {
      if (ids.length >= 2) {
        const available = ids.filter(id => unknowns.some(u => u.id === id));
        if (available.length >= 1) {
          return { type: 'pickCard', cardId: available[0] };
        }
      }
    }
  }

  const target = unknowns[Math.floor(Math.random() * unknowns.length)];
  return { type: 'pickCard', cardId: target.id };
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores, nextRound, getBotAction };
