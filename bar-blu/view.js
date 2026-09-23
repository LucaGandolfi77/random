// ===== Bar Blu — View =====
import { PHASES, PHASE_NAMES, PHASE_ICONS, ITEMS, ITEM_IDS, MACHINES, COLLECTIBLES, CUSTOMERS } from './model.js';

const $ = id => document.getElementById(id);

export function initView() {
  bindScratchCard();
}

function bindScratchCard() {
  const layer = $('scratch-layer');
  if (!layer) return;
  let rubbing = false;
  let card = null;
  layer.addEventListener('mousedown', e => { rubbing = true; card = layer.closest('.scratch-card'); });
  layer.addEventListener('touchstart', e => { rubbing = true; card = layer.closest('.scratch-card'); }, { passive: true });
  layer.addEventListener('mouseup', () => rubbing = false);
  layer.addEventListener('touchend', () => rubbing = false);
  const move = e => {
    if (!rubbing || !card) return;
    e.preventDefault();
    const rect = layer.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const dot = document.createElement('div');
    dot.style.cssText = `position:absolute;left:${cx-20}px;top:${cy-20}px;width:40px;height:40px;border-radius:50%;background:rgba(139,105,20,0.5);pointer-events:none;`;
    card.appendChild(dot);
    setTimeout(() => dot.remove(), 200);
  };
  layer.addEventListener('mousemove', move);
  layer.addEventListener('touchmove', move, { passive: false });
}

export function showScreen(id) {
  const action = () => {
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.setAttribute('aria-hidden', 'true'); });
    const el = $(id);
    if (el) { el.classList.add('active'); el.setAttribute('aria-hidden', 'false'); }
  };
  if (document.startViewTransition) document.startViewTransition(action);
  else action();
}

export function showHome() { showScreen('screen-home'); }
export function showGame() { showScreen('screen-game'); }
export function showSaletta() { showScreen('screen-saletta'); }
export function showScratch() { showScreen('screen-scratch'); }
export function showInventory() { showScreen('screen-inventory'); }
export function showSettings() { showScreen('screen-settings'); }
export function showHowTo() { showScreen('screen-howto'); }
export function showReset() { showScreen('screen-reset'); }
export function showSummary() { showScreen('screen-summary'); }

export function renderHome(state) {
  $('btn-continue').disabled = !state.started;
}

export function updateGameHeader(state) {
  $('hdr-phase').textContent = PHASE_ICONS[PHASES[state.phaseIndex]] + ' ' + PHASE_NAMES[PHASES[state.phaseIndex]];
  $('hdr-shift').textContent = 'Turno ' + state.currentShift;
  $('hdr-level').textContent = 'Lv.' + state.level;
  $('res-tokens').innerHTML = state.tokens + ' &#x1FA99;';
  $('res-xp').innerHTML = state.xp + '/' + (state.level * 20) + ' &#x2726;';
  document.body.className = 'phase-' + PHASES[state.phaseIndex];
}

export function updateAmbient(state, msg) {
  $('ambient-text').textContent = msg || "L'odore del caffè appena macinato riempie il locale.";
}

export function renderCustomer(state) {
  const c = state.currentCustomer;
  const empty = $('customer-empty');
  const card = $('customer-card');
  if (!c) { empty.hidden = false; card.hidden = true; const tag = $('cust-tagline'); if (tag) tag.textContent = ''; const drunk = $('cust-drunk'); if (drunk) drunk.hidden = true; const speech = $('cust-speech'); if (speech) speech.hidden = true; return; }
  empty.hidden = true; card.hidden = false;
  $('cust-avatar').textContent = c.icon;
  $('cust-name').textContent = c.name;
  const item = ITEMS[c.wants];
  $('cust-want').textContent = 'Vuole: ' + item.icon + ' ' + item.name;
  $('cust-time').textContent = 'Preferisce: ' + PHASE_NAMES[c.prefPhases[0]];
  const tag = $('cust-tagline'); if (tag) tag.textContent = c.tagline ? '— ' + c.tagline : '';
  const drunk = $('cust-drunk'); if (drunk) drunk.hidden = !c.drunk;
  const speech = $('cust-speech'); if (speech) speech.hidden = true;
  card.classList.remove('customer-card'); void card.offsetWidth; card.classList.add('customer-card');
}

export function renderItemsBar(state, recommendedId) {
  const bar = $('items-bar'); if (!bar) return; bar.innerHTML = '';
  ITEM_IDS.forEach(id => {
    const item = ITEMS[id];
    const btn = document.createElement('button');
    btn.className = 'item-btn' + (id === recommendedId ? ' recommended' : '');
    btn.type = 'button'; btn.dataset.itemId = id; btn.setAttribute('aria-label', item.name);
    btn.innerHTML = '<span class="item-icon">' + item.icon + '</span><span class="item-label">' + item.name + '</span>';
    bar.appendChild(btn);
  });
}

export function showLukeMessage(text) {
  const b = $('luka-bubble');
  $('luka-text').textContent = text;
  b.hidden = false;
  setTimeout(() => { b.hidden = true; }, 3500);
}

export function renderSaletta(state, result) {
  const c = $('machines'); if (!c) return; c.innerHTML = '';
  MACHINES.forEach((m, i) => {
    const card = document.createElement('div'); card.className = 'machine';
    let reelHTML = '';
    if (result && result.machineIndex === i) {
      reelHTML = result.symbols.map(s => '<div class="reel"><div class="reel-inner" style="transform:translateY(0)"><div class="reel-symbol">' + s + '</div></div></div>').join('');
    } else {
      reelHTML = Array(3).fill(0).map(() => '<div class="reel"><div class="reel-inner" style="transform:translateY(0)"><div class="reel-symbol">?</div></div></div>').join('');
    }
    const disabled = state.tokens < m.cost;
    card.innerHTML = '<div class="machine-header"><span class="machine-name">' + m.name + '</span><span class="machine-cost">' + m.cost + ' gettoni</span></div>' +
      '<p style="font-size:.75rem;opacity:.6;margin-bottom:var(--space-sm)">' + m.desc + '</p>' +
      '<div class="machine-reels" data-machine="' + i + '">' + reelHTML + '</div>' +
      '<p class="machine-result" data-machine-result="' + i + '"></p>' +
      '<button class="machine-btn" type="button" data-machine-spin="' + i + '"' + (disabled ? ' disabled' : '') + '>Gira</button>';
    c.appendChild(card);
  });
  if (result) {
    setTimeout(() => {
      const re = c.querySelector('.machine-result[data-machine-result="' + result.machineIndex + '"]');
      if (re) {
        const prize = result.collectible ? (() => { const cc = COLLECTIBLES.find(x => x.id === result.collectible); return (cc?.icon || '') + ' ' + (cc?.name || result.collectible); })() : '';
        re.textContent = (prize ? prize + ' — ' : '') + '+' + result.tokens + ' gettoni';
        re.style.color = 'var(--accent)';
      }
    }, 350);
  }
}

export function renderScratch(state, scratchResult) {
  const layer = $('scratch-layer'); const reveal = $('scratch-reveal'); const hint = $('scratch-hint'); const ctrl = $('scratch-controls'); const prizeEl = $('scratch-prize'); const cost = $('scratch-cost'); const buyBtn = $('btn-buy-scratch');
  if (scratchResult && scratchResult.collectible) {
    if (layer) layer.style.opacity = '0';
    if (reveal) reveal.textContent = (COLLECTIBLES.find(x => x.id === scratchResult.collectible)?.icon || '');
    if (hint) hint.textContent = 'Premio scoperto!';
    if (ctrl) ctrl.hidden = false;
    if (prizeEl) { const c = COLLECTIBLES.find(x => x.id === scratchResult.collectible); prizeEl.textContent = (c?.icon || '') + ' ' + (c?.name || scratchResult.collectible) + '!'; }
    if (!state.settings.reducedMotion) { const card = $('scratch-card'); if (card) for (let i = 0; i < 8; i++) setTimeout(() => sparkleAt(card, 130, 80), i * 50); }
  } else if (state.hasScratchCard) {
    if (layer) layer.style.opacity = '1'; if (reveal) reveal.textContent = ''; if (hint) hint.textContent = 'Rovina per scoprire il premio!'; if (ctrl) ctrl.hidden = true;
  } else {
    if (layer) layer.style.opacity = '0'; if (reveal) reveal.textContent = ''; if (hint) hint.textContent = 'Compra una carta!'; if (ctrl) ctrl.hidden = true;
  }
  if (cost) cost.textContent = state.tokens >= 3 ? '3' : state.tokens;
  if (buyBtn) buyBtn.disabled = state.tokens < 3;
}

export function renderInventory(state) {
  const grid = $('inv-grid'); if (grid) { grid.innerHTML = '';
    COLLECTIBLES.forEach(c => {
      const owned = state.inventory.includes(c.id);
      const div = document.createElement('div'); div.className = 'inv-item' + (owned ? '' : ' empty');
      div.innerHTML = '<span class="inv-icon">' + c.icon + '</span><span class="inv-name">' + (owned ? c.name : '???') + '</span>';
      grid.appendChild(div);
    });
  }
  const dc = $('display-case'); if (dc) { dc.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('div'); const item = state.displayCase[i];
      if (item) { const c = COLLECTIBLES.find(x => x.id === item); slot.className = 'display-slot filled'; slot.textContent = c?.icon || ''; slot.title = c?.name || ''; }
      else { slot.className = 'display-slot'; slot.textContent = '+'; }
      slot.dataset.slot = i; dc.appendChild(slot);
    }
  }
  const old = $('display-available'); if (old) old.remove();
  const avail = document.createElement('div'); avail.id = 'display-available'; avail.className = 'avail-section';
  avail.innerHTML = '<h3 class="avail-title">Piazza in Vetrina</h3>';
  COLLECTIBLES.forEach(c => {
    if (!state.inventory.includes(c.id)) return;
    if (state.displayCase.includes(c.id)) return;
    const btn = document.createElement('button'); btn.className = 'place-btn'; btn.type = 'button'; btn.dataset.placeId = c.id;
    btn.innerHTML = '<span>' + c.icon + '</span><span>' + c.name + '</span>';
    avail.appendChild(btn);
  });
  if (avail.children.length > 0 && dc && dc.parentNode) dc.parentNode.insertBefore(avail, dc.nextSibling);
  // Memories section
  const oldMem = $('memories-section'); if (oldMem) oldMem.remove();
  if (state.memories && state.memories.length > 0) {
    const memSection = document.createElement('div'); memSection.id = 'memories-section'; memSection.className = 'memories-section';
    memSection.innerHTML = '<h3 class="avail-title">Ricordi del Bancone</h3>';
    CUSTOMERS.forEach(c => {
      if (!c.story) return;
      const theirs = state.memories.filter(m => m.startsWith(c.id + ':'));
      if (theirs.length === 0) return;
      const div = document.createElement('div'); div.className = 'mem-cust';
      div.innerHTML = '<span class="mem-icon">' + c.icon + '</span><span class="mem-name">' + c.name + '</span>';
      const list = document.createElement('div'); list.className = 'mem-list';
      c.story.forEach((s, i) => {
        const memId = c.id + ':' + i;
        const collected = theirs.includes(memId);
        const frag = document.createElement('div'); frag.className = 'mem-frag' + (collected ? '' : ' locked');
        frag.textContent = collected ? s : '???';
        list.appendChild(frag);
      });
      div.appendChild(list);
      memSection.appendChild(div);
    });
    if (memSection.children.length > 0 && dc && dc.parentNode) dc.parentNode.insertBefore(memSection, dc.nextSibling);
  }
}

export function renderSettings(state) {
  $('set-music').textContent = state.settings.music ? 'ON' : 'OFF'; $('set-music').setAttribute('aria-checked', state.settings.music);
  $('set-sfx').textContent = state.settings.sfx ? 'ON' : 'OFF'; $('set-sfx').setAttribute('aria-checked', state.settings.sfx);
  $('set-volume').value = state.settings.volume * 100;
  $('set-motion').textContent = state.settings.reducedMotion ? 'ON' : 'OFF'; $('set-motion').setAttribute('aria-checked', state.settings.reducedMotion);
}

export function updateSummary(data, newCount) {
  $('sum-served').textContent = data.served; $('sum-perfect').textContent = data.perfect;
  $('sum-tokens').textContent = data.tokens; $('sum-collect').textContent = newCount || 0;
}

export function showToast(message, type) {
  const area = $('toast-area'); if (!area) return;
  const t = document.createElement('div'); t.className = 'toast toast-' + (type || 'info');
  t.textContent = message; t.setAttribute('role', 'status'); area.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 2500);
}

export function sparkleAt(parent, cx, cy) {
  if (!parent) return;
  const s = document.createElement('div'); s.className = 'sparkle';
  s.style.left = (cx + (Math.random() * 40 - 20)) + 'px'; s.style.top = (cy + (Math.random() * 40 - 20)) + 'px';
  s.style.setProperty('--sx', (Math.random() * 60 - 30) + 'px'); s.style.setProperty('--sy', (Math.random() * 60 - 30) + 'px');
  s.style.background = Math.random() > 0.5 ? 'var(--accent)' : 'var(--amber)';
  parent.appendChild(s); setTimeout(() => s.remove(), 600);
}

export function showCustomerSpeech(name, text) {
  const b = $('cust-speech'); if (!b) return;
  b.hidden = false;
  $('cust-speaker').textContent = name + ':';
  $('cust-speech-text').textContent = text;
  setTimeout(() => { const el = $('cust-speech'); if (el) el.hidden = true; }, 4500);
}

export function showMemory(customer, text) {
  let overlay = $('memory-overlay');
  if (!overlay) {
    overlay = document.createElement('div'); overlay.id = 'memory-overlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:55;display:flex;align-items:center;justify-content:center;padding:20px';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  overlay.innerHTML = '<div style="background:var(--surface);border-radius:var(--radius-lg);padding:var(--space-xl);max-width:340px;text-align:center"><div style="font-size:2.5rem;margin-bottom:var(--space-md)">' + (customer?.icon || '') + '</div><p style="font-size:.7rem;color:var(--amber);margin-bottom:var(--space-xs);letter-spacing:.1em">RICORDO</p><h3 style="font-size:1.1rem;color:var(--cream);margin-bottom:var(--space-sm)">' + (customer?.name || '') + '</h3><p style="font-size:.95rem;line-height:1.6;font-style:italic;margin-bottom:var(--space-lg)">' + text + '</p><button class="btn btn-primary" id="mem-close" type="button">Ho capito</button></div>';
  overlay.querySelector('#mem-close').addEventListener('click', () => { overlay.style.display = 'none'; });
  const focusable = overlay.querySelectorAll('button');
  if (focusable.length > 0) focusable[0].focus();
}

export function showTutorialStep(step, total, text) {
  let overlay = $('tutorial-overlay');
  if (!overlay) { overlay = document.createElement('div'); overlay.id = 'tutorial-overlay'; overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;display:flex;align-items:center;justify-content:center;padding:20px'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); document.body.appendChild(overlay); }
  overlay.style.display = 'flex';
  overlay.innerHTML = '<div style="background:var(--surface);border-radius:var(--radius-lg);padding:var(--space-xl);max-width:300px;text-align:center"><p style="font-size:.75rem;color:var(--amber);margin-bottom:var(--space-sm)">Passo ' + step + '/' + total + '</p><p style="font-size:1rem;line-height:1.5;margin-bottom:var(--space-lg)">' + text + '</p><div style="display:flex;gap:var(--space-sm);justify-content:center">' + (step > 1 ? '<button class="btn btn-ghost" id="tut-prev" type="button">Indietro</button>' : '') + '<button class="btn btn-primary" id="tut-' + (step < total ? 'next' : 'close') + '" type="button">' + (step < total ? 'Avanti' : 'Inizia!') + '</button></div></div>';
  overlay.querySelector('#tut-close')?.addEventListener('click', () => { overlay.style.display = 'none'; });
  overlay.querySelector('#tut-next')?.addEventListener('click', () => { if (step < total) showTutorialStep(step + 1, total, 'Ottimo! Ogni cliente vuole qualcosa di specifico.'); else overlay.style.display = 'none'; });
  overlay.querySelector('#tut-prev')?.addEventListener('click', () => { if (step > 1) showTutorialStep(step - 1, total, 'Benvenuto! Servi i clienti toccando il prodotto che desiderano.'); });
  // Focus trap
  const focusable = overlay.querySelectorAll('button');
  if (focusable.length > 0) focusable[0].focus();
}

export function hideTutorial() { const o = $('tutorial-overlay'); if (o) { o.style.display = 'none'; } }

export function setCurtainOpen(open) { $('curtain')?.classList.toggle('open', open); }
