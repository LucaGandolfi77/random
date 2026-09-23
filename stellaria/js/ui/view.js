// ui/view.js — rendering DOM, animazioni, accessibilità. Zero regole di gioco.
import { t, getLang } from '../core/i18n.js';
import { TAG_COLORS, TAG_LABELS } from '../domain/data/tagMeta.js';
import { qsa, clamp } from '../core/utils.js';
import * as world from '../domain/world.js';
import { avatarSVG } from './avatar.js';

export function initView() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <header id="topbar" class="topbar" hidden>
      <div id="resources" class="resources" aria-live="polite"></div>
      <div class="topbar-actions">
        <button data-action="share" aria-label="Condividi">↗</button>
        <button data-action="mirror" aria-label="${t('mirror') || 'Specchio'}">🪞</button>
        <button data-action="howto" aria-label="${t('howTo')}">❔</button>
        <button data-action="settings" aria-label="${t('settings')}">⚙</button>
        <button data-action="reset" aria-label="${t('reset')}">↺</button>
      </div>
    </header>
    <main id="main" class="main" inert="false">
      <section id="screen-start" class="screen start-screen" aria-label="Schermata iniziale">
        <div class="start-box">
          <div class="start-icon" aria-hidden="true">✦</div>
          <h1>${t('appTitle')}<br><small>${t('appSubtitle')}</small></h1>
          <p class="tagline">${t('tagline')}</p>
          <div class="start-buttons">
            <button data-action="start-new">${t('start')}</button>
            <button data-action="start-continue" id="btn-continue" disabled>${t('continue')}</button>
          </div>
          <button data-install class="install-btn" hidden>${t('installApp')}</button>
          <p class="start-foot">${t('ready')}</p>
        </div>
      </section>
      <section id="screen-game" class="screen game-screen" aria-label="Gioco" hidden>
        <div id="room-scene" class="room-scene"></div>
        <nav id="exits" class="exits" aria-label="Uscite"></nav>
        <div id="action-bar" class="action-bar"></div>
        <footer id="status" class="status" aria-live="polite"></footer>
      </section>
      <section id="screen-tutorial" class="screen tutorial-screen" aria-label="Tutorial" hidden>
        <div id="tutorial-box" class="tutorial-box"></div>
      </section>
    </main>
    <aside id="panel-root" class="panel-root" aria-hidden="true"></aside>
    <div id="modal-root" class="modal-root" aria-hidden="true"></div>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  `;
}

export function renderStart(hasSave) {
  showScreen('start');
  const btn = document.getElementById('btn-continue');
  if (btn) { btn.disabled = !hasSave; }
}

export function render(state, callbacks) {
  if (!state || !callbacks) return;
  currentCallbacks = callbacks;
  try {
    showScreen('game');
    renderResources(state);
    renderRoom(state, callbacks);
    renderActionBar(state, callbacks);
    const msg = state.lastMsgText || '';
    document.getElementById('status').textContent = msg;
  } catch (err) {
    console.error('render error', err);
    showToast(t('errRender') || 'Errore di visualizzazione. Tocca per riprovare.');
  }
}

let currentCallbacks = null;
export function getCurrentCallbacks() { return currentCallbacks; }

function showScreen(name) {
  qsa('.screen').forEach((s) => s.hidden = s.id !== `screen-${name}`);
  const topbar = document.getElementById('topbar');
  if (topbar) topbar.hidden = name !== 'game';
}

function renderResources(state) {
  document.getElementById('resources').innerHTML = `
    <span class="res" title="${t('stars')}">⭐ ${state.stars}</span>
    <span class="res" title="${t('reflection')}">◈ ${state.riflesso}</span>
    <span class="res" title="${t('fame')}">✧ ${t('level')} ${state.fame}/${6}</span>
  `;
}

function renderRoom(state, callbacks) {
  const scene = document.getElementById('room-scene');
  const room = state.currentRoom || world.getRoom(state.roomId);
  if (!room) { showScreen('start'); return; }
  const heroBg = roomBg(state.roomId, state.time);
  scene.className = `room-scene ${state.time.phase} ${heroBg}`;
  const present = citizensPresent(state);
  const nearest = nearestCitizen(state, present);
  const tokens = present.map((c) => {
    const pos = npcTokenPos(c.id);
    const near = nearest && nearest.id === c.id ? ' near' : '';
    return `<div class="npc-token${near}" data-citizen="${c.id}" style="left:${pos.x}%;top:${pos.y}%" title="${c.nameIT}">${c.portrait}</div>`;
  }).join('');
  const avPos = state.avatarPos || { x: 0.5, y: 0.72 };
  scene.innerHTML = `
    <div class="room-bg ${heroBg}" aria-hidden="true">${roomIcon(state.roomId)}</div>
    <div class="room-title"><h2>${room.nameIT}</h2><span class="room-desc">${room.descIT}</span></div>
    <div id="stage" class="stage" aria-hidden="true">
      <div class="avatar-token" style="left:${avPos.x*100}%;top:${avPos.y*100}%">${avatarSVG(state, 44)}</div>
      ${tokens}
    </div>
    <div class="npcs" id="npcs">${present.map((c) => npcCard(c)).join('')}</div>
    <div class="season-strip">${seasonBadge(state)}</div>
  `;
  renderExits(state, callbacks);
}

function npcTokenPos(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const x = 12 + Math.abs(h) % 68;
  const y = 12 + Math.abs(h >> 16) % 60;
  return { x, y };
}

function nearestCitizen(state, present) {
  const pos = state.avatarPos || { x: 0.5, y: 0.72 };
  let nearest = null;
  let minDist = Infinity;
  for (const c of present) {
    const p = npcTokenPos(c.id);
    const d = Math.hypot(p.x - pos.x * 100, p.y - pos.y * 100);
    if (d < minDist) { minDist = d; nearest = c; }
  }
  return (nearest && minDist < 22) ? nearest : null;
}

function citizensPresent(state) {
  const { citizens, time, roomId } = state;
  const ref = state._citizensRef || world.CITIZENS;
  const out = [];
  for (const ci of Object.values(citizens)) {
    const def = ref.find((x) => x.id === ci.id) || ci;
    const home = world.roomOfCitizen(def, time.hour);
    if (home !== roomId || !isActive(def.hours, time.hour)) continue;
    out.push({ ...def, affinity: ci.affinity || 0, _room: home });
  }
  return out;
}

function isActive(hours, hour) {
  const [a, b] = hours;
  return a <= b ? (hour >= a && hour < b) : (hour >= a || hour < b);
}

function roomBg(roomId, time) {
  const map = { piazza: 'piazza', caffè: 'caffe', serra: 'serra', boutique: 'boutique', mercato: 'mercato', 'sala-specchi': 'specchi' };
  let base = map[roomId] || 'piazza';
  if (time.phase === 'notte') base = 'night-' + base;
  return base;
}

function roomIcon(roomId) {
  const map = { piazza: '⛲', caffè: '☕', serra: '🌿', boutique: '🪞', mercato: '🏪', 'sala-specchi': '🪞✦' };
  return `<span class="room-hero">${map[roomId] || '✦'}</span>`;
}

function seasonBadge(state) {
  const season = world.getSeason ? world.getSeason(state) : null;
  if (!season) return '';
  return `<span class="season-badge">${season.emoji} ${season.nameIT}</span>`;
}

function npcCard(c) {
  const aff = clamp(c.affinity || 0, 0, 100);
  const friend = aff >= 80;
  const tagsHtml = (c.tags || []).slice(0, 3).map((tg) =>
    `<span class="tag" style="background:${color(tg)}">${label(tg)}</span>`).join('');
  const greet = c.greet && c.greet.IT ? c.greet.IT : c.greet || '';
  return `
    <div class="npc-card ${friend ? 'friend' : ''}" data-citizen="${c.id}" role="group" aria-label="${c.nameIT}">
      <span class="npc-avatar" aria-hidden="true">${c.portrait}</span>
      <div class="npc-meta">
        <b>${c.nameIT}</b>
        <span class="npc-personality">${c.personalityIT}</span>
        <div class="npc-tags">${tagsHtml}</div>
        <div class="affinity" aria-label="Affinità ${aff}"><span class="affinity-bar" style="width:${aff}%"></span></div>
        <div class="npc-saludo" data-saludo>${escapeHtml(greet)}</div>
        <div class="npc-acts">
          <button data-act="greet" aria-label="${t('greet')} ${c.nameIT}">${t('greet')}</button>
          <button data-act="pose" aria-label="${t('pose')} ${c.nameIT}">${t('pose')}</button>
          <button data-act="compliment" aria-label="${t('compliment')} ${c.nameIT}">${t('compliment')}</button>
          <button data-act="help" aria-label="${t('help')} ${c.nameIT}">${t('help')}</button>
          <button data-act="speak" aria-label="Ascolta ${c.nameIT}" title="Ascolta">🔊</button>
        </div>
      </div>
    </div>
  `;
}

function renderExits(state, callbacks) {
  const nav = document.getElementById('exits');
  const room = state.currentRoom || world.getRoom(state.roomId);
  const entries = Object.entries((room && room.exits) || {});
  nav.innerHTML = entries.map(([dir, target]) => {
    const tgt = (state._roomsRef || world.ROOMS).find((r) => r.id === target);
    const locked = !!(tgt && tgt.locked);
    return `<button data-dir="${dir}" data-target="${target}" ${locked ? 'disabled' : ''} aria-label="${t('go')} ${dir}${locked ? ' ' + t('lockedRoom') : ''}"><span>${dir}</span></button>`;
  }).join('');
}

function renderActionBar(state, callbacks) {
  document.getElementById('action-bar').innerHTML = `
    <button data-act="decorate" class="fab" aria-label="${t('decorate')}">${t('decorate')}</button>
    <button data-act="outfit" class="fab" aria-label="${t('outfit')}">${t('outfit')}</button>
    <button data-act="inventory" class="fab" aria-label="${t('inventory')}">🎒 ${t('inventory')}</button>
    <button data-act="achievements" class="fab" aria-label="${t('achievements')}">🏆</button>
    <button data-act="market" class="fab" aria-label="${t('marketTitle')}">🏪</button>
  `;
}

// Panels — controller passa contentHtml già costruito.
export function openPanel(panelKey, title, contentHtml) {
  const root = document.getElementById('panel-root');
  root.setAttribute('aria-hidden', 'false');
  document.getElementById('main').setAttribute('inert', 'true');
  root.innerHTML = `
    <div class="panel" role="dialog" aria-modal="true" aria-label="${title}">
      <header><h2>${title}</h2><button data-panel-close aria-label="${t('close')}">✕</button></header>
      <div class="panel-body">${contentHtml}</div>
    </div>
  `;
  const panel = root.querySelector('.panel');
  const closeBtn = root.querySelector('[data-panel-close]');
  closeBtn.onclick = closePanel;
  focusTrap(panel);
  trapKeydownOnEsc(panel);
}

export function closePanel() {
  const root = document.getElementById('panel-root');
  removeAllTrapListeners();
  root.innerHTML = '';
  root.setAttribute('aria-hidden', 'true');
  document.getElementById('main').setAttribute('inert', 'false');
}

export function openModal({ title, body, buttons }) {
  const root = document.getElementById('modal-root');
  root.setAttribute('aria-hidden', 'false');
  const btns = buttons.map((b) =>
    `<button data-modal-action="${b.action}" class="${b.cls || ''}">${b.label}</button>`).join('');
  root.innerHTML = `
    <div class="modal" role="alertdialog" aria-modal="true" aria-label="${title}">
      <h2>${title}</h2>
      <div class="modal-body">${body}</div>
      <div class="modal-actions">${btns}</div>
    </div>
  `;
  root.querySelectorAll('button[data-modal-action]').forEach((b) => {
    b.onclick = () => {
      const action = b.dataset.modalAction;
      closeModal();
      if (window.__modalHandler && window.__modalHandler[action]) window.__modalHandler[action]();
    };
  });
  focusTrap(root.querySelector('.modal'));
  trapKeydownOnEsc(root.querySelector('.modal'));
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
  root.setAttribute('aria-hidden', 'true');
  window.__modalHandler = null;
  removeAllTrapListeners();
}

let trapListeners = [];
function trapKeydownOnEsc(container) {
  const esc = (e) => { if (e.key === 'Escape') closePanel(); };
  document.addEventListener('keydown', esc);
  trapListeners.push(esc);
}
function removeAllTrapListeners() {
  for (const fn of trapListeners) document.removeEventListener('keydown', fn);
  trapListeners = [];
}

function focusTrap(container) {
  const focusables = qsa('button, [href], input, [tabindex]:not([tabindex="-1"])', container)
    .filter((el) => !el.disabled);
  if (!focusables.length) return;
  const first = focusables[0];
  first.focus();
  const handler = (e) => {
    if (!document.querySelector('.panel, .modal')) return;
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      focusables[focusables.length - 1].focus();
    } else if (!e.shiftKey && document.activeElement === focusables[focusables.length - 1]) {
      e.preventDefault();
      first.focus();
    }
  };
  trapListeners.push(handler);
  document.addEventListener('keydown', handler);
}

export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  if (liveRegion()) liveRegion().textContent = msg;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2400);
}
function liveRegion() { return document.getElementById('toast'); }

// Tutorial
export function renderTutorial(step, callbacks) {
  showScreen('tutorial');
  const box = document.getElementById('tutorial-box');
  const steps = ['tutorial1', 'tutorial2', 'tutorial3', 'tutorial4'];
  const idx = clamp(step, 0, steps.length - 1);
  box.innerHTML = `
    <div class="tut-step">
      <h2>${t('tutorialTitle')}</h2>
      <p>${t(steps[idx])}</p>
      <div class="tut-dots">${steps.map((_, i) => `<span class="${i === idx ? 'on' : ''}"></span>`).join('')}</div>
      <div class="tut-actions">
        ${idx > 0 ? `<button data-tut="prev">${t('back')}</button>` : ''}
        ${idx < steps.length - 1 ? `<button data-tut="next">${t('next')}</button>` : `<button data-tut="done">${t('play')}</button>`}
        <button data-tut="skip">${t('tutorialSkip')}</button>
      </div>
    </div>
  `;
  box.querySelector('[data-tut="next"]').onclick = () => { state_tutStep = (state_tutStep || 0) + 1; renderTutorial(state_tutStep, callbacks); };
  const prev = box.querySelector('[data-tut="prev"]');
  if (prev) prev.onclick = () => { state_tutStep = Math.max(0, (state_tutStep || 0) - 1); renderTutorial(state_tutStep, callbacks); };
  box.querySelector('[data-tut="done"]').onclick = callbacks.tutDone;
  box.querySelector('[data-tut="skip"]').onclick = callbacks.tutDone;
}
let state_tutStep = 0;

function color(tag) { return TAG_COLORS[tag] || '#c8b6ff'; }
function label(tag) { return (TAG_LABELS[tag] && TAG_LABELS[tag][getLang()]) || tag; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
