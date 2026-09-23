import { t, setLang, getLang, publish } from './i18n.js';
import { $, $$, createEl, debounce } from './utils.js';
import { CONFIG, COMPONENTS, CHAPTERS, CHARACTERS, EVENTS, WEATHERS, AMBIENT_MESSAGES, PHASES } from './config.js';
import { getState, isUnlocked, isAllowed, runSimulation, runSandbox, placeComponent, removeComponent, clearBoard, completeChapter, setState } from './model.js';
import { evaluate, meetsGoal } from './sim.js';
import { prefersReducedMotion } from './utils.js';

const toastEl = () => $('#toast');
let toastTimer = null;
export function toast(msg) {
  const el = toastEl();
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

export function showScreen(id) {
  $$('main > .screen').forEach((s) => s.classList.add('hidden'));
  const target = $(`#screen-${id}`);
  if (target) target.classList.remove('hidden');
  const top = $('#topbar');
  if (top) top.classList.toggle('hidden', id === 'home');
  const t2 = $('#topbar-title');
  if (t2) t2.textContent = '';
  applyTopbar(id);
}

function applyTopbar(id) {
  const map = { home: 'home', howto: 'howto', settings: 'settings', inventory: 'inventory', achievements: 'achievements' };
  const key = map[id];
  if (key) { const h = $('#topbar-title'); if (h) h.textContent = t(key); }
}

export function setPhase(p) {
  const el = $('#home-phase'); if (el) el.textContent = (PHASES[p] || PHASES[0])[getLang() === 'EN' ? 'nameEN' : 'nameIT'];
  const hud = $('#hud-phase'); if (hud) hud.textContent = (PHASES[p] || PHASES[0])[getLang() === 'EN' ? 'nameEN' : 'nameIT'];
}

// ---------- Home ----------
export function renderHome() {
  const s = getState();
  const h2 = $('#home-title'); if (h2) h2.textContent = CONFIG.appNameIT;
  const tag = $('#home-tagline'); if (tag) tag.textContent = t('appTagline');
  const fr = $('#home-fragments'); if (fr) fr.textContent = `${t('fragment')}: ${s.fragments}`;
  const ph = $('#home-phase'); if (ph) ph.textContent = PHASES[0][getLang() === 'EN' ? 'nameEN' : 'nameIT'];
  const btnCont = $('#btn-continue');
  if (btnCont) btnCont.style.display = (localStorage.getItem(CONFIG.storageKey)) ? '' : 'none';
}

// ---------- Tutorial ----------
let tutorialStep = 0;
export function renderTutorial() {
  tutorialStep = 0;
  drawTutorial();
  $('#screen-tutorial') && showScreen('tutorial');
}
function drawTutorial() {
  const card = $('#tutorial-card'); if (!card) return;
  const step = CONFIG.TUTORIAL_STEPS[tutorialStep];
  card.innerHTML = '';
  const num = createEl('div', { class: 'tutorial-num' }); num.textContent = `${tutorialStep + 1}`;
  const h3 = createEl('h3'); h3.textContent = step[getLang() === 'EN' ? 'titleEN' : 'titleIT'];
  const p = createEl('p'); p.textContent = step[getLang() === 'EN' ? 'textEN' : 'textIT'];
  card.append(num, h3, p);
  const next = $('#btn-tut-next');
  if (next) next.textContent = tutorialStep === CONFIG.TUTORIAL_STEPS.length - 1 ? t('play') : t('next');
}
export function tutorialNext() {
  tutorialStep++;
  if (tutorialStep >= CONFIG.TUTORIAL_STEPS.length) {
    setState({ tutorialDone: true });
    toast(t('tutorialDone'));
    showGame(1);
  } else drawTutorial();
}

// ---------- Game ----------
export function showGame(chapterId) {
  showScreen('game');
  drawGame(chapterId);
}

let currentChapter = 1;
export function showGame2(chapterId) { currentChapter = chapterId; showGame(chapterId); }

function drawGame(chapterId) {
  currentChapter = chapterId;
  const s = getState();
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  if (!ch) return;
  const char = CHARACTERS[ch.character];
  const work = CONFIG.WORKLOADS[ch.workload];

  $('#hud-chapter').textContent = `${t('chapter')} ${ch.id}`;
  $('#hud-fragments').textContent = `${t('fragment')}: ${s.fragments}`;
  const wIdx = (ch.id - 1) % WEATHERS.length;
  $('#hud-weather').textContent = WEATHERS[wIdx][getLang() === 'EN' ? 'nameEN' : 'nameIT'];

  const bTitle = $('#brief-title');
  const charChip = $('#brief-character');
  const bText = $('#brief-text');
  const bGoal = $('#brief-goal');
  if (bTitle) bTitle.textContent = ch[getLang() === 'EN' ? 'titleEN' : 'titleIT'];
  if (charChip) charChip.textContent = char.emoji;
  if (bText) bText.textContent = ch[getLang() === 'EN' ? 'briefEN' : 'briefIT'];
  if (bGoal) bGoal.textContent = `${t('goal')} ${ch[getLang() === 'EN' ? 'goalTextEN' : 'goalTextIT']}`;

  renderPalette('#palette', chapterId);
  renderDie('#die', s.board || [], chapterId, handleRemoveFromDie);
  renderMetrics('#metrics-panel', null);
}

function handleRemoveFromDie(idx) { removeComponent(idx); drawGame(currentChapter); }

function renderPalette(sel, chapterId) {
  const root = $(sel); if (!root) return;
  root.innerHTML = '';
  const title = createEl('div', { class: 'palette-title' }); title.textContent = t('module');
  root.append(title);
  CONFIG.COMPONENTS.filter((c) => isUnlocked(c.kind) && isAllowed(c.kind, chapterId)).forEach((comp) => {
    const unlocked = isUnlocked(comp.kind);
    const div = createEl('div', { class: `mod${unlocked ? '' : ' locked'}`, draggable: unlocked, dataset: { compId: comp.id } });
    const g = createEl('div', { class: 'glyph' }); g.textContent = comp.icon;
    const n = createEl('div', { class: 'name' }); n.textContent = comp[getLang() === 'EN' ? 'nameEN' : 'nameIT'];
    div.append(g, n);
    if (unlocked) div.title = comp[getLang() === 'EN' ? 'descEN' : 'descIT'];
    root.append(div);
  });
}

function renderDie(sel, board, chapterId, onRemove) {
  const root = $(sel); if (!root) return;
  root.innerHTML = '';
  const max = Math.min(CONFIG.MAX_MODULES, chapterId + 3);
  for (let i = 0; i < max; i++) {
    const comp = board[i];
    const slot = createEl('div', { class: `slot${comp ? ' filled' : ''}`, dataset: { slot: String(i) } });
    if (comp) {
      const g = createEl('span', { class: 's-glyph' }); g.textContent = comp.icon;
      const n = createEl('span', { class: 's-name' }); n.textContent = comp[getLang() === 'EN' ? 'nameEN' : 'nameIT'];
      const x = createEl('button', { class: 'remove', 'aria-label': 'Rimuovi' }); x.textContent = '×';
      x.addEventListener('click', () => onRemove(i));
      slot.append(g, n, x);
    } else {
      slot.textContent = t('addModule');
    }
    root.append(slot);
  }
}

function renderMetrics(sel, metrics) {
  const root = $(sel); if (!root) return;
  root.innerHTML = '';
  if (!metrics) {
    const empty = createEl('div', { class: 'metric' });
    const nm = createEl('div', { class: 'm-name' }); nm.textContent = t('signature');
    empty.append(nm);
    root.append(empty);
    return;
  }
  const fields = [
    { k: 'perf', name: t('performance') }, { k: 'latency', name: t('latency') },
    { k: 'power', name: t('power') }, { k: 'cost', name: t('cost') }, { k: 'balance', name: t('balance') },
  ];
  fields.forEach(({ k, name }) => {
    const m = createEl('div', { class: 'metric' });
    const nm = createEl('div', { class: 'm-name' }); nm.textContent = name;
    const v = createEl('div', { class: 'm-value' }); v.textContent = metrics[k];
    m.append(nm, v);
    root.append(m);
  });
  const bn = createEl('div', { class: 'metric' });
  const bnm = createEl('div', { class: 'm-name' }); bnm.textContent = t('bottleneck');
  const bv = createEl('div', { class: 'm-value' }); bv.textContent = metrics.bottleneck || 'none';
  bn.append(bnm, bv);
  root.append(bn);
}

export function setSlotByDrag(compId) {
  const board = [...(getState().board || [])];
  const idx = board.findIndex((c) => !c);
  if (idx < 0) { toast('Die pieno'); return; }
  placeComponent(idx, compId);
  drawGame(currentChapter);
}

export function finishChapter() {
  const s = getState();
  const { metrics } = runSimulation(currentChapter, s.board || []);
  const ch = CHAPTERS.find((c) => c.id === currentChapter);
  const ok = meetsGoal(metrics, (CONFIG.WORKLOADS[ch.workload] || {}).goal);
  renderMetrics('#metrics-panel', metrics);
  const result = completeChapter(currentChapter, ok);
  renderChapterEnd(currentChapter, metrics, ok, result);
}

// ---------- Sandbox ----------
export function showSandbox() {
  showScreen('sandbox');
  const sw = $('#sandbox-workload');
  if (sw) {
    sw.innerHTML = '';
    Object.values(CONFIG.WORKLOADS).forEach((w) => {
      const o = createEl('option', { value: w.id }); o.textContent = w[getLang() === 'EN' ? 'nameEN' : 'nameIT'];
      sw.append(o);
    });
  }
  const sb = $('#sandbox-budget'); if (sb) sb.value = CONFIG.BASE_POWER_BUDGET;
  renderPalette('#palette-sandbox', 8);
  renderDie('#die-sandbox', [], 8, () => {});
  renderMetrics('#metrics-panel-sandbox', null);
}

let sandboxBoard = [];
export function sandboxSetBoard(board) { sandboxBoard = board; }
export function sandboxRun() {
  const wid = $('#sandbox-workload') ? $('#sandbox-workload').value : 'serial_hello';
  const budget = parseInt($('#sandbox-budget') ? $('#sandbox-budget').value : '80', 10);
  const { metrics, workload } = runSandbox(wid, sandboxBoard, budget);
  renderMetrics('#metrics-panel-sandbox', metrics);
  setState({ sandboxRunCount: getState().sandboxRunCount + 1 });
  toast(metrics.bottleneck === 'none' ? t('finish') : metrics.bottleneck);
}

export function sandboxClear() { sandboxBoard = []; renderDie('#die-sandbox', [], 8, () => {}); renderMetrics('#metrics-panel-sandbox', null); }

// ---------- Inventory ----------
export function renderInventory() {
  const root = $('#inventory-grid'); if (!root) return;
  root.innerHTML = '';
  const owned = new Set(getState().sigilli);
  CONFIG.COMPONENTS.forEach((c) => {
    const isOwn = owned.has(c.id);
    const item = createEl('div', { class: `inv-item${isOwn ? ' owned' : ''}` });
    const g = createEl('div', { class: 'glyph' }); g.textContent = c.icon;
    const n = createEl('div', { class: 'name' }); n.textContent = c[getLang() === 'EN' ? 'nameEN' : 'nameIT'];
    item.append(g, n);
    root.append(item);
  });
  const h2 = $('#screen-inventory').querySelector('h2');
  if (h2) h2.textContent = t('inventory');
}

// ---------- Achievements ----------
export function renderAchievements() {
  const root = $('#achievements-list'); if (!root) return;
  root.innerHTML = '';
  const done = new Set(getState().achievements);
  CONFIG.ACHIEVEMENTS.forEach((a) => {
    const isDone = done.has(a.id);
    const item = createEl('div', { class: `ach${isDone ? ' done' : ''}` });
    const g = createEl('span', { class: 'glyph' }); g.textContent = isDone ? '✦' : '◇';
    const txt = createEl('div', { class: 'ach-text' });
    const strong = createEl('strong'); strong.textContent = a[getLang() === 'EN' ? 'nameEN' : 'nameIT'];
    const span = createEl('span'); span.textContent = a[getLang() === 'EN' ? 'descEN' : 'descIT'];
    txt.append(strong, span);
    item.append(g, txt);
    root.append(item);
  });
  const h2 = $('#screen-achievements').querySelector('h2');
  if (h2) h2.textContent = t('achievements');
}

// ---------- How to play ----------
export function renderHowTo() {
  const root = $('#howto-content'); if (!root) return;
  root.innerHTML = '';
  const chapters = [
    { t: t('tutorial'), list: [t('am1'), t('am2'), t('am3'), t('am4')] },
    { t: t('chapter') + ' 1', list: ['Amdahl: speedup = 1 / ((1 - p) + p / N)'] },
    { t: 'Cache', list: ['Hit rate ~ cache capacity / working set'] },
    { t: 'Banda', list: ['effective bandwidth = min(RAM, NoC)'] },
    { t: 'Potenza', list: ['P ~ C × V² × f — alza frequenza, sale consumo'] },
    { t: 'Bottleneck', list: ['il collo di bottiglia cambia con ogni combinazione'] },
  ];
  chapters.forEach((s) => {
    root.append(createEl('h3')).textContent = s.t;
    s.list.forEach((li) => { const p = createEl('p'); p.textContent = li; root.append(p); });
  });
}

// ---------- Settings ----------
export function applySettingsUI() {
  const s = getState();
  setLang(s.lang);
  const it = $('#lang-it'), en = $('#lang-en');
  if (it) it.classList.toggle('active', s.lang === 'IT');
  if (en) en.classList.toggle('active', s.lang === 'EN');
  const son = $('#snd-on'), soff = $('#snd-off');
  if (son) son.classList.toggle('active', s.audioOn);
  if (soff) soff.classList.toggle('active', !s.audioOn);
  const mon = $('#mus-on'), moff = $('#mus-off');
  if (mon) mon.classList.toggle('active', s.musicOn);
  if (moff) moff.classList.toggle('active', !s.musicOn);
  const vol = $('#volume-slider'); if (vol) vol.value = Math.round((s.volume || 0.6) * 100);
  publish();
}

export function setLangUI(lang) {
  setState({ lang });
  saveNow();
  publish();
}
export function setAudio(on) { setState({ audioOn: on }); }
export function setMusic(on) { setState({ musicOn: on }); }
export function setVolume(v) { setState({ volume: v }); }

export function resetConfirmModal(open) {
  const m = $('#reset-modal');
  if (m) m.hidden = !open;
  if (open) {
    $('#reset-modal-title').textContent = t('resetConfirm');
    $('#reset-modal-text').textContent = t('resetConfirm');
    const cancelBtn = $('#btn-reset-cancel');
    if (cancelBtn) cancelBtn.focus();
  }
}

export function confirmModal(title, text, okLabel, onOk) {
  const m = $('#confirm-modal');
  m.hidden = false;
  const card = m.querySelector('.modal-card');
  const h = card.querySelector('h3'); h.textContent = title;
  const p = card.querySelector('p'); p.textContent = text;
  const ok = card.querySelector('#confirm-ok'); ok.textContent = okLabel;
  ok.onclick = () => { m.hidden = true; onOk(); };
  $('#confirm-cancel').onclick = () => { m.hidden = true; };
  $('#confirm-cancel').focus();
}
