import { t, getLang, publish } from './i18n.js';
import { $, $$, createEl, debounce, prefersReducedMotion } from './utils.js';
import { COMPONENTS, CHAPTERS, CONFIG } from './config.js';
import { getState, setState, placeComponent, removeComponent, clearBoard, reset as resetState, runSimulation, runSandbox, completeChapter } from './model.js';
import { loadState, persistState, exportSave, importFromFile } from './services/storage.js';
import * as view from './view.js';
import { playTone, stopAll, setupAudio, unlockAudio, setSound, setMusic, setVolume as setAudioVolume } from './services/audio.js';
import { registerPWA, promptInstall, showInstallBanner } from './services/pwa.js';

function vibrate(pattern) {
  if (navigator.vibrate) try { navigator.vibrate(pattern); } catch { /* not supported */ }
}

let tutorialStep = 0;
let ambientTimer = null;
let currentChapter = 1;
let sandboxBoard = [];

export function init() {
  const s = getState();
  view.renderHome();
  if (localStorage.getItem(CONFIG.storageKey)) {
    const btn = $('#btn-continue'); if (btn) btn.style.display = '';
  }
  registerPWA();
  setupAudio(getState());
  if (getState().musicOn) { setMusic(true); playTone(523, 0.1); }
  bindAll();
  setupDropTargets();
  window.addEventListener('keydown', onKey);
}

function saveNow() { persistState(getState()); }
const saveLater = debounce(saveNow, 250);

function bindAll() {
  $('#btn-start').addEventListener('click', onStart);
  $('#btn-continue').addEventListener('click', onContinue);
  $('#btn-howto-home').addEventListener('click', () => { view.showScreen('howto'); view.renderHowTo(); });
  $('#btn-home').addEventListener('click', onHome);
  $('#btn-settings-top').addEventListener('click', () => view.showScreen('settings'));
  $('#btn-tut-skip').addEventListener('click', onTutorialSkip);
  $('#btn-tut-next').addEventListener('click', onTutorialNext);
  $('#btn-finish').addEventListener('click', onFinish);
  $('#btn-clear').addEventListener('click', onClear);
  $('#btn-end-next').addEventListener('click', onEndNext);
  $('#btn-end-home').addEventListener('click', onHome);
  $('#btn-howto-close').addEventListener('click', onHome);
  const shareBtn = $('#btn-share'); if (shareBtn) shareBtn.addEventListener('click', onShare);
  $('#btn-reset-confirm').addEventListener('click', () => view.resetConfirmModal(true));
  $('#btn-reset-cancel').addEventListener('click', () => view.resetConfirmModal(false));
  $('#btn-reset-confirm2').addEventListener('click', onReset);
  $('#btn-back-settings').addEventListener('click', onHome);
  $('#btn-export').addEventListener('click', onExport);
  $('#btn-import').addEventListener('click', () => $('#file-import').click());
  $('#file-import').addEventListener('change', onImport);
  $('#lang-it').addEventListener('click', () => view.setLangUI('IT'));
  $('#lang-en').addEventListener('click', () => view.setLangUI('EN'));
  $('#snd-on').addEventListener('click', () => { setSound(true); playTone(440, 0.05); persistState(); });
  $('#snd-off').addEventListener('click', () => { setSound(false); stopAll(); persistState(); });
  $('#mus-on').addEventListener('click', () => { setMusic(true); playTone(523, 0.1); persistState(); });
  $('#mus-off').addEventListener('click', () => { setMusic(false); stopAll(); persistState(); });
  $('#volume-slider').addEventListener('input', debounce((e) => { setAudioVolume(parseInt(e.target.value, 10) / 100); persistState(); }, 200));
  $('#btn-install').addEventListener('click', async () => { await promptInstall(); $('#install-banner').hidden = true; });
  $('#confirm-cancel').addEventListener('click', () => { $('#confirm-modal').hidden = true; });
  $('#btn-sandbox-run').addEventListener('click', onSandboxRun);
  $('#sandbox-workload').addEventListener('change', onSandboxRun);
  $('#sandbox-budget').addEventListener('input', debounce(onSandboxRun, 200));
  bindPalette('#palette', addModuleToBoard);
  bindPalette('#palette-sandbox', addModuleToSandbox);
}

function unlockAnd(fn) { if (!window.__audio && window.AudioContext) window.__audio = new (window.AudioContext)(); fn(); }

function onStart() { const s = getState(); s.tutorialDone ? view.showGame(1) : view.renderTutorial(); }
function onContinue() { view.showGame(getState().chapter || 1); }
function onHome() { stopAmbient(); view.showScreen('home'); view.renderHome(); }
function onTutorialSkip() { setState({ tutorialDone: true }); saveNow(); view.showGame(1); }
function onTutorialNext() { view.tutorialNext(); }
function onFinish() { view.finishChapter(); playTone(880, 0.08); vibrate([30, 50, 30]); saveNow(); }
function onShare() {
  const s = getState();
  const { metrics } = runSimulation(currentChapter, s.board || []);
  const text = `SoC Atelier — My crystal: ${metrics.perf} perf, ${metrics.power}W, ${metrics.balance} balance (${metrics.bottleneck})`;
  if (navigator.share) { navigator.share({ title: 'SoC Atelier', text }).catch(() => {}); }
  else { view.toast(text); }
}
function onEndNext() { const s = getState(); s.chapter >= 8 ? view.showSandbox() : view.showGame(s.chapter + 1); }
function onClear() { clearBoard(); sandboxBoard = []; refreshBoard(); }
function onReset() { view.resetConfirmModal(false); stopAmbient(); resetState(); saveNow(); view.showScreen('home'); view.renderHome(); view.toast(t('resetDone')); }
function onExport() { const d = exportSave(); if (!d) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([d], { type: 'application/json' })); a.download = 'soc-atelier.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); view.toast(t('exportDone')); }
async function onImport(e) { const f = e.target.files[0]; if (!f) return; const ok = await importFromFile(f); view.toast(ok ? t('importDone') : t('importFail')); if (ok) { loadState().then((s) => { if (s) setState(s); refreshBoard(); }); } e.target.value = ''; }

function addModuleToBoard(id) { insertModule(id); vibrate(20); }
function addModuleToSandbox(id) { insertSandbox(id); vibrate(20); }

function insertModule(id) {
  const board = [...(getState().board || [])];
  const idx = board.findIndex((c) => !c);
  if (idx < 0) { view.toast('Die pieno'); return; }
  const r = placeComponent(idx, id);
  if (r.ok) { playTone(660, 0.04); refreshBoard(); saveLater(); }
  else view.toast('Non posso inserirlo qui');
}
function insertSandbox(id) {
  if (sandboxBoard.length >= CONFIG.MAX_MODULES) { view.toast('Sandbox pieno'); return; }
  sandboxBoard.push(id); refreshSandbox(); onSandboxRun();
}

function refreshBoard() {
  view.renderDie('#die', getState().board, currentChapter, (idx) => { removeComponent(idx); refreshBoard(); });
  const { metrics } = runSimulation(currentChapter, getState().board || []);
  view.renderMetrics('#metrics-panel', metrics);
}
function refreshSandbox() {
  view.sandboxSetBoard(sandboxBoard);
  const root = $('#die-sandbox');
  root.innerHTML = '';
  sandboxBoard.forEach((id) => {
    const c = COMPONENTS.find((x) => x.id === id); if (!c) return;
    const slot = view.createEl('div', { class: 'slot filled' });
    slot.append(view.createEl('span', { class: 's-glyph' }), view.createEl('span', { class: 's-name' }));
    slot.querySelector('.s-glyph').textContent = c.icon;
    slot.querySelector('.s-name').textContent = c[getLang() === 'EN' ? 'nameEN' : 'nameIT'];
    root.append(slot);
  });
  onSandboxRun();
}

function onSandboxRun() {
  const wid = $('#sandbox-workload').value;
  const budget = parseInt($('#sandbox-budget').value || '80', 10);
  const board = sandboxBoard.map((id) => COMPONENTS.find((c) => c.id === id)).filter(Boolean);
  const { metrics } = runSandbox(wid, board, budget);
  view.renderMetrics('#metrics-panel-sandbox', metrics);
  saveNow();
  if (metrics.bottleneck !== 'none') view.toast(metrics.bottleneck);
}

function onKey(e) {
  if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes((document.activeElement || {}).tagName)) return;
  if (e.key === 'Escape') {
    if (!$('#reset-modal').hidden) view.resetConfirmModal(false);
    if (!$('#confirm-modal').hidden) $('#confirm-modal').hidden = true;
  }
  if (e.key === ' ' && !$('#screen-game').classList.contains('hidden')) { e.preventDefault(); onFinish(); }
}

function bindPalette(sel, onTap) {
  const root = $(sel);
  root.addEventListener('dragstart', (e) => { const m = e.target.closest('.mod'); if (!m) return; e.dataTransfer.setData('text/plain', m.dataset.compId); m.classList.add('dragging'); });
  root.addEventListener('dragend', (e) => { const m = e.target.closest('.mod'); if (m) m.classList.remove('dragging'); });
  root.addEventListener('click', (e) => { const m = e.target.closest('.mod'); if (!m || m.classList.contains('locked')) return; onTap(m.dataset.compId); });
}

function setupDropTargets() {
  for (const sel of ['#die', '#die-sandbox']) {
    const root = $(sel);
    root.addEventListener('dragover', (e) => { e.preventDefault(); root.classList.add('drop-target'); });
    root.addEventListener('dragleave', () => root.classList.remove('drop-target'));
    root.addEventListener('drop', (e) => {
      e.preventDefault(); root.classList.remove('drop-target');
      const id = e.dataTransfer.getData('text/plain'); if (!id) return;
      if (sel === '#die') insertModule(id); else insertSandbox(id);
    });
  }
}

function startAmbient() {
  if (ambientTimer) return;
  stopAll();
  ambientTimer = setInterval(() => { if (Math.random() < 0.25) playTone([220, 330, 440][Math.floor(Math.random() * 3)], 0.03); }, 4000);
}
function stopAmbient() { if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; } stopAll(); }

export function boot() { loadState().then((s) => { if (s) setState(s); view.renderHome(); init(); }); }
