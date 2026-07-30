let selectedCardId = null;
let selectedTakeIds = [];
let timerInterval = null;

function renderGame(state) {
  if (!state) return;
  switch (state.gameType) {
    case 'scopa': renderScopa(state); break;
    case 'briscola': renderBriscola(state); break;
    case 'blackjack': renderBlackjack(state); break;
    case 'settenmezzo': renderSetteMezzo(state); break;
    case 'tressette': renderTressette(state); break;
    case 'poker': renderPoker(state); break;
    case 'uno': renderUno(state); break;
    case 'explodingkittens': renderExplodingKittens(state); break;
    case 'skullking': renderSkullKing(state); break;
    case 'themind': renderTheMind(state); break;
    case 'thiryone': renderThirtyOne(state); break;
    case 'ramino': renderRamino(state); break;
    case 'scala40': renderScala40(state); break;
    case 'memory': renderMemory(state); break;
    default: renderScopa(state);
  }
}

const GAME_NAMES = { scopa: 'Scopa', briscola: 'Briscola', blackjack: 'Blackjack', settenmezzo: 'Sette e Mezzo', tressette: 'Tressette', poker: 'Texas Hold\'em', uno: 'UNO', explodingkittens: 'Exploding Kittens', skullking: 'Skull King', themind: 'The Mind', thiryone: '31', ramino: 'Ramino', scala40: 'Scala 40', memory: 'Memory' };

function renderGameTopBar(state, name) {
  const info = $('game-info');
  let n = name || GAME_NAMES[state.gameType] || 'Scopa';
  info.textContent = `${n} — Mano ${state.round || 1}`;
  if (state.phase === 'gameOver') info.textContent += ' (FINITA)';
  if (state.phase === 'resolve') {
    if (state.handOver) info.textContent += ' (MANO FINITA)';
    else info.textContent += ' (CONSEGNA)';
  }
  if (state.phase === 'dealer') info.textContent += ' (BANCO)';
}

function updateTimer(state) {
  if (!state || state.phase === 'gameOver' || state.phase === 'resolve' || state.handOver) {
    $('game-timer').textContent = '';
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    return;
  }
  if (state.currentPlayer !== window.playerId) {
    $('game-timer').textContent = '';
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    return;
  }
  if (timerInterval) { clearInterval(timerInterval); }
  let sec = 45;
  const el = $('game-timer');
  el.textContent = `⏱ ${sec}s`;
  el.className = 'timer';
  timerInterval = setInterval(() => {
    sec--;
    if (sec <= 0 && timerInterval) { clearInterval(timerInterval); timerInterval = null; el.textContent = ''; return; }
    el.textContent = `⏱ ${sec}s`;
    el.className = 'timer' + (sec <= 10 ? ' danger' : sec <= 20 ? ' warning' : '');
  }, 1000);
}

/* ======================= SCOPA ======================= */

function renderScopa(state) {
  clearSelection(); selectedTakeIds = [];
  renderGameTopBar(state, 'Scopa'); updateTimer(state);
  const table = $('game-table'); table.innerHTML = '';

  if (state.phase === 'gameOver' || state.phase === 'roundEnd') {
    showOverlay(state); return;
  }

  addOpponents(state, table, false);
  const center = document.createElement('div'); center.className = 'center-area';
  const tcd = document.createElement('div'); tcd.id = 'table-cards';
  for (const card of state.table) {
    const el = createCardElement(card); el.dataset.cardId = card.id; tcd.appendChild(el);
  }
  center.appendChild(tcd); table.appendChild(center);
  const hand = document.createElement('div'); hand.id = 'player-hand'; table.appendChild(hand);
  renderScopaHand(state);
  for (const card of (state.hand || [])) {
    const el = hand.querySelector(`[data-card-id="${card.id}"]`);
    if (el) el.addEventListener('click', () => onHandCardClick(card.id, state));
  }
  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  showEvents(state);
}

/* ======================= BRISCOLA ======================= */

function renderBriscola(state) {
  clearSelection(); selectedTakeIds = [];
  renderGameTopBar(state, 'Briscola'); updateTimer(state);
  const table = $('game-table'); table.innerHTML = '';

  if (state.phase === 'gameOver') { showOverlay(state); return; }

  addOpponents(state, table, true);
  const da = document.createElement('div'); da.className = 'briscola-deck-area';
  if (state.deckSize > 0) {
    const back = createCardBack(); back.classList.add('small'); da.appendChild(back);
    const cnt = document.createElement('span'); cnt.className = 'deck-count'; cnt.textContent = `(${state.deckSize})`; da.appendChild(cnt);
  }
  if (state.briscola) {
    const bc = createCardElement(state.briscola, { small: true });
    const wrap = document.createElement('div');
    wrap.appendChild(bc);
    const lbl = document.createElement('div'); lbl.style.cssText = 'font-size:11px;color:#aaa'; lbl.textContent = 'Briscola';
    wrap.appendChild(lbl); da.appendChild(wrap);
  }
  table.appendChild(da);
  const td = document.createElement('div'); td.className = 'trick-area';
  for (const entry of state.playedThisTrick || []) {
    const wrap = document.createElement('div'); wrap.style.textAlign = 'center';
    const ce = createCardElement(entry.card); wrap.appendChild(ce);
    const lbl = document.createElement('div'); lbl.style.cssText = 'font-size:11px;color:#ccc';
    lbl.textContent = findPlayerName(entry.playerId); wrap.appendChild(lbl); td.appendChild(wrap);
  }
  table.appendChild(td);
  const hand = document.createElement('div'); hand.id = 'player-hand'; table.appendChild(hand);
  renderBriscolaHand(state);
  for (const c of (state.hand || [])) {
    const el = hand.querySelector(`[data-card-id="${c.id}"]`);
    if (el) el.addEventListener('click', () => onHandCardClick(c.id, state));
  }
  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  showEvents(state);
}

/* ======================= BLACKJACK ======================= */

function renderBlackjack(state) {
  clearSelection();
  renderGameTopBar(state, 'Blackjack'); updateTimer(state);
  const table = $('game-table'); table.innerHTML = '';

  if (state.phase === 'gameOver') { showOverlay(state); return; }

  const bjDiv = document.createElement('div'); bjDiv.className = 'bj-table-area';

  const da = document.createElement('div'); da.className = 'dealer-area';
  const dl = document.createElement('div'); dl.className = 'label';
  dl.textContent = `Banco ${state.dealerHand ? handValueText(state.dealerHand) : ''}`;
  da.appendChild(dl);
  const dh = document.createElement('div'); dh.id = 'dealer-hand';
  const dCards = state.dealerHand || [];
  for (let i = 0; i < dCards.length; i++) {
    const faceDown = (i === 1 && state.phase === 'play' && state.dealerHidden && !state.dealerHand[1]);
    const card = faceDown ? null : dCards[i];
    if (card) {
      const el = createCardElement(card, { bjCard: true }); el.classList.add('fade-in');
      if (faceDown) el.classList.add('card-back');
      dh.appendChild(el);
    } else {
      const back = createCardBack(); back.classList.add('bj-card'); dh.appendChild(back);
    }
  }
  if (state.phase !== 'play' && dCards.length >= 2 && state.dealerHidden) {
    dh.innerHTML = '';
    for (const c of state.dealerHand || []) {
      const el = createCardElement(c, { bjCard: true }); el.classList.add('fade-in'); dh.appendChild(el);
    }
  }
  da.appendChild(dh);
  if (state.phase === 'resolve' || state.phase === 'dealer') {
    const dv = document.createElement('div'); dv.className = 'bj-value';
    dv.textContent = `Valore: ${handValueText(state.dealerHand || [])}${state.dealerHand && handValue(state.dealerHand) > 21 ? ' (SBALLATO!)' : ''}`;
    da.appendChild(dv);
  }
  bjDiv.appendChild(da);

  for (const pid of state.playerOrder) {
    const pa = document.createElement('div'); pa.className = 'player-bj-area';
    const isMe = pid === window.playerId;
    const nm = isMe ? 'Tu' : findPlayerName(pid);
    const lbl = document.createElement('div'); lbl.className = 'label';
    lbl.textContent = `${nm} — Fiche: ${state.chips[pid] || 0} | Puntata: ${state.bets[pid] || 0}`;
    if (state.currentPlayer === pid && state.phase === 'play') lbl.textContent += ' 👈';
    pa.appendChild(lbl);

    const handDiv = document.createElement('div');
    handDiv.id = isMe ? 'player-hand' : '';
    handDiv.style.display = 'flex'; handDiv.style.justifyContent = 'center';
    handDiv.style.gap = '6px'; handDiv.style.margin = '4px 0';
    const hand = state.hand && isMe ? state.hand : (state.handSize[pid] ? [] : []);
    if (isMe && state.hand) {
      for (const c of state.hand) {
        const el = createCardElement(c, { bjCard: true }); el.dataset.cardId = c.id;
        el.classList.add('fade-in');
        if (state.phase === 'play' && state.currentPlayer === window.playerId) {
          el.addEventListener('click', () => {});
        }
        handDiv.appendChild(el);
      }
    } else {
      for (let i = 0; i < (state.handSize[pid] || 0); i++) {
        const back = createCardBack(); back.classList.add('bj-card'); handDiv.appendChild(back);
      }
    }
    pa.appendChild(handDiv);

    const hv = state.hand && isMe ? handValue(state.hand) : 0;
    if (isMe && state.hand && state.hand.length > 0) {
      const vd = document.createElement('div'); vd.className = 'bj-value';
      vd.textContent = `Valore: ${handValueText(state.hand)}${hv > 21 ? ' (SBALLATO!)' : hv === 21 && state.hand.length === 2 ? ' (BLACKJACK!)' : ''}`;
      pa.appendChild(vd);
    }

    if (state.results && state.results[pid]) {
      const rd = document.createElement('div'); rd.className = 'bj-result ' + state.results[pid];
      const resultLabels = { win: 'VINTO!', lose: 'PERSO', push: 'PAREggio', blackjack: 'BLACKJACK! 🎉', bust: 'SBALLATO' };
      rd.textContent = resultLabels[state.results[pid]] || state.results[pid];
      pa.appendChild(rd);
    }

    bjDiv.appendChild(pa);
  }

  table.appendChild(bjDiv);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  if (state.phase === 'bet' && state.currentPlayer === window.playerId && state.myChips > 0) {
    const amts = state.myChips >= 100 ? [10, 25, 50, 100] : state.myChips >= 50 ? [10, 25, 50] : state.myChips >= 25 ? [10, 25] : [10];
    for (const amt of amts) {
      const btn = document.createElement('button');
      btn.className = 'btn' + (amt === Math.min(100, state.myChips) ? ' primary' : '');
      btn.textContent = `Punta ${amt}`;
      btn.addEventListener('click', () => { window.socket.emit('playerAction', { action: { type: 'bet', amount: amt } }); });
      ap.appendChild(btn);
    }
  } else if (state.phase === 'play' && state.currentPlayer === window.playerId) {
    const hitBtn = document.createElement('button'); hitBtn.className = 'btn success';
    hitBtn.textContent = 'Carta +'; hitBtn.addEventListener('click', () => {
      window.socket.emit('playerAction', { action: { type: 'hit' } });
    });
    ap.appendChild(hitBtn);
    const standBtn = document.createElement('button'); standBtn.className = 'btn danger';
    standBtn.textContent = 'Sto ✋';
    standBtn.addEventListener('click', () => {
      window.socket.emit('playerAction', { action: { type: 'stand' } });
    });
    ap.appendChild(standBtn);
  } else if (state.phase === 'bet' && state.currentPlayer === window.playerId && state.myChips <= 0) {
    const btn = document.createElement('button'); btn.className = 'btn';
    btn.textContent = 'Non hai fiche! 👀';
    btn.disabled = true; ap.appendChild(btn);
  } else if (state.phase === 'resolve' || state.phase === 'dealer') {
    const nextBtn = document.createElement('button'); nextBtn.className = 'btn primary';
    nextBtn.textContent = 'Prossima mano →';
    nextBtn.addEventListener('click', () => {
      window.socket.emit('playerAction', { action: { type: 'nextRound' } });
    });
    ap.appendChild(nextBtn);
  }

  showEvents(state);
}

/* ======================= SETTE E MEZZO ======================= */

function renderSetteMezzo(state) {
  clearSelection();
  renderGameTopBar(state, 'Sette e Mezzo'); updateTimer(state);
  const table = $('game-table'); table.innerHTML = '';
  if (state.phase === 'gameOver') { showOverlay(state); return; }

  const bjDiv = document.createElement('div'); bjDiv.className = 'bj-table-area';

  const da = document.createElement('div'); da.className = 'dealer-area';
  const dl = document.createElement('div'); dl.className = 'label';
  dl.textContent = `Banco ${state.dealerHand ? smValueText(state.dealerHand) : ''}`;
  da.appendChild(dl);
  const dh = document.createElement('div'); dh.id = 'dealer-hand';
  const dCards = state.dealerHand || [];
  for (let i = 0; i < dCards.length; i++) {
    const el = createCardElement(dCards[i], { bjCard: true }); el.classList.add('fade-in'); dh.appendChild(el);
  }
  da.appendChild(dh);
  if (state.phase === 'resolve' || state.phase === 'dealer') {
    const dv = document.createElement('div'); dv.className = 'bj-value';
    dv.textContent = `Valore: ${smValueText(state.dealerHand || [])}${smValue(state.dealerHand || []) > 7.5 ? ' (SBALLATO!)' : ''}`;
    da.appendChild(dv);
  }
  bjDiv.appendChild(da);

  for (const pid of state.playerOrder) {
    const pa = document.createElement('div'); pa.className = 'player-bj-area';
    const isMe = pid === window.playerId;
    const nm = isMe ? 'Tu' : findPlayerName(pid);
    const lbl = document.createElement('div'); lbl.className = 'label';
    lbl.textContent = `${nm} — Fiche: ${state.chips[pid] || 0} | Puntata: ${state.bets[pid] || 0}`;
    if (state.currentPlayer === pid && state.phase === 'play') lbl.textContent += ' 👈';
    pa.appendChild(lbl);

    const handDiv = document.createElement('div');
    handDiv.id = isMe ? 'player-hand' : '';
    handDiv.style.display = 'flex'; handDiv.style.justifyContent = 'center';
    handDiv.style.gap = '6px'; handDiv.style.margin = '4px 0';
    if (isMe && state.hand) {
      for (const c of state.hand) {
        const el = createCardElement(c, { bjCard: true }); el.dataset.cardId = c.id;
        el.classList.add('fade-in');
        handDiv.appendChild(el);
      }
    } else {
      for (let i = 0; i < (state.handSize[pid] || 0); i++) {
        const back = createCardBack(); back.classList.add('bj-card'); handDiv.appendChild(back);
      }
    }
    pa.appendChild(handDiv);

    if (isMe && state.hand && state.hand.length > 0) {
      const vd = document.createElement('div'); vd.className = 'bj-value';
      const v = smValue(state.hand);
      vd.textContent = `Valore: ${smValueText(state.hand)}${v > 7.5 ? ' (SBALLATO!)' : v === 7.5 ? ' (7½!)' : ''}`;
      pa.appendChild(vd);
    }

    if (state.results && state.results[pid]) {
      const rd = document.createElement('div'); rd.className = 'bj-result ' + state.results[pid];
      const resultLabels = { win: 'VINTO!', lose: 'PERSO', push: 'PAREggio', bust: 'SBALLATO' };
      rd.textContent = resultLabels[state.results[pid]] || state.results[pid];
      pa.appendChild(rd);
    }

    bjDiv.appendChild(pa);
  }

  table.appendChild(bjDiv);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  if (state.phase === 'bet' && state.currentPlayer === window.playerId && state.myChips > 0) {
    const amts = state.myChips >= 100 ? [10, 25, 50, 100] : state.myChips >= 50 ? [10, 25, 50] : state.myChips >= 25 ? [10, 25] : [10];
    for (const amt of amts) {
      const btn = document.createElement('button');
      btn.className = 'btn' + (amt === Math.min(100, state.myChips) ? ' primary' : '');
      btn.textContent = `Punta ${amt}`;
      btn.addEventListener('click', () => { window.socket.emit('playerAction', { action: { type: 'bet', amount: amt } }); });
      ap.appendChild(btn);
    }
  } else if (state.phase === 'play' && state.currentPlayer === window.playerId) {
    const hitBtn = document.createElement('button'); hitBtn.className = 'btn success';
    hitBtn.textContent = 'Carta +'; hitBtn.addEventListener('click', () => {
      window.socket.emit('playerAction', { action: { type: 'hit' } });
    });
    ap.appendChild(hitBtn);
    const standBtn = document.createElement('button'); standBtn.className = 'btn danger';
    standBtn.textContent = 'Sto ✋';
    standBtn.addEventListener('click', () => {
      window.socket.emit('playerAction', { action: { type: 'stand' } });
    });
    ap.appendChild(standBtn);
  } else if (state.phase === 'bet' && state.currentPlayer === window.playerId && state.myChips <= 0) {
    const btn = document.createElement('button'); btn.className = 'btn';
    btn.textContent = 'Non hai fiche! 👀';
    btn.disabled = true; ap.appendChild(btn);
  } else if (state.phase === 'resolve' || state.phase === 'dealer') {
    const nextBtn = document.createElement('button'); nextBtn.className = 'btn primary';
    nextBtn.textContent = 'Prossima mano →';
    nextBtn.addEventListener('click', () => {
      window.socket.emit('playerAction', { action: { type: 'nextRound' } });
    });
    ap.appendChild(nextBtn);
  }

  showEvents(state);
}

/* ======================= TRESSETTE ======================= */

function renderTressette(state) {
  clearSelection(); selectedTakeIds = [];
  renderGameTopBar(state, 'Tressette'); updateTimer(state);
  const table = $('game-table'); table.innerHTML = '';
  if (state.phase === 'gameOver') { showOverlay(state); return; }

  addOpponentsTressette(state, table);

  const td = document.createElement('div'); td.className = 'trick-area';
  for (const entry of state.playedThisTrick || []) {
    const wrap = document.createElement('div'); wrap.style.textAlign = 'center';
    const ce = createCardElement(entry.card); wrap.appendChild(ce);
    const lbl = document.createElement('div'); lbl.style.cssText = 'font-size:11px;color:#ccc';
    lbl.textContent = findPlayerName(entry.playerId); wrap.appendChild(lbl); td.appendChild(wrap);
  }
  table.appendChild(td);

  const hand = document.createElement('div'); hand.id = 'player-hand'; table.appendChild(hand);
  const container = document.getElementById('player-hand') || hand;
  container.innerHTML = '';
  if (state.hand) {
    for (const c of state.hand) {
      const el = createCardElement(c);
      el.dataset.cardId = c.id;
      const isMyTurn = state.currentPlayer === window.playerId && state.phase === 'play';
      if (!isMyTurn) el.classList.add('disabled');
      container.appendChild(el);
    }
    for (const c of state.hand) {
      const el = container.querySelector(`[data-card-id="${c.id}"]`);
      if (el) el.addEventListener('click', () => onHandCardClick(c.id, state));
    }
  }

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  showEvents(state);
}

function addOpponentsTressette(state, container) {
  const oa = document.createElement('div'); oa.className = 'opponent-area';
  for (const pid of state.playerOrder) {
    if (pid === window.playerId) continue;
    const box = document.createElement('div');
    box.className = 'opponent-box' + (state.currentPlayer === pid ? ' is-current' : '');
    box.innerHTML = `
      <div class="name">${findPlayerName(pid)}</div>
      <div class="cards-count">Carte: ${state.handSize[pid] || 0}</div>
      <div class="captured-count">Prese: ${state.capturedCount[pid] || 0}</div>
      <div class="points">${state.points[pid] || 0} pt</div>
    `;
    oa.appendChild(box);
  }
  container.appendChild(oa);
}

/* ======================= POKER ======================= */

function renderPoker(state) {
  clearSelection();
  renderGameTopBar(state, 'Texas Hold\'em'); updateTimer(state);
  const table = $('game-table'); table.innerHTML = '';

  if (state.phase === 'gameOver') { showOverlay(state); return; }

  const pokerDiv = document.createElement('div'); pokerDiv.className = 'poker-table';

  const potInfo = document.createElement('div'); potInfo.className = 'poker-pot';
  potInfo.textContent = `💰 Piatto: ${state.pot} | Puntata corrente: ${state.currentBet}`;
  pokerDiv.appendChild(potInfo);

  const communityDiv = document.createElement('div'); communityDiv.className = 'poker-community';
  const cl = document.createElement('div'); cl.className = 'label';
  cl.textContent = `Community: ${state.phase === 'preflop' ? '(nessuna carta ancora)' : ''}`;
  communityDiv.appendChild(cl);

  const cc = document.createElement('div'); cc.style.display = 'flex'; cc.style.justifyContent = 'center'; cc.style.gap = '6px';
  for (const c of state.communityCards || []) {
    const el = createCardElement(c, { bjCard: true }); el.classList.add('fade-in'); cc.appendChild(el);
  }
  communityDiv.appendChild(cc);
  pokerDiv.appendChild(communityDiv);

  // Players
  for (const pid of state.playerOrder) {
    const pa = document.createElement('div'); pa.className = 'player-bj-area';
    const isMe = pid === window.playerId;
    const nm = isMe ? 'Tu' : findPlayerName(pid);
    const folded = state.playerFolded[pid];

    let status = '';
    if (folded) status = ' (LASCIATO)';
    else if (state.playerAllIn[pid]) status = ' (ALL-IN!)';
    else if (state.currentPlayer === pid) status = ' 👈';
    else if (state.playerDone[pid]) status = ' ✔';

    const lbl = document.createElement('div'); lbl.className = 'label';
    lbl.textContent = `${nm}${status} — Fiche: ${state.chips[pid] || 0} | Puntata: ${state.playerBet[pid] || 0}`;
    pa.appendChild(lbl);

    const handDiv = document.createElement('div');
    handDiv.id = isMe ? 'player-hand' : '';
    handDiv.style.display = 'flex'; handDiv.style.justifyContent = 'center';
    handDiv.style.gap = '6px'; handDiv.style.margin = '4px 0';

    if (isMe && state.hand) {
      for (const c of state.hand) {
        const el = createCardElement(c, { bjCard: true }); el.dataset.cardId = c.id;
        el.classList.add('fade-in'); handDiv.appendChild(el);
      }
    } else if (!folded) {
      for (let i = 0; i < 2; i++) {
        const back = createCardBack(); back.classList.add('bj-card'); handDiv.appendChild(back);
      }
    }
    pa.appendChild(handDiv);

    if (state.results && state.results[pid] && (state.phase === 'showdown' || state.phase === 'resolve' || state.phase === 'gameOver')) {
      const rd = document.createElement('div'); rd.className = 'bj-result win';
      rd.textContent = state.results[pid].name || '?';
      pa.appendChild(rd);
    }

    pokerDiv.appendChild(pa);
  }

  table.appendChild(pokerDiv);

  // Action panel
  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  if (state.handOver && state.phase !== 'gameOver') {
    const nextBtn = document.createElement('button'); nextBtn.className = 'btn primary';
    nextBtn.textContent = 'Prossima mano →';
    nextBtn.addEventListener('click', () => {
      window.socket.emit('playerAction', { action: { type: 'nextRound' } });
    });
    ap.appendChild(nextBtn);
  } else if (state.currentPlayer === window.playerId && state.phase !== 'showdown' && state.phase !== 'resolve' && !state.handOver) {
    const myBet = state.playerBet[window.playerId] || 0;
    const toCall = state.currentBet - myBet;
    const myChips = state.myChips || 0;

    if (toCall === 0) {
      const checkBtn = document.createElement('button'); checkBtn.className = 'btn success';
      checkBtn.textContent = 'Passa (Check)';
      checkBtn.addEventListener('click', () => { window.socket.emit('playerAction', { action: { type: 'check' } }); });
      ap.appendChild(checkBtn);
    } else {
      const callBtn = document.createElement('button'); callBtn.className = 'btn';
      callBtn.textContent = `Vedi (Call ${Math.min(toCall, myChips)})`;
      callBtn.addEventListener('click', () => { window.socket.emit('playerAction', { action: { type: 'call', amount: Math.min(toCall, myChips) } }); });
      ap.appendChild(callBtn);
    }

    const raiseAmt = myChips >= state.bbAmount ? Math.min(state.minRaise, myChips) : myChips;
    const raiseBtn = document.createElement('button'); raiseBtn.className = 'btn primary';
    raiseBtn.textContent = `Rilancia (Raise ${raiseAmt})`;
    raiseBtn.addEventListener('click', () => { window.socket.emit('playerAction', { action: { type: 'raise', amount: raiseAmt } }); });
    ap.appendChild(raiseBtn);

    const foldBtn = document.createElement('button'); foldBtn.className = 'btn danger';
    foldBtn.textContent = 'Lascia (Fold) ✋';
    foldBtn.addEventListener('click', () => { window.socket.emit('playerAction', { action: { type: 'fold' } }); });
    ap.appendChild(foldBtn);

    const allInBtn = document.createElement('button'); allInBtn.className = 'btn';
    allInBtn.textContent = `All-In ${myChips}`;
    allInBtn.addEventListener('click', () => { window.socket.emit('playerAction', { action: { type: 'allIn', amount: myChips } }); });
    ap.appendChild(allInBtn);
  }

  showEvents(state);
}

/* ======================= UNO ======================= */

function createUnoCardElement(card) {
  const el = document.createElement('div');
  el.className = 'card uno-card';
  if (card.color) el.style.background = card.color === 'red' ? 'linear-gradient(135deg, #D32F2F, #B71C1C)' : card.color === 'yellow' ? 'linear-gradient(135deg, #FFC107, #FF8F00)' : card.color === 'green' ? 'linear-gradient(135deg, #2E7D32, #1B5E20)' : card.color === 'blue' ? 'linear-gradient(135deg, #1565C0, #0D47A1)' : '';
  else el.style.background = 'linear-gradient(135deg, #333, #111)';
  if (card.type === 'wild') el.style.border = '3px solid #FFC107';
  if (card.type === 'wild4') el.style.border = '3px solid #D32F2F';
  const rank = document.createElement('span'); rank.className = 'rank';
  rank.textContent = card.rank || '?';
  rank.style.color = '#fff'; rank.style.fontSize = card.rank && card.rank.length > 1 ? '14px' : '18px';
  const suit = document.createElement('span'); suit.className = 'suit';
  suit.textContent = card.suitSymbol || '';
  suit.style.color = 'rgba(255,255,255,0.7)';
  el.appendChild(rank); el.appendChild(suit);
  el.dataset.cardId = card.id;
  return el;
}

function renderUno(state) {
  clearSelection();
  renderGameTopBar(state, 'UNO'); updateTimer(state);
  const table = $('game-table'); table.innerHTML = '';
  if (state.phase === 'gameOver') { showOverlay(state); return; }

  const unoDiv = document.createElement('div'); unoDiv.className = 'uno-table';

  const infoBar = document.createElement('div'); infoBar.className = 'uno-info';
  const colorNames = { red: 'Rosso', yellow: 'Giallo', green: 'Verde', blue: 'Blu' };
  const colorBox = document.createElement('span'); colorBox.style.cssText = 'display:inline-block;width:20px;height:20px;border-radius:50%;background:'+(state.currentColor||'#333')+';vertical-align:middle;margin:0 6px';
  infoBar.innerHTML = `<strong>Colore: ${colorNames[state.currentColor] || state.currentColor || '?'}</strong> `;
  infoBar.appendChild(colorBox);
  infoBar.innerHTML += ` | Mazzo: ${state.deckSize} carte | Direzione: ${state.direction === 1 ? '🔄 Orario' : '🔄 Antiorario'}`;
  unoDiv.appendChild(infoBar);

  const discardArea = document.createElement('div'); discardArea.className = 'uno-discard';
  const dl = document.createElement('div'); dl.className = 'label'; dl.textContent = 'Scarto:';
  discardArea.appendChild(dl);
  const topCardDiv = document.createElement('div'); topCardDiv.style.display = 'flex'; topCardDiv.style.justifyContent = 'center';
  if (state.discardTop) topCardDiv.appendChild(createUnoCardElement(state.discardTop));
  discardArea.appendChild(topCardDiv);
  unoDiv.appendChild(discardArea);

  for (const pid of state.playerOrder) {
    const pa = document.createElement('div'); pa.className = 'player-bj-area';
    const isMe = pid === window.playerId;
    const nm = isMe ? 'Tu' : findPlayerName(pid);
    const lbl = document.createElement('div'); lbl.className = 'label';
    lbl.textContent = `${nm} — Carte: ${state.handSize[pid] || 0}`;
    if (state.currentPlayer === pid) lbl.textContent += ' 👈';
    pa.appendChild(lbl);

    const handDiv = document.createElement('div');
    handDiv.id = isMe ? 'player-hand' : '';
    handDiv.style.display = 'flex'; handDiv.style.justifyContent = 'center';
    handDiv.style.gap = '6px'; handDiv.style.margin = '4px 0';

    if (isMe && state.hand) {
      for (const c of state.hand) {
        const el = createUnoCardElement(c); el.dataset.cardId = c.id;
        el.classList.add('fade-in');
        handDiv.appendChild(el);
      }
    } else {
      for (let i = 0; i < (state.handSize[pid] || 0); i++) {
        const back = createCardBack(); back.classList.add('small'); handDiv.appendChild(back);
      }
    }
    pa.appendChild(handDiv);
    unoDiv.appendChild(pa);
  }

  table.appendChild(unoDiv);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  const top = state.discardTop;

  if (state.phase === 'chooseColor' && state.currentPlayer === window.playerId) {
    const cl = document.createElement('div'); cl.className = 'label'; cl.textContent = 'Scegli un colore:';
    ap.appendChild(cl);
    const colors = [
      { color: 'red', label: 'Rosso', hex: '#D32F2F' },
      { color: 'yellow', label: 'Giallo', hex: '#FFC107' },
      { color: 'green', label: 'Verde', hex: '#2E7D32' },
      { color: 'blue', label: 'Blu', hex: '#1565C0' },
    ];
    for (const c of colors) {
      const btn = document.createElement('button');
      btn.style.background = c.hex; btn.style.color = '#fff';
      btn.className = 'btn'; btn.textContent = c.label;
      btn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'chooseColor', color: c.color } }));
      ap.appendChild(btn);
    }
  } else if (state.currentPlayer === window.playerId && state.phase === 'play') {
    if (state.pendingDraw > 0) {
      const btn = document.createElement('button'); btn.className = 'btn danger';
      btn.textContent = `Pesca ${state.pendingDraw} carte!`;
      btn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'draw' } }));
      ap.appendChild(btn);
    } else {
      const handlePlay = (cardId) => {
        window.socket.emit('playerAction', { action: { type: 'play', cardId } });
      };
      for (const c of (state.hand || [])) {
        const canPlay = c.color === state.currentColor || c.type === top?.type || c.type === 'wild' || c.type === 'wild4';
        if (canPlay) {
          const btn = createUnoCardElement(c);
          btn.className = 'card uno-card btn';
          btn.style.cursor = 'pointer'; btn.style.margin = '2px';
          btn.addEventListener('click', () => handlePlay(c.id));
          ap.appendChild(btn);
        }
      }
      const drawBtn = document.createElement('button'); drawBtn.className = 'btn';
      drawBtn.textContent = 'Pesca carta';
      drawBtn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'draw' } }));
      ap.appendChild(drawBtn);
    }
  }

  showEvents(state);
}

/* ======================= EXPLODING KITTENS ======================= */

function renderExplodingKittens(state) {
  clearSelection();
  renderGameTopBar(state, 'Exploding Kittens'); updateTimer(state);
  const table = $('game-table'); table.innerHTML = '';
  if (state.phase === 'gameOver') { showOverlay(state); return; }

  const ekDiv = document.createElement('div'); ekDiv.className = 'ek-table';

  const infoBar = document.createElement('div'); infoBar.className = 'uno-info';
  infoBar.innerHTML = `<strong>🐱 Mazzo: ${state.deckSize} carte</strong>`;
  ekDiv.appendChild(infoBar);

  for (const pid of state.playerOrder) {
    const isAlive = state.alive && state.alive[pid];
    const pa = document.createElement('div'); pa.className = 'player-bj-area';
    const isMe = pid === window.playerId;
    const nm = isMe ? 'Tu' : findPlayerName(pid);
    const lbl = document.createElement('div'); lbl.className = 'label';
    lbl.textContent = `${isAlive ? '✅' : '💥'} ${nm} — ${isAlive ? 'Carte: ' + (state.handSize[pid] || 0) : 'ELIMINATO'}`;
    if (state.currentPlayer === pid && isAlive) lbl.textContent += ' 👈';
    pa.appendChild(lbl);

    if (isAlive && isMe && state.hand) {
      const handDiv = document.createElement('div');
      handDiv.id = 'player-hand';
      handDiv.style.display = 'flex'; handDiv.style.justifyContent = 'center';
      handDiv.style.flexWrap = 'wrap'; handDiv.style.gap = '6px'; handDiv.style.margin = '4px 0';
      for (const c of state.hand) {
        const el = createCardElement(c);
        el.style.background = c.suitColor || '#333'; el.style.color = '#fff';
        el.style.fontSize = '20px'; el.style.minWidth = '60px';
        el.dataset.cardId = c.id;
        el.classList.add('fade-in');
        const isAction = c.type !== 'defuse' && c.type !== 'exploding_kitten';
        if (isAction) { el.style.cursor = 'pointer'; el.classList.add('btn'); }
        handDiv.appendChild(el);
      }
      pa.appendChild(handDiv);
    } else if (isAlive) {
      const sz = document.createElement('div'); sz.style.cssText = 'font-size:13px;color:#999;padding:4px';
      sz.textContent = `🃏 ${state.handSize[pid] || 0} carte`;
      pa.appendChild(sz);
    }

    if (state.futureCards && isMe) {
      const fd = document.createElement('div'); fd.style.cssText = 'font-size:12px;color:#FFC107;padding:4px';
      fd.textContent = `👀 Prossime: ${state.futureCards.map(c => c.label || c.type).join(', ')}`;
      pa.appendChild(fd);
    }

    ekDiv.appendChild(pa);
  }

  table.appendChild(ekDiv);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  if (state.currentPlayer === window.playerId && state.phase === 'play' && state.alive && state.alive[window.playerId]) {
    for (const c of (state.hand || [])) {
      if (c.type !== 'defuse' && c.type !== 'exploding_kitten') {
        const btn = document.createElement('button'); btn.className = 'btn';
        btn.style.background = c.suitColor || '#333'; btn.style.color = '#fff';
        btn.textContent = `${c.rank || '?'} ${c.label || c.type}`;
        if (c.type === 'favor') {
          btn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'playFavor', cardId: c.id } }));
        } else {
          btn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'playCard', cardId: c.id } }));
        }
        ap.appendChild(btn);
      }
    }
    const drawBtn = document.createElement('button'); drawBtn.className = 'btn primary';
    drawBtn.textContent = 'Pesca carta ➡️';
    drawBtn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'draw' } }));
    ap.appendChild(drawBtn);
  }

  showEvents(state);
}

/* ======================= SKULL KING ======================= */

function renderSkullKing(state) {
  renderGameTopBar(state, 'Skull King'); updateTimer(state);
  const table = $('game-table'); table.innerHTML = '';

  if (state.phase === 'gameOver') { showOverlay(state); return; }
  if (state.phase === 'roundOver') { showOverlay(state); return; }

  const container = document.createElement('div'); container.className = 'sk-container';

  const infoRow = document.createElement('div'); infoRow.className = 'sk-info-row';
  infoRow.innerHTML = `<span>Round ${state.round}/10</span>`;
  if (state.phase === 'bidding') infoRow.innerHTML += ' <span class="highlight">🃏 Puntate!</span>';
  else infoRow.innerHTML += ` <span>Mazzo: ${state.deckSize} carte</span>`;
  container.appendChild(infoRow);

  const tricksDiv = document.createElement('div'); tricksDiv.className = 'sk-tricks';
  for (const pid of state.playerOrder) {
    const t = document.createElement('span');
    const bid = state.bids[pid] === -1 ? '?' : state.bids[pid];
    t.textContent = `${findPlayerName(pid)}: ${state.tricksWon[pid] || 0}/${bid} prese`;
    if (pid === state.currentPlayer) t.style.fontWeight = 'bold';
    if (pid === window.playerId) t.style.color = '#FFC107';
    tricksDiv.appendChild(t);
    tricksDiv.appendChild(document.createTextNode(' '));
  }
  container.appendChild(tricksDiv);

  if (state.phase === 'bidding') {
    const bidArea = document.createElement('div'); bidArea.className = 'bid-area';
    for (const pid of state.playerOrder) {
      if (pid === window.playerId) continue;
      const bd = document.createElement('div'); bd.className = 'sk-bid-status';
      const bid = state.bids[pid];
      bd.textContent = `${findPlayerName(pid)}: ${bid === -1 ? '⏳' : `🤞 ${bid}`}`;
      if (state.currentPlayer === pid) bd.classList.add('highlight');
      bidArea.appendChild(bd);
    }
    container.appendChild(bidArea);
  }

  const trickArea = document.createElement('div'); trickArea.className = 'trick-area';
  if (state.playedThisTrick && state.playedThisTrick.length > 0) {
    for (const entry of state.playedThisTrick) {
      const wrap = document.createElement('div'); wrap.style.textAlign = 'center';
      const ce = createCardElement(entry.card); wrap.appendChild(ce);
      const lbl = document.createElement('div'); lbl.style.cssText = 'font-size:11px;color:#ccc';
      lbl.textContent = findPlayerName(entry.playerId); wrap.appendChild(lbl);
      trickArea.appendChild(wrap);
    }
  }
  container.appendChild(trickArea);

  if (state.hand && state.hand.length > 0) {
    const hd = document.createElement('div'); hd.id = 'player-hand';
    for (const c of state.hand) {
      const el = createCardElement(c);
      el.style.background = c.suitColor || '#333';
      if (c.type === 'tigress') el.style.background = 'linear-gradient(135deg,#FF6F00,#E65100)';
      el.dataset.cardId = c.id;
      hd.appendChild(el);
    }
    container.appendChild(hd);
  }

  table.appendChild(container);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);

  if (state.phase === 'bidding' && state.currentPlayer === window.playerId) {
    const handSize = (state.hand || []).length;
    for (let i = 0; i <= handSize; i++) {
      const btn = document.createElement('button'); btn.className = 'btn' + (i === 0 ? '' : ' primary');
      btn.textContent = `Punta ${i}`;
      btn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'bid', amount: i } }));
      ap.appendChild(btn);
    }
  }

  if (state.phase === 'play' && state.currentPlayer === window.playerId && state.hand) {
    for (const c of state.hand) {
      if (c.type === 'tigress') {
        const btn1 = document.createElement('button'); btn1.className = 'btn';
        btn1.style.background = '#D32F2F'; btn1.style.color = '#fff';
        btn1.textContent = `${c.rank} Tigre (Pirata)`;
        btn1.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'tigressChoice', cardId: c.id, subtype: 'pirate' } }));
        ap.appendChild(btn1);
        const btn2 = document.createElement('button'); btn2.className = 'btn';
        btn2.style.background = '#607D8B'; btn2.style.color = '#fff';
        btn2.textContent = `${c.rank} Tigre (Escape)`;
        btn2.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'tigressChoice', cardId: c.id, subtype: 'escape' } }));
        ap.appendChild(btn2);
      } else {
        const btn = document.createElement('button'); btn.className = 'btn';
        btn.textContent = `${c.rank} ${c.suitLabel || c.type}`;
        btn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'play', cardId: c.id } }));
        ap.appendChild(btn);
      }
    }
  }

  if (state.phase === 'roundOver' && state.currentPlayer === window.playerId) {
    const nb = document.createElement('button'); nb.className = 'btn primary';
    nb.textContent = 'Prossimo round ➡️';
    nb.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'nextRound' } }));
    ap.appendChild(nb);
  }

  showEvents(state);
}

/* ======================= THE MIND ======================= */

function renderTheMind(state) {
  const table = $('game-table'); table.innerHTML = '';
  const el = $('game-info');
  el.textContent = `The Mind — Livello ${state.level}/${state.maxLevel}`;

  if (state.phase === 'gameOver') {
    table.innerHTML = `<div class="tm-overlay"><h2>${state.winner ? '🎉 Vittoria!' : '💀 Sconfitta!'}</h2><p>Livello raggiunto: ${state.level}${state.winner ? '/' + state.maxLevel : ''}</p></div>`;
    showOverlay(state);
    return;
  }

  const c = document.createElement('div'); c.className = 'tm-container';

  const statusBar = document.createElement('div'); statusBar.className = 'tm-status';
  statusBar.innerHTML = `<span>❤️ ${'❤️'.repeat(state.lives)}${'🖤'.repeat(Math.max(0, state.maxLives - state.lives))}</span><span>⭐ ${'⭐'.repeat(state.stars)}${'☆'.repeat(Math.max(0, state.maxStars - state.stars))}</span><span>🃏 ${state.remainingCards} carte rimaste</span>`;
  c.appendChild(statusBar);

  const stackArea = document.createElement('div'); stackArea.className = 'tm-stack';
  if (state.lastPlayedValue > 0) {
    const lastCard = state.cardsPlayed && state.cardsPlayed.length > 0 ? state.cardsPlayed[state.cardsPlayed.length - 1] : null;
    if (lastCard) {
      const el2 = createCardElement(lastCard);
      el2.style.width = '80px'; el2.style.height = '110px'; el2.style.fontSize = '28px';
      el2.style.background = '#1565C0'; el2.style.color = '#fff';
      el2.style.borderRadius = '10px'; el2.style.margin = '0 auto';
      el2.querySelector('.rank').style.color = '#fff';
      el2.querySelector('.suit').style.display = 'none';
      stackArea.appendChild(el2);
    }
    const lbl = document.createElement('div'); lbl.style.cssText = 'font-size:13px;margin-top:6px;color:#ffca28';
    lbl.textContent = `Ultima: ${state.lastPlayedValue}`;
    stackArea.appendChild(lbl);
  } else {
    const empty = document.createElement('div'); empty.className = 'tm-empty-stack';
    empty.textContent = '⚪';
    empty.style.cssText = 'width:80px;height:110px;border:2px dashed #666;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto;';
    stackArea.appendChild(empty);
    const lbl = document.createElement('div'); lbl.style.cssText = 'font-size:12px;margin-top:6px;color:#888';
    lbl.textContent = 'In attesa...';
    stackArea.appendChild(lbl);
  }
  c.appendChild(stackArea);

  const playedCount = state.cardsPlayed ? state.cardsPlayed.length : 0;
  const totalCards = state.playerOrder ? state.playerOrder.length * state.level : 1;
  const progress = document.createElement('div'); progress.className = 'tm-progress';
  const pct = totalCards > 0 ? Math.round(playedCount / totalCards * 100) : 0;
  progress.innerHTML = `<div class="tm-bar"><div class="tm-fill" style="width:${pct}%"></div></div><span>${playedCount}/${totalCards}</span>`;
  c.appendChild(progress);

  if (state.hand && state.phase === 'play') {
    const hd = document.createElement('div'); hd.id = 'player-hand'; hd.className = 'tm-hand';
    for (const card of state.hand) {
      const el2 = createCardElement(card);
      el2.style.background = '#1565C0'; el2.style.color = '#fff'; el2.style.border = '2px solid #0D47A1';
      el2.style.width = '56px'; el2.style.height = '80px';
      el2.querySelector('.rank').style.color = '#fff';
      el2.querySelector('.rank').style.fontSize = '22px';
      el2.querySelector('.suit').style.display = 'none';
      hd.appendChild(el2);
    }
    c.appendChild(hd);
  }

  for (const pid of state.playerOrder) {
    if (pid === window.playerId) continue;
    const info = document.createElement('div'); info.className = 'tm-opponent';
    info.textContent = `${findPlayerName(pid)}: ${state.handSize[pid] || 0} carte`;
    if (state.ready && state.ready[pid] && state.phase === 'ready') info.textContent += ' ✅';
    c.appendChild(info);
  }

  table.appendChild(c);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);

  if (state.phase === 'ready') {
    if (!state.ready[window.playerId]) {
      const btn = document.createElement('button'); btn.className = 'btn primary';
      btn.textContent = '👋 Pronto!';
      btn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'ready' } }));
      ap.appendChild(btn);
    } else {
      const w = document.createElement('span'); w.style.cssText = 'color:#ffca28;font-size:16px;';
      w.textContent = '⏳ In attesa degli altri...';
      ap.appendChild(w);
    }
  }

  if (state.phase === 'play') {
    if ((state.hand || []).length > 0) {
      const btn = document.createElement('button'); btn.className = 'btn primary';
      btn.style.fontSize = '20px'; btn.style.padding = '14px 32px';
      btn.textContent = `🎯 Gioca (${state.hand[0].value})`;
      btn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'play' } }));
      ap.appendChild(btn);
    } else {
      const w = document.createElement('span'); w.style.cssText = 'color:#4CAF50;font-size:16px;';
      w.textContent = '✅ Hai finito le carte!';
      ap.appendChild(w);
    }

    if (state.stars > 0) {
      const sbtn = document.createElement('button'); sbtn.className = 'btn';
      sbtn.textContent = `⭐ Usa Stella (×${state.stars})`;
      sbtn.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'useStar' } }));
      ap.appendChild(sbtn);
    }
  }

  if (state.phase === 'levelComplete') {
    const nb = document.createElement('button'); nb.className = 'btn primary';
    nb.textContent = state.level >= state.maxLevel ? '🏁 Fine!' : '▶️ Prossimo livello';
    nb.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'nextLevel' } }));
    ap.appendChild(nb);
  }

  showEvents(state);
}

/* ======================= 31 ======================= */

function renderThirtyOne(state) {
  const table = $('game-table'); table.innerHTML = '';
  renderGameTopBar(state, '31'); updateTimer(state);

  if (state.phase === 'gameOver') { showOverlay(state); return; }
  if (state.phase === 'roundOver') { showOverlay(state); return; }

  const c = document.createElement('div'); c.className = 'to-container';

  const livesRow = document.createElement('div'); livesRow.className = 'to-lives';
  livesRow.innerHTML = state.playerOrder.map(pid =>
    `<span${pid === window.playerId ? ' style="color:#FFC107"' : ''}>${findPlayerName(pid)}: ${'❤️'.repeat(state.lives[pid] || 0)}${'🖤'.repeat(Math.max(0, 3 - (state.lives[pid] || 0)))}</span>`
  ).join(' ');
  c.appendChild(livesRow);

  if (state.knocked) {
    const kc = document.createElement('div'); kc.className = 'to-knock';
    kc.textContent = `🔔 ${findPlayerName(state.knocker)} ha chiuso!`;
    c.appendChild(kc);
  }

  const poolArea = document.createElement('div'); poolArea.className = 'to-pool';
  const poolLabel = document.createElement('div'); poolLabel.style.cssText = 'font-size:13px;font-weight:600;color:#ccc;margin-bottom:4px;';
  poolLabel.textContent = 'Mazzo:';
  poolArea.appendChild(poolLabel);
  const poolCards = document.createElement('div'); poolCards.style.display = 'flex'; poolCards.style.gap = '6px'; poolCards.style.justifyContent = 'center';
  for (const pc of state.pool) {
    const el = createCardElement(pc); el.dataset.cardId = pc.id;
    poolCards.appendChild(el);
  }
  poolArea.appendChild(poolCards);
  c.appendChild(poolArea);

  if (state.hand) {
    const handDiv = document.createElement('div'); handDiv.id = 'player-hand';
    handDiv.style.display = 'flex'; handDiv.style.justifyContent = 'center'; handDiv.style.gap = '6px'; handDiv.style.margin = '8px 0';
    for (let i = 0; i < state.hand.length; i++) {
      const el = createCardElement(state.hand[i]);
      el.dataset.cardIndex = i;
      el.dataset.cardId = state.hand[i].id;
      handDiv.appendChild(el);
    }
    c.appendChild(handDiv);

    const hv = document.createElement('div'); hv.className = 'to-handvalue';
    const v = state.handValue;
    hv.textContent = `Valore mano: ${v === 30.5 ? '30½' : v === 32 ? '32 (Fuoco!)' : v} pt`;
    if (v >= 28) hv.style.color = '#4CAF50';
    else if (v >= 22) hv.style.color = '#FFC107';
    else hv.style.color = '#ff5252';
    c.appendChild(hv);
  }

  for (const pid of state.playerOrder) {
    if (pid === window.playerId) continue;
    const oi = document.createElement('div'); oi.className = 'to-opponent';
    oi.textContent = `${findPlayerName(pid)}: ${state.handSize[pid] || 0} carte${state.currentPlayer === pid ? ' 🎯' : ''}`;
    c.appendChild(oi);
  }

  table.appendChild(c);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);

  if (state.phase === 'play' && state.currentPlayer === window.playerId) {
    const addBtn = (label, actionData, cls = 'btn') => {
      const btn = document.createElement('button'); btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', () => window.socket.emit('playerAction', { action: actionData }));
      ap.appendChild(btn);
    };

    if (state.handValue >= 31) {
      addBtn('🎉 Dichiara 31!', { type: 'declare31' }, 'btn primary');
    }
    if (state.handValue === 32) {
      addBtn('🔥 Fuoco! (3 Assi)', { type: 'declareFeuer' }, 'btn danger');
    }
    if (!state.knocked) {
      addBtn('🔔 Chiudi', { type: 'knock' }, 'btn');
    }
    addBtn('⏭️ Passa', { type: 'pass' });

    for (let i = 0; i < (state.hand || []).length; i++) {
      for (const pc of state.pool) {
        addBtn(`Scambia ${state.hand[i].rank}${state.hand[i].suitSymbol} ↔ ${pc.rank}${pc.suitSymbol}`,
          { type: 'swap', cardIndex: i, poolCardId: pc.id });
      }
    }
    if (!state.knocked && state.pool.length === 3) {
      addBtn('🔄 Scambia tutto', { type: 'swapAll' });
    }
  }

  if (state.phase === 'roundOver' && state.currentPlayer === window.playerId) {
    const nb = document.createElement('button'); nb.className = 'btn primary';
    nb.textContent = 'Prossimo round ➡️';
    nb.addEventListener('click', () => window.socket.emit('playerAction', { action: { type: 'nextRound' } }));
    ap.appendChild(nb);
  }

  showEvents(state);
}

let selectedMeldCards = [];

function renderRamino(state) {
  const table = $('game-table'); table.innerHTML = '';
  renderGameTopBar(state, 'Ramino'); updateTimer(state);

  if (state.phase === 'roundOver' || state.phase === 'gameOver') { showOverlay(state); return; }

  const c = document.createElement('div'); c.className = 'rm-container';

  const info = document.createElement('div'); info.className = 'rm-info';
  info.innerHTML = `📚 Mazzo: ${state.deckSize} carte | 🗑️ Scarto: ${state.discardTop ? createCardElement(state.discardTop).outerHTML : '—'}`;
  c.appendChild(info);

  for (const pid of state.playerOrder) {
    const isMe = pid === window.playerId;
    const sec = document.createElement('div'); sec.className = 'rm-player';

    const header = document.createElement('div'); header.className = 'rm-header';
    header.textContent = `${isMe ? '👤 Tu' : findPlayerName(pid)} — ${state.handSize[pid] || 0} carte${state.currentPlayer === pid ? ' 🎯' : ''}`;
    sec.appendChild(header);

    if (state.melds && state.melds[pid] && state.melds[pid].length > 0) {
      const meldArea = document.createElement('div'); meldArea.className = 'rm-melds';
      for (let mi = 0; mi < state.melds[pid].length; mi++) {
        const g = document.createElement('div'); g.className = 'rm-meld-group';
        for (const mc of state.melds[pid][mi]) {
          const el = createCardElement(mc);
          if (mc.rank === 'JOKER') el.classList.add('joker');
          g.appendChild(el);
        }
        meldArea.appendChild(g);
      }
      sec.appendChild(meldArea);
    }

    if (isMe && state.hand) {
      const handDiv = document.createElement('div'); handDiv.className = 'rm-hand';
      for (let i = 0; i < state.hand.length; i++) {
        const el = createCardElement(state.hand[i]);
        el.dataset.cardId = state.hand[i].id;
        const idx = selectedMeldCards.indexOf(state.hand[i].id);
        if (idx >= 0) el.classList.add('selected');
        el.addEventListener('click', () => {
          const i2 = selectedMeldCards.indexOf(state.hand[i].id);
          if (i2 >= 0) selectedMeldCards.splice(i2, 1);
          else selectedMeldCards.push(state.hand[i].id);
          renderRamino(state);
        });
        handDiv.appendChild(el);
      }
      sec.appendChild(handDiv);
    }

    c.appendChild(sec);
  }

  table.appendChild(c);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  if (state.phase === 'play' || state.phase === 'action' && state.currentPlayer === window.playerId) {
    if (state.phase === 'draw' && !state.drawnThisTurn) {
      addActionBtn(ap, '📥 Pesca dal mazzo', { type: 'drawFromDeck' });
      addActionBtn(ap, '📤 Pesca dallo scarto', { type: 'drawFromDiscard' });
      if (state.deckSize === 0) addActionBtn(ap, '⏭️ Salta pesca', { type: 'skipDraw' });
    }
    if (state.phase === 'action' && state.drawnThisTurn) {
      if (selectedMeldCards.length >= 3) {
        addActionBtn(ap, '🃏 Mela selezionate', { type: 'meld', cardIds: selectedMeldCards }, 'btn');
      }
      if (selectedMeldCards.length === 1) {
        const sid = selectedMeldCards[0];
        for (const pid of state.playerOrder) {
          const ml = state.melds[pid] || [];
          for (let mi = 0; mi < ml.length; mi++) {
            addActionBtn(ap, `➕ Appoggia a mela ${findPlayerName(pid)} #${mi+1}`,
              { type: 'addToMeld', ownerId: pid, meldIndex: mi, cardId: sid }, 'btn');
          }
        }
      }
      if (selectedMeldCards.length === 1) {
        addActionBtn(ap, '🗑️ Scarta', { type: 'discard', cardId: selectedMeldCards[0] }, 'btn');
      }
    }
  }
  showEvents(state);
}

function renderScala40(state) {
  const table = $('game-table'); table.innerHTML = '';
  renderGameTopBar(state, 'Scala 40'); updateTimer(state);

  if (state.phase === 'roundOver' || state.phase === 'gameOver') { showOverlay(state); return; }

  const c = document.createElement('div'); c.className = 'rm-container';

  const info = document.createElement('div'); info.className = 'rm-info';
  info.innerHTML = `📚 Mazzo: ${state.deckSize} carte | 🗑️ Scarto: ${state.discardTop ? createCardElement(state.discardTop).outerHTML : '—'}`;
  c.appendChild(info);

  for (const pid of state.playerOrder) {
    const isMe = pid === window.playerId;
    const sec = document.createElement('div'); sec.className = 'rm-player';

    const initDone = state.initialMeldDone && state.initialMeldDone[pid];
    const header = document.createElement('div'); header.className = 'rm-header';
    header.innerHTML = `${isMe ? '👤 Tu' : findPlayerName(pid)} — ${state.handSize[pid] || 0} carte${state.currentPlayer === pid ? ' 🎯' : ''} ${initDone ? '✅ Scala 40' : '⏳ Scala 40'}`;
    sec.appendChild(header);

    if (state.melds && state.melds[pid] && state.melds[pid].length > 0) {
      const meldArea = document.createElement('div'); meldArea.className = 'rm-melds';
      for (let mi = 0; mi < state.melds[pid].length; mi++) {
        const g = document.createElement('div'); g.className = 'rm-meld-group';
        for (const mc of state.melds[pid][mi]) {
          const el = createCardElement(mc);
          if (mc.rank === 'JOKER') el.classList.add('joker');
          g.appendChild(el);
        }
        meldArea.appendChild(g);
      }
      sec.appendChild(meldArea);
    }

    if (isMe && state.hand) {
      const handDiv = document.createElement('div'); handDiv.className = 'rm-hand';
      for (let i = 0; i < state.hand.length; i++) {
        const el = createCardElement(state.hand[i]);
        el.dataset.cardId = state.hand[i].id;
        if (state.hand[i].rank === 'JOKER') el.classList.add('joker');
        const idx = selectedMeldCards.indexOf(state.hand[i].id);
        if (idx >= 0) el.classList.add('selected');
        el.addEventListener('click', () => {
          const i2 = selectedMeldCards.indexOf(state.hand[i].id);
          if (i2 >= 0) selectedMeldCards.splice(i2, 1);
          else selectedMeldCards.push(state.hand[i].id);
          renderScala40(state);
        });
        handDiv.appendChild(el);
      }
      sec.appendChild(handDiv);
    }

    c.appendChild(sec);
  }

  table.appendChild(c);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);
  if (state.phase === 'play' || state.phase === 'action' && state.currentPlayer === window.playerId) {
    if (state.phase === 'draw' && !state.drawnThisTurn) {
      addActionBtn(ap, '📥 Pesca dal mazzo', { type: 'drawFromDeck' });
      addActionBtn(ap, '📤 Pesca dallo scarto', { type: 'drawFromDiscard' });
      if (state.deckSize === 0) addActionBtn(ap, '⏭️ Salta pesca', { type: 'skipDraw' });
    }
    if (state.phase === 'action' && state.drawnThisTurn) {
      if (selectedMeldCards.length >= 3) {
        addActionBtn(ap, '🃏 Mela selezionate', { type: 'meld', cardIds: selectedMeldCards }, 'btn');
      }
      if (selectedMeldCards.length === 1) {
        const sid = selectedMeldCards[0];
        for (const pid of state.playerOrder) {
          const ml = state.melds[pid] || [];
          for (let mi = 0; mi < ml.length; mi++) {
            addActionBtn(ap, `➕ Appoggia a mela ${findPlayerName(pid)} #${mi+1}`,
              { type: 'addToMeld', ownerId: pid, meldIndex: mi, cardId: sid }, 'btn');
          }
        }
      }
      if (selectedMeldCards.length === 1) {
        addActionBtn(ap, '🗑️ Scarta', { type: 'discard', cardId: selectedMeldCards[0] }, 'btn');
      }
    }
  }
  showEvents(state);
}

/* ======================= MEMORY ======================= */

let memMismatchTimer = null;

function renderMemory(state) {
  const table = $('game-table'); table.innerHTML = '';
  renderGameTopBar(state, 'Memory'); updateTimer(state);

  if (state.phase === 'roundOver' || state.phase === 'gameOver') { showOverlay(state); return; }

  const c = document.createElement('div'); c.className = 'mem-container';

  const info = document.createElement('div'); info.className = 'mem-info';
  const myPairs = state.pairsFound[window.playerId] || 0;
  let totalFound = 0;
  const infoParts = [];
  for (const pid of state.playerOrder) {
    const cnt = state.pairsFound[pid] || 0;
    totalFound += cnt;
    infoParts.push(`${findPlayerName(pid)}: ${cnt}${pid === state.currentPlayer ? ' 🎯' : ''}`);
  }
  info.innerHTML = `<span>${infoParts.join(' | ')}</span><span>Trovate: ${totalFound}/${state.pairsCount}</span>`;
  if (state.hasJoker) info.innerHTML += '<span>⭐ Jolly</span>';
  c.appendChild(info);

  const grid = document.createElement('div'); grid.className = 'mem-grid';
  grid.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;

  const isMyTurn = state.currentPlayer === window.playerId &&
    (state.phase === 'pickFirst' || state.phase === 'pickSecond');

  for (const card of state.grid) {
    const el = document.createElement('div');
    el.className = 'mem-card';
    el.dataset.row = card.row;
    el.dataset.col = card.col;

    if (card.matched) {
      el.classList.add('matched');
      el.textContent = card.symbol;
      if (card.isJoker) el.classList.add('joker');
    } else if (card.flipped && card.visible) {
      el.classList.add('flipped');
      el.textContent = card.symbol;
      if (card.isJoker) el.classList.add('joker');
    } else {
      el.classList.add('back');
      el.textContent = '?';
    }

    if (isMyTurn && !card.matched && !card.flipped) {
      el.classList.add('clickable');
      el.addEventListener('click', () => {
        window.socket.emit('playerAction', { action: { type: 'pickCard', cardId: card.id } });
      });
    }

    grid.appendChild(el);
  }

  c.appendChild(grid);
  table.appendChild(c);

  const ap = document.createElement('div'); ap.id = 'action-panel'; table.appendChild(ap);

  if (state.phase === 'mismatch' && state.currentPlayer === window.playerId) {
    const waitMsg = document.createElement('div');
    waitMsg.className = 'mem-wait';
    waitMsg.textContent = '🔄 Ricorda le carte...';
    ap.appendChild(waitMsg);

    if (memMismatchTimer) { clearTimeout(memMismatchTimer); memMismatchTimer = null; }
    memMismatchTimer = setTimeout(() => {
      window.socket.emit('playerAction', { action: { type: 'resolveMismatch' } });
      memMismatchTimer = null;
    }, 1500);
  } else {
    if (memMismatchTimer) { clearTimeout(memMismatchTimer); memMismatchTimer = null; }
  }

  showEvents(state);
}

function addActionBtn(ap, label, actionData, cls = 'btn') {
  const btn = document.createElement('button'); btn.className = cls;
  btn.textContent = label;
  btn.addEventListener('click', () => window.socket.emit('playerAction', { action: actionData }));
  ap.appendChild(btn);
}

/* ======================= SHARED ======================= */

function showOverlay(state) {
  const table = $('game-table'); table.innerHTML = '';
  const ov = document.createElement('div'); ov.id = 'round-end-overlay';
  ov.innerHTML = `<h2>${state.phase === 'gameOver' ? '🏆 Partita Finita!' : '📋 Fine Mano'}</h2>`;
  const sd = document.createElement('div'); sd.className = 'scores-table';

  const gameType = state.gameType || 'scopa';

  for (const pid of state.playerOrder) {
    const isHuman = pid === window.playerId;
    const entry = document.createElement('div');
    entry.className = 'score-entry' + (state.winner === pid ? ' winner' : '');
    let pts = '';
    if (gameType === 'uno') {
      const c = state.handSize ? state.handSize[pid] || 0 : 0;
      pts = `${c} carte${state.winner === pid ? ' (VINTO!)' : ''}`;
    } else if (gameType === 'explodingkittens') {
      pts = state.alive && state.alive[pid] ? '✅ Vivo' : '💥 Eliminato';
    } else if (gameType === 'blackjack' || gameType === 'settenmezzo' || gameType === 'poker') pts = `${state.chips[pid] || 0} fiche`;
    else if (gameType === 'skullking') pts = `${state.gameScores[pid] || 0} pt${state.phase !== 'roundOver' ? ` (${state.tricksWon[pid] || 0}/${state.bids[pid] === -1 ? '?' : state.bids[pid]} prese)` : ''}`;
    else if (state.gamePoints && state.gamePoints[pid] !== undefined) pts = `${state.gamePoints[pid]} pt`;
    else if (state.points) pts = `${state.points[pid] || 0} pt`;
    else pts = `${state.scores[pid] || 0} pt`;
    entry.innerHTML = `
      <div class="name">${findPlayerName(pid)}${isHuman ? ' (tu)' : ''}${state.winner === pid ? ' 👑' : ''}</div>
      <div class="points">${pts}</div>
    `;
    sd.appendChild(entry);
  }
  ov.appendChild(sd);

  const canNext = ((gameType === 'blackjack' || gameType === 'settenmezzo' || gameType === 'uno' || gameType === 'explodingkittens' || gameType === 'skullking' || gameType === 'themind' || gameType === 'thiryone' || gameType === 'ramino' || gameType === 'scala40' || gameType === 'memory' || (gameType === 'poker' && state.handOver))) && state.phase !== 'gameOver';
  if (canNext) {
    const nb = document.createElement('button'); nb.className = 'btn primary';
    nb.textContent = 'Prossima mano →';
    nb.addEventListener('click', () => {
      window.socket.emit('playerAction', { action: { type: 'nextRound' } });
    });
    ov.appendChild(nb);
  }

  table.appendChild(ov);
}

function showEvents(state) {
  const ev = $('game-events');
  if (state.events && state.events.length > 0) {
    ev.innerHTML = formatEvents(state.events);
    ev.classList.remove('hidden');
  } else { ev.innerHTML = ''; }
}

function addOpponents(state, container, isBriscola) {
  const oa = document.createElement('div'); oa.className = 'opponent-area';
  for (const pid of state.playerOrder) {
    if (pid === window.playerId) continue;
    const box = document.createElement('div');
    box.className = 'opponent-box' + (state.currentPlayer === pid ? ' is-current' : '');
    let extra = '';
    if (isBriscola) extra = `<div class="points">${state.points[pid] || 0} pt</div>`;
    else extra = state.scores ? `<div class="points">${state.scores[pid] || 0} pt</div>` : '';
    box.innerHTML = `
      <div class="name">${findPlayerName(pid)}</div>
      <div class="cards-count">Carte: ${state.handSize[pid] || 0}</div>
      ${!isBriscola ? `<div class="captured-count">Prese: ${state.capturedCount[pid] || 0}</div>` : ''}
      ${extra}
    `;
    oa.appendChild(box);
  }
  container.appendChild(oa);
}

/* ======================= CARD SELECTION ======================= */

function clearSelection() { selectedCardId = null; selectedTakeIds = []; }

function onHandCardClick(cardId, state) {
  const gt = state.gameType;
  if ((gt === 'briscola' || gt === 'tressette') && state.currentPlayer === window.playerId && state.phase === 'play') {
    window.socket.emit('playerAction', { action: { cardId } });
    return;
  }
  if (state.currentPlayer !== window.playerId || state.phase !== 'play') return;
  if (gt === 'blackjack' || gt === 'settenmezzo' || gt === 'uno' || gt === 'explodingkittens') return;
  if (selectedCardId === cardId) { clearSelection(); updateActionPanel(state); return; }
  selectedCardId = cardId; selectedTakeIds = []; updateActionPanel(state);
  document.querySelectorAll('#player-hand .card').forEach(el => {
    el.classList.toggle('selected', el.dataset.cardId === cardId);
  });
}

function updateActionPanel(state) {
  const panel = $('action-panel'); panel.innerHTML = '';
  if (!selectedCardId) return;
  const card = (state.hand || []).find(c => c.id === selectedCardId);
  if (!card) return;

  if (state.gameType === 'briscola' || state.gameType === 'tressette' || state.gameType === 'uno' || state.gameType === 'explodingkittens') return;

  const tableCards = state.table || [];
  const value = card.value;
  const singles = tableCards.filter(c => c.value === value);
  const combos = findCombinations(tableCards, value);

  if (singles.length > 0) {
    for (const s of singles) {
      const btn = document.createElement('button'); btn.className = 'btn primary';
      btn.textContent = `Prendi ${s.rank} ${s.suitSymbol}`;
      btn.addEventListener('click', () => playScopaAction(selectedCardId, [s.id]));
      panel.appendChild(btn);
    }
  } else if (combos.length > 0) {
    document.querySelectorAll('#table-cards .card').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => toggleTakeCard(el.dataset.cardId, state));
    });
    const info = document.createElement('p'); info.style.cssText = 'font-size:13px;margin-bottom:8px';
    info.textContent = `Seleziona le carte da prendere (somma = ${card.rank})`; panel.appendChild(info);
    const tb = document.createElement('button'); tb.className = 'btn primary'; tb.id = 'take-combo-btn';
    tb.textContent = 'Prendi'; tb.disabled = true;
    tb.addEventListener('click', () => { if (selectedTakeIds.length > 0) playScopaAction(selectedCardId, selectedTakeIds); });
    panel.appendChild(tb);
    const pb = document.createElement('button'); pb.className = 'btn'; pb.textContent = 'Lascia sul tavolo';
    pb.addEventListener('click', () => playScopaAction(selectedCardId, null));
    panel.appendChild(pb);
  } else {
    const btn = document.createElement('button'); btn.className = 'btn';
    btn.textContent = `Gioca ${card.rank} ${card.suitSymbol}`;
    btn.addEventListener('click', () => playScopaAction(selectedCardId, null));
    panel.appendChild(btn);
  }
}

function toggleTakeCard(cardId, state) {
  const idx = selectedTakeIds.indexOf(cardId);
  if (idx >= 0) selectedTakeIds.splice(idx, 1);
  else selectedTakeIds.push(cardId);
  const value = (state.hand || []).find(c => c.id === selectedCardId)?.value || 0;
  const sum = selectedTakeIds.reduce((s, id) => {
    const c = state.table.find(t => t.id === id); return s + (c ? c.value : 0);
  }, 0);
  document.querySelectorAll('#table-cards .card').forEach(el => {
    el.classList.toggle('taken-highlight', selectedTakeIds.includes(el.dataset.cardId));
  });
  const tb = document.getElementById('take-combo-btn');
  if (tb) tb.disabled = sum !== value || selectedTakeIds.length === 0;
}

function playScopaAction(cardId, takeIds) {
  if (!window.socket) return;
  window.socket.emit('playerAction', { action: { cardId, take: takeIds } }, (res) => {
    if (res && res.error) showToast(res.error);
  });
  clearSelection();
}

function findCombinations(cards, target) {
  const results = [];
  function bt(start, sel, sum) {
    if (sum === target) { results.push([...sel]); return; }
    if (sum > target) return;
    for (let i = start; i < cards.length; i++) {
      sel.push(cards[i]); bt(i + 1, sel, sum + cards[i].value); sel.pop();
    }
  }
  bt(0, [], 0);
  return results;
}

/* ======================= CARD VALUE HELPERS ======================= */

function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; total += 11; }
    else if (['K', 'Q', 'J', '10'].includes(c.rank)) total += 10;
    else total += parseInt(c.rank) || 0;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function handValueText(cards) {
  const v = handValue(cards);
  if (v === 21 && cards.length === 2) return '21 (BJ)';
  if (v > 21) return v + ' Sballato!';
  return String(v);
}

function smValue(cards) {
  let total = 0;
  for (const c of cards) {
    if (['J', 'Q', 'K', 'C', 'R'].includes(c.rank)) total += 0.5;
    else if (c.rank === 'A' || c.rank === '1') total += 1;
    else total += parseInt(c.rank) || 0;
  }
  return total;
}

function smValueText(cards) {
  const v = smValue(cards);
  if (v > 7.5) return v + ' Sballato!';
  return v === 7.5 ? '7½' : String(v);
}

/* ======================= NAME RESOLUTION ======================= */

function findPlayerName(pid) {
  if (pid === window.playerId) return 'Tu';
  if (pid && pid.startsWith('bot_')) return 'Bot';
  if (window.currentRoom && pid) {
    const p = window.currentRoom.players.find(pl => pl.id === pid);
    if (p) return p.nickname;
  }
  return pid ? pid.slice(0, 8) : '?';
}

/* ======================= EVENTS ======================= */

function formatEvents(events) {
  const msgs = [];
  for (const e of events) {
    if (e.type === 'scopa') msgs.push('🃏 Scopa!');
    else if (e.type === 'capture') msgs.push(`${findPlayerName(e.playerId)} prende ${(e.taken || []).length} carta/e`);
    else if (e.type === 'play') msgs.push(`${findPlayerName(e.playerId)} gioca ${e.card?.rank || ''}${e.card?.suitSymbol || ''}`);
    else if (e.type === 'trick') msgs.push(`🏆 ${findPlayerName(e.winner)} vince la presa!`);
    else if (e.type === 'lastTrick') msgs.push(`📌 ${findPlayerName(e.winner)} fa l'ultima presa! (+1 pt)`);
    else if (e.type === 'gameOver') msgs.push(`👑 ${findPlayerName(e.winner)} vince la partita!`);
    else if (e.type === 'roundScore') {
      const parts = Object.entries(e.scores || {}).map(([pid, pts]) => `${findPlayerName(pid)}: ${pts}pt`);
      msgs.push('📊 ' + parts.join(' | '));
    } else if (e.type === 'deal') msgs.push('📩 Nuova distribuzione');
    else if (e.type === 'newRound') {
      let msg = '🔄 Nuova mano!';
      if (e.previousScores) {
        const parts = Object.entries(e.previousScores).map(([pid, pts]) => `${findPlayerName(pid)}: ${pts}pt`);
        msg += ' — ' + parts.join(' | ');
      }
      msgs.push(msg);
    } else if (e.type === 'newHand') {
      msgs.push(`🔄 Nuova mano! Dealer: ${findPlayerName(e.dealer)}`);
    } else if (e.type === 'sweep') msgs.push(`🧹 Ultime carte a ${findPlayerName(e.playerId)}`);
    else if (e.type === 'bet') msgs.push(`💰 ${findPlayerName(e.playerId)} punta ${e.amount}`);
    else if (e.type === 'hit') msgs.push(`${findPlayerName(e.playerId)}: Carta! ${e.card?.rank || ''}${e.card?.suitSymbol || ''}`);
    else if (e.type === 'stand') msgs.push(`✋ ${findPlayerName(e.playerId)} sta${e.note ? ' (' + e.note + ')' : ''}`);
    else if (e.type === 'bust') msgs.push(`💥 ${findPlayerName(e.playerId)} sballato! (${e.value})`);
    else if (e.type === 'blackjack') msgs.push(`🎉 ${findPlayerName(e.playerId)}: BLACKJACK!`);
    else if (e.type === 'dealerBlackjack') msgs.push(`🎲 Il banco ha Blackjack!`);
    else if (e.type === 'dealerTurn') msgs.push(`🎰 Turno del banco`);
    else if (e.type === 'dealerHit') msgs.push(`Banco prende carta: ${e.card?.rank || ''}${e.card?.suitSymbol || ''}`);
    else if (e.type === 'resolve') {
      if (e.dValue) msgs.push(`📋 Banco: ${e.dValue} punti`);
    } else if (e.type === 'fold') msgs.push(`✋ ${findPlayerName(e.playerId)} lascia!`);
    else if (e.type === 'check') msgs.push(`✅ ${findPlayerName(e.playerId)} passa`);
    else if (e.type === 'call') msgs.push(`📞 ${findPlayerName(e.playerId)} vede (${e.amount})`);
    else if (e.type === 'raise') msgs.push(`📈 ${findPlayerName(e.playerId)} rilancia (${e.amount}, totale ${e.totalBet})`);
    else if (e.type === 'allIn') msgs.push(`🔥 ${findPlayerName(e.playerId)} va All-In!`);
    else if (e.type === 'flop') msgs.push(`♠️ Flop: ${(e.cards || []).map(c => c.rank + c.suitSymbol).join(' ')}`);
    else if (e.type === 'turn') msgs.push(`♦️ Turn: ${e.card?.rank || ''}${e.card?.suitSymbol || ''}`);
    else if (e.type === 'river') msgs.push(`♣️ River: ${e.card?.rank || ''}${e.card?.suitSymbol || ''}`);
    else if (e.type === 'showdown') msgs.push(`🃏 Showdown!`);
    else if (e.type === 'hand') msgs.push(`${findPlayerName(e.playerId)}: ${e.handName}`);
    else if (e.type === 'win') msgs.push(`💰 ${findPlayerName(e.playerId)} vince ${e.amount}!${e.handName ? ' (' + e.handName + ')' : ''}`);
    else if (e.type === 'split') msgs.push(`🔄 Diviso tra ${(e.players || []).map(findPlayerName).join(', ')}: ${e.each} ciascuno`);
    else if (e.type === 'handOver') msgs.push(`🏁 Mano finita. Piatto: ${e.pot}`);
    else if (e.type === 'blind') msgs.push(`👁️ ${findPlayerName(e.playerId)}: ${e.blind === 'small' ? 'piccolo' : 'grande'} buio (${e.amount})`);
    else if (e.type === 'reverse') msgs.push(`🔄 Inversione di direzione!`);
    else if (e.type === 'colorChosen') msgs.push(`🎨 Colore scelto: ${e.color}`);
    else if (e.type === 'chooseColor') msgs.push(`🎨 ${findPlayerName(e.playerId)} sceglie un colore`);
    else if (e.type === 'drawPenalty') msgs.push(`💀 ${findPlayerName(e.playerId)} pesca ${e.count} carte!`);
    else if (e.type === 'mayPlay') msgs.push(`💡 Puoi giocare la carta pescata!`);
    else if (e.type === 'draw') msgs.push(`${findPlayerName(e.playerId)} pesca ${e.count || 1} carta/e`);
    else if (e.type === 'exploded') msgs.push(`💥 ${findPlayerName(e.playerId)} è esploso!`);
    else if (e.type === 'defused') msgs.push(`🛡️ ${findPlayerName(e.playerId)} disinnesca il gatto!`);
    else if (e.type === 'drewCard') msgs.push(`${findPlayerName(e.playerId)} pesca una carta`);
    else if (e.type === 'cardPlayed') {
      const names = { skip: 'Salta', attack: 'Attacco', shuffle: 'Mescola', favor_none: 'Favore (nessun bersaglio)' };
      msgs.push(`${findPlayerName(e.playerId)} gioca: ${names[e.card] || e.card}`);
    } else if (e.type === 'favor') msgs.push(`🤝 ${findPlayerName(e.playerId)} prende una carta da ${findPlayerName(e.targetId)}`);
    else if (e.type === 'seeFuture') msgs.push(`👀 ${findPlayerName(e.playerId)} guarda le prossime carte`);
    else if (e.type === 'bid') msgs.push(`🤞 ${findPlayerName(e.playerId)} punta ${e.amount} presa/e`);
    else if (e.type === 'bonus') msgs.push(`✨ ${findPlayerName(e.playerId)}: ${e.reason} (+${e.points}pt)`);
    else if (e.type === 'roundScore') {
      let m = `📊 ${findPlayerName(e.playerId)}: puntate ${e.bid}, fatte ${e.won} = ${e.score >= 0 ? '+' : ''}${e.score}pt (tot: ${e.total})`;
      msgs.push(m);
    }
    else if (e.type === 'ready') msgs.push(`👋 ${findPlayerName(e.playerId)} è pronto`);
    else if (e.type === 'startLevel') msgs.push(`🎯 Livello ${e.level} — Inizia!`);
    else if (e.type === 'play' && e.value) msgs.push(`${findPlayerName(e.playerId)}: ${e.value}`);
    else if (e.type === 'error') msgs.push(`💥 ${findPlayerName(e.playerId)} sbaglia! (${e.value}) — persa 1 vita, scartate ${e.discarded} carte (❤️×${e.livesLeft})`);
    else if (e.type === 'starUsed') msgs.push(`⭐ ${findPlayerName(e.playerId)} usa una stella! Tutti scartano la carta più bassa`);
    else if (e.type === 'discard') msgs.push(`  ${findPlayerName(e.playerId)} scarta ${e.value}`);
    else if (e.type === 'continue') msgs.push(`▶️ Continuate!`);
    else if (e.type === 'reward') {
      const icon = e.item === 'life' ? '❤️' : '⭐';
      msgs.push(`🎁 Ricompensa: +${e.count}${icon}`);
    } else if (e.type === 'levelComplete') msgs.push(`✅ Livello ${e.level} completato!`);
    else if (e.type === 'newLevel') msgs.push(`🆕 Livello ${e.level}`);
    else if (e.type === 'newGame') msgs.push(`🔄 Nuova partita!`);
    else if (e.type === 'swap') msgs.push(`${findPlayerName(e.playerId)} scambia ${e.cardValue}×${e.gaveValue}`);
    else if (e.type === 'swapAll') msgs.push(`🔄 ${findPlayerName(e.playerId)} scambia tutto`);
    else if (e.type === 'pass') msgs.push(`⏭️ ${findPlayerName(e.playerId)} passa`);
    else if (e.type === 'knock') msgs.push(`🔔 ${findPlayerName(e.playerId)} chiude!`);
    else if (e.type === 'declare') msgs.push(`🎉 ${findPlayerName(e.playerId)}: ${e.name} (${e.value})`);
    else if (e.type === 'reveal') {
      const parts = Object.entries(e.values || {}).map(([pid, v]) => `${findPlayerName(pid)}: ${v === 30.5 ? '30½' : v === 32 ? '32🔥' : v}`);
      msgs.push('🃏 Scoperta: ' + parts.join(' | '));
    } else if (e.type === 'knockResult') {
      const kv = e.values ? e.values[e.knocker] : 0;
      msgs.push(`${findPlayerName(e.knocker)} ha chiuso con ${kv === 30.5 ? '30½' : kv} pt`);
    } else if (e.type === 'roundOver') {
      if (e.loser) msgs.push(`💀 ${findPlayerName(e.loser)} perde una vita! (❤️×${e.livesLeft})`);
      if (e.winner) msgs.push(`👑 ${findPlayerName(e.winner)} vince il round!`);
      if (e.scores) {
        const parts = Object.entries(e.scores).map(([pid, s]) => `${findPlayerName(pid)}: -${s}pt`);
        msgs.push(`📊 Penalità: ${parts.join(' | ')}`);
      }
    } else if (e.type === 'tieLowest') {
      const names = (e.players || []).map(findPlayerName).join(', ');
      msgs.push(`🤝 Pari: ${names} perdono tutti una vita!`);
    } else if (e.type === 'eliminated') msgs.push(`❌ ${findPlayerName(e.playerId)} eliminato!`);
    else if (e.type === 'skipDraw') msgs.push(`⏭️ ${findPlayerName(e.playerId)} salta la pesca`);
    else if (e.type === 'meld') {
      const t = e.drewReplacement ? ' (pesca rimpiazzo)' : '';
      msgs.push(`🃏 ${findPlayerName(e.playerId)} melda ${e.count || ''} carte${t}`);
    } else if (e.type === 'addToMeld') {
      const o = e.ownerId === e.playerId ? 'proprie' : `di ${findPlayerName(e.ownerId)}`;
      msgs.push(`➕ ${findPlayerName(e.playerId)} appoggia a meld ${o}`);
    }     else if (e.type === 'memMatch') msgs.push(`✅ ${findPlayerName(e.playerId)} trova ${e.symbol}! (coppia!)`);
    else if (e.type === 'memMismatch') msgs.push(`❌ ${findPlayerName(e.playerId)} sbaglia! (non è coppia)`);
    else if (e.type === 'memJoker') msgs.push(`⭐ ${findPlayerName(e.playerId)} trova il Jolly! (match automatico!)`);
    else if (e.type === 'reshuffle') msgs.push(`🔄 Mazzo rimescolato (${e.count} carte)`);
  }
  return msgs.join('<br>');
}

window.findPlayerName = findPlayerName;
