/* ===================================================
   🗣️ QUOTESMITH — Client
   UI: setup (lingua → categoria → difficoltà), quiz a
   10 domande, streak, punteggio e record personale.
   La logica (database, opzioni, punteggio) vive in
   data.js + engine.js.
   =================================================== */
(function () {
  'use strict';

  const Q = window.QuoteSmith;
  const DB = window.QUOTESMITH_DB.QUOTES;
  const $ = (id) => document.getElementById(id);

  const I18N = {
    setupTitle: { it: 'Prepara la partita', en: 'Set up the game' },
    langLabel: { it: '1 · Scegli la lingua', en: '1 · Choose your language' },
    catLabel: { it: '2 · Scegli la categoria', en: '2 · Pick a category' },
    diffLabel: { it: '3 · Scegli la difficoltà', en: '3 · Pick a difficulty' },
    start: { it: 'Inizia il gioco 🔥', en: 'Start the game 🔥' },
    who: { it: 'Chi ha detto questa frase?', en: 'Who said this quote?' },
    next: { it: 'Continua ➡️', en: 'Continue ➡️' },
    endTitle: { it: 'Partita finita!', en: 'Game over!' },
    bestStreak: { it: 'Streak migliore', en: 'Best streak' },
    bestScore: { it: 'Record personale', en: 'Personal best' },
    retry: { it: 'Rigioca 🔁', en: 'Play again 🔁' },
    menu: { it: '← menu', en: '← menu' },
    footer: { it: '100% offline · il database resta sul tuo telefono', en: '100% offline · the database lives on your phone' },
    listened: { it: 'Ben detto!', en: 'Well said!' },
    wrongHint: { it: 'La risposta giusta era:', en: 'The correct answer was:' },
    yourBest: { it: 'Il tuo record:', en: 'Your best:' },
    of: { it: 'di', en: 'of' },
  };
  function t(key) { return I18N[key][state.lang] || I18N[key].it; }

  const state = {
    lang: 'it',
    cat: null,
    diff: 'easy',
    round: [],
    idx: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    answered: false,
    results: [],
  };

  /* ---------------- localStorage ---------------- */
  function loadBest() {
    try {
      const b = JSON.parse(localStorage.getItem('quotesmith.best') || '{}');
      state.bestScore = b.score || 0;
      state.bestStreak = b.streak || 0;
    } catch (e) { state.bestScore = 0; state.bestStreak = 0; }
  }
  function saveBest() {
    const score = Math.max(state.bestScore || 0, state.score);
    const streak = Math.max(state.bestStreak || 0, state.streak);
    try { localStorage.setItem('quotesmith.best', JSON.stringify({ score, streak })); }
    catch (e) { /* ignora */ }
    state.bestScore = score;
    state.bestStreak = streak;
  }

  /* ---------------- screens ---------------- */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  function confetti() {
    const colors = ['#ffd23f', '#ff3d6e', '#2ec27e', '#8f7bff', '#ff9f1a', '#41d6ff'];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 60; i++) {
      const d = document.createElement('div');
      d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw';
      d.style.background = colors[i % colors.length];
      d.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
      d.style.animationDelay = (Math.random() * 0.4) + 's';
      frag.appendChild(d);
    }
    document.body.appendChild(frag);
    setTimeout(() => { document.querySelectorAll('.confetti').forEach((x) => x.remove()); }, 3500);
  }

  function vibrate(pattern) { if (navigator.vibrate) navigator.vibrate(pattern); }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------- i18n statica ---------------- */
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.documentElement.lang = state.lang;
  }

  /* ---------------- setup ---------------- */
  function renderLangs() {
    const box = $('langList');
    box.innerHTML = '';
    Q.LANGS.forEach((l) => {
      const b = document.createElement('button');
      b.className = 'lang-btn' + (state.lang === l.key ? ' active' : '');
      b.textContent = l.name;
      b.onclick = () => { state.lang = l.key; renderLangs(); renderCats(); renderDiffs(); applyI18n(); renderBest(); };
      box.appendChild(b);
    });
  }

  function renderCats() {
    const box = $('catGrid');
    box.innerHTML = '';
    Q.CATEGORIES.forEach((c) => {
      const count = DB.filter((q) => q[2] === c.key && q[3] === state.lang).length;
      const b = document.createElement('button');
      b.className = 'cat-card' + (state.cat === c.key ? ' active' : '');
      b.innerHTML =
        '<span class="c-emoji">' + c.emoji + '</span>' +
        '<span class="c-name">' + c.name[state.lang] + '</span>' +
        '<span class="c-count">' + count + ' ' + t('of').toLowerCase() + '? frasi</span>';
      b.onclick = () => { state.cat = c.key; renderCats(); updateStart(); };
      box.appendChild(b);
    });
  }

  function renderDiffs() {
    const box = $('diffList');
    box.innerHTML = '';
    Q.DIFFICULTIES.forEach((d) => {
      const b = document.createElement('button');
      b.className = 'diff-btn' + (state.diff === d.key ? ' active' : '');
      b.innerHTML = d.name[state.lang] + '<span class="d-hint">' + d.hint[state.lang] + '</span>';
      b.onclick = () => { state.diff = d.key; renderDiffs(); };
      box.appendChild(b);
    });
  }

  function updateStart() {
    $('btnStart').disabled = !state.cat;
  }

  function renderBest() {
    const box = $('bestBox');
    box.innerHTML = '';
    if ((state.bestScore || 0) > 0 || (state.bestStreak || 0) > 0) {
      box.textContent = '🏆 ' + t('bestScore') + ' ' + state.bestScore + '/10 · 🔥 ' + t('bestStreak') + ' ' + state.bestStreak;
    } else {
      box.textContent = t('yourBest') + ' —';
    }
  }

  /* ---------------- gioco ---------------- */
  function startGame() {
    state.round = Q.buildRound(DB, { cat: state.cat, lang: state.lang, diff: state.diff, count: Q.ROUND_SIZE });
    state.idx = 0;
    state.score = 0;
    state.streak = 0;
    state.answered = false;
    state.results = [];
    $('btnHome').hidden = false;
    show('screen-game');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.round[state.idx];
    state.answered = false;

    $('progressText').textContent = (state.idx + 1) + ' / ' + state.round.length;
    $('roundBadge').textContent = Q.catName(q.cat, state.lang) + ' · ' + Q.diffName(q.diff, state.lang);
    $('streakChip').hidden = state.streak < 2;
    $('streakChip').textContent = '🔥 ' + state.streak;

    $('quoteText').textContent = q.text;
    $('feedback').hidden = true;
    $('btnNext').hidden = true;

    const box = $('options');
    box.innerHTML = '';
    q.options.forEach((author, i) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.textContent = author;
      b.onclick = () => answer(i);
      box.appendChild(b);
    });
  }

  function answer(i) {
    if (state.answered) return;
    state.answered = true;
    const q = state.round[state.idx];
    const correct = Q.checkAnswer(q, i);

    if (correct) {
      state.score++;
      state.streak++;
      vibrate([30]);
    } else {
      state.streak = 0;
      vibrate([60, 40, 60]);
    }
    state.results[state.idx] = correct;

    const btns = document.querySelectorAll('#options .opt');
    btns.forEach((b, k) => {
      b.disabled = true;
      if (k === q.correct) b.classList.add('correct');
      else if (k === i) b.classList.add('wrong');
      else b.classList.add('dim');
      if (k === q.correct || k === i) b.classList.add('pop');
    });

    const fb = $('feedback');
    fb.hidden = false;
    fb.innerHTML = correct
      ? '<b>✅ ' + q.author + '</b>'
      : '<b>❌ ' + (btns[i].textContent) + '</b> · ' + t('wrongHint') + ' <b>' + q.author + '</b>';

    $('btnNext').hidden = false;
  }

  function next() {
    state.idx++;
    if (state.idx >= state.round.length) endGame();
    else renderQuestion();
  }

  function endGame() {
    saveBest();
    const pct = state.score / state.round.length;
    $('endTitle').textContent = t('endTitle') + ' ' + Q.scoreFor(state.score, state.round.length);
    $('endStars').textContent = Q.scoreFor(state.score, state.round.length);
    $('endScore').textContent = state.score;
    $('endStreak').textContent = state.streak > state.bestStreak ? state.streak : (state.bestStreak || 0);
    $('endBest').textContent = state.bestScore;

    const list = $('endList');
    list.innerHTML = '';
    state.round.forEach((q, i) => {
      const ok = !!state.results[i];
      const item = document.createElement('div');
      item.className = 'end-item ' + (ok ? 'ok' : 'ko');
      item.innerHTML =
        '<span class="mark">' + (ok ? '✓' : '✗') + '</span>' +
        '<span class="txt"><b>' + esc(q.text) + '</b><span>' + esc(q.author) + '</span></span>';
      list.appendChild(item);
    });

    if (pct >= 0.8) confetti();
    $('btnHome').hidden = false;
    show('screen-end');
  }

  /* ---------------- init ---------------- */
  function init() {
    loadBest();
    renderLangs();
    renderCats();
    renderDiffs();
    renderBest();
    applyI18n();

    $('btnStart').onclick = startGame;

    $('btnNext').onclick = next;
    $('btnRetry').onclick = () => { show('screen-setup'); renderBest(); };
    $('btnMenu').onclick = () => { show('screen-setup'); renderBest(); };
    $('btnHome').onclick = () => { show('screen-setup'); renderBest(); };

    $('btnRead').onclick = () => {
      const text = $('quoteText').textContent;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = state.lang === 'it' ? 'it-IT' : 'en-US';
      if (window.speechSynthesis) speechSynthesis.speak(u);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // hook per gli smoke test
    window.__qsmState = state;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
