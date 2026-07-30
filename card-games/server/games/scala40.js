const { shuffle, createFrenchDeck } = require('../cards');
const { isValidMeld, canAddToMeld, handPenalty, findFromHand, removeFromHand, isJoker, cardPoints, combinations } = require('./melds');

const meta = {
  id: 'scala40',
  name: 'Scala 40',
  description: 'Combina in set e scale con jolly! Prima mela deve valere almeno 40 punti.',
  minPlayers: 2,
  maxPlayers: 6,
  deckType: 'scala40',
};

const MIN_INITIAL_MELD = 40;

function createScala40Deck() {
  const d1 = createFrenchDeck();
  const d2 = createFrenchDeck().map(c => ({ ...c, id: c.id + '-2', uid: c.uid + 100 }));
  const jokers = [];
  for (let i = 0; i < 4; i++) {
    jokers.push({
      id: `joker-${i}`, uid: 200 + i,
      rank: 'JOKER', suit: 'joker', value: 0,
      deckType: 'scala40',
      suitSymbol: '★', suitColor: '#D4A017',
      isJoker: true,
    });
  }
  return [...d1, ...d2, ...jokers];
}

function dealCards(players) {
  const n = players.length;
  const perPlayer = n <= 4 ? 13 : 11;
  const deck = shuffle(createScala40Deck());
  const hands = {};
  let idx = 0;
  for (const p of players) {
    hands[p.id] = deck.slice(idx, idx + perPlayer);
    idx += perPlayer;
  }
  const remaining = deck.slice(idx);
  const discardTop = remaining.pop();
  return { deck: remaining, hands, discardPile: [discardTop] };
}

function create(players) {
  const { deck, hands, discardPile } = dealCards(players);
  const playerOrder = players.map(p => p.id);
  return {
    meta, deck, hands, discardPile,
    melds: {},
    playerOrder,
    currentPlayer: playerOrder[0],
    turnIndex: 0,
    drawnThisTurn: false,
    phase: 'draw',
    round: 1,
    events: [],
    winner: null,
    scores: {},
    initialMeldDone: {},
    state: 'active',
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase, currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    discardTop: state.discardPile[state.discardPile.length - 1] || null,
    deckSize: state.deck.length,
    handSize: {},
    meldSize: {},
    melds: {},
    initialMeldDone: state.initialMeldDone,
    scores: state.scores,
    events: state.events,
    winner: state.winner,
    round: state.round,
    drawnThisTurn: state.drawnThisTurn,
  };
  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
    const ml = state.melds[pid] || [];
    safe.meldSize[pid] = ml.length;
    safe.melds[pid] = ml.map(m => m.map(c => ({ ...c })));
  }
  if (state.hands[playerId]) {
    safe.hand = state.hands[playerId].map(c => ({ ...c }));
  }
  return safe;
}

function isPlayerTurn(state, playerId) {
  return state.currentPlayer === playerId && state.phase !== 'roundOver' && state.phase !== 'gameOver';
}

function getValidActions(state, playerId) {
  if (!isPlayerTurn(state, playerId)) return [];
  const actions = [];
  const hand = state.hands[playerId] || [];

  if (state.phase === 'draw') {
    if (!state.drawnThisTurn && state.deck.length > 0) {
      actions.push({ type: 'drawFromDeck' });
    }
    if (!state.drawnThisTurn && state.discardPile.length > 1) {
      actions.push({ type: 'drawFromDiscard' });
    }
    if (!state.drawnThisTurn && state.deck.length === 0 && state.discardPile.length <= 1) {
      actions.push({ type: 'skipDraw' });
    }
  } else if (state.phase === 'action') {
    if (hand.length >= 3) {
      const combos = findAllMelds(hand);
      for (const cids of combos) {
        actions.push({ type: 'meld', cardIds: cids });
      }
    }
    for (const pid of state.playerOrder) {
      const ml = state.melds[pid] || [];
      for (let i = 0; i < ml.length; i++) {
        for (const card of hand) {
          if (canAddToMeldWithJokers(ml[i], card)) {
            actions.push({ type: 'addToMeld', ownerId: pid, meldIndex: i, cardId: card.id });
          }
        }
      }
    }
    for (const card of hand) {
      actions.push({ type: 'discard', cardId: card.id });
    }
  }

  return dedupeActions(actions);
}

function canAddToMeldWithJokers(meld, card) {
  return isValidMeld([...meld, card]);
}

function findAllMelds(hand) {
  const seen = new Set();
  const combos = [];
  for (let sz = 3; sz <= hand.length; sz++) {
    for (const trial of combinations(hand, sz)) {
      if (isValidMeld(trial)) {
        const ids = trial.map(c => c.id).sort().join(',');
        if (!seen.has(ids)) {
          seen.add(ids);
          combos.push(trial.map(c => c.id));
        }
      }
    }
  }
  return combos;
}

function dedupeActions(actions) {
  const seen = new Set();
  return actions.filter(a => {
    const key = a.type + (a.cardId || '') + (a.ownerId || '') + (a.meldIndex ?? '') + (a.cardIds ? a.cardIds.join(',') : '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyAction(state, playerId, action) {
  state.events = [];
  if (!isPlayerTurn(state, playerId)) return { error: 'Non è il tuo turno' };
  const hand = state.hands[playerId];
  if (!hand) return { error: 'Giocatore non valido' };

  if (action.type === 'drawFromDeck') {
    if (state.phase !== 'draw' || state.drawnThisTurn) return { error: 'Hai già pescato' };
    if (state.deck.length === 0) {
      reshuffleDiscard(state);
      if (state.deck.length === 0) return { error: 'Mazzo finito' };
    }
    const card = state.deck.pop();
    hand.push(card);
    state.drawnThisTurn = true;
    state.phase = 'action';
    state.events.push({ type: 'draw', playerId, from: 'deck' });
    return { ok: true };
  }

  if (action.type === 'drawFromDiscard') {
    if (state.phase !== 'draw' || state.drawnThisTurn) return { error: 'Hai già pescato' };
    if (state.discardPile.length < 2) return { error: 'Niente da pescare' };
    const card = state.discardPile.pop();
    hand.push(card);
    state.drawnThisTurn = true;
    state.phase = 'action';
    state.events.push({ type: 'draw', playerId, from: 'discard', card });
    return { ok: true };
  }

  if (action.type === 'skipDraw') {
    if (state.phase !== 'draw' || state.drawnThisTurn) return { error: 'Non puoi saltare' };
    state.drawnThisTurn = true;
    state.phase = 'action';
    state.events.push({ type: 'skipDraw', playerId });
    return { ok: true };
  }

  if (action.type === 'meld') {
    if (state.phase !== 'action') return { error: 'Fase sbagliata' };
    const cards = findFromHand(hand, action.cardIds);
    if (cards.length < 3) return { error: 'Servono almeno 3 carte' };
    if (cards.length !== new Set(action.cardIds).size) return { error: 'Carte duplicate' };
    if (!isValidMeld(cards)) return { error: 'Combinazione non valida' };
    if (!state.initialMeldDone[playerId]) {
      const pts = cards.reduce((s, c) => s + cardPoints(c), 0);
      if (pts < MIN_INITIAL_MELD) {
        return { error: `Prima mela deve valere almeno ${MIN_INITIAL_MELD} punti (solo ${pts})` };
      }
      state.initialMeldDone[playerId] = true;
    }
    if (!state.melds[playerId]) state.melds[playerId] = [];
    state.melds[playerId].push(cards);
    state.hands[playerId] = removeFromHand(hand, action.cardIds);
    const r = state.deck.pop();
    if (!r) reshuffleDiscard(state);
    const r2 = state.deck.pop();
    if (r2) hand.push(r2);
    state.events.push({ type: 'meld', playerId, count: cards.length, drewReplacement: !!r2 });
    checkWin(state, playerId);
    return { ok: true };
  }

  if (action.type === 'addToMeld') {
    if (state.phase !== 'action') return { error: 'Fase sbagliata' };
    const card = hand.find(c => c.id === action.cardId);
    if (!card) return { error: 'Carta non in mano' };
    const ml = state.melds[action.ownerId];
    if (!ml || !ml[action.meldIndex]) return { error: 'Meld non trovato' };
    const meld = ml[action.meldIndex];
    if (!canAddToMeldWithJokers(meld, card)) return { error: 'Non può essere aggiunto' };
    ml[action.meldIndex] = [...meld, card];
    state.hands[playerId] = removeFromHand(hand, [action.cardId]);
    state.events.push({ type: 'addToMeld', playerId, ownerId: action.ownerId, card });
    checkWin(state, playerId);
    if (state.phase === 'roundOver') return { ok: true };
    const r = state.deck.pop();
    if (!r) reshuffleDiscard(state);
    const r2 = state.deck.pop();
    if (r2) hand.push(r2);
    state.events[state.events.length - 1].drewReplacement = !!r2;
    return { ok: true };
  }

  if (action.type === 'discard') {
    if (state.phase !== 'action') return { error: 'Fase sbagliata' };
    const card = hand.find(c => c.id === action.cardId);
    if (!card) return { error: 'Carta non in mano' };
    state.hands[playerId] = removeFromHand(hand, [action.cardId]);
    state.discardPile.push(card);
    state.events.push({ type: 'discard', playerId, card });
    checkWin(state, playerId);
    if (state.phase === 'roundOver') return { ok: true };
    advanceTurn(state);
    return { ok: true };
  }

  return { error: 'Azione non valida' };
}

function reshuffleDiscard(state) {
  if (state.discardPile.length > 1) {
    const top = state.discardPile.pop();
    state.deck = shuffle(state.discardPile);
    state.discardPile = [top];
    state.events.push({ type: 'reshuffle', count: state.deck.length });
  }
}

function checkWin(state, playerId) {
  const hand = state.hands[playerId] || [];
  if (hand.length === 0) {
    state.winner = playerId;
    state.phase = 'roundOver';
    state.scores = {};
    for (const pid of state.playerOrder) {
      if (pid !== playerId) {
        const rest = state.hands[pid] || [];
        state.scores[pid] = handPenalty(rest);
      }
    }
    state.events.push({ type: 'roundOver', winner: playerId, scores: state.scores });
    return true;
  }
  return false;
}

function advanceTurn(state) {
  const n = state.playerOrder.length;
  state.turnIndex = (state.turnIndex + 1) % n;
  state.currentPlayer = state.playerOrder[state.turnIndex];
  state.drawnThisTurn = false;
  state.phase = 'draw';
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function getRoundScores(state) {
  return state.scores || {};
}

function nextRound(state) {
  if (state.phase !== 'roundOver') return { error: 'Round non finito' };
  const alive = state.playerOrder;
  const { deck, hands, discardPile } = dealCards(alive.map(pid => ({ id: pid })));
  state.deck = deck;
  state.hands = hands;
  state.discardPile = discardPile;
  state.melds = {};
  state.initialMeldDone = {};
  state.currentPlayer = state.playerOrder[0];
  state.turnIndex = 0;
  state.drawnThisTurn = false;
  state.phase = 'draw';
  state.round++;
  state.events = [{ type: 'newRound', round: state.round }];
  state.winner = null;
  state.scores = {};
  return { ok: true };
}

function getBotAction(state, playerId) {
  if (!isPlayerTurn(state, playerId)) return null;
  const hand = state.hands[playerId] || [];
  const actions = getValidActions(state, playerId);

  if (state.phase === 'draw') {
    if (state.deck.length === 0 && state.discardPile.length <= 1) return { type: 'skipDraw' };

    const top = state.discardPile[state.discardPile.length - 1];

    if (top && state.discardPile.length > 1 && state.deck.length > 0) {
      if (isJoker(top)) return { type: 'drawFromDiscard' };
      if (cardPoints(top) >= 10) return { type: 'drawFromDiscard' };
      const useful = hand.some(c =>
        c.suit === top.suit && Math.abs(cardPoints(c) - cardPoints(top)) <= 2
      );
      if (useful) return { type: 'drawFromDiscard' };
    }

    if (state.deck.length > 0) return { type: 'drawFromDeck' };
    if (state.discardPile.length > 1) return { type: 'drawFromDiscard' };
    return { type: 'skipDraw' };
  }

  const meldActions = actions.filter(a => a.type === 'meld');
  if (meldActions.length > 0) {
    if (!state.initialMeldDone[playerId]) {
      let best = null;
      let bestPts = 0;
      for (const ma of meldActions) {
        const cards = findFromHand(hand, ma.cardIds);
        const pts = cards.reduce((s, c) => s + cardPoints(c), 0);
        if (pts >= MIN_INITIAL_MELD && pts > bestPts) {
          best = ma;
          bestPts = pts;
        }
      }
      if (best) return best;
      const highPts = meldActions.some(ma => {
        const cards = findFromHand(hand, ma.cardIds);
        return cards.reduce((s, c) => s + cardPoints(c), 0) >= MIN_INITIAL_MELD - 10;
      });
      if (!highPts && hand.length <= 3) {
        const bestMeld = meldActions.reduce((best, ma) => {
          const cards = findFromHand(hand, ma.cardIds);
          const pts = cards.reduce((s, c) => s + cardPoints(c), 0);
          return pts > (best?.pts || 0) ? { ma, pts } : best;
        }, null);
        if (bestMeld) return bestMeld.ma;
      }
    } else {
      return meldActions[meldActions.length - 1];
    }
  }

  const addAction = actions.find(a => a.type === 'addToMeld');
  if (addAction) return addAction;

  const discardActions = actions.filter(a => a.type === 'discard');
  if (discardActions.length > 0) {
    const usefulCards = new Set();
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        for (let k = j + 1; k < hand.length; k++) {
          const trial = [hand[i], hand[j], hand[k]];
          if (isValidMeld(trial)) {
            trial.forEach(c => usefulCards.add(c.id));
          }
        }
      }
    }
    for (const pid of Object.keys(state.melds || {})) {
      const ml = state.melds[pid] || [];
      for (const meld of ml) {
        for (const card of hand) {
          if (canAddToMeld(meld, card)) usefulCards.add(card.id);
        }
      }
    }
    if (!state.initialMeldDone[playerId]) {
      for (const c of hand) {
        if (cardPoints(c) >= 8 || isJoker(c)) usefulCards.add(c.id);
      }
    }

    let worst = null;
    let worstVal = Infinity;
    for (const c of hand) {
      if (isJoker(c)) continue;
      if (usefulCards.has(c.id)) continue;
      const v = cardPoints(c);
      if (v < worstVal) { worst = c; worstVal = v; }
    }
    if (!worst) {
      for (const c of hand) {
        if (isJoker(c)) continue;
        if (!worst || cardPoints(c) > cardPoints(worst)) worst = c;
      }
    }
    if (!worst) worst = hand.filter(c => !isJoker(c))[0];
    if (!worst) worst = hand[0];
    if (worst) return { type: 'discard', cardId: worst.id };
  }

  return null;
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores, nextRound, getBotAction };
