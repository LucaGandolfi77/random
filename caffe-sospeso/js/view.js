import * as C from './config.js';
import { t } from './i18n.js';
import { $all, prefersReducedMotion, pick, hashStr } from './utils.js';

const screens = {};
const $ = {}; // cached refs
let state = null;
let onAroma = null;
let onCustomerAction = null;
let composeDraft = { originId: null, milkId: null, sweetId: null };
let onAromaCraft = null;

export function init(refs) {
  Object.assign($, refs);
  C.AROMAS.forEach((a) => {
    screens[`aroma-${a.id}`] = null;
  });
}

export function setState(s) {
  state = s;
}

export function setCallbacks({ aromaCraft, customerAction }) {
  onAromaCraft = aromaCraft;
  onCustomerAction = customerAction;
}

function show(id, showIt) {
  const el = $.app.querySelector(`[data-screen="${id}"]`);
  if (el) el.classList.toggle('hidden', !showIt);
}

export function showScreen(name) {
  $all('[data-screen]', $.app).forEach((s) => s.classList.add('hidden'));
  const target = $.app.querySelector(`[data-screen="${name}"]`);
  if (target) target.classList.remove('hidden');
  if (name === 'game') {
    setTimeout(() => {
      $.susp?.classList.toggle('hidden', !(state.decorOwned.includes('lavagna-sospeso')));
    }, 0);
  }
}

export function render() {
  if (!state || !$.app) return;
  if ($.resources) renderResources($.resources);
  if ($.chalkboard) {
    const idx = C.TIME_PHASES.findIndex((p) => p.id === state.timePhase);
    $.chalkboard.textContent = t('message_chalkboard', { msg: C.MESSAGES[(idx < 0 ? 0 : idx) % C.MESSAGES.length] });
  }
  renderCustomer($.customer, state);
  if ($.machine) renderMachine($.machine, state);
  if ($.compose) renderCompose($.compose, state);
  if ($.actions) renderActions($.actions, state);
  const game = document.querySelector('[data-screen="game"]:not(.hidden)');
  if (game) {
    const sp = document.getElementById('btn-sospeso');
    if (sp) sp.classList.toggle('hidden', !state.decorOwned.includes('lavagna-sospeso'));
    const ws = document.getElementById('btn-water');
    if (ws) ws.classList.toggle('hidden', !state.decorOwned.includes('angolo-piante'));
  }
}

function renderResources(el) {
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  const tok = document.createElement('div');
  tok.className = 'chip chip-tokens';
  tok.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="num">${state.tokens}</span><span class="lbl">${t('tokens_label')}</span>`;
  const beans = document.createElement('div');
  beans.className = 'chip chip-beans';
  beans.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="num">${state.beans}</span><span class="lbl">${t('beans_label')}</span>`;
  const lvl = document.createElement('div');
  lvl.className = 'chip chip-level';
  lvl.innerHTML = `<span class="num">L${state.level}</span><span class="lbl">${t('home_progress', { level: state.level, aromas: Object.values(state.aromi).filter(Boolean).length })}</span>`;
  frag.append(tok, beans, lvl);
  el.replaceChildren(frag);
}

function renderCustomer(el, st) {
  el.innerHTML = '';
  if (!st.currentCustomer) {
    el.innerHTML = `<div class="customer-empty">${t('home_welcome')}</div>`;
    return;
  }
  const c = C.CUSTOMERS.find((x) => x.id === st.currentCustomer);
  const name = t(c.nameKey);
  const affinity = st.customers[st.currentCustomer]?.affinity ?? 0;
  const preferred = computePrefLabel(st);
  el.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'customer-card';
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', t('customer_greeting', { name }));
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = name[0];
  const body = document.createElement('div');
  body.className = 'customer-body';
  const h = document.createElement('strong');
  h.textContent = name;
  const q = document.createElement('div');
  q.className = 'customer-quip';
  q.textContent = preferred;
  const heart = document.createElement('div');
  heart.className = 'hearts';
  heart.setAttribute('aria-label', 'affinity');
  heart.textContent = '♥'.repeat(affinity) + '♡'.repeat(C.MAX_AFFINITY - affinity);
  body.append(h, q, heart);
  card.append(avatar, body);
  el.appendChild(card);
}

function computePrefLabel(st) {
  if (!st.currentCustomer) return '';
  const phase = st.timePhase;
  const weather = st.weather;
  const seed = `${st.currentCustomer}|${phase}|${weather}`;
  const h = hashStr(seed) % (C.ORIGINS.length * C.MILKS.length * C.SWEETS.length);
  const o = C.ORIGINS[h % C.ORIGINS.length].nameKey;
  const m = C.MILKS[Math.floor(h / C.ORIGINS.length) % C.MILKS.length].nameKey;
  const s = C.SWEETS[Math.floor(h / (C.ORIGINS.length * C.MILKS.length)) % C.SWEETS.length].nameKey;
  return `${t(o)} · ${t(m)} · ${t(s)}`;
}

function recipeLabelT(key) {
  const [o, m, s] = key.split('-');
  const oName = C.ORIGINS.find((x) => x.id === o)?.nameKey;
  const mName = C.MILKS.find((x) => x.id === m)?.nameKey;
  const sName = C.SWEETS.find((x) => x.id === s)?.nameKey;
  return `${t(oName)} · ${t(mName)} · ${t(sName)}`;
}

function renderMachine(el, st) {
  el.innerHTML = '';
  if (!st.currentCustomer) {
    el.innerHTML = `<div class="machine-empty">${t('choose_drink')}</div>`;
    return;
  }
  el.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'machine';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'macchina del caffè');
  const gbar = document.createElement('div');
  gbar.className = 'meter';
  gbar.dataset.ref = 'grind';
  gbar.innerHTML = `<div class="meter-track"><div class="meter-fill" style="width:${st.grind * 100}%"></div></div><span>${t('tap_brew')}</span>`;
  const pbar = document.createElement('div');
  pbar.className = 'meter';
  pbar.dataset.ref = 'pour';
  pbar.innerHTML = `<div class="meter-track"><div class="meter-fill pour" style="width:${st.pour * 100}%"></div></div><span>${t('hold_pour')}</span>`;
  const recipe = document.createElement('div');
  recipe.className = 'recipe-hint';
  recipe.textContent = st.lastRecipe ? `pref: ${recipeLabelT(st.lastRecipe)}` : '';
  wrap.append(gbar, pbar, recipe);
  el.appendChild(wrap);
}

function renderActions(el, st) {
  el.innerHTML = '';
  if (!st.currentCustomer) {
    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.textContent = t('play');
    b.addEventListener('click', () => onCustomerAction?.('greet'));
    el.appendChild(b);
    return;
  }
  const b1 = document.createElement('button');
  b1.className = 'btn btn-secondary';
  b1.textContent = `${t('tap_brew')} ${Math.round(st.grind * 100)}%`;
  b1.addEventListener('click', () => onCustomerAction?.('grind'));
  el.appendChild(b1);
  const b2 = document.createElement('button');
  b2.className = 'btn btn-secondary pour-btn';
  b2.textContent = `${t('hold_pour')} ${Math.round(st.pour * 100)}%`;
  const start = (e) => { e.preventDefault(); onCustomerAction?.('pourStart'); };
  b2.addEventListener('pointerdown', start);
  b2.addEventListener('pointerup', () => onCustomerAction?.('pourStop'));
  b2.addEventListener('pointerleave', () => { if (st.pourHeld) onCustomerAction?.('pourStop'); });
  b2.addEventListener('touchstart', start, { passive: false });
  b2.addEventListener('touchend', (e) => { e.preventDefault(); onCustomerAction?.('pourStop'); });
  el.appendChild(b2);
  const b3 = document.createElement('button');
  b3.className = 'btn btn-primary';
  b3.textContent = t('serve_btn');
  b3.addEventListener('click', () => onCustomerAction?.('serve'));
  el.appendChild(b3);
  const sr = document.createElement('button');
  sr.className = 'btn btn-ghost';
  sr.textContent = t('close');
  sr.addEventListener('click', () => onCustomerAction?.('leave'));
  el.appendChild(sr);
}

function renderCompose(el, st) {
  el.innerHTML = '';
  if (!st.currentCustomer) {
    const empty = document.createElement('div');
    empty.className = 'compose-preview';
    empty.textContent = st.tutorialDone ? t('choose_drink') : t('choose_drink_hint');
    el.appendChild(empty);
    return;
  }
  const prev = document.createElement('div');
  prev.className = 'compose-preview';
  prev.textContent = st.lastRecipe ? `Preparando: ${recipeLabelT(st.lastRecipe)}` : t('choose_drink_hint');
  el.appendChild(prev);
  const mkRow = (items, dim, onPick) => {
    const row = document.createElement('div');
    row.className = 'compose-row';
    const label = document.createElement('div');
    label.className = 'lbl-row';
    label.textContent = dim;
    row.appendChild(label);
    for (const it of items) {
      const b = document.createElement('button');
      b.className = 'pill';
      b.type = 'button';
      b.textContent = t(it.nameKey);
      if (composeDraft[dim] === it.id) b.classList.add('selected');
      b.addEventListener('click', () => { composeDraft[dim] = it.id; render(); onPick && onPick(); });
      row.appendChild(b);
    }
    return row;
  };
  el.appendChild(mkRow(C.ORIGINS, 'originId'));
  el.appendChild(mkRow(C.MILKS, 'milkId'));
  el.appendChild(mkRow(C.SWEETS, 'sweetId'));
  const done = composeDraft.originId && composeDraft.milkId && composeDraft.sweetId;
  const go = document.createElement('button');
  go.className = 'btn btn-primary btn-block';
  go.type = 'button';
  go.textContent = t('prepare_btn');
  go.disabled = !done;
  go.addEventListener('click', () => {
    if (done) onCustomerAction?.('recipe', { ...composeDraft });
  });
  el.appendChild(go);
}

export function renderInventory() {
  const el = $.invList;
  if (!el) return;
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const a of C.AROMAS) {
    const discovered = !!state.aromi[a.id];
    const card = document.createElement('div');
    card.className = 'aroma-card' + (discovered ? '' : ' locked');
    card.dataset.aroma = a.id;
    const ic = document.createElement('div');
    ic.className = 'aroma-icon';
    ic.textContent = discovered ? '✦' : '?';
    const lb = document.createElement('div');
    lb.className = 'aroma-name';
    lb.textContent = discovered ? t(a.nameKey) : t('inventory_empty');
    card.append(ic, lb);
    if (discovered) card.setAttribute('aria-label', t(a.nameKey));
    else card.setAttribute('aria-label', `${t(a.nameKey)} bloccato`);
    frag.appendChild(card);
  }
  el.replaceChildren(frag);
}

export function renderAchievements() {
  const el = $.achList;
  if (!el) return;
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const a of C.ACHIEVEMENTS) {
    const done = state.achievements.includes(a.id);
    const card = document.createElement('div');
    card.className = 'ach-card' + (done ? '' : ' locked');
    const ic = document.createElement('span');
    ic.textContent = done ? '✓' : '·';
    const body = document.createElement('div');
    const n = document.createElement('strong');
    n.textContent = t(a.nameKey);
    const d = document.createElement('small');
    d.textContent = t(a.descKey);
    body.append(n, d);
    card.append(ic, body);
    frag.appendChild(card);
  }
  el.replaceChildren(frag);
}

export function renderDecor() {
  const el = $.decorList;
  if (!el) return;
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const u of C.UNLOCKABLES) {
    const owned = state.decorOwned.includes(u.id);
    const placed = state.decorPlaced.includes(u.id);
    const card = document.createElement('div');
    card.className = 'decor-card';
    const name = document.createElement('strong');
    name.textContent = owned ? t(u.nameKey) : `${t(u.nameKey)} (${u.cost} tok)`;
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    if (!owned) {
      btn.textContent = `Compra (${u.cost})`;
      btn.addEventListener('click', () => emitBuy(u.id));
    } else {
      btn.textContent = placed ? 'Rimuovi' : 'Metti';
      btn.addEventListener('click', () => emitToggle(u.id));
    }
    card.append(name, btn);
    frag.appendChild(card);
  }
  for (const d of C.DECORS) {
    if (!state.decorOwned.includes('pianta') && d.id !== 'pianta') continue;
    const placed = state.decorPlaced.includes(d.id);
    const card = document.createElement('div');
    card.className = 'decor-card';
    const name = document.createElement('strong');
    name.textContent = t(d.nameKey);
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    btn.textContent = placed ? 'Rimuovi' : 'Metti';
    btn.addEventListener('click', () => emitToggle(d.id));
    card.append(name, btn);
    frag.appendChild(card);
  }
  el.replaceChildren(frag);
}

function emitBuy(id) { onAromaCraft?.('buyDecor', id); }
function emitToggle(id) { onAromaCraft?.('toggleDecor', id); }

export function renderSospeso() {
  const el = $.sospList;
  if (!el) return;
  el.innerHTML = '';
  const st = state;
  const left = document.createElement('div');
  left.className = 'sosp-counter';
  left.textContent = `${t('sospeso_board_empty')} (${st.sospesiLeft})`;
  const b = document.createElement('button');
  b.className = 'btn btn-primary';
  b.textContent = t('suspend_btn', { cost: C.SOGGI_TOKEN_COST });
  b.disabled = st.tokens < C.SOGGI_TOKEN_COST;
  b.addEventListener('click', () => onAromaCraft?.('sospeso'));
  el.append(left, b);
  if (st.sospesiStories.length) {
    const ul = document.createElement('ul');
    for (const s of st.sospesiStories.slice(-6)) {
      const li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    }
    el.appendChild(ul);
  }
}

export function toast(text) {
  const el = $.toast;
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('visible'), 2200);
}

export function message(text) {
  if ($.live) $.live.textContent = text;
}

export function flashAchievement(text) {
  toast(text);
  message(text);
}

export function renderAllPanels() {
  if ($.invTitle) $.invTitle.textContent = t('inventory_title');
  if ($.achTitle) $.achTitle.textContent = t('achievements_title');
  renderInventory();
  renderAchievements();
  renderDecor();
  renderSospeso();
}

export function setHomeProgress() {
  if ($.homeProgress) $.homeProgress.textContent = t('home_progress', { level: state.level, aromas: Object.values(state.aromi).filter(Boolean).length });
}
