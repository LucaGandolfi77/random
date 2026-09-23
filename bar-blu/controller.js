// ===== Bar Blu — Controller =====
import {
  loadState, defaultState, SAVE_KEY,
} from './storage.js';
import {
  PHASES, PHASE_NAMES, PHASE_ICONS, ITEMS, COLLECTIBLES,
  serveCustomer, spinMachine, buyScratchCard, scratchReveal, placeInDisplay, removeFromDisplay,
  endShift as modelEndShift, checkMilestones, checkUnlocks, checkMemories,
  startNewShift as modelStartShift, generateCustomer as modelGenerateCustomer, getAmbientMessage,
  pickCustomer, startEventLoop,
} from './model.js';
import {
  initView, renderHome, showHome, showGame, showScreen, renderCustomer, renderItemsBar,
  renderSaletta, renderScratch, renderInventory, renderSettings, showToast, sparkleAt,
  showTutorialStep, setCurtainOpen, showLukeMessage, showReset, showCustomerSpeech, showMemory,
} from './view.js';
import { playSFX, startMusic, stopMusic, setVolume, getContext } from './audio.js';
import { generateCartolina, shareCartolina } from './cartolina.js';

let state = loadState();
if (!state || !state.settings) state = defaultState();
let scratchRevealed = false;
let deferredPrompt = null;
let ambientTimer = null;
let firstGesture = false;

export function init() {
  initView();
  bindEvents();
  handlePWAInstall();
  registerServiceWorker();
  applySettings();
  handleShareTarget();
  listenShareTarget();
  renderHome();
  showHome();
  if (state.settings.music) lazyMusic();
  startAmbient();
  checkMotionPref();
}

function handleShareTarget() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'share-received') {
    showToast('Cartolina ricevuta!', 'reward');
    history.replaceState(null, '', './');
  }
}

function listenShareTarget() {
  navigator.serviceWorker?.addEventListener('message', e => {
    if (e.data?.type === 'SHARE_TARGET') {
      showToast('Cartolina ricevuta: ' + (e.data.title || 'immagine'), 'reward');
    }
  });
}

function applySettings() {
  setVolume(state.settings.volume);
  const html = document.documentElement;
  html.dataset.reduceMotion = state.settings.reducedMotion ? 'true' : 'false';
}

function lazyMusic() {
  if (firstGesture) return;
  document.addEventListener('click', function onFirst() {
    firstGesture = true;
    document.removeEventListener('click', onFirst);
    if (state.settings.music && getContext) {
      getContext();
      startMusic();
    }
  }, { once: true });
}

function checkMotionPref() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) { state.settings.reducedMotion = true; document.documentElement.dataset.reduceMotion = 'true'; save(); }
  mq.addEventListener('change', e => { state.settings.reducedMotion = e.matches; document.documentElement.dataset.reduceMotion = String(e.matches); save(); });
}

function startAmbient() {
  if (ambientTimer) clearInterval(ambientTimer);
  ambientTimer = setInterval(() => {
    if (document.getElementById('screen-game')?.classList.contains('active')) {
      const el = document.getElementById('ambient-text');
      if (el) el.textContent = getAmbientMessage();
    }
  }, 8000);
}

function save() {
  state.lastAccess = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
}

const $ = id => document.getElementById(id);

// ---- Events ----
function bindEvents() {
  $('btn-new-shift')?.addEventListener('click', onNewShift);
  $('btn-continue')?.addEventListener('click', onContinue);
  $('btn-howto')?.addEventListener('click', () => { playSFX('click'); openHowTo(); });
  $('btn-settings-home')?.addEventListener('click', () => { playSFX('click'); openSettings(); });
  $('nav-saletta')?.addEventListener('click', () => { playSFX('click'); openSaletta(); });
  $('nav-inventario')?.addEventListener('click', () => { playSFX('click'); openInventory(); });
  $('nav-scratch')?.addEventListener('click', () => { playSFX('click'); openScratchScreen(); });
  $('nav-end')?.addEventListener('click', () => { playSFX('click'); onEndShift(); });
  $('items-bar')?.addEventListener('click', onItemClick);
  $('curtain')?.addEventListener('click', onCurtain);
  $('curtain')?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCurtain(); }});
  $('machines')?.addEventListener('click', onMachineSpin);
  $('btn-close-saletta')?.addEventListener('click', closeSaletta);
  $('btn-close-saletta-x')?.addEventListener('click', closeSaletta);
  $('scratch-layer')?.addEventListener('click', onScratchClick);
  $('btn-buy-scratch')?.addEventListener('click', onBuyScratch);
  $('btn-scratch-new')?.addEventListener('click', openScratchScreen);
  $('btn-close-scratch')?.addEventListener('click', closeScratch);
  $('btn-close-scratch-x')?.addEventListener('click', closeScratch);
  $('display-case')?.addEventListener('click', onDisplayClick);
  $('btn-close-inv')?.addEventListener('click', closeInventory);
  $('btn-close-inv-x')?.addEventListener('click', closeInventory);
  $('btn-close-settings')?.addEventListener('click', closeSettings);
  $('set-music')?.addEventListener('click', toggleMusic);
  $('set-sfx')?.addEventListener('click', toggleSFX);
  $('set-volume')?.addEventListener('input', onVolume);
  $('set-motion')?.addEventListener('click', toggleMotion);
  $('btn-tutorial')?.addEventListener('click', () => { playSFX('click'); showTutorialStep(1, 4, 'Benvenuto! Servi i clienti toccando cosa desiderano.'); });
  $('btn-share-cartolina')?.addEventListener('click', onShareCartolina);
  $('btn-howto-full')?.addEventListener('click', () => { playSFX('click'); openHowTo(); });
  $('btn-reset')?.addEventListener('click', () => { playSFX('click'); showReset(); });
  $('btn-close-howto')?.addEventListener('click', () => showScreen(state.started ? 'screen-game' : 'screen-home'));
  $('btn-confirm-reset')?.addEventListener('click', onResetConfirm);
  $('btn-cancel-reset')?.addEventListener('click', () => { playSFX('click'); showSettings(); });
  $('btn-close-reset')?.addEventListener('click', () => { playSFX('click'); showSettings(); });
  $('btn-end-shift')?.addEventListener('click', onEndConfirmed);
  $('btn-install')?.addEventListener('click', onInstall);
  $('btn-install-dismiss')?.addEventListener('click', dismissInstall);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const screens = ['screen-settings','screen-howto','screen-reset','screen-saletta','screen-inventory','screen-scratch'];
      for (const id of screens) {
        if ($(id)?.classList.contains('active')) {
          playSFX('click');
          if (id === 'screen-saletta') closeSaletta();
          else if (id === 'screen-settings') showSettings();
          else showScreen(state.started ? 'screen-game' : 'screen-home');
          break;
        }
      }
    }
  });
  startEventLoop(state, onRandomEvent);
}

// ---- Actions ----

function onNewShift() {
  playSFX('click');
  state = modelStartShift(state);
  modelGenerateCustomer(state);
  save(); ensureAudio(); renderGameScreen(); showGame(); maybeTutorial();
}

function onContinue() {
  playSFX('click'); ensureAudio();
  if (!state.started) { onNewShift(); return; }
  if (!state.currentCustomer) modelGenerateCustomer(state);
  renderGameScreen(); showGame();
}

function ensureAudio() {
  if (!state.audioReady) { try { getContext(); state.audioReady = true; save(); } catch (_) {} }
}

function onItemClick(e) {
  const btn = e.target.closest('.item-btn');
  if (!btn) return;
  const itemId = btn.dataset.itemId;
  if (!itemId || !state.currentCustomer) return;
  playSFX('click');
  const serving = state.currentCustomer;
  const result = serveCustomer(state, itemId);
  if (!result.success) {
    playSFX('error');
    const want = ITEMS[result.want];
    showToast('Luca preferisce il ' + (want?.name || 'quel prodotto'), 'warn');
    renderItemsBar(state, result.want);
    return;
  }
  playSFX('serve');
  if (navigator.vibrate) navigator.vibrate(20);
  if (result.sobering) {
    showToast('Luca gli offre un caffè: si riprende un po\'.', 'success');
  } else {
    showToast('+' + result.reward + ' gettoni!', 'success');
  }
  if (result.collectible) {
    playSFX('collect');
    const c = COLLECTIBLES.find(x => x.id === result.collectible);
    showToast('Collezionato: ' + (c?.name || result.collectible) + '!', 'reward');
    sparkleAt($('bar-scene'), 120, 100);
    announce('Collezionato ' + (c?.name || 'oggetto'));
  }
  if (serving?.quips?.length) {
    showCustomerSpeech(serving.name, serving.quips[Math.floor(Math.random() * serving.quips.length)]);
  }
  const mr = checkMilestones(state);
  mr.newMilestones.forEach(m => { playSFX('milestone'); showToast('Traguardo: ' + m.name + '!', 'reward'); announce('Traguardo: ' + m.name); });
  const ur = checkUnlocks(state);
  ur.newUnlocks.forEach(u => showToast('Sbloccato: ' + u.name + '!', 'info'));
  const mc = checkMemories(state);
  mc.newMemories.forEach(m => { playSFX('milestone'); showMemory(m, m.text); });
  save(); renderGameScreen(); renderHome();
}

function onRandomEvent(event) {
  if (!state || !state.started) return;
  if (state.settings.sfx) playSFX('coin');
  showToast(event.icon + ' ' + event.text, 'info');
}

function onCurtain() {
  playSFX('click');
  const c = $('curtain');
  if (c) c.classList.toggle('open');
}

function openSaletta() { playSFX('click'); renderSaletta(state); showScreen('screen-saletta'); }

function onMachineSpin(e) {
  const btn = e.target.closest('[data-machine-spin]');
  if (!btn) return;
  const idx = parseInt(btn.dataset.machineSpin);
  playSFX('spin');
  const r = spinMachine(state, idx);
  if (r.error) { showToast(r.error, 'warn'); return; }
  playSFX('result');
  showToast('+' + r.tokens + ' gettoni' + (r.collectible ? '! Collezionato!' : ''), 'reward');
  if (navigator.vibrate) navigator.vibrate(30);
  save(); renderSaletta(state, r); renderHome();
  const ur = checkUnlocks(state);
  ur.newUnlocks.forEach(u => showToast('Sbloccato: ' + u.name + '!', 'info'));
}

function closeSaletta() { playSFX('click'); const c = $('curtain'); if (c) c.classList.remove('open'); renderGameScreen(); showGame(); }

function openScratchScreen() { scratchRevealed = false; playSFX('click'); renderScratch(state); showScreen('screen-scratch'); }

function onBuyScratch() {
  playSFX('click');
  const r = buyScratchCard(state);
  if (r.error) { showToast(r.error, 'warn'); return; }
  playSFX('coin'); showToast('Carta comprata!', 'success');
  save(); renderScratch(state); renderSaletta(state);
}

function onScratchClick() {
  if (!state.hasScratchCard || scratchRevealed) return;
  playSFX('scratch');
  const r = scratchReveal(state);
  if (r.error) return;
  scratchRevealed = true;
  playSFX('collect');
  if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  showToast('+' + r.tokens + ' gettoni' + (r.collectible ? '! Collezionato!' : ''), 'reward');
  save(); renderScratch(state, r); renderHome();
}

function openInventory() { playSFX('click'); renderInventory(state); showScreen('screen-inventory'); }

function onDisplayClick(e) {
  playSFX('click');
  const placeBtn = e.target.closest('[data-place-id]');
  if (placeBtn) {
    const itemId = placeBtn.dataset.placeId;
    let placed = false;
    for (let i = 0; i < 4; i++) { if (!state.displayCase[i]) { const r = placeInDisplay(state, i, itemId); if (r.success) { placed = true; showToast('Piazzato in vetrina', 'success'); break; } } }
    if (!placed) showToast('Vetrina piena', 'warn');
    save(); renderInventory(state); return;
  }
  const slot = e.target.closest('.display-slot');
  if (!slot) return;
  const idx = parseInt(slot.dataset.slot);
  if (state.displayCase[idx]) { removeFromDisplay(state, idx); showToast('Rimosso dalla vetrina', 'info'); save(); renderInventory(state); }
}

function closeInventory() { playSFX('click'); renderGameScreen(); showGame(); }

function openHowTo() { showScreen('screen-howto'); }
function showSettings() { renderSettings(state); showScreen('screen-settings'); }

function closeSettings() { playSFX('click'); save(); if (state.started) { renderGameScreen(); showGame(); } else { renderHome(); showHome(); } }

function toggleMusic() {
  state.settings.music = !state.settings.music;
  if (state.settings.music) { ensureAudio(); startMusic(); } else stopMusic();
  playSFX('click'); save(); renderSettings(state);
}

function toggleSFX() { state.settings.sfx = !state.settings.sfx; playSFX('click'); save(); renderSettings(state); }

function onVolume(e) { state.settings.volume = e.target.value / 100; setVolume(state.settings.volume); save(); }

function toggleMotion() {
  state.settings.reducedMotion = !state.settings.reducedMotion;
  document.documentElement.dataset.reduceMotion = String(state.settings.reducedMotion);
  save(); renderSettings(state);
  showToast(state.settings.reducedMotion ? 'Movimento ridotto attivo' : 'Movimento normale', 'info');
}

function onShareCartolina() {
  playSFX('click');
  const canvas = generateCartolina(state);
  shareCartolina(canvas, state).then(r => {
    if (r.ok) showToast('Cartolina condivisa!', 'success');
    else if (r.reason === 'aborted') showToast('Condivisione annullata', 'info');
    else showToast('Cartolina salvata', 'success');
  }).catch(() => showToast('Errore nella condivisione', 'warn'));
}

function onResetConfirm() {
  playSFX('click');
  try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
  state = defaultState();
  scratchRevealed = false;
  document.documentElement.dataset.reduceMotion = 'false';
  showToast('Gioco resettato', 'warn');
  renderHome(); showHome();
}

function onEndShift() {
  playSFX('click');
  const r = modelEndShift(state);
  if (r.success) {
    $('sum-served').textContent = r.summary.served;
    $('sum-perfect').textContent = r.summary.perfect;
    $('sum-tokens').textContent = r.summary.tokens;
    $('sum-collect').textContent = state.collectiblesFound.length;
  }
  showScreen('screen-summary');
}

function onEndConfirmed() { playSFX('click'); save(); renderHome(); showHome(); }

// ---- PWA ----
function handlePWAInstall() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('install-banner')?.classList.remove('hidden'); });
}
function onInstall() { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; dismissInstall(); }); } }
function dismissInstall() { $('install-banner')?.classList.add('hidden'); }

// ---- Render ----
function renderGameScreen() {
  if (!state) return;
  $('hdr-phase').textContent = PHASE_ICONS[PHASES[state.phaseIndex]] + ' ' + PHASE_NAMES[PHASES[state.phaseIndex]];
  $('hdr-shift').textContent = 'Turno ' + state.currentShift;
  $('hdr-level').textContent = 'Lv.' + state.level;
  $('res-tokens').innerHTML = state.tokens + ' &#x1FA99;';
  $('res-xp').innerHTML = state.xp + '/' + (state.level * 20) + ' &#x2726;';
  document.body.className = 'phase-' + PHASES[state.phaseIndex];
  renderCustomer(state);
  renderItemsBar(state, state.currentCustomer?.wants);
  $('ambient-text').textContent = getAmbientMessage();
  $('luka-bubble').hidden = true;
  $('curtain').classList.remove('open');
}

function maybeTutorial() {
  if (!state.tutorialDone) { state.tutorialDone = true; save(); showTutorialStep(1, 4, 'Benvenuto al Bar Blu! Servi i clienti toccando il prodotto che desiderano.'); }
}

// ---- SW ----
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./service-worker.js'); } catch (e) { console.log('SW err', e); }
  }
}
