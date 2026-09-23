import * as C from './config.js';
import { t, setLang, applyStatic } from './i18n.js';
import { prefersReducedMotion } from './utils.js';
import { debounce } from './utils.js';
import { loadState, saveState } from './services/storage.js';
import { setAudioStateRef, playSfx, startMusic, stopMusic, setVolume, audioSupported, unlockAudio } from './services/audio.js';
import { registerServiceWorker, promptInstall, setupInstallPrompt } from './services/pwa.js';
import { ambientInit } from './services/ambient.js';
import { generatePoster, sharePoster, initShareTarget } from './services/share.js';
import { init as modelInit, getState, greetCustomer, grindStep, pourTick, pourStop, serveCustomer, leaveCustomer, leaveSospeso, claimSospeso, waterPlants, buyDecor, toggleDecor, advancePhase, rollWeather, rollEvent, applyEvent, checkAchievements, setSetting, reset as modelReset, setBrewRecipe } from './model.js';
import { setState as viewSetState, init as viewInit, showScreen, render, renderInventory, renderAchievements, renderDecor, renderSospeso, toast, message, setHomeProgress, renderAllPanels, setCallbacks } from './view.js';

let state = null;
let pourInterval = null;
let musicStarted = false;
let audioUnlocked = false;
const requestSave = debounce(() => saveState(state), 280);

export function init() {
  const loaded = loadState();
  modelInit(loaded);
  state = loaded;
  setAudioStateRef(() => state);
  applyMotionPref();
  viewInit({
    app: document.getElementById('app'),
    resources: document.getElementById('resources'),
    chalkboard: document.getElementById('chalkboard'),
    customer: document.getElementById('customer'),
    machine: document.getElementById('machine'),
    actions: document.getElementById('actions'),
    compose: document.getElementById('compose'),
    invList: document.getElementById('inv-list'),
    invTitle: document.getElementById('inv-title'),
    achList: document.getElementById('ach-list'),
    achTitle: document.getElementById('ach-title'),
    decorList: document.getElementById('decor-list'),
    sospList: document.getElementById('sosp-list'),
    toast: document.getElementById('toast'),
    live: document.getElementById('live'),
    homeProgress: document.getElementById('home-progress'),
  });
  viewSetState(state);
  setCallbacks({
    aromaCraft: (action, payload) => craft(action, payload),
    customerAction: (action, payload) => action(action, payload),
  });
  setHomeProgress();
  bindEvents();
  showScreen(state.tutorialDone ? 'home' : 'tutorial');
  registerServiceWorker();
  setupInstallPrompt();
  ambientInit(() => state);
  bindAudioUnlock();
  bindVisibility();
  requestSave();
  applyStatic();
  initShareTarget();
}

function applyMotionPref() {
  if (state.settings?.reduceMotion || prefersReducedMotion()) {
    document.body.classList.add('reduce-motion');
  }
}

function bindAudioUnlock() {
  const unlock = () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    unlockAudio();
    if (state.settings?.music && audioSupported()) {
      startMusic();
      musicStarted = true;
    }
  };
  document.addEventListener('pointerdown', unlock, { once: true, passive: true });
  document.addEventListener('keydown', unlock, { once: true });
}

function bindVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (pourInterval) { clearInterval(pourInterval); pourInterval = null; }
      if (musicStarted) stopMusic();
    } else {
      if (state.settings?.music && audioSupported() && !musicStarted) {
        startMusic();
        musicStarted = true;
      }
    }
  });
}

function go(screen) {
  if (pourInterval) { clearInterval(pourInterval); pourInterval = null; }
  showScreen(screen);
  render();
}

function action(type, payload) {
  const s = getState();
  switch (type) {
    case 'greet': {
      const c = greetCustomer();
      if (c) {
        playSfx('tap');
        const name = t(C.CUSTOMERS.find((x) => x.id === c.customerId).nameKey);
        toast(t('customer_greeting', { name }));
        render();
        onCustomerServed();
      }
      break;
    }
    case 'grind': {
      grindStep();
      playSfx('grind');
      requestSave();
      render();
      break;
    }
    case 'recipe': {
      setBrewRecipe(payload.originId, payload.milkId, payload.sweetId);
      playSfx('tap');
      requestSave();
      render();
      break;
    }
    case 'pourStart': {
      if (pourInterval) clearInterval(pourInterval);
      pourInterval = setInterval(() => {
        pourTick();
        const el = document.querySelector('[data-ref="pour"] .meter-fill');
        const st = getState();
        if (el) el.style.width = `${st.pour * 100}%`;
        if (st.pour >= 1) { pourStop(); render(); }
      }, 60);
      playSfx('tap');
      render();
      break;
    }
    case 'pourStop': {
      const p = pourStop();
      if (p !== undefined) requestSave();
      playSfx('pour');
      render();
      break;
    }
    case 'serve': {
      if (!s.lastRecipe) { toast(t('serve_first')); playSfx('error'); return; }
      const r = serveCustomer();
      if (r.error) return;
      playSfx(r.perfect ? 'perfect' : 'serve');
      if (r.discoveredAroma) {
        const a = C.AROMAS.find((x) => x.id === r.discoveredAroma);
        const msg = t('aroma_discovered', { name: t(a.nameKey) });
        toast(msg);
        message(msg);
        playSfx('discover');
        renderInventory();
      }
      if (r.leveled) { toast(t('level_up', { level: r.level })); playSfx('levelup'); }
      const fresh = checkAchievements();
      for (const id of fresh) {
        const a = C.ACHIEVEMENTS.find((x) => x.id === id);
        if (a) toast(t(a.nameKey));
      }
      if (r.matched) message(t('serve_perfect'));
      toast(t('serve_ok'));
      message(t('serve_ok'));
      render();
      setHomeProgress();
      requestSave();
      onCustomerServed();
      break;
    }
    case 'leave': {
      const name = s.currentCustomer ? t(C.CUSTOMERS.find((x) => x.id === s.currentCustomer).nameKey) : '';
      leaveCustomer();
      toast(name ? t('customer_quit', { name }) : t('customer_quit', { name: 'Ospite' }));
      go('game');
      break;
    }
  }
}

function craft(action, payload) {
  const s = getState();
  switch (action) {
    case 'sospeso': {
      const r = leaveSospeso();
      if (r.ok) { playSfx('coin'); toast(t('sospeso_left')); message(t('sospeso_left')); renderSospeso(); render(); requestSave(); }
      else { toast(t('tokens_low')); playSfx('error'); }
      break;
    }
    case 'claimSospeso': {
      if (claimSospeso().ok) { playSfx('serve'); toast(t('sospeso_claimed')); renderSospeso(); render(); requestSave(); }
      break;
    }
    case 'waterPlants': {
      const r = waterPlants();
      if (r.ok) { playSfx('tap'); toast(t('plant_grown')); render(); requestSave(); }
      else { toast(t('tokens_low')); playSfx('error'); }
      break;
    }
    case 'buyDecor': {
      const r = buyDecor(payload);
      if (r.ok) { playSfx('coin'); toast(t('buy_decor_ok', { name: t(C.UNLOCKABLES.find((u) => u.id === payload).nameKey) })); renderDecor(); render(); requestSave(); }
      else { toast(t('tokens_low')); playSfx('error'); }
      break;
    }
    case 'toggleDecor': {
      toggleDecor(payload);
      renderDecor();
      requestSave();
      break;
    }
  }
}

function onCustomerServed() {
  const phase = advancePhase();
  if (Math.random() < 0.5) rollWeather();
  if (Math.random() < 0.3) {
    const ev = rollEvent();
    const key = applyEvent(ev);
    if (key) toast(t(key));
  }
  requestSave();
}

function bindEvents() {
  document.getElementById('btn-start')?.addEventListener('click', () => { playSfx('open'); go('game'); });
  document.getElementById('btn-continue')?.addEventListener('click', () => { playSfx('open'); go('game'); });
  document.querySelectorAll('[data-action="settings"]').forEach((b) => b.addEventListener('click', () => { go('settings'); renderSettings(); }));
  document.querySelectorAll('[data-action="howto"]').forEach((b) => b.addEventListener('click', () => { go('howto'); renderAllPanels?.(); }));
  document.querySelectorAll('[data-action="inventory"]').forEach((b) => b.addEventListener('click', () => { go('inventory'); renderAllPanels(); }));
  document.querySelectorAll('[data-action="achievements"]').forEach((b) => b.addEventListener('click', () => { go('achievements'); renderAllPanels(); }));
  document.querySelectorAll('[data-action="back"]').forEach((b) => b.addEventListener('click', () => { go('home'); setHomeProgress(); }));
  document.getElementById('btn-reset')?.addEventListener('click', openResetConfirm);
  document.getElementById('reset-confirm-yes')?.addEventListener('click', () => { openResetConfirm(false); modelReset(); location.reload(); });
  document.getElementById('reset-confirm-no')?.addEventListener('click', () => openResetConfirm(false));

  document.getElementById('btn-music')?.addEventListener('click', () => {
    state.settings.music = !state.settings.music;
    if (state.settings.music && audioSupported()) { startMusic(); musicStarted = true; } else stopMusic();
    requestSave(); renderSettings();
  });
  document.getElementById('btn-sfx')?.addEventListener('click', () => {
    state.settings.sfx = !state.settings.sfx;
    if (state.settings.sfx) playSfx('tap');
    requestSave(); renderSettings();
  });
  document.getElementById('range-volume')?.addEventListener('input', (e) => {
    state.settings.volume = parseFloat(e.target.value);
    setVolume(state.settings.volume);
    requestSave();
  });
  document.getElementById('select-lang')?.addEventListener('change', (e) => {
    setLang(e.target.value); setSetting('lang', e.target.value); requestSave(); renderSettings(); applyStatic();
  });
  document.getElementById('toggle-motion')?.addEventListener('change', (e) => {
    state.settings.reduceMotion = e.target.checked;
    document.body.classList.toggle('reduce-motion', e.target.checked);
    requestSave();
  });
  document.getElementById('btn-install')?.addEventListener('click', async () => { await promptInstall(); });
  document.getElementById('btn-save')?.addEventListener('click', () => { saveState(state); toast(t('save')); });
  document.getElementById('btn-share')?.addEventListener('click', async () => {
    const canvas = generatePoster(state);
    const res = await sharePoster(canvas, state);
    toast(res === 'downloaded' ? t('share_download') : t('shared_ok'));
  });

  document.getElementById('tutorial-start')?.addEventListener('click', () => {
    state.tutorialDone = true; saveState(state); go('game'); render();
  });

  document.getElementById('btn-water')?.addEventListener('click', () => craft('waterPlants'));
  document.getElementById('btn-sospeso')?.addEventListener('click', () => craft('sospeso'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { openResetConfirm(false); return; }
    const game = document.querySelector('[data-screen="game"]:not(.hidden)');
    if (!game || e.target && e.target.matches('input,select,textarea')) return;
    if (e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); action('grind'); }
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); action('serve'); }
  });
}

function renderSettings() {
  const m = document.getElementById('btn-music');
  const s = document.getElementById('btn-sfx');
  if (m) m.textContent = state.settings.music ? `${t('settings_music')} ✓` : t('settings_music');
  if (s) s.textContent = state.settings.sfx ? `${t('settings_sfx')} ✓` : t('settings_sfx');
  const r = document.getElementById('range-volume');
  if (r) r.value = state.settings.volume;
  const l = document.getElementById('select-lang');
  if (l) l.value = state.lang;
  const mt = document.getElementById('toggle-motion');
  if (mt) mt.checked = state.settings.reduceMotion;
}

let lastFocused = null;
function toggleResetModal(open) {
  const m = document.getElementById('reset-confirm');
  if (!m) return;
  if (open) {
    lastFocused = document.activeElement;
    m.classList.remove('hidden');
    document.getElementById('reset-confirm-yes')?.focus();
  } else {
    m.classList.add('hidden');
    if (lastFocused) lastFocused.focus();
  }
}
function openResetConfirm() { toggleResetModal(true); }
export { openResetConfirm };
