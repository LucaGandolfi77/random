// ui/controller.js — eventi, orchestrazione, azioni. Non muta lo stato direttamente (delega al model).
import { CONFIG } from '../core/config.js';
import * as model from '../domain/model.js';
import * as stateCore from '../core/state.js';
import * as world from '../domain/world.js';
import { t, setLang, getLang } from '../core/i18n.js';
import { bus } from '../core/bus.js';
import {
  renderStart, render, renderTutorial, openPanel, closePanel, openModal, closeModal, showToast,
} from './view.js';
import { startAudio, setSound, setMusic, setVolume, playVote, playSuccess, playClick, playCollect, setMusicMode, speak } from '../services/audio.js';
import { initPwa, promptInstall } from '../services/pwa.js';
import { persistState, loadState, requestPersistent, exportSave, importFromFile } from '../services/storage.js';
import { shareProfile, PENDING_KEY } from '../services/share.js';
import { exportToFS, importFromFS } from '../services/backup.js';
import { ambientProfile, startAmbientListening, ambientProfileText, getSeason } from '../services/ambient.js';
import { isWebAuthnAvailable, registerProfilePin, verifyProfilePin, clearProfilePin, hasPin } from '../services/auth.js';
import { debounce, pick, qs, qsa, safeLocalStorage } from '../core/utils.js';
import { extractPalette } from './avatar.js';
import { avatarSVG } from './avatar.js';
import { haptic, HAPTICS, ritualAvailable, performRitual, generateDiary, oracleForUI } from '../features/index.js';
import { GESTURES } from '../domain/data/items.js';
import { ALL_ITEMS as ITEMS, OUTFIT_SLOTS } from '../domain/data/items.js';
import { UNLOCKABLES } from '../domain/data/unlockables.js';
import { ACHIEVEMENTS } from '../domain/data/achievements.js';
import { EVENTS, AMBIENT_MESSAGES } from '../domain/data/events.js';

let state = null;
let pinVerified = false;
let clockTimer = null;
let eventCooldown = 0;
let ambientMode = false;
let currentCallbacks = null;

// ─── bootstrap ─────────────────────────────────────────────

export async function boot() {
  initPwa();
  const pinRegistered = hasPin();
  if (pinRegistered) {
    const v = await verifyProfilePin();
    if (!v.ok) {
      openModal({ title: 'Profilo bloccato', body: 'Verifica biometrica richiesta per continuare.', buttons: [{ label: 'Riprova', action: 'retry' }, { label: t('cancel'), action: 'cancel' }] });
      window.__modalHandler = { retry: boot, cancel: () => {} };
      return;
    }
  }
  state = await loadState();
  await requestPersistent().catch(() => {});
  bindRefs(state);
  setupGlobalEvents();
  applyPendingShare();
  maybeSendDailyNotif();
  startAmbientListening();
  ambientProfile(state);
  if (pinRegistered) pinVerified = true;
  setupSaveLifecycle();
  renderStart(hasSave());
}

function hasSave() {
  try { return !!localStorage.getItem(stateCore.storageKey()); } catch { return false; }
}

function setupSaveLifecycle() {
  document.addEventListener('visibilitychange', () => {
    if (!state) return;
    if (document.hidden) {
      persistState(state);
      if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    } else {
      if (!clockTimer) startClock();
      if (state.soundOn) startAudio();
      world.tickTime(state);
      state.fame = model.computeFame(state);
      maybeSendDailyNotif();
      render(state, currentCallbacks);
    }
  });
}

function bindRefs(s) {
  s._citizensRef = world.CITIZENS;
  s._roomsRef = world.ROOMS;
  s.currentRoom = world.getRoom(s.roomId);
}

function startClock() {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    if (!state || document.hidden) return;
    world.tickTime(state);
    state.fame = model.computeFame(state);
    model.checkAchievements(state);
    bus.emit('time:change', state);
    persistState(state);
    refreshForTime(state);
  }, 60000);
}

function refreshForTime(state) {
  if (!currentCallbacks) return;
  const mode = state.riflesso >= state.fame * 30 ? 'autentico' : 'fama';
  setMusicMode(mode);
  render(state, currentCallbacks);
}

// ─── API per View ──────────────────────────────────
function api() {
  return {
    onMove, onGreet, onPose, onHelp, onCompliment,
    onDecorate: openDecorate, onOutfit: openOutfit, onInventory: openInventory, onAchievements: openAchievements,
    onShare: onShare, onMarket: openMarket,
  };
}

async function onMove(target) {
  const res = world.moveTo(state, target);
  if (res === 'locked') {
    openModal({ title: t('lockedRoom'), body: '', buttons: [{ label: t('ok') || 'OK', action: 'close' }] });
    window.__modalHandler = { close: closePanel };
    return;
  }
  if (!res) return;
  state.currentRoom = world.getRoom(target);
  maybeEvent();
  state.fame = model.computeFame(state);
  await saveNow();
  render(state, currentCallbacks);
}

function onGreet(id) {
  const c = state.citizens[id];
  if (!c) return;
  world.tickTime(state);
  if (state.soundOn) startAudio();
  const txt = (c.greet && c.greet.IT) || c.greet || '';
  showToast(txt);
  state.lastMsgText = txt;
  maybeLaugh(c);
  saveNow(); render(state, currentCallbacks);
}

function onPose(id) {
  const gesture = pick(GESTURES).id;
  const res = model.performGesture(state, state.roomId, gesture, id);
  if (state.soundOn) { playVote(); playSuccess(); }
  if (res.stars > 0) showToast(t('starsEarned').replace('{n}', res.stars));
  if (res.reflex > 0) showToast(t('reflectionEarned'));
  if (res.vibe < 0.3 && state.citizens[id].repetition > 3) showToast(t('repeatWarning'));
  else if (res.liked) showToast(t('voteNice').replace('{name}', res.citizen.nameIT));
  else showToast(t('voteMeh').replace('{name}', res.citizen.nameIT));
  state.lastMsgText = res.liked ? t('voteNice').replace('{name}', res.citizen.nameIT) : t('voteMeh').replace('{name}', res.citizen.nameIT);
  maybeEvent();
  checkProgression();
  saveNow(); render(state, currentCallbacks);
}

function onHelp(id) {
  const c = model.helpCitizen(state, id);
  if (state.soundOn) playSuccess();
  showToast(`${c.nameIT} — ${t('reflectionEarned')}`);
  state.lastMsgText = `${c.nameIT}: "Grazie per essere qui."`;
  checkProgression(); saveNow(); render(state, currentCallbacks);
}

function onCompliment(id) {
  const c = model.complimentCitizen(state, id);
  if (state.soundOn) playClick();
  showToast(`${c.nameIT} sorride.`);
  saveNow(); render(state, currentCallbacks);
}

async function onShare() {
  const res = await shareProfile(state);
  if (res.ok) showToast(t('shared'));
  else if (res.reason === 'unsupported') showToast(t('shareUnsupported') || 'Condivisione non disponibile.');
  else showToast(t('shareCancelled'));
}

function maybeLaugh(c) {
  if (state.riflesso > 20 && c.affinity >= 80) {
    setTimeout(() => showToast(`${c.nameIT}: "Mi piaci davvero."`), 1200);
  }
}

function maybeEvent() {
  eventCooldown--;
  if (eventCooldown > 0) return;
  if (Math.random() > 0.35) return;
  eventCooldown = 3;
  const ev = pick(EVENTS);
  const ctx = world.applyEvent(state, ev.id === 'meteora' ? 'meteor' : ev.id);
  if (ev.id === 'gossip') {
    state.lastMsgText = ctx.up ? 'Ona onda di gossip si moltiplicano i complimenti.' : 'I commenti si raffreddano.';
    showToast(t('eventGossip').replace('{text}', ctx.up ? 'li complimenti si moltiplicano' : 'i commenti si raffreddano'));
  } else if (ev.id === 'meteora' || ev.id === 'meteor') { showToast(t('eventMeteor')); }
  else if (ev.id === 'vip') { showToast(t('eventVIP')); }
  else if (ev.id === 'blackout') { showToast(t('eventBlackout')); }
  saveNow(); render(state, currentCallbacks);
}

function checkProgression() { model.checkAchievements(state); state.fame = model.computeFame(state); }

// ─── Salvataggio ───────────────────────────────────
function saveNow() {
  persistState(state);
  if (document.getElementById('toast') && !toastQuiet) showToast(t('saved'));
}
let toastQuiet = true;

// ─── Pannelli ──────────────────────────────────────
function tutCallbacks() {
  return {
    tutNext: () => { state._tutStep = (state._tutStep || 0) + 1; renderTutorial(state._tutStep, tutCallbacks()); },
    tutDone: () => { state.tutorialDone = true; state._tutStep = 0; saveNow(); render(state, currentCallbacks); },
  };
}

// Impostazioni
export function openSettings() {
  const langItems = [{ code: 'IT' }, { code: 'EN' }].map((l) =>
    `<button data-lang="${l.code}">${l.code}</button>`).join('');
  const body = `
    <div><h3>${t('language')}</h3><div class="lang-row">${langItems}</div></div>
    <div><h3>${t('sound')}</h3>
      <label><input type="checkbox" data-setting="sound" ${state.soundOn ? 'checked' : ''}> ${t('sound')}</label>
      <label><input type="checkbox" data-setting="music" ${state.musicOn ? 'checked' : ''}> ${t('music')}</label>
      <label>${t('volume')} <input type="range" min="0" max="1" step="0.05" value="${state.volume}" data-setting="volume"></label>
      <label><input type="checkbox" data-setting="ambient" ${ambientMode ? 'checked' : ''}> Modalità ambiente</label>
    </div>
    <div><h3>Notifiche</h3>
      <label><input type="checkbox" data-setting="notif" ${state.gentleNotif ? 'checked' : ''}> Notifiche gentili (max 1/giorno, opt-in)</label>
    </div>
    <div><h3>${t('profile') || 'Profilo'}</h3>
      <button data-action="pin-setup">${t('pinSetup')}</button>
    </div>
    <div><h3>${t('backup') || 'Backup'}</h3>
      <button data-export-fs>${t('exportSave') || 'Esporta salvataggio'} (File System)</button>
      <button data-import-fs>${t('importSave') || 'Importa salvataggio'} (File System)</button>
      <button data-export-share>${t('share')} (Share API)</button>
    </div>
    <div><input type="file" accept=".json" data-import></div>
  `;
  openPanel('settings', t('panelSettingsTitle'), body);
  qsa('[data-setting="sound"]').forEach((i) => i.onchange = () => { state.soundOn = i.checked; setSound(i.checked); persistState(state); });
  qsa('[data-setting="music"]').forEach((i) => i.onchange = () => { state.musicOn = i.checked; setMusic(i.checked); persistState(state); });
  qsa('[data-setting="volume"]').forEach((i) => i.oninput = () => { state.volume = parseFloat(i.value); setVolume(state.volume); persistState(state); });
  qsa('[data-setting="ambient"]').forEach((i) => i.onchange = () => { ambientMode = i.checked; persistState(state); showToast(ambientMode ? 'Modalità ambiente attiva' : 'Modalità ambiente disattiva'); });
  qsa('[data-setting="notif"]').forEach((i) => i.onchange = async () => {
    state.gentleNotif = i.checked;
    persistState(state);
    if (i.checked) {
      const r = await requestNotificationPermission();
      showToast(r === 'granted' ? t('notifOn') : `Notifiche: ${r}`);
    } else { showToast(t('notifOff')); }
  });
  qsa('[data-lang]').forEach((b) => b.onclick = () => { setLang(b.dataset.lang); persistState(state); render(state, currentCallbacks); });
  qsa('[data-export-fs]').forEach((b) => b.onclick = exportFS);
  qsa('[data-import-fs]').forEach((b) => b.onclick = importFS);
  qsa('[data-export-share]').forEach((b) => b.onclick = shareFromPanel);
  const fileInput = document.querySelector('[data-import]');
  if (fileInput) fileInput.onchange = importFile;
      qsa('[data-action="pin-setup"]').forEach((b) => b.onclick = pinSetup);
}

function pinSetup() {
  if (!hasPin()) {
    registerProfilePin().then((r) => {
      showToast(t('pinActive')); pinVerified = true; persistState(state); }
      else if (r.reason === 'unsupported' || r.reason === 'unavailable') showToast(t('pinUnavailable'));
      else showToast(t('cancelled'));
    });
  } else {
    openModal({ title: t('pinTitle'), body: t('pinBody'), buttons: [
      { label: t('remove') || 'Rimuovi', action: 'remove' }, { label: t('cancel'), action: 'cancel' },
    ] });
    window.__modalHandler = {
      remove: async () => { await clearProfilePin(); pinVerified = false; showToast(t('pinRemoved')); persistState(state); closeModal(); },
      cancel: closeModal,
    };
  }
}

async function exportFS() {
  const res = await exportToFS(state);
  showToast(res.ok ? `Salvato ${res.via}` : (res.reason === 'unsupported' ? t('fsUnavailable') : t('cancelled')));
}
async function importFS() {
  const res = await importFromFS();
  if (res.ok) { state = res.state; bindRefs(state); persistState(state); render(state, currentCallbacks); showToast(t('imported')); }
    else showToast(t('importFailed'));
}
async function shareFromPanel() {
  const res = await shareProfile(state);
  showToast(res.ok ? t('shared') : (res.reason === 'unsupported' ? t('shareUnsupported') : t('cancelled')));
}

function importFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  importFromFile(file).then((ok) => {
    if (ok) { loadState().then((s) => { state = s; bindRefs(s); persistState(s); render(state, currentCallbacks); showToast(t('saved')); }); }
    else showToast(t('importBadFile'));
  });
}

// ─── Specchio di Stellaria ──────────────────────────
export function openMirror() {
  const s = state;
  const fameStage = ['', 'Sparizione', 'Rumore', 'Voce', 'Eco', 'Riflesso', 'Specchio'][s.fame] || '';
  const showPct = Math.min(100, Math.round((s.riflesso / Math.max(1, s.fame * 40)) * 100));
  const mode = s.riflesso >= s.fame * 30 ? 'autentico' : 'fama';
  const modeLabel = mode === 'autentico'
    ? 'Stai scegliendo il silenzio dentro al rumore.'
    : 'Stai cercando l\'eco sotto l\'applauso.';
  const oracle = ambientProfileText(s) || '';
  const season = getSeason(s);
  const body = `
    <div class="mirror-portrait" aria-hidden="true">${avatarSVG(s, 140)}</div>
    <h3>${t('mirror') || 'Il tuo Specchio'}</h3>
    <div class="mirror-dual">
      <div><small>${t('fame')}</small><b>✧ ${s.fame}/6 — ${fameStage}</b></div>
      <div><small>${t('reflection')}</small><b>◈ ${s.riflesso}</b></div>
    </div>
    <div class="meter"><small>Riflesso / Fama</small>
      <div class="affinity"><span class="affinity-bar" style="width:${showPct}%"></span></div>
    </div>
    <p class="mirror-mode" data-mode="${mode}">${modeLabel}</p>
    <div class="mirror-season">${season.emoji} ${season.nameIT}</div>
    <blockquote class="mirror-oracle">✦ ${oracle}</blockquote>
    <div class="mirror-actions">
      <button data-mirror="decorate">${t('decorate')}</button>
      <button data-mirror="outfit">${t('outfit')}</button>
      <button data-mirror="close">${t('close')}</button>
    </div>
  `;
  openPanel('mirror', t('mirror') || 'Sala dei Riflessi', body);
  qsa('[data-mirror="decorate"]').forEach((b) => b.onclick = () => { closePanel(); openDecorate(); });
  qsa('[data-mirror="outfit"]').forEach((b) => b.onclick = () => { closePanel(); openOutfit(); });
  qsa('[data-mirror="close"]').forEach((b) => b.onclick = closePanel);
}

// ─── Mercato del Riflesso ───────────────────
export function openMarket() {
  const stock = model.marketStock(state);
  const owned = state.ownedOutfits || [];
  let body = `<h3>${t('marketTitle')}</h3>`;
  body += `<p class="market-date">✦ ${t('marketDate')}</p>`;
  body += `<p>${t('marketStock').replace('{n}', String(stock.length))}</p>`;
  for (const it of stock) {
    const p = model.priceOf(it, state);
    const isRare = it.requireRiflesso !== undefined;
    const currency = it.currency === 'riflesso' ? 'Riflesso' : 'Stelle';
    const ownedAlready = owned.includes(it.id);
    body += `<div class="shop-row">
      <div><b>${it.nameIT}</b> <small>${t('marketRare')} · ${currency}</small><br><small>${it.descIT || ''}</small></div>
      <button data-market-buy="${it.id}" ${ownedAlready ? 'disabled' : ''}>${ownedAlready ? t('marketOwned') : `${t('marketBuy')} ${p}${it.currency === 'riflesso' ? '◈' : '✧'}`}</button>
    </div>`;
  }
  openPanel('market', t('marketTitle'), body);
  qsa('[data-market-buy]').forEach((b) => {
    b.onclick = () => {
      const res = model.buyMarket(state, b.dataset.marketBuy);
      if (res.ok) {
        if (state.soundOn) playCollect();
        showToast(t('marketBought').replace('{name}', res.name));
        persistState(state);
        openMarket();
      } else if (res.reason === 'sold-out') showToast(t('marketSoldOut'));
      else if (res.reason === 'require-riflesso') showToast(t('marketRequireRefl'));
      else showToast(t('notEnough'));
    };
  });
}

// ─── Arreda ────────────────────────────────────────
function openDecorate() {
  const room = state.currentRoom || world.getRoom(state.roomId);
  const items = model.availableFurnitureFor(room.id);
  const owned = state.furniture[room.id] || [];
  let rows = items.map((it) => {
    const bought = owned.includes(it.id);
    return `<div class="shop-row ${bought ? 'done' : ''}">
      <div><b>${it.nameIT}</b><br><small>${t('tags')}: ${it.tags.join(', ')}</small></div>
      <button data-buy="${it.id}" ${bought ? 'disabled' : ''}>${bought ? t('equipped') : `${t('buy')} ${model.priceOf(it, state)}✧`}</button>
    </div>`;
  }).join('');
  const body = `
    <h3>${room.nameIT}</h3>
    <p class="room-desc">${room.descIT}</p>
    <div class="vibe-meter" aria-label="${t('vibe')}">${vibeMeterHTML(state, room.id)}</div>
    ${rows}
  `;
  openPanel('decorate', t('panelFurnitureTitle'), body);
  qsa('[data-buy]').forEach((b) => b.onclick = () => {
    const res = model.buy(state, b.dataset.buy);
    if (res.ok) { if (state.soundOn) playCollect(); showToast(t('shopItemBought').replace('{name}', res.name)); }
    else showToast(res.reason === 'already' ? t('equipped') : t('notEnough'));
    openDecorate();
  });
}

// ─── Outfit ────────────────────────────────────────
function openOutfit() {
  const slots = ['capelli', 'top', 'bottom', 'accessorio'];
  const slotLabels = { capelli: 'Capelli', top: 'Tuta', bottom: 'Basso', accessorio: 'Accessorio' };
  let body = '';
  for (const slot of slots) {
    const current = state.outfit[slot];
    const items = model.availableOutfitItems().filter((it) => it.slot === slot);
    body += `<div class="shop-block"><h3>${slotLabels[slot] || slot}</h3>`;
    body += `<div class="outfit-preview">${avatarSVG(state, 80)}</div>`;
    for (const it of items) {
      const eq = current === it.id;
      body += `<div class="shop-row ${eq ? 'done' : ''}">
        <div><b>${it.nameIT}</b></div>
        <button data-outfit="${slot}" data-item="${it.id}" ${eq ? 'disabled' : ''}>${eq ? t('equipped') : `${it.cost ? t('buy') + ' ' + model.priceOf(it, state) + '✧' : t('equip')}`}</button>
      </div>`;
    }
    body += '</div>';
  }
  openPanel('outfit', t('panelOutfitTitle'), body);
  qsa('[data-outfit]').forEach((b) => b.onclick = () => {
    const slot = b.dataset.outfit;
    const itemId = b.dataset.item;
    const it = model.availableOutfitItems().find((x) => x.id === itemId);
    if (!it) return;
    const alreadyOwned = (state.ownedOutfits || []).includes(itemId);
    if (!alreadyOwned) {
      const res = model.buy(state, itemId);
      if (!res.ok) { showToast(t('notEnough')); return; }
      state.ownedOutfits.push(itemId);
    }
    model.setOutfit(state, slot, itemId);
    if (state.soundOn) playClick();
    showToast(t('outfitBought').replace('{name}', it.nameIT));
    persistState(state);
    openOutfit();
  });
}

// ─── Inventario ────────────────────────────────────────
function openInventory() {
  const coll = state.collectibles || [];
  const upg = model.availableUpgrades(state);
  let body = `<h3>${t('collectibles') || 'Collezionabili'}</h3>`;
  body += `<div class="inv-grid">${coll.length ? coll.map((c) => `<div class="inv-item">${c}</div>`).join('') : '<em>Nessun collezionabile ancora.</em>'}</div>`;
  body += `<h3>${t('upgrades') || 'Miglioramenti'}</h3>`;
  body += upg.map((it) => `<div class="shop-row"><div><b>${it.nameIT}</b><br><small>Fama ${it.requireFame || '?'}</small></div><button data-buy="${it.id}">${t('buy')} ${model.priceOf(it, state)}✧</button></div>`).join('');
  openPanel('inventory', t('panelInventoryTitle'), body);
  qsa('[data-buy]').forEach((b) => b.onclick = () => {
    const res = model.buy(state, b.dataset.buy);
    if (res.ok) { if (state.soundOn) playCollect(); showToast(t('shopItemBought').replace('{name}', res.name)); }
    else showToast(res.reason === 'already' ? t('equipped') : t('notEnough'));
    openInventory();
  });
}

// ─── Traguardi ─────────────────────────────────────
function openAchievements() {
  const body = ACHIEVEMENTS.map((a) => {
    const got = state.achievements.includes(a.id);
    return `<div class="shop-row ${got ? 'done' : ''}"><div><b>${a.icon} ${a.nameIT}</b><br><small>${a.descIT}</small></div><span>${got ? '✓' : '?'}</span></div>`;
  }).join('');
  openPanel('achievements', t('panelAchievementsTitle'), body);
}

// ─── Eventi globali ────────────────────────────────
function setupGlobalEvents() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    switch (a.dataset.action) {
      case 'start-new': startNew(); break;
      case 'start-continue': if (state) { startAudio(0.2); render(state, currentCallbacks); } break;
      case 'howto': openHowTo(); break;
      case 'settings': openSettings(); break;
      case 'reset': openResetConfirm(); break;
      case 'share': onShare(); break;
      case 'mirror': openFeatures(); break;
    }
  });
  const installBtn = document.querySelector('[data-install]');
  if (installBtn) installBtn.onclick = () => { promptInstall(); };
  window.addEventListener('sw-updated', () => showToast(t('swUpdate')));
  window.addEventListener('appinstalled', () => showToast(t('installed')));
  window.addEventListener('storage:quota', () => { if (state) { persistState(state); showToast(t('storageQuota')); } });
  window.addEventListener('beforeunload', () => { if (state) persistState(state); });
  setupSwipe();
  setupViewDelegation();
  setupAvatarDrag();
}

function setupAvatarDrag() {
  const stage = document.getElementById('room-scene');
  if (!stage || !('PointerEvent' in window)) return;
  let dragging = false;
  let startClient = null;
  let startPos = null;
  let tokenEl = null;
  stage.addEventListener('pointerdown', (e) => {
    if (!state || !state.avatarPos) return;
    dragging = true;
    startClient = { x: e.clientX, y: e.clientY };
    startPos = { ...state.avatarPos };
    tokenEl = stage.querySelector('.avatar-token');
    try { stage.setPointerCapture(e.pointerId); } catch {}
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging || !tokenEl) return;
    const dx = (e.clientX - startClient.x) / window.innerWidth;
    const dy = (e.clientY - startClient.y) / window.innerHeight;
    const x = clamp(startPos.x + dx, 0.05, 0.95);
    const y = clamp(startPos.y + dy, 0.05, 0.9);
    tokenEl.style.left = `${x*100}%`;
    tokenEl.style.top = `${y*100}%`;
  });
  stage.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    if (tokenEl && state) {
      const nx = parseFloat(tokenEl.style.left) / 100;
      const ny = parseFloat(tokenEl.style.top) / 100;
      if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
        state.avatarPos.x = nx; state.avatarPos.y = ny;
      }
    }
    persistState(state);
    render(state, currentCallbacks);
  });
}

function setupViewDelegation() {
  const scene = document.getElementById('room-scene');
  if (scene) {
    scene.addEventListener('click', (e) => {
      if (!currentCallbacks) return;
      const card = e.target.closest('.npc-card');
      if (!card) return;
      const actBtn = e.target.closest('[data-act]');
      if (!actBtn) { currentCallbacks.onGreet(card.dataset.citizen); return; }
      const act = actBtn.dataset.act;
      const id = card.dataset.citizen;
      if (act === 'greet') currentCallbacks.onGreet(id);
      else if (act === 'pose') currentCallbacks.onPose(id);
      else if (act === 'help') currentCallbacks.onHelp(id);
      else if (act === 'compliment') currentCallbacks.onCompliment(id);
      else if (act === 'speak') {
        const c = state.citizens[id];
        if (c) speak(c.greet && c.greet.IT ? c.greet.IT : c.nameIT, getLang());
      }
    });
  }
  const exits = document.getElementById('exits');
  if (exits) {
    exits.addEventListener('click', (e) => {
      if (!currentCallbacks) return;
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      currentCallbacks.onMove(b.dataset.target);
    });
  }
  const actionBar = document.getElementById('action-bar');
  if (actionBar) {
    actionBar.addEventListener('click', (e) => {
      if (!currentCallbacks) return;
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'decorate') currentCallbacks.onDecorate();
      else if (b.dataset.act === 'outfit') currentCallbacks.onOutfit();
      else if (b.dataset.act === 'inventory') currentCallbacks.onInventory();
      else if (b.dataset.act === 'achievements') currentCallbacks.onAchievements();
      else if (b.dataset.act === 'market') openMarket();
    });
  }
  qsa('[data-action="mirror"]').forEach((b) => b.onclick = openFeatures);
}

function escapeAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function startNew() {
  state = model.defaultState();
  bindRefs(state);
  saveNow();
  renderTutorial(0, tutCallbacks());
  if (state.soundOn) startAudio(0.3);
}

function openHowTo() {
  openPanel('howto', t('panelHowToTitle'), `
    <ol>
      <li>${t('tutorial1')}</li>
      <li>${t('tutorial2')}</li>
      <li>${t('tutorial3')}</li>
      <li>${t('tutorial4')}</li>
    </ol>
  `);
}

function openResetConfirm() {
  openModal({ title: t('resetConfirm'), body: '', buttons: [
    { label: t('cancel'), action: 'close' }, { label: t('reset'), action: 'reset', cls: 'danger' },
  ] });
  window.__modalHandler = { close: closePanel, reset: resetGame };
}

async function resetGame() {
  if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  closeModal();
  await clearProfilePin();
  state = model.defaultState();
  bindRefs(state);
  saveNow();
  renderStart(hasSave());
  showToast(t('resetDone'));
}

async function applyPendingShare() {
  try {
    const pending = localStorage.getItem(PENDING_KEY);
    if (!pending) return;
    localStorage.removeItem(PENDING_KEY);
    if (state) { state.lastMsgText = `Messaggio condiviso: ${pending.slice(0, 80)}`; }
  } catch {}
}

async function maybeSendDailyNotif() {
  if (!state || !state.gentleNotif) return;
  const last = safeLocalStorage('get', 'stellaria-notif-last') || '';
  const today = new Date().toDateString();
  if (last === today) return;
  const ritual = ritualAvailable();
  if (!ritual.ok) return;
  const season = getSeason(state);
  const body = `${season.emoji} ${season.nameIT} — Il Cerchio della Sera è aperto.`;
  if (sendGentleNotification('Stellaria — Un nuovo giorno', body)) {
    safeLocalStorage('set', 'stellaria-notif-last', today);
  }
}

// ─── Feature panel ────────────────────
export function openFeatures() {
  const oracle = oracleForUI(state);
  const season = getSeason(state);
  const r = ritualAvailable();
  const diary = generateDiary(state);
  const body = `
    <h3>✦ Specchio</h3>
    <blockquote class="mirror-oracle">${oracle.line}</blockquote>
    <div class="season-badge" style="display:block;text-align:center;margin:6px 0">${season.emoji} ${season.nameIT}</div>
    <h3>Rituale</h3>
    <p>Il Cerchio della Sera: 30 secondi di quiete, +2 Riflesso.</p>
    <button data-ritual="${r.ok ? 'do' : 'wait'}" ${r.ok ? '' : 'disabled'}>${r.ok ? 'Gioca' : 'Riposa (1/giorno)'}</button>
    <h3>${t('diary') || 'Diario'}</h3>
    <textarea readonly rows="8" style="width:100%;background:var(--surface-2);color:var(--text);border-radius:var(--sr);padding:8px;font-size:0.75rem;font-family:monospace">${escapeAttr(diary)}</textarea>
    <button data-diary="copy">Copia</button>
    <button data-diary="export">Esporta</button>
    <h3>📷 ${t('mood') || 'Tema foto'}</h3>
    <p>Importa una foto: la palette influenza l'accento. Il contrasto è sempre garantito.</p>
    <input type="file" accept="image/*" data-mood-sync>
    <button data-mood="reset">Ripristina tema</button>
  `;
  openPanel('features', 'Sala dei Riflessi', body);
  qsa('[data-ritual]').forEach((b) => b.onclick = () => {
    if (b.dataset.ritual !== 'do') return;
    const res = performRitual(state);
    if (res.ok) { haptic(HAPTICS.ritual); showToast(`+2 Riflesso! (${res.riflesso})`); persistState(state); openFeatures(); }
    else showToast(t('restTomorrow'));
  });
  qsa('[data-diary="copy"]').forEach((b) => b.onclick = async () => {
    try { await navigator.clipboard.writeText(diary); showToast(t('copied')); } catch { showToast(t('copiedPanel')); }
  });
  qsa('[data-diary="export"]').forEach((b) => b.onclick = async () => {
    try {
      const blob = new Blob([diary], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `stellaria-diary-${new Date().toISOString().slice(0, 10)}.md`;
      a.click(); URL.revokeObjectURL(url);
      showToast(t('diaryExported'));
    } catch { showToast(t('exportFailed')); }
  });
  const moodInput = document.querySelector('[data-mood-sync]');
  if (moodInput) moodInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = new Image();
      img.onload = async () => {
        const palette = extractPalette(img, 5);
        if (!palette) { showToast(t('paletteFailed')); return; }
        const acc = ensureAccent(palette[0]);
        document.documentElement.style.setProperty('--accent', acc);
        document.documentElement.style.setProperty('--surface-2', palette[1] || '#3a2d63');
        state.mood = { palette, source: 'photo' };
        persistState(state);
        showToast(t('themeApplied'));
        openFeatures();
      };
      img.src = URL.createObjectURL(file);
    } catch { showToast(t('photoInvalid')); }
  };
  qsa('[data-mood="reset"]').forEach((b) => b.onclick = () => {
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--surface-2');
    state.mood = { palette: null, source: null };
    persistState(state);
    showToast(t('themeReset'));
    openFeatures();
  });
}

function ensureAccent(hex) {
  if (!hex) return '#f4c963';
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const lum = (r, g, b) => {
    const f = (v) => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b);
  };
  const r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255;
  if (lum(r,g,b) > 0.55) {
    const darken = (v, p) => Math.round((1-p) * v * 255).toString(16).padStart(2, '0');
    return '#' + darken(r, 0.35) + darken(g, 0.35) + darken(b, 0.35);
  }
  return hex;
}

// ─── Vibe Meter (helper) ────────────────────
export function vibeMeterHTML(st, roomId) {
  const tags = new Set();
  for (const slot of ['capelli', 'top', 'bottom', 'accessorio']) {
    const id = st.outfit[slot];
    const it = ITEMS.find((x) => x.id === id);
    if (it) for (const tg of it.tags) tags.add(tg);
  }
  const room = world.ROOMS.find((r) => r.id === roomId);
  if (room) for (const tg of room.decor) tags.add(tg);
  return `<small>${t('vibe') || 'Vibe'}</small>
    <div class="vibe-tags">${[...tags].slice(0, 8).map((tg) => `<span class="tag" style="background:#c8b6ff">${tg}</span>`).join('')}</div>`;
}
