const { shuffle, createFrenchDeck } = require('../cards');
const { isValidMeld, canAddToMeld, handPenalty, findFromHand, removeFromHand, isJoker, combinations } = require('./melds');

const meta = {
  id: 'ramino',
  name: 'Ramino',
  description: 'Combina le carte in set e scale! Il primo che resta senza carte vince.',
  minPlayers: 2,
  maxPlayers: 6,
  deckType: 'french52',
};

function dealCards(players) {
  const n = players.length;
  const perPlayer = n <= 4 ? 7 : 5;
  const deck = shuffle(createFrenchDeck());
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
    melds: state.melds,
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
    safe.melds[pid] = ml.map(m => ({ ...m }));
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
      const combos = findCombinable(hand);
      for (const cids of combos) {
        actions.push({ type: 'meld', cardIds: cids });
      }
    }
    for (const pid of state.playerOrder) {
      const ml = state.melds[pid] || [];
      for (let i = 0; i < ml.length; i++) {
        for (const card of hand) {
          if (canAddToMeld(ml[i], card)) {
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

function findCombinable(hand) {
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
    if (state.deck.length === 0) return { error: 'Mazzo finito' };
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
    if (!state.melds[playerId]) state.melds[playerId] = [];
    state.melds[playerId].push(cards);
    state.hands[playerId] = removeFromHand(hand, action.cardIds);
    const r = state.deck.pop();
    if (r) hand.push(r);
    state.events.push({ type: 'meld', playerId, count: cards.length, drewReplacement: !!r });
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
    if (!canAddToMeld(meld, card)) return { error: 'Non può essere aggiunto' };
    ml[action.meldIndex] = [...meld, card];
    state.hands[playerId] = removeFromHand(hand, [action.cardId]);
    state.events.push({ type: 'addToMeld', playerId, ownerId: action.ownerId, card });
    checkWin(state, playerId);
    if (state.phase === 'roundOver') return { ok: true };
    const r = state.deck.pop();
    if (r) hand.push(r);
    state.events[state.events.length - 1].drewReplacement = !!r;
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

const botMemory = {};

function getBotAction(state, playerId) {
  if (!isPlayerTurn(state, playerId)) return null;
  const hand = state.hands[playerId] || [];

  if (!botMemory[playerId]) botMemory[playerId] = { round: -1 };
  if (botMemory[playerId].round !== state.round) {
    botMemory[playerId] = { round: state.round, passCount: 0 };
  }

  if (state.phase === 'draw') {
    if (state.deck.length === 0 && state.discardPile.length <= 1) return { type: 'skipDraw' };
    if (state.deck.length === 0 && state.discardPile.length > 1) {
      const acts = getValidActions(state, playerId);
      const drawAct = acts.find(a => a.type === 'drawFromDiscard');
      if (drawAct && hand.length <= 4) return { type: 'skipDraw' };
      if (drawAct) return drawAct;
    }
    if (state.deck.length > 0) {
      if (hand.length <= 3) return { type: 'drawFromDeck' };
    }
    if (state.discardPile.length > 1) {
      const top = state.discardPile[state.discardPile.length - 1];
      if (hand.length <= 4) return { type: 'drawFromDiscard' };
    }
    if (state.deck.length > 0) return { type: 'drawFromDeck' };
    if (state.discardPile.length > 1) return { type: 'drawFromDiscard' };
    return { type: 'skipDraw' };
  }

  const actions = getValidActions(state, playerId);

  if (hand.length <= 2 && actions.some(a => a.type === 'discard')) {
    const discardAction = actions.find(a => a.type === 'discard');
    if (discardAction) return discardAction;
  }

  const meldAction = actions.find(a => a.type === 'meld');
  if (meldAction) return meldAction;

  const addAction = actions.find(a => a.type === 'addToMeld');
  if (addAction) return addAction;

  const discardActions = actions.filter(a => a.type === 'discard');
  if (discardActions.length > 0) {
    let worst = null;
    let worstVal = -1;
    for (const c of hand) {
      const v = { J: 11, Q: 12, K: 13, A: 1 }[c.rank] || parseInt(c.rank) || 0;
      const canMeldSoon = hand.some(h => h.id !== c.id && (h.rank === c.rank || (h.suit === c.suit && Math.abs(({ J: 11, Q: 12, K: 13, A: 1 }[h.rank] || parseInt(h.rank) || 0) - v) <= 1)));
      if (v > worstVal && !canMeldSoon) { worst = c; worstVal = v; }
    }
    if (!worst) {
      worst = hand.reduce((a, b) => {
        const va = { J: 11, Q: 12, K: 13, A: 1 }[a.rank] || parseInt(a.rank) || 0;
        const vb = { J: 11, Q: 12, K: 13, A: 1 }[b.rank] || parseInt(b.rank) || 0;
        return va > vb ? a : b;
      });
    }
    return { type: 'discard', cardId: worst.id };
  }

  return null;
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores, nextRound, getBotAction };
