// View · Rendering puro: legge lo stato e aggiorna il DOM. Nessuna regola di gioco,
// nessuna scrittura nello stato (riceve snapshot già calcolati o stati in sola lettura).

import { MAX, CATALOG_COST } from './config.js';
import { STR, MOON_NAMES, t } from './i18n.js';
import { MILESTONES, UNLOCKS, RARE_BOOKS, TUTORIAL_STEPS, MESSAGES, ROOMS, READERS, MOON_ACHIEVEMENTS } from './model/data.js';
import { moonPhase, moonPhaseId, isRoomUnlocked } from './model/state.js';
import { describeRoom } from './services/a11y.js';
import { listPacks } from './services/mods.js';

const els = {};
const TIMERS = new Map(); // timer da pulire in destroy()

function $(id) { return document.getElementById(id); }

// Cache degli elementi: chiamata una volta all'avvio.
export function cacheElements() {
  [
    'luce', 'calma', 'inchiostro', 'luceVal', 'calmaVal', 'inchiostroVal',
    'lanterns', 'tableArea', 'tableBooks', 'bookCount', 'kettle', 'shelves',
    'curiosityShelf', 'readerZone', 'reader', 'catArea', 'eventLayer', 'ambient',
    'milestones', 'unlocks', 'stats', 'progress', 'rareList', 'collectionCount',
    'tut', 'tutText', 'tutDots', 'tutSkip', 'helpBtn', 'helpPanel', 'settingsBtn',
    'settingsPanel', 'resetBtn', 'saveBtn', 'toast', 'offline', 'installBanner',
    'installBtn', 'installDismiss', 'iosInstall', 'langBtn', 'confirmBar',
    'confirmYes', 'confirmNo', 'confirmMsg', 'moon', 'moonName', 'lettersList',
    'lettersEmpty', 'exportBtn', 'importBtn', 'pasteLetterBtn', 'updateHint',
    'reloadBtn', 'parallaxWindow', 'room', 'helpPanelBody', 'catBtn',
    'catAreaName', 'shareHint', 'welcome', 'game', 'skylight', 'wellRoom', 'rain',
    'navCollection', 'collectionPanel', 'milestoneCard', 'dawnCard', 'announce',
    'roomNav', 'hallPanel', 'atticPanel', 'gardenPanel', 'archiveStats', 'gardenStats',
    'saveEditorPanel', 'saveEditorText', 'saveEditPreview', 'saveEditApply',
    'saveEditStatus', 'saveEditDiff', 'archiveIdbToggle', 'editSaveBtn',
    'readerCard', 'readerMeta', 'readerFav', 'readerChoices', 'readerReply',
    'weatherBadge', 'almanacList', 'roomDesc', 'shareCardBtn', 'modList',
    'loadModBtn', 'highContrastToggle', 'voiceToggle',
    'multiCreateBtn', 'multiAcceptBtn', 'multiAnswerBtn', 'multiConnectBtn',
    'multiSendLetterBtn', 'multiSendStatusBtn', 'multiSignal', 'multiStatus',
  ].forEach((id) => { els[id] = $(id); });
  return els;
}

export function getEl(name) { return els[name]; }

// ---- Risorse (progress + numeri) ----
export function renderResources(state) {
  setBar('luce', state.resources.luce, MAX.luce, t(state.settings.lang, 'luce'));
  setBar('calma', state.resources.calma, MAX.calma, t(state.settings.lang, 'calma'));
  setBar('inchiostro', state.resources.inchiostro, MAX.inchiostro, t(state.settings.lang, 'inchiostro'));
}

function setBar(key, val, max, label) {
  const bar = els[key];
  const num = els[`${key}Val`];
  if (!bar) return;
  const pct = Math.round((val / max) * 100);
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', String(Math.round(val)));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(max));
  bar.setAttribute('aria-label', label);
  bar.style.setProperty('--pct', String(pct));
  if (num) num.textContent = String(Math.round(val));
}

// ---- Lanterne ----
export function renderLanterns(state) {
  if (!els.lanterns) return;
  [...els.lanterns.children].forEach((node, i) => {
    const lit = Boolean(state.lanterns[i]);
    node.classList.toggle('lit', lit);
    node.setAttribute('aria-pressed', String(lit));
    node.setAttribute('aria-label', `${t(state.settings.lang, 'lanterns') || 'Lanterna'} ${i + 1}`);
  });
}

// ---- Stanze (Fase 1) ----
const ROOM_LABEL_KEYS = {
  hall: 'roomHall',
  attic: 'roomAttic',
  winterGarden: 'roomWinterGarden',
};

export function renderRooms(state) {
  const lang = state.settings.lang;
  if (els.room) els.room.dataset.room = state.room;

  // pannelli attività
  if (els.hallPanel) els.hallPanel.hidden = state.room !== 'hall';
  if (els.atticPanel) els.atticPanel.hidden = state.room !== 'attic';
  if (els.gardenPanel) els.gardenPanel.hidden = state.room !== 'winterGarden';
  const windowEl = els.parallaxWindow;
  if (windowEl) windowEl.hidden = state.room !== 'hall';

  if (els.roomNav) {
    els.roomNav.replaceChildren(...ROOMS.map((room) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `room-chip ${state.room === room.id ? 'on' : ''}`;
      btn.dataset.action = 'switch-room';
      btn.dataset.room = room.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(state.room === room.id));
      const unlocked = isRoomUnlocked(state, room.id);
      btn.disabled = !unlocked;
      btn.title = unlocked
        ? (room.name[lang] || room.name.it)
        : t(lang, 'roomLocked');
      btn.textContent = `${room.icon || '✦'} ${room.name[lang] || room.name.it}`;
      if (!unlocked) btn.classList.add('locked');
      return btn;
    }));
  }

  if (els.archiveStats) {
    els.archiveStats.textContent = `${t(lang, 'stats')}: ${state.stats.archiveSorted || 0}`;
  }
  if (els.gardenStats) {
    els.gardenStats.textContent = `${t(lang, 'stats')}: ${state.stats.plantsTended || 0}`;
  }
}

// ---- Tavolo / scaffali / evento / gatto ----
const TABLE_COLORS = ['#d99a7a', '#7fc7c1', '#b2a7f5', '#f0b96b', '#e29bb0', '#8fd6a8', '#5d6bd8', '#c9863f'];

export function renderRoom(state) {
  if (els.tableArea) {
    els.tableArea.setAttribute('data-books', String(state.booksOnTable));
    els.tableArea.classList.toggle('empty', state.booksOnTable === 0);
    const lang = state.settings.lang;
    els.tableArea.setAttribute(
      'aria-label',
      lang === 'it' ? `Tavolo: ${state.booksOnTable} libri — tocca o scorri per riporre` : `Table: ${state.booksOnTable} books — tap or swipe to shelve`,
    );
  }
  if (els.tableBooks) {
    els.tableBooks.replaceChildren(...Array.from({ length: state.booksOnTable }, (_, i) => {
      const b = document.createElement('span');
      b.className = 'table-book';
      b.style.setProperty('--c', TABLE_COLORS[i % TABLE_COLORS.length]);
      b.style.setProperty('--r', `${((i * 37) % 14) - 7}deg`);
      return b;
    }));
  }
  if (els.bookCount) {
    const lang = state.settings.lang;
    els.bookCount.textContent = lang === 'it'
      ? `${state.booksOnTable} sul tavolo`
      : `${state.booksOnTable} on the table`;
  }
  if (els.shelves) {
    els.shelves.setAttribute('data-count', String(state.booksShelved));
    const frag = document.createDocumentFragment();
    const n = Math.min(state.booksShelved, 40);
    for (let i = 0; i < n; i += 1) {
      const b = document.createElement('span');
      b.className = 'shelved-book';
      b.style.setProperty('--c', TABLE_COLORS[(i * 5 + 3) % TABLE_COLORS.length]);
      b.style.setProperty('--h', `${16 + ((i * 7) % 12)}px`);
      frag.appendChild(b);
    }
    els.shelves.replaceChildren(frag);
  }
  if (els.curiosityShelf) {
    els.curiosityShelf.hidden = !state.unlocks.curiosityShelf;
  }
  if (els.skylight) els.skylight.hidden = !state.unlocks.skylight;
  if (els.wellRoom) els.wellRoom.hidden = !state.unlocks.wellRoom;
  if (els.rain) els.rain.hidden = !(state.event && state.event.type === 'rain');
  renderEvent(state);
  renderCat(state);
}

function renderEvent(state) {
  if (!els.eventLayer) return;
  els.eventLayer.replaceChildren();
  const ev = state.event;
  if (!ev) return;
  const el = document.createElement('div');
  el.className = `event event-${ev.type}`;
  el.setAttribute('role', 'status');
  el.textContent = eventLabel(ev.type, state.settings.lang);
  if (ev.type === 'fallenBook') {
    el.setAttribute('data-action', 'collect-fallen');
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
  } else if (ev.type === 'reader' && !state.readerActive) {
    // evento reader: il lettore è attivo, niente badge extra
    return;
  } else {
    el.setAttribute('data-action', 'dismiss-event');
  }
  els.eventLayer.appendChild(el);
}

function eventLabel(type, lang) {
  const labels = {
    it: { cat: 'Il gatto-ombra si è seduto qui — interagisci con lui!', rain: 'Pioggia sui vetri: +1 Calma (tocca)', fallenBook: 'Un libro è caduto: raccoglilo!', reader: '' },
    en: { cat: 'The shadow-cat sits here — interact with it!', rain: 'Rain on the glass: +1 Calm (tap)', fallenBook: 'A book fell: pick it up!', reader: '' },
  };
  return (labels[lang] || labels.it)[type] || '';
}

function renderCat(state) {
  if (!els.catArea) return;
  els.catArea.className = 'cat';
  els.catArea.setAttribute('data-zone', state.catArea);
  els.catArea.setAttribute('data-area', state.catArea);
}

// ---- Lettore + dialogo procedurale (Fase 2) ----
export function renderReader(state) {
  if (els.readerZone) {
    els.readerZone.classList.toggle('active', state.readerActive);
    els.readerZone.setAttribute('aria-hidden', String(!state.readerActive));
  }
  const card = els.readerCard;
  const btn = els.reader;
  if (card) card.hidden = !state.readerActive;
  if (btn) {
    btn.hidden = !state.readerActive;
    btn.setAttribute('aria-pressed', String(state.readerActive));
  }
  const profile = state.readerProfile;
  if (state.readerActive && profile) {
    const lang = state.settings.lang;
    const moods = {
      it: { shy: 'timo', curious: 'curioso', dreamy: 'sognante' },
      en: { shy: 'shy', curious: 'curious', dreamy: 'dreamy' },
    };
    const mood = (moods[lang] || moods.it)[profile.mood] || profile.mood;
    if (els.readerMeta) {
      els.readerMeta.textContent = `${profile.name} · ${mood}`;
    }
    if (els.readerFav) {
      const book = RARE_BOOKS.find((b) => b.id === profile.preferredBook);
      const title = book ? (book[lang] || book.it).title : '—';
      els.readerFav.textContent = `${t(lang, 'readerFav')}: ${title}`;
    }
    if (els.readerChoices) {
      const choices = READERS.dialogue?.choices || [];
      const done = Boolean(profile.choice);
      els.readerChoices.replaceChildren(...choices.map((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `reader-choice ${profile.choice === c.id ? 'on' : ''}`;
        b.dataset.action = 'reader-choice';
        b.dataset.id = c.id;
        b.textContent = (c[lang] || c.it).label;
        b.disabled = done;
        return b;
      }));
      els.readerChoices.hidden = done;
    }
    if (els.readerReply) {
      els.readerReply.hidden = !profile.reply;
      els.readerReply.textContent = profile.reply || '';
    }
  } else {
    if (els.readerChoices) els.readerChoices.replaceChildren();
    if (els.readerReply) { els.readerReply.hidden = true; els.readerReply.textContent = ''; }
  }
  const hint = els.shareHint || $(('shareHint'));
  if (hint) hint.hidden = false;
  renderWeather(state);
}

function renderWeather(state) {
  const el = els.weatherBadge;
  if (!el) return;
  const lang = state.settings.lang;
  const raining = state.weather === 'rain' || state.event?.type === 'rain';
  el.hidden = state.room !== 'hall';
  el.textContent = raining ? t(lang, 'weatherRain') : t(lang, 'weatherClear');
  el.dataset.weather = raining ? 'rain' : 'clear';
}

// ---- Evento / toast / ambient ----
let toastTimer = null;
export function showToast(msg, lang) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  els.toast.setAttribute('role', 'status');
  if (toastTimer) clearTimeout(toastTimer);
  // B16: toast si nasconde da solo dopo TOAST_MS
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    toastTimer = null;
  }, 4000);
  void lang;
}

export function hideToast() {
  if (els.toast) els.toast.classList.remove('show');
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
}

export function renderAmbient(state) {
  if (!els.ambient) return;
  const lang = state.settings.lang;
  const list = MESSAGES[lang] || MESSAGES.it;
  els.ambient.textContent = list[state.ambientIndex % list.length] || '';
}

// ---- Traguardi / sblocchi / statistiche ----
export function renderMilestones(state) {
  if (!els.milestones) return;
  const lang = state.settings.lang;
  els.milestones.replaceChildren();
  Object.entries(MILESTONES).forEach(([key, m]) => {
    const li = document.createElement('li');
    const got = Boolean(state.milestones[key]);
    li.className = `milestone ${got ? 'done' : 'todo'}`;
    li.textContent = `${got ? '✓' : '○'} ${m[lang]?.title || m.it.title}`;
    li.title = (m[lang]?.desc || m.it.desc) + (got ? '' : ` — ${m[lang]?.desc || ''}`);
    els.milestones.appendChild(li);
  });
}

export function renderUnlocks(state) {
  if (!els.unlocks) return;
  const lang = state.settings.lang;
  els.unlocks.replaceChildren();
  Object.entries(UNLOCKS).forEach(([key, u]) => {
    const li = document.createElement('li');
    const got = Boolean(state.unlocks[key]);
    li.className = `unlock ${got ? 'done' : 'todo'}`;
    li.textContent = `${got ? '🔓' : '🔒'} ${u[lang]?.name || u.it.name}`;
    li.title = u[lang]?.desc || u.it.desc;
    els.unlocks.appendChild(li);
  });
}

export function renderStats(state) {
  if (!els.stats) return;
  const lang = state.settings.lang;
  const rows = [
    [t(lang, 'lanterns') || 'Lanterns', state.stats.lanternsLit],
    [t(lang, 'booksShelved') || 'Books', state.stats.booksShelved],
    [t(lang, 'teasBrewed') || 'Teas', state.stats.teasBrewed],
    [t(lang, 'readersServed') || 'Readers', state.stats.readersServed],
    [t(lang, 'eventsSeen') || 'Events', state.stats.eventsSeen],
  ];
  els.stats.replaceChildren(...rows.map(([label, n]) => {
    const li = document.createElement('li');
    li.innerHTML = ''; // evita innerHTML con contenuto esterno
    const k = document.createElement('span');
    k.textContent = String(label);
    const v = document.createElement('b');
    v.textContent = String(n);
    li.append(k, v);
    return li;
  }));
}

// ---- Accessibilità: descrizione stanza SR (Fase 3) ----
export function renderRoomDesc(state) {
  if (!els.roomDesc) return;
  els.roomDesc.textContent = describeRoom(state, t);
}

// ---- Mods list (Fase 3) ----
export function renderModList(state) {
  if (!els.modList) return;
  const lang = state.settings.lang;
  const packs = listPacks();
  els.modList.replaceChildren();
  if (!packs.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = t(lang, 'modsEmpty');
    els.modList.appendChild(li);
    return;
  }
  packs.forEach((p) => {
    const li = document.createElement('li');
    const k = document.createElement('span');
    k.textContent = `${p.name} v${p.version}`;
    const v = document.createElement('b');
    const on = (state.activeMods || []).includes(p.id);
    v.textContent = on ? '✓' : '○';
    li.append(k, v);
    els.modList.appendChild(li);
  });
}

// ---- Almanacco delle lune (Fase 2) ----
export function renderAlmanac(state) {
  if (!els.almanacList) return;
  const lang = state.settings.lang;
  const a = state.almanac || { full: 0, new: 0, phases: [], achievements: {} };
  els.almanacList.replaceChildren();

  const rows = [
    [t(lang, 'almanacFulls'), a.full],
    [t(lang, 'almanacNews'), a.new],
    [t(lang, 'almanacPhases'), a.phases?.length || 0],
  ];
  rows.forEach(([label, n]) => {
    const li = document.createElement('li');
    const k = document.createElement('span');
    k.textContent = String(label);
    const v = document.createElement('b');
    v.textContent = String(n);
    li.append(k, v);
    els.almanacList.appendChild(li);
  });

  const achEntries = Object.entries(MOON_ACHIEVEMENTS || {});
  if (!achEntries.length) return;
  if (!(a.phases?.length)) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = t(lang, 'almanacEmpty');
    els.almanacList.appendChild(p);
    return;
  }
  achEntries.forEach(([key, def]) => {
    const li = document.createElement('li');
    const got = Boolean(a.achievements?.[key]);
    li.className = `milestone ${got ? 'done' : 'todo'}`;
    li.textContent = `${got ? '✓' : '○'} ${(def[lang] || def.it).title}`;
    li.title = (def[lang] || def.it).desc;
    els.almanacList.appendChild(li);
  });
}

export function renderProgress(state) {
  if (!els.progress) return;
  const found = state.raresFound.length;
  const total = RARE_BOOKS.length;
  const cat = state.raresCataloged.length;
  els.progress.setAttribute('role', 'progressbar');
  els.progress.setAttribute('aria-valuemin', '0');
  els.progress.setAttribute('aria-valuemax', String(total));
  els.progress.setAttribute('aria-valuenow', String(cat));
  els.progress.setAttribute('aria-label', t(state.settings.lang, 'progress'));
  els.progress.style.setProperty('--pct', String(Math.round((cat / total) * 100)));
  const fill = els.progress.querySelector('.progress-fill');
  if (fill) fill.style.setProperty('--pct', String(Math.round((cat / total) * 100)));
  if (els.collectionCount) {
    els.collectionCount.textContent = `${cat}/${total} ${t(state.settings.lang, 'collectionOf')}`;
  }
  void found;
}

// ---- Schermate (welcome/game) ----
export function showWelcome(hasSave) {
  if (els.welcome) els.welcome.hidden = false;
  if (els.game) els.game.hidden = true;
  const newBtn = $(('newBtn'));
  if (newBtn) newBtn.hidden = !hasSave;
}

export function showGame() {
  if (els.welcome) els.welcome.hidden = true;
  if (els.game) els.game.hidden = false;
}

export function togglePanelById(id, open) {
  const el = $(id);
  if (el) el.hidden = !open;
}

export function announce(msg) {
  if (els.announce) els.announce.textContent = msg;
}

export function renderRareList(state) {
  if (!els.rareList) return;
  const lang = state.settings.lang;
  els.rareList.replaceChildren();
  if (state.raresFound.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = t(lang, 'emptyCollection');
    els.rareList.appendChild(p);
    return;
  }
  RARE_BOOKS.forEach((b) => {
    const found = state.raresFound.includes(b.id);
    const cat = state.raresCataloged.includes(b.id);
    if (!found) return;
    const card = document.createElement('article');
    card.className = `rare ${cat ? 'cat' : 'uncat'}`;
    card.style.setProperty('--cover', b.cover);

    const cover = document.createElement('div');
    cover.className = 'rare-cover';
    cover.textContent = b.glyph;

    const info = document.createElement('div');
    info.className = 'rare-info';
    const h = document.createElement('h4');
    h.textContent = (b[lang] || b.it).title;
    const d = document.createElement('p');
    d.textContent = (b[lang] || b.it).desc;
    info.append(h, d);

    if (!cat) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rare-btn';
      btn.dataset.action = 'catalog';
      btn.dataset.id = b.id;
      btn.textContent = `${t(lang, 'catalog')} (${CATALOG_COST} Ink)`;
      if (!state.unlocks.curiosityShelf || state.resources.inchiostro < CATALOG_COST) {
        btn.disabled = true;
      }
      info.appendChild(btn);
    } else {
      const badge = document.createElement('span');
      badge.className = 'rare-badge';
      badge.textContent = '✓';
      info.appendChild(badge);
    }
    card.append(cover, info);
    els.rareList.appendChild(card);
  });
}

// ---- Tutorial / pannelli ----
export function renderTutorial(state) {
  if (!els.tut) return;
  const lang = state.settings.lang;
  const visible = !state.tutorialDone && state.tutorialStep < 4;
  els.tut.hidden = !visible;
  document.querySelectorAll('.tut-target').forEach((n) => n.classList.remove('tut-target'));
  if (!visible) return;
  const step = TUTORIAL_STEPS[lang]?.[state.tutorialStep] || TUTORIAL_STEPS.it[state.tutorialStep];
  if (els.tutText) els.tutText.textContent = step.text;
  if (els.tutDots) {
    els.tutDots.replaceChildren(...[0, 1, 2, 3].map((i) => {
      const dot = document.createElement('span');
      dot.className = `dot ${i === state.tutorialStep ? 'on' : ''}`;
      return dot;
    }));
  }
  const targetId = step.target === 'tableArea' ? 'tableArea' : step.target;
  const target = els[targetId] || getEl(targetId);
  if (target) target.classList.add('tut-target');
}

export function renderPanels(state) {
  // i18n dinamico dei pannelli già aperti + label bottoni
  const lang = state.settings.lang;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    node.textContent = t(lang, key);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    node.setAttribute('aria-label', t(lang, node.getAttribute('data-i18n-aria')));
  });
  document.documentElement.lang = lang;
  if (els.helpPanelBody) buildHelp(lang);
  void ROOM_LABEL_KEYS;
}

function buildHelp(lang) {
  const keys = ['helpNote', 'help0', 'help1', 'help2', 'help3', 'help4', 'help5', 'helpKeys', 'helpShare'];
  els.helpPanelBody.replaceChildren(...keys.map((k) => {
    const p = document.createElement('p');
    p.textContent = t(lang, k);
    return p;
  }));
}

// ---- Lettere ----
export function renderLetters(state) {
  if (!els.lettersList) return;
  const lang = state.settings.lang;
  els.lettersList.replaceChildren();
  if (!state.letters.length) {
    if (els.lettersEmpty) els.lettersEmpty.hidden = false;
    return;
  }
  if (els.lettersEmpty) els.lettersEmpty.hidden = true;
  state.letters.forEach((letter) => {
    const li = document.createElement('li');
    li.className = 'letter';
    const p = document.createElement('p');
    p.textContent = letter.text;
    const time = document.createElement('time');
    time.dateTime = new Date(letter.ts).toISOString();
    time.textContent = new Date(letter.ts).toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB');
    li.append(p, time);
    els.lettersList.appendChild(li);
  });
}

export function flashLetter() {
  if (!els.lettersList) return;
  els.lettersList.classList.add('flash');
  setTimeout(() => els.lettersList?.classList.remove('flash'), 900);
}

// ---- Luna (Fase G3: calcolo offline, nessuna rete) ----
export function renderMoon(state, now = Date.now()) {
  if (!els.moon) return;
  const lang = state.settings.lang;
  const phase = moonPhase(now);
  const id = moonPhaseId(phase);
  const name = (MOON_NAMES[lang] || MOON_NAMES.it)[id];
  els.moon.style.setProperty('--phase', phase.toFixed(4));
  els.moon.dataset.phase = id;
  if (els.moonName) {
    els.moonName.textContent = t(lang, 'moonTonight', { phase: name });
    els.moonName.title = name;
  }
  void state;
}

// ---- Stato UI (banners, offline, update, install) ----
export function renderBanners({ offline, standalone, canInstall, updateReady, corrupted }) {
  if (els.offline) els.offline.hidden = !offline;
  if (els.installBanner) {
    const show = canInstall && !standalone;
    els.installBanner.hidden = !show;
    if (els.iosInstall) els.iosInstall.hidden = !(show && isIOSHint());
  }
  if (els.updateHint) els.updateHint.hidden = !updateReady;
  if (corrupted) showToast(t('it', 'otherTab'), 'it');
}

function isIOSHint() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function setCatAreaLabel(state) {
  if (!els.catAreaName) return;
  const names = {
    it: { hearth: 'Camino', lanterns: 'Lanterne', tableArea: 'Tavolo', kettle: 'Bollitore', shelves: 'Scaffali', readerZone: 'Lettore' },
    en: { hearth: 'Hearth', lanterns: 'Lanterns', tableArea: 'Table', kettle: 'Kettle', shelves: 'Shelves', readerZone: 'Reader' },
  };
  const lang = state.settings.lang;
  els.catAreaName.textContent = (names[lang] || names.it)[state.catArea] || '';
}

// ---- Ciclo di vita ----
// B6: destroy completo — rimuove tutti i listener/timer creati dalla View.
export function destroy() {
  TIMERS.forEach((id) => clearTimeout(id));
  TIMERS.clear();
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  hideToast();
  document.querySelectorAll('.zone-target').forEach((n) => n.classList.remove('zone-target'));
}

// Registra un timer da pulire in automatico.
export function later(fn, ms) {
  const id = setTimeout(() => {
    TIMERS.delete(id);
    fn();
  }, ms);
  TIMERS.add(id);
  void STR;
  void MESSAGES;
  return id;
}
