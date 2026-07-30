const { shuffle } = require('../cards');

const SETS = {
  brown:     { name: 'Marrone',   size: 2, rents: [1, 2],        color: '#6D4C41', tier: 1, props: ['Mediterranean Avenue', 'Baltic Avenue'] },
  lightblue: { name: 'Azzurro',   size: 3, rents: [1, 2, 3],     color: '#4FC3F7', tier: 1, props: ['Oriental Avenue', 'Vermont Avenue', 'Connecticut Avenue'] },
  pink:      { name: 'Rosa',     size: 3, rents: [1, 2, 4],     color: '#F06292', tier: 2, props: ['St. Charles Place', 'States Avenue', 'Virginia Avenue'] },
  orange:    { name: 'Arancione', size: 3, rents: [1, 3, 5],     color: '#FFA726', tier: 2, props: ['St. James Place', 'Tennessee Avenue', 'New York Avenue'] },
  red:       { name: 'Rosso',    size: 3, rents: [2, 3, 6],     color: '#E53935', tier: 3, props: ['Kentucky Avenue', 'Indiana Avenue', 'Illinois Avenue'] },
  yellow:    { name: 'Giallo',   size: 3, rents: [2, 4, 6],     color: '#FDD835', tier: 3, props: ['Atlantic Avenue', 'Ventnor Avenue', 'Marvin Gardens'] },
  green:     { name: 'Verde',    size: 3, rents: [2, 4, 7],     color: '#43A047', tier: 4, props: ['Pacific Avenue', 'North Carolina Avenue', 'Pennsylvania Avenue'] },
  darkblue:  { name: 'Blu',      size: 2, rents: [3, 8],        color: '#1E88E5', tier: 4, props: ['Park Place', 'Boardwalk'] },
  railroad:  { name: 'Stazioni', size: 4, rents: [1, 2, 3, 4], color: '#37474F', tier: 2, props: ['Reading Railroad', 'Pennsylvania Railroad', 'B. & O. Railroad', 'Short Line'] },
  utility:   { name: 'Societa',  size: 2, rents: [1, 2],        color: '#90A4AE', tier: 2, props: ['Electric Company', 'Water Works'] },
};
const COLORS = Object.keys(SETS);

const ACTION_INFO = {
  passgo:       { label: 'Passa Via!', icon: '➡️', value: 1 },
  dealbreaker:  { label: 'Rompi Patto', icon: '💥', value: 5 },
  forcedeal:    { label: 'Scambio Forzato', icon: '🔄', value: 3 },
  slydeal:      { label: 'Furto Furtivo', icon: '🥷', value: 3 },
  debtcollector:{ label: 'Esattore', icon: '💰', value: 3 },
  birthday:     { label: 'Buon Compleanno', icon: '🎂', value: 2 },
  doublerent:   { label: 'Doppio Affitto', icon: '✕2', value: 1 },
  house:        { label: 'Casa', icon: '🏠', value: 3 },
  hotel:        { label: 'Albergo', icon: '🏨', value: 4 },
  justsayno:    { label: 'Col Cavolo!', icon: '🛑', value: 4 },
};

const meta = {
  id: 'monopolydeal',
  name: 'Monopoly Deal',
  description: 'Raccogli 3 set di proprieta completi di colori diversi. Carte azione, furto, affitti e "Col Cavolo!" a catena.',
  minPlayers: 2,
  maxPlayers: 5,
  deckType: 'monopolydeal',
};

function createDeck() {
  const deck = [];
  let uid = 0;
  // Property cards (28)
  for (const color of COLORS) {
    const s = SETS[color];
    s.props.forEach((name, i) => {
      deck.push({ id: `prop-${color}-${i}`, uid: uid++, type: 'property', color, name, value: s.tier, rank: name, suit: color, suitColor: s.color, suitSymbol: s.name[0] });
    });
  }
  // Wild cards (10)
  const wilds = [
    { id: 'wild-rainbow-0', colors: COLORS.slice(), name: 'Jolly Proprieta' }, // 1 rainbow
    { id: 'wild-rainbow-1', colors: COLORS.slice(), name: 'Jolly Proprieta' },
    { id: 'wild-brown-lightblue', colors: ['brown', 'lightblue'] },
    { id: 'wild-pink-orange-0', colors: ['pink', 'orange'] },
    { id: 'wild-pink-orange-1', colors: ['pink', 'orange'] },
    { id: 'wild-red-yellow-0', colors: ['red', 'yellow'] },
    { id: 'wild-red-yellow-1', colors: ['red', 'yellow'] },
    { id: 'wild-darkblue-green', colors: ['darkblue', 'green'] },
    { id: 'wild-railroad-lightblue', colors: ['railroad', 'lightblue'] },
    { id: 'wild-railroad-green', colors: ['railroad', 'green'] },
  ];
  for (const w of wilds) {
    const name = `Jolly ${SETS[w.colors[w.colors.length === 1 ? 0 : 0]].name}/${SETS[w.colors[1]].name}`;
    const maxTier = Math.max(...w.colors.map(c => SETS[c].tier));
    deck.push({ id: w.id, uid: uid++, type: 'wild', colors: w.colors, color: w.colors[0], name: w.name || name, value: maxTier, rank: '★', suit: 'wild', suitColor: '#6D4C41', suitSymbol: 'W', rentable: true });
  }
  // Money cards (20)
  const moneyCards = [[1, 6], [2, 5], [3, 3], [4, 3], [5, 2], [10, 1]];
  for (const [val, count] of moneyCards) {
    for (let i = 0; i < count; i++) {
      deck.push({ id: `money-${val}-${i}`, uid: uid++, type: 'money', value: val, rank: `${val}M`, suit: 'money', suitColor: '#9E9E9E', suitSymbol: 'M' });
    }
  }
  // Action cards (34)
  const actionCards = [['passgo', 10], ['dealbreaker', 2], ['forcedeal', 3], ['slydeal', 3], ['justsayno', 3], ['debtcollector', 3], ['birthday', 2], ['doublerent', 2], ['house', 3], ['hotel', 3]];
  for (const [subtype, count] of actionCards) {
    const info = ACTION_INFO[subtype];
    for (let i = 0; i < count; i++) {
      deck.push({ id: `action-${subtype}-${i}`, uid: uid++, type: 'action', subtype, name: info.label, value: info.value, rank: info.icon, suit: subtype, suitColor: '#5D4037', suitSymbol: info.label[0] });
    }
  }
  // Rent cards (13)
  const dualRents = [['brown', 'lightblue'], ['pink', 'orange'], ['red', 'yellow'], ['green', 'darkblue'], ['railroad', 'utility']];
  for (const [c1, c2] of dualRents) {
    for (let i = 0; i < 2; i++) {
      deck.push({ id: `rent-${c1}-${c2}-${i}`, uid: uid++, type: 'rent', colors: [c1, c2], color: c1, value: 1, rank: 'Affitto', suit: 'rent', suitColor: SETS[c1].color, suitSymbol: 'A' });
    }
  }
  for (let i = 0; i < 3; i++) {
    deck.push({ id: `rent-wild-${i}`, uid: uid++, type: 'rent', colors: COLORS.slice(), color: null, value: 3, rank: 'Affitto Jolly', suit: 'rent', suitColor: '#6D4C41', suitSymbol: 'A' });
  }
  return deck;
}

function create(players) {
  let deck = shuffle(createDeck());
  const playerOrder = players.map(p => p.id);
  const hands = {}, banks = {}, properties = {}, setAddons = {};
  for (const pid of playerOrder) {
    hands[pid] = [];
    banks[pid] = [];
    properties[pid] = [];
    setAddons[pid] = {};
  }
  for (let i = 0; i < 5; i++) for (const pid of playerOrder) hands[pid].push(deck.pop());
  // first player draws 2 to start
  drawN_cards(hands, playerOrder[0], deck, 2);
  const state = {
    meta, deck, discardPile: [], hands, banks, properties, setAddons,
    playerOrder, currentPlayer: playerOrder[0], turnIndex: 0,
    phase: 'play', playsLeft: 3, pending: null,
    events: [], winner: null, round: 1,
  };
  state.events = [{ type: 'turnStart', playerId: playerOrder[0] }];
  return state;
}

function drawN_cards(hands, pid, deck, n) {
  for (let i = 0; i < n; i++) {
    if (deck.length === 0) break;
    hands[pid].push(deck.pop());
  }
}

// ----- helpers -----
function cardMoneyValue(card, assignedColor) {
  if (!card) return 0;
  if (card.type === 'money' || card.type === 'action' || card.type === 'rent') return card.value;
  if (card.type === 'property') return SETS[card.color].tier;
  if (card.type === 'wild') return assignedColor ? SETS[assignedColor].tier : (card.value || 1);
  return 0;
}

function setColorOf(prop) {
  return prop.assignedColor || (prop.type === 'property' ? prop.color : null);
}

function setCount(state, pid, color) {
  let n = 0;
  for (const p of state.properties[pid]) if (setColorOf(p) === color) n++;
  return n;
}

function isComplete(state, pid, color) {
  return setCount(state, pid, color) >= SETS[color].size;
}

function completeSets(state, pid) {
  return COLORS.filter(c => isComplete(state, pid, c));
}

function rentBase(state, pid, color) {
  const n = setCount(state, pid, color);
  if (n === 0) return 0;
  const rents = SETS[color].rents;
  const base = rents[Math.min(n, SETS[color].size) - 1];
  let extra = 0;
  const addon = state.setAddons[pid][color];
  if (isComplete(state, pid, color)) {
    if (addon && addon.house) extra += 3;
    if (addon && addon.hotel) extra += 4;
  }
  return base + extra;
}

function checkWin(state, pid) {
  if (completeSets(state, pid).length >= 3) return true;
  return false;
}

function nextIndex(state, from) {
  const n = state.playerOrder.length;
  return (from + 1) % n;
}

function advanceTurn(state) {
  state.turnIndex = nextIndex(state, state.turnIndex);
  state.currentPlayer = state.playerOrder[state.turnIndex];
  state.pending = null;
  state.playsLeft = 3;
  state.phase = 'play';
  drawN(state, state.currentPlayer, 2);
  state.events = [{ type: 'turnStart', playerId: state.currentPlayer }];
}

function reshuffleDeck(state) {
  if (state.deck.length > 0 || state.discardPile.length === 0) return;
  state.deck = shuffle(state.discardPile);
  state.discardPile = [];
}

function drawN(state, pid, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    reshuffleDeck(state);
    if (state.deck.length === 0) break;
    state.hands[pid].push(state.deck.pop());
    drawn.push(true);
  }
  return drawn.length;
}

function findHand(state, pid, cardId) {
  return state.hands[pid].findIndex(c => c.id === cardId);
}

function findProp(state, pid, cardId) {
  return state.properties[pid].findIndex(p => p.id === cardId);
}

// can this property be paid away / swapped (not part of a complete set)?
function isMovable(state, pid, prop) {
  const color = setColorOf(prop);
  // a property in a complete set can't be used in slydeal/forcedeal
  return !isComplete(state, pid, color);
}

function startTurnDraw(state) {
  drawN(state, state.currentPlayer, 2);
  state.phase = 'play';
  state.playsLeft = 3;
  state.events = [];
}

// ----- public state -----
function getPublicState(state, playerId) {
  const safe = {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    playerOrder: state.playerOrder,
    playsLeft: state.playsLeft,
    pending: null,
    events: state.events,
    winner: state.winner,
    round: state.round,
    deckSize: state.deck.length,
    discardSize: state.discardPile.length,
    banks: {},
    properties: {},
    setAddons: {},
    completeSets: {},
    handSize: {},
    bankTotals: {},
  };
  for (const pid of state.playerOrder) {
    safe.handSize[pid] = (state.hands[pid] || []).length;
    safe.banks[pid] = (state.banks[pid] || []).slice();
    const myProps = (state.properties[pid] || []).map(p => (p.id === undefined ? p : { ...p }));
    safe.properties[pid] = myProps;
    const addons = state.setAddons[pid] || {};
    safe.setAddons[pid] = {};
    for (const c of Object.keys(addons)) {
      safe.setAddons[pid][c] = { house: addons[c].house ? { ...addons[c].house } : null, hotel: addons[c].hotel ? { ...addons[c].hotel } : null };
    }
    safe.completeSets[pid] = completeSets(state, pid);
    safe.bankTotals[pid] = (state.banks[pid] || []).reduce((s, c) => s + c.value, 0);
  }
  if (state.pending) {
    const p = state.pending;
    safe.pending = {
      kind: p.kind, fromId: p.fromId, status: p.status,
      targetId: p.targetId, opponentId: p.opponentId,
      color: p.color, amount: p.amount, doubleUsed: !!p.doubleUsed,
      queue: p.queue ? p.queue.slice() : undefined,
      myCardId: p.myCardId, targetCardId: p.targetCardId,
      jsnCount: p.jsnCount || 0,
      respondent: p.respondent,
    };
  }
  if (state.hands[playerId]) safe.hand = state.hands[playerId];
  return safe;
}

// ----- valid actions -----
function getValidActions(state, playerId) {
  const me = state.currentPlayer;
  if (state.phase === 'jsn' && state.pending && state.pending.respondent === playerId) {
    const actions = [{ type: 'accept' }];
    const hand = state.hands[playerId] || [];
    hand.forEach(c => { if (c.type === 'action' && c.subtype === 'justsayno') actions.push({ type: 'playJSN', cardId: c.id }); });
    return actions;
  }
  if (state.phase === 'pay' && state.pending && state.pending.targetId === playerId) {
    const auto = autoPayment(state, playerId, state.pending.amount);
    return [{ type: 'payCards', cardIds: auto }];
  }
  if (state.phase === 'discard' && state.currentPlayer === playerId) {
    const auto = autoDiscard(state, playerId);
    return [{ type: 'discardCards', cardIds: auto }];
  }
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return [];
  const hand = state.hands[playerId] || [];
  const actions = [];

  // end turn
  actions.push({ type: 'endTurn' });

  // bank money/action/rent
  for (const c of hand) {
    if (c.type === 'money' || c.type === 'action' || c.type === 'rent') actions.push({ type: 'bank', cardId: c.id });
  }
  // play properties
  for (const c of hand) {
    if (c.type === 'property') actions.push({ type: 'playProperty', cardId: c.id });
    if (c.type === 'wild') {
      for (const col of c.colors) actions.push({ type: 'playProperty', cardId: c.id, color: col });
    }
  }
  // free wild moves
  for (const p of state.properties[playerId]) {
    if (p.type !== 'wild') continue;
    const cur = setColorOf(p);
    for (const col of p.colors) {
      if (col !== cur) actions.push({ type: 'moveWild', cardId: p.id, color: col });
    }
  }
  // action cards
  for (const c of hand) {
    if (c.type !== 'action') continue;
    if (c.subtype === 'passgo') { actions.push({ type: 'playAction', cardId: c.id, action: 'passgo' }); }
    else if (c.subtype === 'birthday') { actions.push({ type: 'playAction', cardId: c.id, action: 'birthday' }); }
    else if (c.subtype === 'debtcollector') {
      for (const oid of state.playerOrder) if (oid !== playerId) actions.push({ type: 'playAction', cardId: c.id, action: 'debtcollector', targetId: oid });
    }
    else if (c.subtype === 'slydeal') {
      for (const oid of state.playerOrder) {
        if (oid === playerId) continue;
        for (const p of state.properties[oid]) {
          if (isMovable(state, oid, p)) actions.push({ type: 'playAction', cardId: c.id, action: 'slydeal', targetId: oid, targetCardId: p.id });
        }
      }
    }
    else if (c.subtype === 'forcedeal') {
      const myMovable = state.properties[playerId].filter(p => isMovable(state, playerId, p));
      for (const oid of state.playerOrder) {
        if (oid === playerId) continue;
        for (const tp of state.properties[oid]) {
          if (!isMovable(state, oid, tp)) continue;
          for (const mp of myMovable) actions.push({ type: 'playAction', cardId: c.id, action: 'forcedeal', targetId: oid, targetCardId: tp.id, myCardId: mp.id });
        }
      }
    }
    else if (c.subtype === 'dealbreaker') {
      for (const oid of state.playerOrder) {
        if (oid === playerId) continue;
        for (const col of completeSets(state, oid)) actions.push({ type: 'playAction', cardId: c.id, action: 'dealbreaker', targetId: oid, color: col });
      }
    }
    else if (c.subtype === 'house') {
      for (const col of COLORS) {
        if ((col === 'railroad' || col === 'utility')) continue;
        if (isComplete(state, playerId, col) && !(state.setAddons[playerId][col] && state.setAddons[playerId][col].house)) {
          actions.push({ type: 'playHouse', cardId: c.id, color: col });
        }
      }
    }
    else if (c.subtype === 'hotel') {
      for (const col of COLORS) {
        if (col === 'railroad' || col === 'utility') continue;
        const addon = state.setAddons[playerId][col];
        if (isComplete(state, playerId, col) && addon && addon.house && !addon.hotel) {
          actions.push({ type: 'playHotel', cardId: c.id, color: col });
        }
      }
    }
  }
  // rent cards
  for (const c of hand) {
    if (c.type !== 'rent') continue;
    const drCards = hand.filter(x => x.type === 'action' && x.subtype === 'doublerent');
    for (const col of c.colors) {
      if (setCount(state, playerId, col) === 0) continue;
      actions.push({ type: 'playRent', cardId: c.id, color: col });
      if (state.playsLeft >= 2) {
        for (const dr of drCards) actions.push({ type: 'playRent', cardId: c.id, color: col, doubleCardId: dr.id });
      }
    }
  }
  return actions;
}

// ----- payment / discard auto-computation -----
function playerWealth(state, pid) {
  const bank = state.banks[pid] || [];
  const props = state.properties[pid] || [];
  let total = bank.reduce((s, c) => s + c.value, 0);
  for (const p of props) total += cardMoneyValue(p, setColorOf(p));
  return total;
}

// pick cards covering amount, preferring small bank money then low-tier properties
function autoPayment(state, pid, amount) {
  const bank = (state.banks[pid] || []).slice();
  const props = (state.properties[pid] || []).slice();
  bank.sort((a, b) => a.value - b.value);
  const chosen = [];
  let total = 0;
  for (const c of bank) { chosen.push(c.id); total += c.value; if (total >= amount) return chosen; }
  const propSorted = props.sort((a, b) => cardMoneyValue(a, setColorOf(a)) - cardMoneyValue(b, setColorOf(b)));
  for (const p of propSorted) {
    chosen.push(p.id);
    total += cardMoneyValue(p, setColorOf(p));
    const wealth = playerWealth(state, pid);
    if (total >= amount || total >= wealth) return chosen;
  }
  return chosen;
}

function autoDiscard(state, pid) {
  const hand = (state.hands[pid] || []).slice();
  const need = hand.length - 7;
  if (need <= 0) return [];
  // prefer discarding low-value money/action cards, keep properties
  hand.sort((a, b) => discardValue(a) - discardValue(b));
  return hand.slice(0, need).map(c => c.id);
}
function discardValue(c) {
  if (c.type === 'money') return c.value + 0.1;
  if (c.type === 'action' && c.subtype === 'doublerent') return 1.1;
  if (c.type === 'action') return c.value + 5;
  if (c.type === 'rent') return c.value + 4;
  if (c.type === 'property') return 100;
  if (c.type === 'wild') return 200;
  return 50;
}

// ----- apply action -----
function applyAction(state, playerId, action) {
  state.events = [];

  if (state.phase === 'discard' && state.currentPlayer === playerId) {
    if (action.type !== 'discardCards') return { error: 'Scarta fino a 7 carte' };
    const ids = action.cardIds || [];
    const hand = state.hands[playerId];
    const need = hand.length - 7;
    if (ids.length !== need) return { error: `Scarta esattamente ${need} carte` };
    for (const id of ids) {
      const idx = hand.findIndex(c => c.id === id);
      if (idx === -1) return { error: 'Carta non in mano' };
      state.discardPile.push(hand.splice(idx, 1)[0]);
    }
    state.events.push({ type: 'discarded', playerId, count: ids.length });
    advanceTurn(state);
    return { ok: true };
  }

  if (state.phase === 'jsn' && state.pending && state.pending.respondent === playerId) {
    return applyJSNResponse(state, playerId, action);
  }

  if (state.phase === 'pay' && state.pending && state.pending.targetId === playerId) {
    return applyPayment(state, playerId, action);
  }

  if (state.phase !== 'play' || state.currentPlayer !== playerId) return { error: 'Non è il tuo turno' };

  switch (action.type) {
    case 'endTurn': return doEndTurn(state, playerId);
    case 'bank': return doBank(state, playerId, action);
    case 'playProperty': return doPlayProperty(state, playerId, action);
    case 'moveWild': return doMoveWild(state, playerId, action);
    case 'playHouse': return doPlayHouse(state, playerId, action);
    case 'playHotel': return doPlayHotel(state, playerId, action);
    case 'playAction': return doPlayAction(state, playerId, action);
    case 'playRent': return doPlayRent(state, playerId, action);
    default: return { error: 'Azione non valida' };
  }
}

function doEndTurn(state, pid) {
  state.events.push({ type: 'endTurn', playerId: pid });
  if ((state.hands[pid] || []).length > 7) {
    state.phase = 'discard';
    return { ok: true };
  }
  advanceTurn(state);
  return { ok: true };
}

function decPlay(state, pid) {
  state.playsLeft--;
  if (state.playsLeft <= 0) {
    return doEndTurn(state, pid);
  }
  return { ok: true };
}

function doBank(state, pid, action) {
  const idx = findHand(state, pid, action.cardId);
  if (idx === -1) return { error: 'Carta non in mano' };
  const card = state.hands[pid][idx];
  if (card.type === 'property' || card.type === 'wild') return { error: 'Le proprieta non vanno in banca' };
  state.hands[pid].splice(idx, 1);
  state.banks[pid].push(card);
  state.events.push({ type: 'bank', playerId: pid, cardName: cardLabel(card) });
  return decPlay(state, pid);
}

function doPlayProperty(state, pid, action) {
  const idx = findHand(state, pid, action.cardId);
  if (idx === -1) return { error: 'Carta non in mano' };
  const card = state.hands[pid][idx];
  if (card.type !== 'property' && card.type !== 'wild') return { error: 'Non è una proprieta' };
  let assigned = null;
  if (card.type === 'wild') {
    if (!card.colors.includes(action.color)) return { error: 'Colore non valido per il jolly' };
    assigned = action.color;
  }
  state.hands[pid].splice(idx, 1);
  const prop = { ...card, assignedColor: assigned };
  state.properties[pid].push(prop);
  state.events.push({ type: 'playProperty', playerId: pid, cardName: cardLabel(card), color: setColorOf(prop) });
  if (checkWin(state, pid)) return winGame(state, pid);
  return decPlay(state, pid);
}

function doMoveWild(state, pid, action) {
  const pidx = findProp(state, pid, action.cardId);
  if (pidx === -1) return { error: 'Proprieta non trovata' };
  const p = state.properties[pid][pidx];
  if (p.type !== 'wild') return { error: 'Non è un jolly' };
  if (!p.colors.includes(action.color)) return { error: 'Colore non valido' };
  // can't break a complete set unless moving within same color
  const oldColor = setColorOf(p);
  if (isComplete(state, pid, oldColor)) {
    // moving out of a complete set requires the set to remain 🤔 - allow if resulting setCount(oldColor) drops below size? Actually you may move a wild out freely. Allow.
  }
  state.properties[pid][pidx].assignedColor = action.color;
  state.events.push({ type: 'moveWild', playerId: pid, cardName: cardLabel(p), from: oldColor, to: action.color });
  return { ok: true }; // free action
}

function doPlayHouse(state, pid, action) {
  const idx = findHand(state, pid, action.cardId);
  if (idx === -1) return { error: 'Carta non in mano' };
  const card = state.hands[pid][idx];
  if (card.type !== 'action' || card.subtype !== 'house') return { error: 'Non è una Casa' };
  const col = action.color;
  if (col === 'railroad' || col === 'utility') return { error: 'Niente case su stazioni/societa' };
  if (!isComplete(state, pid, col)) return { error: 'Set non completo' };
  const addon = (state.setAddons[pid][col] = state.setAddons[pid][col] || {});
  if (addon.house) return { error: 'Casa già presente' };
  state.hands[pid].splice(idx, 1);
  addon.house = card;
  state.events.push({ type: 'houseBuilt', playerId: pid, color: col });
  return decPlay(state, pid);
}

function doPlayHotel(state, pid, action) {
  const idx = findHand(state, pid, action.cardId);
  if (idx === -1) return { error: 'Carta non in mano' };
  const card = state.hands[pid][idx];
  if (card.type !== 'action' || card.subtype !== 'hotel') return { error: 'Non è un Albergo' };
  const col = action.color;
  if (col === 'railroad' || col === 'utility') return { error: 'Niente alberghi su stazioni/societa' };
  const addon = state.setAddons[pid][col];
  if (!addon || !addon.house) return { error: 'Serve prima una Casa' };
  if (addon.hotel) return { error: 'Albergo già presente' };
  state.hands[pid].splice(idx, 1);
  addon.hotel = card;
  state.events.push({ type: 'hotelBuilt', playerId: pid, color: col });
  return decPlay(state, pid);
}

function doPlayAction(state, pid, action) {
  const idx = findHand(state, pid, action.cardId);
  if (idx === -1) return { error: 'Carta non in mano' };
  const card = state.hands[pid][idx];
  if (card.type !== 'action') return { error: 'Non è una carta azione' };
  const a = action.action;
  if (card.subtype !== a) return { error: 'Tipo azione errato' };

  // passgo: draw 2 immediately, discard the card
  if (a === 'passgo') {
    state.hands[pid].splice(idx, 1);
    state.discardPile.push(card);
    const drawn = drawN(state, pid, 2);
    state.events.push({ type: 'passgo', playerId: pid, drawn });
    return decPlay(state, pid);
  }
  // justsayno cannot be played standalone in play phase
  if (a === 'justsayno' || a === 'doublerent') return { error: 'Non puoi giocare questa carta ora' }

  // birthday: discard, charge all others 2M
  if (a === 'birthday') {
    state.hands[pid].splice(idx, 1);
    state.discardPile.push(card);
    state.events.push({ type: 'birthday', playerId: pid });
    const targets = state.playerOrder.filter(o => o !== pid);
    state.pending = { kind: 'birthday', fromId: pid, queue: targets, amount: 2, status: 'init', actionCardId: card.id };
    return advancePending(state);
  }
  // debtcollector
  if (a === 'debtcollector') {
    if (!action.targetId || action.targetId === pid) return { error: 'Scegli bersaglio' };
    state.hands[pid].splice(idx, 1);
    state.discardPile.push(card);
    state.events.push({ type: 'debtcollector', playerId: pid, targetId: action.targetId });
    state.pending = { kind: 'debtcollector', fromId: pid, targetId: action.targetId, amount: 5, status: 'init', actionCardId: card.id };
    return advancePending(state);
  }
  // slydeal
  if (a === 'slydeal') {
    if (!action.targetId || !action.targetCardId) return { error: 'Scegli proprieta da rubare' };
    const ti = findProp(state, action.targetId, action.targetCardId);
    if (ti === -1) return { error: 'Proprieta non trovata' };
    if (!isMovable(state, action.targetId, state.properties[action.targetId][ti])) return { error: 'Non puoi rubare da set completo' };
    state.hands[pid].splice(idx, 1);
    state.discardPile.push(card);
    state.events.push({ type: 'slydeal', playerId: pid, targetId: action.targetId, targetCardId: action.targetCardId });
    state.pending = { kind: 'slydeal', fromId: pid, targetId: action.targetId, targetCardId: action.targetCardId, status: 'init', actionCardId: card.id };
    return advancePending(state);
  }
  // forcedeal
  if (a === 'forcedeal') {
    if (!action.targetId || !action.targetCardId || !action.myCardId) return { error: 'Scegli scambio' };
    const ti = findProp(state, action.targetId, action.targetCardId);
    const mi = findProp(state, pid, action.myCardId);
    if (ti === -1 || mi === -1) return { error: 'Proprieta non trovata' };
    if (!isMovable(state, action.targetId, state.properties[action.targetId][ti])) return { error: 'Bersaglio in set completo' };
    if (!isMovable(state, pid, state.properties[pid][mi])) return { error: 'La tua proprieta è in set completo' };
    state.hands[pid].splice(idx, 1);
    state.discardPile.push(card);
    state.events.push({ type: 'forcedeal', playerId: pid, targetId: action.targetId, targetCardId: action.targetCardId, myCardId: action.myCardId });
    state.pending = { kind: 'forcedeal', fromId: pid, targetId: action.targetId, targetCardId: action.targetCardId, myCardId: action.myCardId, status: 'init', actionCardId: card.id };
    return advancePending(state);
  }
  // dealbreaker
  if (a === 'dealbreaker') {
    if (!action.targetId || !action.color) return { error: 'Scegli set completo' };
    if (!isComplete(state, action.targetId, action.color)) return { error: 'Set non completo' };
    state.hands[pid].splice(idx, 1);
    state.discardPile.push(card);
    state.events.push({ type: 'dealbreaker', playerId: pid, targetId: action.targetId, color: action.color });
    state.pending = { kind: 'dealbreaker', fromId: pid, targetId: action.targetId, color: action.color, status: 'init', actionCardId: card.id };
    return advancePending(state);
  }
  return { error: 'Azione non riconosciuta' };
}

function doPlayRent(state, pid, action) {
  const idx = findHand(state, pid, action.cardId);
  if (idx === -1) return { error: 'Carta non in mano' };
  const card = state.hands[pid][idx];
  if (card.type !== 'rent') return { error: 'Non è una carta affitto' };
  if (!card.colors.includes(action.color)) return { error: 'Colore non valido' };
  if (setCount(state, pid, action.color) === 0) return { error: 'Non hai proprieta di quel colore' };
  const baseAmount = rentBase(state, pid, action.color);
  let amount = baseAmount;
  let doubleCard = null;
  if (action.doubleCardId) {
    const di = findHand(state, pid, action.doubleCardId);
    if (di === -1) return { error: 'Carta doppio non in mano' };
    const dc = state.hands[pid][di];
    if (dc.type !== 'action' || dc.subtype !== 'doublerent') return { error: 'Non è Doppio Affitto' };
    if (state.playsLeft < 2) return { error: 'Servono 2 giocate per il Doppio Affitto' };
    doubleCard = dc;
    state.hands[pid].splice(di, 1);
    amount = amount * 2;
  }
  state.hands[pid].splice(findHand(state, pid, action.cardId), 1);
  state.discardPile.push(card);
  if (doubleCard) state.discardPile.push(doubleCard);
  const owedPlayers = state.playerOrder.filter(o => o !== pid);
  state.pending = { kind: 'rent', fromId: pid, color: action.color, amount, doubleUsed: !!doubleCard, queue: owedPlayers, status: 'init', actionCardId: card.id, doubleCardId: doubleCard ? doubleCard.id : null };
  state.events.push({ type: 'rent', playerId: pid, color: action.color, amount, doubleUsed: !!doubleCard });
  // two plays consumed when doubled
  if (doubleCard) {
    state.playsLeft--;
  }
  return advancePending(state);
}

// advance pending state machine: picks next interaction (jsn then pay) per target
function advancePending(state) {
  const p = state.pending;
  if (!p) return { ok: true };

  // multi-target effects (rent/birthday) iterate queue
  if (p.kind === 'rent' || p.kind === 'birthday') {
    if (p.status === 'exec') {
      // execute rent/birthday: it's done for all targets after queue emptied
      state.pending = null;
      state.playsLeft = Math.max(0, state.playsLeft - 1);
      // check wins for fromId
      if (checkWin(state, p.fromId)) return winGame(state, p.fromId);
      if (state.playsLeft <= 0) return doEndTurn(state, p.fromId);
      state.phase = 'play';
      state.currentPlayer = p.fromId;
      return { ok: true };
    }
    // pick next target
    if (!p.queue || p.queue.length === 0) {
      p.status = 'exec';
      return advancePending(state);
    }
    const target = p.queue[0];
    p.currentTarget = target;
    // does target have a JSN?
    if ((state.hands[target] || []).some(c => c.type === 'action' && c.subtype === 'justsayno')) {
      p.status = 'jsn';
      p.respondent = target;
      p.opponentId = p.fromId;
      p.jsnCount = 0;
      state.phase = 'jsn';
      state.currentPlayer = target;
      state.events.push({ type: 'jsnPrompt', fromId: p.fromId, targetId: target, kind: p.kind });
      return { ok: true };
    }
    // no JSN available → proceed to payment
    return startPaymentFor(state, target);
  }

  // single-target actions (slydeal/forcedeal/dealbreaker/debtcollector)
  if (p.status === 'exec') {
    executeDirectAction(state, p);
    state.pending = null;
    state.playsLeft = Math.max(0, state.playsLeft - 1);
    if (checkWin(state, p.fromId)) return winGame(state, p.fromId);
    if (state.playsLeft <= 0) return doEndTurn(state, p.fromId);
    state.phase = 'play';
    state.currentPlayer = p.fromId;
    return { ok: true };
  }
  if (p.status === 'init') {
    const target = p.targetId;
    if ((state.hands[target] || []).some(c => c.type === 'action' && c.subtype === 'justsayno')) {
      p.status = 'jsn';
      p.respondent = target;
      p.opponentId = p.fromId;
      p.jsnCount = 0;
      state.phase = 'jsn';
      state.currentPlayer = target;
      state.events.push({ type: 'jsnPrompt', fromId: p.fromId, targetId: target, kind: p.kind });
      return { ok: true };
    }
    p.status = 'exec';
    return advancePending(state);
  }
  return { ok: true };
}

function startPaymentFor(state, target) {
  const p = state.pending;
  const amount = p.amount;
  if (playerWealth(state, target) === 0) {
    // nothing to pay; move to next target
    state.events.push({ type: 'paidNothing', playerId: target });
    if (p.queue) p.queue.shift();
    p.status = 'init';
    return advancePending(state);
  }
  p.status = 'pay';
  p.targetId = target;
  state.phase = 'pay';
  state.currentPlayer = target;
  state.events.push({ type: 'paymentDue', playerId: target, amount, to: p.fromId });
  return { ok: true };
}

function applyPayment(state, payerId, action) {
  if (action.type !== 'payCards') return { error: 'Devi pagare' };
  const p = state.pending;
  const amount = p.amount;
  const ids = action.cardIds || [];
  // gather selected cards from bank and properties
  const totalWealth = playerWealth(state, payerId);
  let total = 0;
  const givenBank = [];
  const givenProps = [];
  for (const id of ids) {
    const bi = (state.banks[payerId] || []).findIndex(c => c.id === id);
    if (bi !== -1) { const c = state.banks[payerId][bi]; total += c.value; givenBank.push(c); continue; }
    const pi = findProp(state, payerId, id);
    if (pi !== -1) { const prop = state.properties[payerId][pi]; total += cardMoneyValue(prop, setColorOf(prop)); givenProps.push(prop); continue; }
    return { error: 'Carta non selezionabile' };
  }
  if (total < amount && total < totalWealth) return { error: `Devi pagare ${amount}M o tutto quello che hai` };
  // remove from payer
  for (const c of givenBank) {
    const bi = state.banks[payerId].findIndex(x => x.id === c.id);
    state.banks[payerId].splice(bi, 1);
  }
  for (const prop of givenProps) {
    const pi = findProp(state, payerId, prop.id);
    state.properties[payerId].splice(pi, 1);
  }
  // give to creditor
  const creditor = p.fromId;
  for (const c of givenBank) state.banks[creditor].push(c);
  for (const prop of givenProps) {
    // keep assignedColor for wilds; for properties keep color
    state.properties[creditor].push({ ...prop });
  }
  state.events.push({ type: 'paid', fromId: payerId, toId: creditor, amount: total, cardCount: givenBank.length + givenProps.length });
  // next target or finish
  if (p.queue) p.queue.shift();
  p.status = 'init';
  // check win for creditor
  if (checkWin(state, creditor)) return winGame(state, creditor);
  return advancePending(state);
}

function applyJSNResponse(state, respondentId, action) {
  const p = state.pending;
  if (action.type === 'accept') {
    // even count => action resolves; odd => canceled
    if ((p.jsnCount || 0) % 2 === 0) {
      state.events.push({ type: 'jsnAccepted', by: respondentId });
      // proceed: if rent/birthday, go to payment; otherwise exec
      if (p.kind === 'rent' || p.kind === 'birthday') {
        return startPaymentFor(state, p.currentTarget);
      }
      p.status = 'exec';
      return advancePending(state);
    } else {
      state.events.push({ type: 'jsnCanceled', by: respondentId });
      // entire pending canceled
      state.pending = null;
      // playsLeft decrement for the action card already happened? We decrement at end of pending resolution. So no double count.
      // for multi-target rent: if canceled for this target, skip to next target
      // For rent canceled by JSN: official rule - JSN cancels the rent for THAT player only
      const canceledFor = respondentId;
      const queue = p.queue || [];
      const idx = queue.indexOf(canceledFor);
      if (idx !== -1) queue.splice(idx, 1);
      // restore a fresh pending to continue with remaining targets
      if (queue.length > 0) {
        state.pending = { ...p, queue, status: 'init', respondent: undefined, jsnCount: 0 };
        return advancePending(state);
      }
      // all canceled or none left → finish rent action
      state.pending = null;
      state.playsLeft = Math.max(0, state.playsLeft - 1);
      if (checkWin(state, p.fromId)) return winGame(state, p.fromId);
      if (state.playsLeft <= 0) return doEndTurn(state, p.fromId);
      state.phase = 'play';
      state.currentPlayer = p.fromId;
      return { ok: true };
    }
  }
  if (action.type === 'playJSN') {
    const idx = (state.hands[respondentId] || []).findIndex(c => c.id === action.cardId);
    if (idx === -1) return { error: 'Carta non in mano' };
    const card = state.hands[respondentId][idx];
    if (card.type !== 'action' || card.subtype !== 'justsayno') return { error: 'Non è Col Cavolo!' };
    state.hands[respondentId].splice(idx, 1);
    state.discardPile.push(card);
    p.jsnCount = (p.jsnCount || 0) + 1;
    state.events.push({ type: 'jsnPlayed', by: respondentId, count: p.jsnCount });
    // flip respondent to the other party
    const nextResp = p.opponentId;
    p.opponentId = respondentId;
    p.respondent = nextResp;
    state.currentPlayer = nextResp;
    // if the new respondent has no JSN, they can only accept
    return { ok: true };
  }
  return { error: 'Azione non valida in fase Col Cavolo!' };
}

function executeDirectAction(state, p) {
  if (p.kind === 'slydeal') {
    const ti = findProp(state, p.targetId, p.targetCardId);
    const prop = state.properties[p.targetId].splice(ti, 1)[0];
    state.properties[p.fromId].push({ ...prop });
    state.events.push({ type: 'stolen', fromId: p.fromId, fromTarget: p.targetId, cardName: cardLabel(prop) });
  } else if (p.kind === 'forcedeal') {
    const ti = findProp(state, p.targetId, p.targetCardId);
    const mi = findProp(state, p.fromId, p.myCardId);
    const tprop = state.properties[p.targetId].splice(ti, 1)[0];
    const mprop = state.properties[p.fromId].splice(mi, 1)[0];
    state.properties[p.fromId].push({ ...tprop });
    state.properties[p.targetId].push({ ...mprop });
    state.events.push({ type: 'swapped', fromId: p.fromId, targetId: p.targetId, mine: cardLabel(mprop), theirs: cardLabel(tprop) });
  } else if (p.kind === 'dealbreaker') {
    const col = p.color;
    const stolen = [];
    state.properties[p.targetId] = state.properties[p.targetId].filter(prop => {
      if (setColorOf(prop) === col) { stolen.push(prop); return false; }
      return true;
    });
    const addon = state.setAddons[p.targetId][col];
    let houseCard = null, hotelCard = null;
    if (addon) { houseCard = addon.house; hotelCard = addon.hotel; delete state.setAddons[p.targetId][col]; }
    for (const prop of stolen) state.properties[p.fromId].push({ ...prop });
    const myAddon = state.setAddons[p.fromId][col] = state.setAddons[p.fromId][col] || {};
    if (houseCard) myAddon.house = houseCard;
    if (hotelCard) myAddon.hotel = hotelCard;
    state.events.push({ type: 'setStolen', fromId: p.fromId, fromTarget: p.targetId, color: col, withHouse: !!houseCard, withHotel: !!hotelCard });
  } else if (p.kind === 'debtcollector') {
    // JSN already failed; force payment
    startPaymentFor(state, p.targetId);
  }
}

function winGame(state, pid) {
  state.winner = pid;
  state.phase = 'gameOver';
  state.events.push({ type: 'gameOver', winner: pid });
  return { ok: true };
}

function isOver(state) { return state.phase === 'gameOver'; }

function getRoundScores(state) {
  const r = {};
  for (const pid of state.playerOrder) r[pid] = completeSets(state, pid).length;
  return r;
}

function nextRound(state) {
  if (state.phase !== 'gameOver') return { error: 'Round non finito' };
  const deck = shuffle(createDeck());
  const hands = {}, banks = {}, properties = {}, setAddons = {};
  for (const pid of state.playerOrder) { hands[pid] = []; banks[pid] = []; properties[pid] = []; setAddons[pid] = {}; }
  for (let i = 0; i < 5; i++) for (const pid of state.playerOrder) hands[pid].push(deck.pop());
  // first player draws 2 to start
  drawN_cards(hands, state.playerOrder[0], deck, 2);
  Object.assign(state, {
    deck, discardPile: [], hands, banks, properties, setAddons,
    currentPlayer: state.playerOrder[0], turnIndex: 0,
    phase: 'play', playsLeft: 3, pending: null,
    events: [{ type: 'newRound', round: state.round + 1 }, { type: 'turnStart', playerId: state.playerOrder[0] }],
    winner: null, round: state.round + 1,
  });
  return { ok: true };
}

// ----- bot AI -----
function getBotAction(state, playerId, difficulty) {
  const actions = getValidActions(state, playerId);
  if (!actions || actions.length === 0) return null;

  if (state.phase === 'pay' && state.pending && state.pending.targetId === playerId) return actions[0];
  if (state.phase === 'discard' && state.currentPlayer === playerId) return actions[0];
  if (state.phase === 'jsn' && state.pending && state.pending.respondent === playerId) {
    const p = state.pending;
    const threatening = ['dealbreaker', 'rent', 'debtcollector'].includes(p.kind);
    const jsnActions = actions.filter(a => a.type === 'playJSN');
    if (threatening && jsnActions.length > 0) return jsnActions[0];
    if ((p.kind === 'slydeal' || p.kind === 'forcedeal') && jsnActions.length > 0) return jsnActions[0];
    return actions[0]; // accept
  }
  if (state.phase !== 'play' || state.currentPlayer !== playerId) return null;

  // priority heuristics
  const myComplete = completeSets(state, playerId);
  // 1. buy house/hotel on a complete set
  const house = actions.find(a => a.type === 'playHouse');
  if (house) return house;
  const hotel = actions.find(a => a.type === 'playHotel');
  if (hotel) return hotel;
  // 2. dealbreaker if it gives 3rd set or steals a high-value set
  const dealbreaker = actions.find(a => a.type === 'playAction' && a.action === 'dealbreaker');
  if (dealbreaker) return dealbreaker;
  // 3. complete a set via property play (prefer property that completes a color)
  const completePlay = actions.find(a => {
    if (a.type !== 'playProperty') return false;
    const setAfter = (state.properties[playerId].filter(p => setColorOf(p) === (a.color || state.hands[playerId].find(c => c.id === a.cardId).color)).length) + 1;
    return setAfter >= SETS[a.color || state.hands[playerId].find(c => c.id === a.cardId).color].size;
  });
  if (completePlay) return completePlay;
  // 4. rent with highest amount
  const rents = actions.filter(a => a.type === 'playRent');
  if (rents.length > 0) {
    // prefer doubled rent on highest amount
    const best = rents.reduce((best, a) => {
      const amt = rentBase(state, playerId, a.color) * (a.doubleCardId ? 2 : 1);
      return (!best || amt > best.amt) ? { action: a, amt } : best;
    }, null);
    if (best && best.amt > 0) return best.action;
  }
  // 5. slydeal to gain toward a set
  const slydeal = actions.find(a => a.type === 'playAction' && a.action === 'slydeal');
  if (slydeal) return slydeal;
  // 6. forcedeal
  const forcedeal = actions.find(a => a.type === 'playAction' && a.action === 'forcedeal');
  if (forcedeal) return forcedeal;
  // 7. pass go (draw 2)
  const passgo = actions.find(a => a.type === 'playAction' && a.action === 'passgo');
  if (passgo && (state.hands[playerId] || []).length < 7) return passgo;
  // 8. play any property
  const anyProperty = actions.find(a => a.type === 'playProperty');
  if (anyProperty) return anyProperty;
  // 9. bank money
  const bankMoney = actions.find(a => a.type === 'bank');
  if (bankMoney) return bankMoney;
  // 10. birthday/debtcollector
  const birthday = actions.find(a => a.type === 'playAction' && a.action === 'birthday');
  if (birthday) return birthday;
  const debt = actions.find(a => a.type === 'playAction' && a.action === 'debtcollector');
  if (debt) return debt;
  // 11. move wild to improve a set
  const moveWild = actions.find(a => a.type === 'moveWild');
  if (moveWild) return moveWild;
  // 12. end turn
  return actions.find(a => a.type === 'endTurn') || actions[0];
}

function cardLabel(card) {
  if (!card) return '?';
  if (card.type === 'property') return card.name + ' (' + SETS[card.color].name + ')';
  if (card.type === 'wild') return 'Jolly ' + (card.colors.map(c => SETS[c].name).join('/'));
  if (card.type === 'money') return card.value + 'M';
  if (card.type === 'action') return ACTION_INFO[card.subtype].label;
  if (card.type === 'rent') return 'Affitto ' + (card.colors.length > 2 ? 'Jolly' : SETS[card.colors[0]].name + '/' + SETS[card.colors[1]].name);
  return '?';
}

module.exports = {
  meta, create, getPublicState, getValidActions, applyAction, isOver,
  getRoundScores, nextRound, getBotAction, createDeck, SETS, cardLabel,
};