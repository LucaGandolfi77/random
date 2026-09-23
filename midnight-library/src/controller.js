// Controller: mediazione tra View e Model. Non scrive direttamente lo stato
// (usa solo le azioni pure del Model) e non tocca il DOM direttamente
// (delega ogni rendering alla View).

import { AUTOSAVE_MS, TICK_MS, SAVE_KEY, MAX_MODS } from './config.js';
import * as M from './model/actions.js';
import { defaultState, tick, moonPhase } from './model/state.js';
import { TUTORIAL_STEPS, MOON_ACHIEVEMENTS, RARE_BOOKS } from './model/data.js';
import { t } from './i18n.js';
import * as V from './view.js';
import * as S from './services/storage.js';
import { audio } from './services/audio.js';
import * as PWA from './services/pwa.js';
import { sharePostcard } from './services/share.js';
import { loadPack, listPacks, addPack, removePack, applyPacks } from './services/mods.js';
import * as MP from './services/multiplayer.js';
import { startVoiceCommands } from './services/a11y.js';

let state = defaultState();
let hasSave = false;
let unsubStorage = null;
let timers = [];
let destroyed = false;
let updateWorker = null;
let wakeLock = null;
let rafParallax = null;
let swipe = null;

const LANG_CYCLE = ['it', 'en'];

export function getState() { return state; }

// ---- Bootstrap ----
export function start(opts = {}) {
  destroyed = false;
  const loaded = S.load();
  state = loaded.state || defaultState();
  hasSave = !loaded.missing;
  if (loaded.corrupted) V.showToast('Save recovered from backup.', state.settings.lang);
  // Fallback: localStorage vuoto ma forse c'è un salvataggio su IndexedDB
  if (loaded.missing) {
    S.loadFromIdb().then((fromIdb) => {
      if (destroyed || !fromIdb) return;
      state = fromIdb;
      hasSave = true;
      applySettings();
      renderAll();
      V.showToast(t(state.settings.lang, 'idbSaved'), state.settings.lang);
    }).catch(() => undefined);
  } else if (state.settings.archiveIdb) {
    S.hydrateLetters(state).then(() => {
      if (!destroyed) renderAll();
    }).catch(() => undefined);
  }

  V.cacheElements();
  bindStaticListeners();
  applySettings();
  renderAll();

  if (opts.skipWelcome) V.showGame();
  else V.showWelcome(hasSave);

  startTimers();

  unsubStorage = S.subscribe((external) => {
    state = external;
    renderAll();
    V.showToast(state.settings.lang === 'it' ? 'Salvataggio aggiornato da un\'altra scheda.' : 'Save updated from another tab.', state.settings.lang);
  });

  PWA.captureInstallPrompt();
  PWA.registerSW({
    onUpdate: (worker) => {
      updateWorker = worker;
      V.renderBanners({ offline: !navigator.onLine, standalone: PWA.isStandalone(), canInstall: PWA.canPromptInstall(), updateReady: true });
    },
  });
  PWA.onShareTarget((text) => {
    const r = M.addLetter(state, text, Date.now());
    if (r.ok) {
      save();
      V.renderLetters(state);
      V.flashLetter();
      V.showToast('📩 ' + (state.settings.lang === 'it' ? 'Una lettera è scivolata sotto la porta…' : 'A letter slipped under the door…'), state.settings.lang);
      audio.play('letter');
    }
  });

  // Fase 3 · Progressive install campaign (deep-link ?install=1 o #install)
  maybeHandleInstallDeepLink();

  // Fase 3 · Multiplayer handlers
  MP.setHandlers({
    onMessage: onPeerMessage,
    onStatus: onPeerStatus,
  });

  // Fase 3 · Voice commands (se abilitate)
  applyVoiceSetting();

  window.addEventListener('online', refreshBanners);
  window.addEventListener('offline', refreshBanners);
  document.addEventListener('lumina:installed', refreshBanners);

  if (opts.restart) { /* usato nei test */ }
  return state;
}

function maybeHandleInstallDeepLink() {
  try {
    const url = new URL(window.location.href);
    const flag = url.searchParams.get('install');
    const isHash = window.location.hash === '#install';
    if (flag !== '1' && flag !== 'true' && !isHash) return;
    if (flag) {
      url.searchParams.delete('install');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
    V.showGame();
    V.showToast(t(state.settings.lang, 'installDeep'), state.settings.lang);
    // mostra banner install e tenta prompt dopo un beat
    setTimeout(() => {
      refreshBanners();
      if (PWA.canPromptInstall()) PWA.promptInstall().then(() => refreshBanners());
      else V.getEl('installBanner')?.removeAttribute('hidden');
    }, 400);
  } catch { /* URL invalido */ }
}

let voiceStop = null;
function applyVoiceSetting() {
  if (voiceStop) { voiceStop(); voiceStop = null; }
  if (!state.settings.voiceCommands) return;
  voiceStop = startVoiceCommands({
    lang: state.settings.lang,
    onCommand: (cmd) => {
      handleVoiceCommand(cmd);
    },
    onError: (err) => {
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        state.settings.voiceCommands = false;
        applySettings();
        save();
        V.showToast(t(state.settings.lang, 'voiceUnsupported'), state.settings.lang);
      }
    },
  });
  if (!voiceStop) {
    // browser senza supporto → spegni toggle
    state.settings.voiceCommands = false;
    syncToggles();
  }
}

function handleVoiceCommand(cmd) {
  switch (cmd.action) {
    case 'lantern': {
      const idx = state.lanterns.findIndex((l) => !l);
      if (idx >= 0) actLantern(idx);
      break;
    }
    case 'tea': actTea(); break;
    case 'reader': actReader(); break;
    case 'shelve': actShelve(); break;
    case 'catalog': V.togglePanelById('collectionPanel', true); break;
    case 'help': V.togglePanelById('helpPanel', true); break;
    case 'settings': V.togglePanelById('settingsPanel', true); break;
    case 'save': if (save()) V.showToast(t(state.settings.lang, 'saved'), state.settings.lang); break;
    case 'collect-fallen': actFallen(); break;
    case 'switch-room': actSwitchRoom(cmd.dataset?.room); break;
    case 'sort-archive': actSortArchive(); break;
    case 'tend-plants': actTendPlants(); break;
    default: break;
  }
}

function onPeerMessage(msg) {
  if (msg.kind === 'letter') {
    const r = M.addLetter(state, msg.text, Date.now());
    if (r.ok) {
      save();
      V.renderLetters(state);
      V.flashLetter();
      V.showToast(t(state.settings.lang, 'multiLetterIn'), state.settings.lang);
      audio.play('letter');
    }
  } else if (msg.kind === 'status') {
    V.showToast(t(state.settings.lang, 'multiStatusIn'), state.settings.lang);
    const el = V.getEl('multiStatus');
    if (el && msg.payload) {
      el.textContent = `${msg.payload.name || 'peer'} · ${msg.payload.room} · ${msg.payload.readersServed} readers`;
    }
  }
}

function onPeerStatus(s) {
  const el = V.getEl('multiStatus');
  if (!el) return;
  const lang = state.settings.lang;
  const map = {
    'creating-offer': lang === 'it' ? 'Creazione invito…' : 'Creating invite…',
    'creating-answer': lang === 'it' ? 'Creazione risposta…' : 'Creating reply…',
    connecting: lang === 'it' ? 'Connessione…' : 'Connecting…',
    open: t(lang, 'multiConnected'),
    closed: lang === 'it' ? 'Disconnesso.' : 'Disconnected.',
    error: lang === 'it' ? 'Errore WebRTC.' : 'WebRTC error.',
  };
  el.textContent = map[s.status] || s.status || '';
}

function refreshBanners() {
  V.renderBanners({
    offline: !navigator.onLine,
    standalone: PWA.isStandalone(),
    canInstall: PWA.canPromptInstall() || PWA.isIOS(),
    updateReady: Boolean(updateWorker),
  });
}

// ---- Loop / timer ----
function startTimers() {
  stopTimers();
  timers.push(setInterval(onTick, TICK_MS));
  timers.push(setInterval(() => { save(); }, AUTOSAVE_MS));
}

function stopTimers() {
  timers.forEach(clearInterval);
  timers = [];
}

function onTick() {
  if (destroyed || document.hidden) return;
  const now = Date.now();
  tick(state, now);
  const events = M.worldTick(state, now);
  handleWorldEvents(events);
  renderDynamic();
}

function handleWorldEvents(events) {
  events.forEach((e) => {
    switch (e.kind) {
      case 'readerArrived':
        V.showToast(state.settings.lang === 'it' ? 'Un lettore è arrivato.' : 'A reader arrived.', state.settings.lang);
        audio.play('reader');
        break;
      case 'bookArrived':
        break;
      case 'lanternDimmed':
        V.showToast(state.settings.lang === 'it' ? 'Una lanterna si è spenta.' : 'A lantern dimmed.', state.settings.lang);
        break;
      case 'event':
        if (e.type === 'cat') {
          V.showToast(state.settings.lang === 'it' ? 'Il gatto-ombra è qui.' : 'The shadow-cat is here.', state.settings.lang);
        } else if (e.type === 'rain') {
          V.showToast(state.settings.lang === 'it' ? 'Pioggia sui vetri — tocca per +1 Calma.' : 'Rain on the glass — tap for +1 Calm.', state.settings.lang);
        } else if (e.type === 'fallenBook') {
          V.showToast(state.settings.lang === 'it' ? 'Un libro è caduto!' : 'A book fell!', state.settings.lang);
        }
        break;
      case 'eventEnded':
        break;
      case 'dailyLetter':
        V.showToast('📩 ' + t(state.settings.lang, 'dailyLetter'), state.settings.lang);
        V.flashLetter();
        audio.play('letter');
        break;
      case 'moonAchievement': {
        const def = MOON_ACHIEVEMENTS?.[e.key];
        const title = def ? (def[state.settings.lang] || def.it).title : e.key;
        V.showToast(`☾ ${t(state.settings.lang, 'moonAchievement')}: ${title}`, state.settings.lang);
        audio.play('milestone');
        break;
      }
      default:
        break;
    }
  });
}

function renderDynamic() {
  V.renderResources(state);
  V.renderLanterns(state);
  V.renderRoom(state);
  V.renderRooms(state);
  V.renderReader(state);
  V.renderAmbient(state);
  V.renderProgress(state);
  V.renderRareList(state);
  V.renderLetters(state);
  V.renderMoon(state);
  V.renderAlmanac(state);
  V.renderRoomDesc(state);
  V.setCatAreaLabel(state);
}

function renderAll() {
  renderDynamic();
  V.renderMilestones(state);
  V.renderUnlocks(state);
  V.renderStats(state);
  V.renderAlmanac(state);
  V.renderModList(state);
  V.renderTutorial(state);
  V.renderPanels(state);
  refreshBanners();
}

// ---- Persistenza ----
function save() {
  state.lastSave = Date.now();
  const ok = S.save(state);
  if (!ok) {
    // Fallback automatico IndexedDB (quota localStorage piena)
    S.saveIdb(state).then((idbOk) => {
      const lang = state.settings.lang;
      V.showToast(
        idbOk ? t(lang, 'idbSaved') : t(lang, 'saveFailed'),
        lang,
      );
    });
    return true; // best-effort: IDB in corso
  }
  if (state.settings.archiveIdb) S.hydrateLetters(state);
  return true;
}

// ---- Azioni di gioco (una per gesto) ----
function actLantern(i) {
  const r = M.lightLantern(state, i, Date.now());
  if (!r.ok) return;
  audio.play('lantern');
  haptic(15);
  if (r.bonus) V.showToast('🐱 +1 ' + (state.settings.lang === 'it' ? 'Luce (gatto)' : 'Light (cat)'), state.settings.lang);
  if (r.milestone) milestoneFx(r.milestone);
  afterAction();
}

function actShelve() {
  const r = M.shelveBook(state, Date.now());
  if (!r.ok) {
    V.showToast(state.settings.lang === 'it' ? 'Nessun libro sul tavolo.' : 'No books on the table.', state.settings.lang);
    return;
  }
  audio.play('shelve');
  haptic(12);
  if (r.bonus) V.showToast('🐱 +' + r.ink + ' ' + (state.settings.lang === 'it' ? 'Inchiostro (gatto)' : 'Ink (cat)'), state.settings.lang);
  afterAction();
}

function actTea() {
  const r = M.brewTea(state, Date.now());
  audio.play('tea');
  haptic(18);
  V.showToast(`+${r.gain} ` + (state.settings.lang === 'it' ? 'Calma' : 'Calm'), state.settings.lang);
  afterAction();
}

function actReader() {
  const r = M.serveReader(state, Date.now());
  if (!r.ok) {
    if (r.reason === 'calma') V.showToast(t(state.settings.lang, 'needCalma'), state.settings.lang);
    else V.showToast(state.settings.lang === 'it' ? 'Nessun lettore in attesa.' : 'No reader waiting.', state.settings.lang);
    return;
  }
  audio.play('reader');
  haptic(25);
  if (r.found) {
    V.showToast(
      `${state.settings.lang === 'it' ? 'Nuovo volume!' : 'New volume!'} ${(r.found[state.settings.lang] || r.found.it).title}`,
      state.settings.lang,
    );
    audio.play('catalog');
  }
  if (r.milestone) milestoneFx(r.milestone);
  if (r.unlockWellRoom) {
    V.showToast(state.settings.lang === 'it' ? 'Sbloccato: Sala del Pozzo.' : 'Unlocked: Well Room.', state.settings.lang);
  }
  afterAction();
}

function actReaderChoice(choiceId) {
  const r = M.answerReaderDialogue(state, choiceId, Date.now());
  if (!r.ok) return;
  audio.play('click');
  haptic(10);
  if (r.reply) V.showToast(r.reply, state.settings.lang);
  afterAction();
}

function actCatalog(id) {
  const r = M.catalogRare(state, id, Date.now());
  if (!r.ok) {
    const msgs = {
      ink: state.settings.lang === 'it' ? 'Ti servono 3 Inchiostri.' : 'You need 3 Ink.',
      locked: state.settings.lang === 'it' ? 'Sblocca prima lo Scaffale delle Curiosità.' : 'Unlock the Curiosity Shelf first.',
      notFound: state.settings.lang === 'it' ? 'Non ancora scoperto.' : 'Not discovered yet.',
      done: state.settings.lang === 'it' ? 'Già catalogato.' : 'Already catalogued.',
    };
    V.showToast(msgs[r.reason] || '', state.settings.lang);
    return;
  }
  audio.play('catalog');
  haptic(30);
  if (r.milestone) milestoneFx(r.milestone);
  afterAction();
}

function actFallen() {
  const r = M.collectFallenBook(state, Date.now());
  if (!r.ok) return;
  audio.play('shelve');
  haptic(20);
  V.showToast(`+${r.ink} ` + (state.settings.lang === 'it' ? 'Inchiostro' : 'Ink'), state.settings.lang);
  if (r.bonus) V.showToast('🐱 +1 🐾', state.settings.lang);
  afterAction();
}

function actDismissEvent() {
  const hadRain = state.event?.type === 'rain';
  M.dismissEvent(state, Date.now());
  if (hadRain) V.showToast('+1 ' + (state.settings.lang === 'it' ? 'Calma' : 'Calm'), state.settings.lang);
  audio.play('click');
  afterAction();
}

function actSwitchRoom(roomId) {
  const r = M.switchRoom(state, roomId);
  if (!r.ok) {
    V.showToast(t(state.settings.lang, 'roomLocked'), state.settings.lang);
    return;
  }
  if (r.noop) return;
  audio.play('click');
  haptic(10);
  afterAction();
}

function actSortArchive() {
  const r = M.sortArchive(state, Date.now());
  if (!r.ok) {
    V.showToast(t(state.settings.lang, r.reason === 'cooldown' ? 'cooldown' : 'wrongRoom'), state.settings.lang);
    return;
  }
  audio.play('shelve');
  haptic(14);
  if (r.bonus) V.showToast('🐱 +' + r.ink + ' ' + (state.settings.lang === 'it' ? 'Inchiostro (gatto)' : 'Ink (cat)'), state.settings.lang);
  else V.showToast(`+${r.ink} ` + (state.settings.lang === 'it' ? 'Inchiostro' : 'Ink'), state.settings.lang);
  afterAction();
}

function actTendPlants() {
  const r = M.tendPlants(state, Date.now());
  if (!r.ok) {
    V.showToast(t(state.settings.lang, r.reason === 'cooldown' ? 'cooldown' : 'wrongRoom'), state.settings.lang);
    return;
  }
  audio.play('tea');
  haptic(14);
  if (r.bonus) V.showToast('🐱 +' + r.calma + ' ' + (state.settings.lang === 'it' ? 'Calma (gatto)' : 'Calm (cat)'), state.settings.lang);
  else V.showToast(`+${r.calma} ` + (state.settings.lang === 'it' ? 'Calma' : 'Calm'), state.settings.lang);
  afterAction();
}

function afterAction() {
  save();
  renderAll();
}

function milestoneFx(key) {
  audio.play('milestone');
  haptic([30, 40, 60]);
  const lang = state.settings.lang;
  const titleEl = document.getElementById('milestoneTitle');
  const descEl = document.getElementById('milestoneDesc');
  const labels = {
    firstLight: { it: ['Prima Luce', 'Quattro lanterne accese insieme.'], en: ['First Light', 'Four lanterns lit at once.'] },
    firstGuest: { it: ['Primo Ospite', 'Il primo lettore è stato accolto.'], en: ['First Guest', 'The first reader was welcomed.'] },
    dawn: { it: ['Alba', 'Tutti i volumi rari sono in catalogo.'], en: ['Dawn', 'Every rare volume is catalogued.'] },
  };
  const pair = labels[key] || labels.firstLight;
  const [title, desc] = pair[lang] || pair.it;
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
  V.togglePanelById('milestoneCard', true);
  if (state.milestones.dawn) V.togglePanelById('dawnCard', true);
  V.showToast('🏆 ' + (lang === 'it' ? 'Nuovo traguardo!' : 'New milestone!'), lang);
}

function haptic(pattern) {
  if (!state.settings.haptics) return;
  if (!navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch { /* non supportato */ }
}

// ---- Pannelli / conferme / settings ----
function togglePanel(which) {
  const help = V.getEl('helpPanel');
  const set = V.getEl('settingsPanel');
  if (!help || !set) return;
  const target = which === 'help' ? help : set;
  const other = which === 'help' ? set : help;
  const willOpen = target.hidden;
  other.hidden = true;
  if (!other.hidden) releaseFocus();
  target.hidden = !willOpen;
  if (willOpen) {
    trapFocus(target);
    const first = target.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (first) first.focus();
  } else {
    releaseFocus();
  }
  audio.play('click');
}

// B11: focus trap leggero per pannelli aperti
let trapped = null;
let trapHandler = null;
function trapFocus(container) {
  releaseFocus();
  trapped = container;
  trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const nodes = [...container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', trapHandler, true);
}
function releaseFocus() {
  if (trapHandler) document.removeEventListener('keydown', trapHandler, true);
  trapHandler = null;
  trapped = null;
}

function askReset() {
  const bar = V.getEl('confirmBar');
  const msg = V.getEl('confirmMsg');
  if (!bar) return;
  if (msg) msg.textContent = state.settings.lang === 'it' ? 'Cancellare il salvataggio e ricominciare?' : 'Delete the save and start again?';
  bar.hidden = false;
  V.getEl('confirmYes')?.focus();
}

function doReset() {
  const bar = V.getEl('confirmBar');
  if (bar) bar.hidden = true;
  S.clear();
  hasSave = false;
  state = defaultState();
  applySettings();
  renderAll();
  V.showWelcome(false);
  V.showToast(state.settings.lang === 'it' ? 'Nuova partita.' : 'New game.', state.settings.lang);
}

function cancelReset() {
  const bar = V.getEl('confirmBar');
  if (bar) bar.hidden = true;
  V.getEl('resetBtn')?.focus();
}

function toggleSetting(key) {
  state.settings[key] = !state.settings[key];
  applySettings();
  save();
  renderAll();
}

function applySettings() {
  document.documentElement.dataset.motion = state.settings.reducedMotion ? 'reduced' : 'full';
  document.documentElement.dataset.contrast = state.settings.highContrast ? 'high' : 'normal';
  audio.setMusic(state.settings.music && !document.hidden);
  audio.setSfx(state.settings.sfx);
  if (state.settings.wakeLock) requestWakeLock(); else releaseWakeLock();
  if (state.settings.parallax) enableParallax(); else disableParallax();
  applyVoiceSetting();
  // sync UI dei toggle
  syncToggles();
}

function syncToggles() {
  const map = {
    music: 'musicToggle', sfx: 'sfxToggle', reducedMotion: 'motionToggle',
    haptics: 'hapticsToggle', wakeLock: 'wakeToggle', parallax: 'parallaxToggle',
    archiveIdb: 'archiveIdbToggle', highContrast: 'highContrastToggle',
    voiceCommands: 'voiceToggle',
  };
  Object.entries(map).forEach(([key, id]) => {
    const input = document.getElementById(id);
    if (input) input.checked = Boolean(state.settings[key]);
  });
  const langBtn = V.getEl('langBtn');
  if (langBtn) langBtn.textContent = state.settings.lang === 'it' ? 'IT → EN' : 'EN → IT';
}

// ---- Wake Lock ----
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* rifiutato/unsupported */ }
}
function releaseWakeLock() {
  try { wakeLock?.release(); } catch { /* ok */ }
  wakeLock = null;
}

// ---- Parallasse finestra (Fase G3) ----
function enableParallax() {
  const target = V.getEl('parallaxWindow');
  if (!target || rafParallax) return;
  const onOrient = (e) => {
    const beta = (e.beta || 0) / 45;   // -1..1
    const gamma = (e.gamma || 0) / 45;
    if (rafParallax) return;
    rafParallax = requestAnimationFrame(() => {
      rafParallax = null;
      target.style.setProperty('--px', `${Math.max(-8, Math.min(8, gamma * 6)).toFixed(2)}px`);
      target.style.setProperty('--py', `${Math.max(-6, Math.min(6, beta * 4)).toFixed(2)}px`);
    });
  };
  const onPointer = (e) => {
    if (e.pointerType === 'touch') return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    target.style.setProperty('--px', `${(x * 5).toFixed(2)}px`);
    target.style.setProperty('--py', `${(y * 4).toFixed(2)}px`);
  };
  window.addEventListener('deviceorientation', onOrient);
  window.addEventListener('pointermove', onPointer);
  enableParallax._off = () => {
    window.removeEventListener('deviceorientation', onOrient);
    window.removeEventListener('pointermove', onPointer);
  };
}
function disableParallax() {
  if (enableParallax._off) { enableParallax._off(); enableParallax._off = null; }
  const target = V.getEl('parallaxWindow');
  if (target) { target.style.setProperty('--px', '0px'); target.style.setProperty('--py', '0px'); }
}

// ---- Lettere (paste / import testo) ----
async function pasteLetter() {
  try {
    const text = await navigator.clipboard.readText();
    const r = M.addLetter(state, text, Date.now());
    if (r.ok) {
      save();
      V.renderLetters(state);
      V.flashLetter();
      audio.play('letter');
      V.showToast('📩 ' + (state.settings.lang === 'it' ? 'Una lettera è scivolata sotto la porta…' : 'A letter slipped under the door…'), state.settings.lang);
    } else if (r.reason === 'empty') {
      V.showToast(state.settings.lang === 'it' ? 'Appunti vuoti.' : 'Clipboard empty.', state.settings.lang);
    }
  } catch {
    V.showToast(state.settings.lang === 'it' ? 'Permesso clipboard negato.' : 'Clipboard permission denied.', state.settings.lang);
  }
}

// ---- Fase 3 · Cartolina PNG + Web Share ----
async function shareCard() {
  const res = await sharePostcard(state, {
    phase: moonPhase(Date.now()),
    rareTotal: RARE_BOOKS.length,
    day: new Date().toISOString().slice(0, 10),
    url: window.location.origin + window.location.pathname,
    title: 'Lumina',
    text: t(state.settings.lang, 'promise'),
  });
  if (res.ok && res.method === 'share') {
    V.showToast(t(state.settings.lang, 'postcardShared'), state.settings.lang);
  } else if (res.ok) {
    V.showToast(t(state.settings.lang, 'postcardDownload'), state.settings.lang);
  } else if (res.cancelled) {
    /* utente ha annullato */
  } else {
    V.showToast(t(state.settings.lang, 'modInvalid'), state.settings.lang);
  }
  audio.play('click');
}

// ---- Fase 3 · Mods ----
async function loadModFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.luminapack,.json,application/zip,application/json';
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const result = await loadPack(file);
    if (!result.ok) {
      const key = result.error === 'tooLarge' ? 'modTooLarge' : 'modInvalid';
      V.showToast(t(state.settings.lang, key), state.settings.lang);
      return;
    }
    const added = addPack(result.pack);
    if (!added.ok) {
      V.showToast(t(state.settings.lang, 'modInvalid'), state.settings.lang);
      return;
    }
    if (state.activeMods.length < MAX_MODS && !state.activeMods.includes(result.pack.id)) {
      state.activeMods.push(result.pack.id);
    }
    applyModContent();
    save();
    renderAll();
    V.showToast(t(state.settings.lang, 'modLoaded', { name: result.pack.name }), state.settings.lang);
    audio.play('catalog');
  });
  input.click();
}

function applyModContent() {
  // Sovrapponi pack attivi al content corrente (senza eval).
  try {
    const packs = listPacks().filter((p) => (state.activeMods || []).includes(p.id));
    if (!packs.length) return;
    // content.js espone applyPacks tramite dynamic import leggera
    import('./model/content.js').then((C) => {
      const base = C.getContent();
      const merged = applyPacks(base, packs);
      C.__setContentForMods?.(merged);
      renderAll();
    }).catch(() => undefined);
  } catch { /* best-effort */ }
}

// ---- Fase 3 · Multiplayer (signaling manuale) ----
async function multiCreate() {
  if (!MP.isSupported()) {
    V.showToast(t(state.settings.lang, 'multiUnsupported'), state.settings.lang);
    return;
  }
  const r = await MP.createOffer();
  const ta = V.getEl('multiSignal');
  if (r.ok && ta) {
    ta.value = r.sdp;
    ta.select?.();
    try { await navigator.clipboard?.writeText(r.sdp); } catch { /* ok */ }
    V.showToast(t(state.settings.lang, 'multiCreate'), state.settings.lang);
  } else {
    V.showToast(t(state.settings.lang, 'multiBadCode'), state.settings.lang);
  }
}

async function multiAccept() {
  if (!MP.isSupported()) {
    V.showToast(t(state.settings.lang, 'multiUnsupported'), state.settings.lang);
    return;
  }
  const ta = V.getEl('multiSignal');
  const code = ta?.value || '';
  const r = await MP.acceptOffer(code);
  if (r.ok && ta) {
    ta.value = r.sdp;
    ta.select?.();
    try { await navigator.clipboard?.writeText(r.sdp); } catch { /* ok */ }
    V.showToast(t(state.settings.lang, 'multiAnswer'), state.settings.lang);
  } else {
    V.showToast(t(state.settings.lang, 'multiBadCode'), state.settings.lang);
  }
}

async function multiAnswer() {
  // Alias: genera answer da offer già incollato (stesso flusso di accept)
  await multiAccept();
}

async function multiConnect() {
  if (!MP.isSupported()) {
    V.showToast(t(state.settings.lang, 'multiUnsupported'), state.settings.lang);
    return;
  }
  const ta = V.getEl('multiSignal');
  const code = ta?.value || '';
  const r = await MP.acceptAnswer(code);
  if (r.ok) {
    V.showToast(t(state.settings.lang, 'multiConnected'), state.settings.lang);
  } else {
    V.showToast(t(state.settings.lang, 'multiBadCode'), state.settings.lang);
  }
}

function multiSendLetter() {
  const text = state.letters[state.letters.length - 1]?.text
    || t(state.settings.lang, 'promise');
  const okSend = MP.sendLetter(text);
  V.showToast(
    okSend ? t(state.settings.lang, 'multiSendLetter') : t(state.settings.lang, 'multiUnsupported'),
    state.settings.lang,
  );
}

function multiSendStatus() {
  const okSend = MP.sendStatus({
    room: state.room,
    readersServed: state.stats.readersServed,
    rares: state.raresCataloged,
    playtime: state.playtime,
    lang: state.settings.lang,
    name: state.peerName || 'guardian',
  });
  V.showToast(
    okSend ? t(state.settings.lang, 'multiSendStatus') : t(state.settings.lang, 'multiUnsupported'),
    state.settings.lang,
  );
}

// ---- Export / Import salvataggio ----
async function exportSave() {
  const date = new Date().toISOString().slice(0, 10);
  const res = await PWA.saveToFile(`lumina-save-${date}.json`, S.serialize(state));
  if (res.ok) {
    V.showToast(state.settings.lang === 'it' ? 'Salvataggio esportato.' : 'Save exported.', state.settings.lang);
    audio.play('click');
  }
}

async function importSave() {
  const res = await PWA.pickFile();
  if (!res.ok || res.cancelled) return;
  const parsed = S.parse(res.text);
  if (!parsed.ok) {
    V.showToast(t(state.settings.lang, 'importFail'), state.settings.lang);
    return;
  }
  // Mostra diff e chiedi conferma via editor pre-compilato
  openSaveEditor(res.text, parsed);
}

// ---- Editor salvataggio in-game + diff preview (Fase 1) ----
let pendingEditState = null;

function openSaveEditor(text, parsed = null) {
  const ta = V.getEl('saveEditorText');
  const diffEl = V.getEl('saveEditDiff');
  const status = V.getEl('saveEditStatus');
  const applyBtn = V.getEl('saveEditApply');
  pendingEditState = null;
  if (applyBtn) applyBtn.disabled = true;
  if (diffEl) { diffEl.hidden = true; diffEl.replaceChildren(); }
  if (status) status.textContent = '';
  if (ta) ta.value = text != null ? text : S.serialize(state);
  V.togglePanelById('saveEditorPanel', true);
  trapFocus(V.getEl('saveEditorPanel'));
  if (parsed) previewSaveEdit();
  ta?.focus();
  audio.play('click');
}

function previewSaveEdit() {
  const ta = V.getEl('saveEditorText');
  const status = V.getEl('saveEditStatus');
  const diffEl = V.getEl('saveEditDiff');
  const applyBtn = V.getEl('saveEditApply');
  const lang = state.settings.lang;
  if (!ta) return;
  const parsed = S.parse(ta.value);
  if (!parsed.ok) {
    pendingEditState = null;
    if (applyBtn) applyBtn.disabled = true;
    if (diffEl) { diffEl.hidden = true; diffEl.replaceChildren(); }
    if (status) status.textContent = t(lang, 'editSaveInvalid');
    return;
  }
  pendingEditState = parsed.state;
  const diff = S.diffStates(state, parsed.state);
  if (diffEl) {
    diffEl.replaceChildren(...diff.map((d) => {
      const li = document.createElement('li');
      const k = document.createElement('span');
      k.textContent = d.path;
      const v = document.createElement('b');
      v.textContent = `${fmtVal(d.from)} → ${fmtVal(d.to)}`;
      li.append(k, v);
      return li;
    }));
    diffEl.hidden = diff.length === 0;
  }
  if (status) {
    status.textContent = diff.length === 0
      ? t(lang, 'editSaveNoDiff')
      : t(lang, 'editSaveDiffReady');
  }
  if (applyBtn) applyBtn.disabled = false;
}

function fmtVal(v) {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === 'object') return '{…}';
  return String(v);
}

function applySaveEdit() {
  if (!pendingEditState) return;
  state = pendingEditState;
  pendingEditState = null;
  applySettings();
  save();
  renderAll();
  V.togglePanelById('saveEditorPanel', false);
  releaseFocus();
  V.showToast(t(state.settings.lang, 'importDone'), state.settings.lang);
  audio.play('milestone');
}

// ---- Bind eventi statici (una volta) ----
function bindStaticListeners() {
  // Delega click globale sulle zone d'azione
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  bindSwipe(V.getEl('tableArea'));

  document.getElementById('startBtn')?.addEventListener('click', () => {
    V.showGame();
    audio.play('click');
  });
  document.getElementById('newBtn')?.addEventListener('click', () => {
    // "Nuova partita" dalla welcome: apre il flusso di reset
    V.showGame();
    setTimeout(askReset, 300);
  });
  document.getElementById('navCollection')?.addEventListener('click', () => {
    V.togglePanelById('collectionPanel', true);
    trapFocus(V.getEl('collectionPanel'));
    V.getEl('collectionPanel')?.querySelector('button')?.focus();
    audio.play('click');
  });
  document.getElementById('helpBtn')?.addEventListener('click', () => togglePanel('help'));
  document.getElementById('settingsBtn')?.addEventListener('click', () => togglePanel('settings'));
  document.getElementById('helpClose')?.addEventListener('click', () => togglePanel('help'));
  document.getElementById('settingsClose')?.addEventListener('click', () => togglePanel('settings'));
  document.getElementById('resetBtn')?.addEventListener('click', askReset);
  document.getElementById('confirmYes')?.addEventListener('click', doReset);
  document.getElementById('confirmNo')?.addEventListener('click', cancelReset);
  document.getElementById('saveBtn')?.addEventListener('click', () => {
    if (save()) V.showToast(state.settings.lang === 'it' ? 'Salvato.' : 'Saved.', state.settings.lang);
  });
  document.getElementById('langBtn')?.addEventListener('click', () => {
    const idx = LANG_CYCLE.indexOf(state.settings.lang);
    state.settings.lang = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
    applySettings();
    save();
    renderAll();
  });
  document.getElementById('exportBtn')?.addEventListener('click', exportSave);
  document.getElementById('importBtn')?.addEventListener('click', importSave);
  document.getElementById('editSaveBtn')?.addEventListener('click', () => openSaveEditor(null));
  document.getElementById('saveEditPreview')?.addEventListener('click', previewSaveEdit);
  document.getElementById('saveEditApply')?.addEventListener('click', applySaveEdit);
  document.getElementById('pasteLetterBtn')?.addEventListener('click', pasteLetter);
  document.getElementById('shareCardBtn')?.addEventListener('click', shareCard);
  document.getElementById('reloadBtn')?.addEventListener('click', () => window.location.reload());
  document.getElementById('dawnOk')?.addEventListener('click', () => V.togglePanelById('dawnCard', false));
  document.getElementById('milestoneOk')?.addEventListener('click', () => V.togglePanelById('milestoneCard', false));

  ['musicToggle:music', 'sfxToggle:sfx', 'motionToggle:reducedMotion', 'hapticsToggle:haptics', 'wakeToggle:wakeLock', 'parallaxToggle:parallax', 'archiveIdbToggle:archiveIdb', 'highContrastToggle:highContrast', 'voiceToggle:voiceCommands']
    .forEach((pair) => {
      const [id, key] = pair.split(':');
      document.getElementById(id)?.addEventListener('change', () => toggleSetting(key));
    });

  // Fase 3 · Mods + Multiplayer
  document.getElementById('loadModBtn')?.addEventListener('click', loadModFile);
  document.getElementById('multiCreateBtn')?.addEventListener('click', multiCreate);
  document.getElementById('multiAcceptBtn')?.addEventListener('click', multiAccept);
  document.getElementById('multiAnswerBtn')?.addEventListener('click', multiAnswer);
  document.getElementById('multiConnectBtn')?.addEventListener('click', multiConnect);
  document.getElementById('multiSendLetterBtn')?.addEventListener('click', multiSendLetter);
  document.getElementById('multiSendStatusBtn')?.addEventListener('click', multiSendStatus);

  document.getElementById('tutSkip')?.addEventListener('click', () => {
    state.tutorialDone = true;
    state.tutorialStep = 4;
    save();
    V.renderTutorial(state);
  });

  document.getElementById('installBtn')?.addEventListener('click', async () => {
    const choice = await PWA.promptInstall();
    if (!choice && PWA.isIOS()) {
      V.getEl('iosInstall')?.removeAttribute('hidden');
    }
    refreshBanners();
  });
  document.getElementById('installDismiss')?.addEventListener('click', () => {
    const b = V.getEl('installBanner');
    if (b) b.hidden = true;
  });

  document.addEventListener('visibilitychange', () => {
    audio.handleVisibility(document.hidden);
    if (!document.hidden) {
      onTick();
      if (state.settings.wakeLock) requestWakeLock();
    }
  });

  window.addEventListener('beforeunload', () => { save(); });
  window.addEventListener('pagehide', () => { save(); });
}

function onClick(e) {
  const zone = e.target.closest?.('[data-action]');
  if (!zone) return;
  // B1: non propagare oltre (evita doppio trigger su container annidati)
  e.stopPropagation();
  const action = zone.dataset.action;
  switch (action) {
    case 'lantern': actLantern(Number(zone.dataset.index)); break;
    case 'shelve': actShelve(); break;
    case 'tea': actTea(); break;
    case 'reader': actReader(); break;
    case 'reader-choice': actReaderChoice(zone.dataset.id); break;
    case 'catalog': actCatalog(zone.dataset.id); break;
    case 'collect-fallen': actFallen(); break;
    case 'dismiss-event': actDismissEvent(); break;
    case 'switch-room': actSwitchRoom(zone.dataset.room); break;
    case 'sort-archive': actSortArchive(); break;
    case 'tend-plants': actTendPlants(); break;
    case 'close-panel': {
      const panelId = zone.dataset.panel;
      if (panelId === 'helpPanel' || panelId === 'settingsPanel') togglePanel(panelId === 'helpPanel' ? 'help' : 'settings');
      else { V.togglePanelById(panelId, false); releaseFocus(); }
      break;
    }
    case 'open-collection':
      V.togglePanelById('collectionPanel', true);
      trapFocus(V.getEl('collectionPanel'));
      break;
    case 'toggle-setting': toggleSetting(zone.dataset.key); break;
    default: break;
  }
}

function onKeydown(e) {
  // Ignora se sta scrivendo in un input/textarea
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

  if (e.key === 'Escape') {
    const help = V.getEl('helpPanel');
    const set = V.getEl('settingsPanel');
    const coll = V.getEl('collectionPanel');
    const editor = V.getEl('saveEditorPanel');
    const bar = V.getEl('confirmBar');
    if (bar && !bar.hidden) { cancelReset(); return; }
    if (editor && !editor.hidden) { V.togglePanelById('saveEditorPanel', false); releaseFocus(); return; }
    if (help && !help.hidden) { togglePanel('help'); return; }
    if (set && !set.hidden) { togglePanel('settings'); return; }
    if (coll && !coll.hidden) { V.togglePanelById('collectionPanel', false); releaseFocus(); return; }
  }

  if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
    e.preventDefault();
    togglePanel('help');
    return;
  }

  const k = e.key.toLowerCase();
  if (['1', '2', '3', '4'].includes(k)) {
    actLantern(Number(k) - 1);
    return;
  }
  switch (k) {
    case 't': actTea(); break;
    case 'r': actReader(); break;
    case 'f': actFallen(); break;
    case 'b': actShelve(); break;
    case 's': if (save()) V.showToast(state.settings.lang === 'it' ? 'Salvato.' : 'Saved.', state.settings.lang); break;
    default: break;
  }
}

// Swipe orizzontale sul tavolo → ripone un libro (mobile-first).
function bindSwipe(el) {
  if (!el) return;
  let startX = 0;
  let startY = 0;
  let tracking = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  el.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      e.preventDefault();
      actShelve();
    }
  });
  el.addEventListener('pointercancel', () => { tracking = false; });
}

// ---- Teardown completo (B6) ----
export function destroy() {
  destroyed = true;
  stopTimers();
  if (voiceStop) { voiceStop(); voiceStop = null; }
  MP.reset();
  if (unsubStorage) { unsubStorage(); unsubStorage = null; }
  releaseFocus();
  disableParallax();
  releaseWakeLock();
  V.destroy();
  window.removeEventListener('online', refreshBanners);
  window.removeEventListener('offline', refreshBanners);
  document.removeEventListener('lumina:installed', refreshBanners);
  // i listener delegati su document restano: rimuovibili esplicitamente
  document.removeEventListener('click', onClick);
  document.removeEventListener('keydown', onKeydown);
  updateWorker = null;
}

// Per i test: iniettare uno stato / forzare un re-render.
export function __setState(next) {
  state = next;
}
export function __render() {
  renderAll();
}
export { SAVE_KEY };

// Espone un piccolo hook per i test di integrazione (nessun effetto in produzione
// se non aggiungere una proprietà read-only su window).
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__lumina', {
    configurable: true,
    get() {
      return {
        get state() { return state; },
        render: __render,
        destroy,
        start,
      };
    },
  });
};
