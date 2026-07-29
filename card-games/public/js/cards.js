function createCardElement(card, options = {}) {
  const el = document.createElement('div');
  el.className = 'card';
  if (options.small) el.classList.add('small');
  if (options.tiny) el.classList.add('tiny');
  if (options.faceDown) {
    el.classList.add('card-back');
    return el;
  }
  const rank = document.createElement('span');
  rank.className = 'rank';
  rank.style.color = card.suitColor || '#222';
  rank.textContent = card.rank;
  const suit = document.createElement('span');
  suit.className = 'suit';
  suit.style.color = card.suitColor || '#222';
  suit.textContent = card.suitSymbol || '';
  el.appendChild(rank);
  el.appendChild(suit);
  el.dataset.cardId = card.id;
  return el;
}

function createCardBack() {
  const el = document.createElement('div');
  el.className = 'card card-back';
  return el;
}

function renderScopaHand(state) {
  const container = document.getElementById('player-hand');
  container.innerHTML = '';
  if (!state.hand) return;
  for (const card of state.hand) {
    const el = createCardElement(card);
    el.dataset.cardId = card.id;
    const isMyTurn = state.currentPlayer === window.playerId && state.phase === 'play';
    if (!isMyTurn) el.classList.add('disabled');
    container.appendChild(el);
  }
}

function renderBriscolaHand(state) {
  const container = document.getElementById('player-hand');
  container.innerHTML = '';
  if (!state.hand) return;
  for (const card of state.hand) {
    const el = createCardElement(card);
    el.dataset.cardId = card.id;
    const isMyTurn = state.currentPlayer === window.playerId && state.phase === 'play';
    if (!isMyTurn) el.classList.add('disabled');
    container.appendChild(el);
  }
}

function renderOpponentCards(count) {
  const container = document.createElement('div');
  container.className = 'opponent-cards';
  for (let i = 0; i < Math.min(count, 6); i++) {
    const back = createCardBack();
    back.classList.add('tiny');
    container.appendChild(back);
  }
  return container;
}

function renderGameCards(state) {
  if (state.briscolaSuit !== undefined) {
    renderBriscolaGameCards(state);
  } else {
    renderScopaGameCards(state);
  }
}

function renderCardOnTable(card, options = {}) {
  const el = createCardElement(card, options);
  el.dataset.cardId = card.id;
  return el;
}

function renderCapturedPile(cards, max = 5) {
  const container = document.createElement('div');
  container.className = 'captured-pile';
  const visible = cards.slice(-max);
  for (const c of visible) {
    const el = createCardElement(c, { tiny: true });
    container.appendChild(el);
    if (visible.length > 1) el.style.marginLeft = '-24px';
  }
  if (cards.length > max) {
    const more = document.createElement('span');
    more.className = 'muted';
    more.style.fontSize = '11px';
    more.textContent = `+${cards.length - max}`;
    container.appendChild(more);
  }
  return container;
}
