const { shuffle } = require('../cards');

const CARD_TYPES = {
  exploding_kitten: { rank: '💥', label: 'Gatto Esplosivo', color: '#D32F2F' },
  defuse: { rank: '🛡️', label: 'Disinnesco', color: '#2E7D32' },
  skip: { rank: '⏭️', label: 'Salta', color: '#1976D2' },
  attack: { rank: '⚔️', label: 'Attacco', color: '#FF6F00' },
  favor: { rank: '🤝', label: 'Favore', color: '#7B1FA2' },
  shuffle: { rank: '🔀', label: 'Mescola', color: '#607D8B' },
  seethefuture: { rank: '👀', label: 'Anteprima', color: '#0097A7' },
};

const meta = {
  id: 'explodingkittens',
  name: 'Exploding Kittens',
  description: 'Pesca un gatto esplosivo e sei fuori! Usa carte speciali per sopravvivere.',
  minPlayers: 2,
  maxPlayers: 5,
  deckType: 'exploding_kittens',
};

function createEkDeck(playerCount) {
  const deck = [];
  let uid = 0;
  const t = CARD_TYPES;
  for (let i = 0; i < playerCount - 1; i++)
    deck.push({ id: `ek-${i}`, uid: uid++, type: 'exploding_kitten', rank: t.exploding_kitten.rank, suit: 'exploding_kitten', suitColor: t.exploding_kitten.color, suitSymbol: '💥', label: t.exploding_kitten.label });
  const defuseCount = Math.max(4, playerCount * 2);
  for (let i = 0; i < defuseCount; i++)
    deck.push({ id: `defuse-${i}`, uid: uid++, type: 'defuse', rank: t.defuse.rank, suit: 'defuse', suitColor: t.defuse.color, suitSymbol: '🛡️', label: t.defuse.label });
  for (const [type, count] of [['skip', 4], ['attack', 4], ['favor', 4], ['shuffle', 4], ['seethefuture', 4]]) {
    for (let i = 0; i < count; i++) {
      const info = t[type];
      deck.push({ id: `${type}-${i}`, uid: uid++, type, rank: info.rank, suit: type, suitColor: info.color, suitSymbol: info.rank, label: info.label });
    }
  }
  return deck;
}

function create(players) {
  let deck = shuffle(createEkDeck(players.length));
  const playerOrder = players.map(p => p.id);
  const hands = {};
  const alive = {};
  for (const pid of playerOrder) { hands[pid] = []; alive[pid] = true; }
  for (const pid of playerOrder) {
    const di = deck.findIndex(c => c.type === 'defuse');
    if (di >= 0) hands[pid].push(deck.splice(di, 1)[0]);
  }
  return {
    meta, deck, hands, playerOrder, alive,
    currentPlayer: playerOrder[0], turnIndex: 0,
    phase: 'play', drawsNeeded: 1, extraDraws: 0,
    events: [], winner: null, round: 1,
    exploded: {}, futureCards: null,
  };
}

function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase, currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder, alive: state.alive,
    handSize: {}, events: state.events, winner: state.winner,
    round: state.round, deckSize: state.deck.length,
    exploded: state.exploded, drawsNeeded: state.drawsNeeded,
    extraDraws: state.extraDraws,
  };
  for (const pid of state.playerOrder) safe.handSize[pid] = (state.hands[pid] || []).length;
  if (state.hands[playerId]) safe.hand = state.hands[playerId];
  if (state.futureCards && state.currentPlayer === playerId && state.phase === 'play')
    safe.futureCards = state.futureCards;
  return safe;
}

function getValidActions(state, playerId) {
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return [];
  if (!state.alive[playerId]) return [];
  const hand = state.hands[playerId] || [];
  const actions = [];
  for (const c of hand) {
    if (c.type === 'defuse' || c.type === 'exploding_kitten') continue;
    if (c.type === 'favor') {
      const targets = state.playerOrder.filter(p => p !== playerId && state.alive[p] && (state.hands[p] || []).length > 0);
      if (targets.length > 0)
        actions.push({ type: 'playFavor', cardId: c.id, targetId: targets[Math.floor(Math.random() * targets.length)] });
    } else {
      actions.push({ type: 'playCard', cardId: c.id });
    }
  }
  actions.push({ type: 'draw' });
  return actions;
}

function applyAction(state, playerId, action) {
  state.events = [];
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return { error: 'Non è il tuo turno' };
  if (!state.alive[playerId]) return { error: 'Sei fuori' };
  const hand = state.hands[playerId];

  if (action.type === 'draw') {
    if (state.deck.length === 0) return { error: 'Mazzo finito' };
    const card = state.deck.pop();
    state.events.push({ type: 'draw', playerId, card: { type: card.type, id: card.id } });
    if (card.type === 'exploding_kitten') {
      const di = hand.findIndex(c => c.type === 'defuse');
      if (di >= 0) {
        hand.splice(di, 1);
        state.deck.push(card);
        shuffle(state.deck);
        state.events.push({ type: 'defused', playerId });
        resolveDraw(state);
      } else {
        state.alive[playerId] = false;
        state.exploded[playerId] = true;
        state.hands[playerId] = [];
        state.events.push({ type: 'exploded', playerId });
        const aliveCount = Object.values(state.alive).filter(Boolean).length;
        if (aliveCount <= 1) {
          const winner = state.playerOrder.find(p => state.alive[p]);
          state.winner = winner; state.phase = 'gameOver';
          state.events.push({ type: 'gameOver', winner });
        } else {
          state.drawsNeeded = 1;
          advanceToNext(state);
        }
      }
    } else {
      hand.push(card);
      state.events.push({ type: 'drewCard', playerId });
      resolveDraw(state);
    }
    return { ok: true };
  }

  if (action.type === 'playCard' || action.type === 'playFavor') {
    const idx = hand.findIndex(c => c.id === action.cardId);
    if (idx === -1) return { error: 'Carta non in mano' };
    const card = hand[idx];
    if (card.type === 'defuse' || card.type === 'exploding_kitten') return { error: 'Non puoi giocare questa carta ora' };
    hand.splice(idx, 1);

    if (card.type === 'skip') {
      state.events.push({ type: 'cardPlayed', playerId, card: 'skip' });
      state.drawsNeeded = 0;
      resolveDraw(state);
      return { ok: true };
    }
    if (card.type === 'attack') {
      state.extraDraws += 1;
      state.events.push({ type: 'cardPlayed', playerId, card: 'attack' });
      state.drawsNeeded = 0;
      resolveDraw(state);
      return { ok: true };
    }
    if (card.type === 'favor') {
      const targets = state.playerOrder.filter(p => p !== playerId && state.alive[p] && (state.hands[p] || []).length > 0);
      let targetId = action.targetId;
      if (!targetId || !state.alive[targetId] || !state.hands[targetId] || state.hands[targetId].length === 0) {
        if (targets.length > 0) targetId = targets[Math.floor(Math.random() * targets.length)];
        else { state.events.push({ type: 'cardPlayed', playerId, card: 'favor_none' }); return { ok: true }; }
      }
      const si = Math.floor(Math.random() * state.hands[targetId].length);
      hand.push(state.hands[targetId].splice(si, 1)[0]);
      state.events.push({ type: 'favor', playerId, targetId });
      return { ok: true };
    }
    if (card.type === 'shuffle') {
      shuffle(state.deck);
      state.events.push({ type: 'cardPlayed', playerId, card: 'shuffle' });
      return { ok: true };
    }
    if (card.type === 'seethefuture') {
      state.futureCards = state.deck.slice(-3).reverse();
      state.events.push({ type: 'seeFuture', playerId });
      return { ok: true };
    }
    hand.splice(idx, 0, card);
    return { error: 'Carta non riconosciuta' };
  }
  return { error: 'Azione non valida' };
}

function resolveDraw(state) {
  state.futureCards = null;
  state.drawsNeeded--;
  if (state.drawsNeeded > 0) return;
  state.drawsNeeded = 1 + state.extraDraws;
  state.extraDraws = 0;
  advanceToNext(state);
}

function advanceToNext(state) {
  const alive = state.playerOrder.filter(p => state.alive[p]);
  if (alive.length <= 1) {
    if (alive.length === 1) {
      state.winner = alive[0];
      state.phase = 'gameOver';
      state.events.push({ type: 'gameOver', winner: alive[0] });
    }
    return;
  }
  const idx = alive.indexOf(state.currentPlayer);
  state.currentPlayer = alive[(idx + 1) % alive.length];
  state.turnIndex = state.playerOrder.indexOf(state.currentPlayer);
}

function isOver(state) {
  return state.phase === 'gameOver';
}

function nextRound(state) {
  const deck = shuffle(createEkDeck(state.playerOrder.length));
  const hands = {};
  const alive = {};
  for (const pid of state.playerOrder) { hands[pid] = []; alive[pid] = true; }
  for (const pid of state.playerOrder) {
    const di = deck.findIndex(c => c.type === 'defuse');
    if (di >= 0) hands[pid].push(deck.splice(di, 1)[0]);
  }
  Object.assign(state, {
    deck, hands, alive, currentPlayer: state.playerOrder[0],
    turnIndex: 0, phase: 'play', drawsNeeded: 1, extraDraws: 0,
    events: [{ type: 'newRound', round: state.round + 1 }],
    winner: null, round: state.round + 1, exploded: {}, futureCards: null,
  });
}

module.exports = { meta, create, getPublicState, getValidActions, applyAction, isOver, getRoundScores: (s) => { const r = {}; for (const pid of s.playerOrder) r[pid] = s.alive[pid] ? 'Vivo' : 'Eliminato'; return r; }, nextRound };
