/* ===================================================
   🍸 SHOTMIND — Client
   UI, stato del giro, bevute e scoreboard.
   La logica (parole, feedback, regole) vive in game.js.
   =================================================== */
(function () {
  'use strict';

  const G = window.ShotmindGame;
  const $ = (id) => document.getElementById(id);

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const COLORS = ['#ffd23f', '#ff3d6e', '#2ec27e', '#8f7bff', '#ff9f1a', '#41d6ff'];

  /* ---------------- stato ---------------- */
  const state = {
    pack: 'bar',
    mode: 'maker',          // 'maker' | 'app'
    players: [],            // [{name, sips}]
    maker: 0,               // indice cantiniere, -1 = app
    guesser: 0,
    secret: '',
    attempt: 0,
    current: '',
    history: [],            // [{guess, feedback, drinks, guesser, maker}]
    round: 1,
    running: false,
    locked: false,          // blocca input durante il banner
  };

  /* ---------------- helper ---------------- */
  function addSips(idx, n) {
    if (idx >= 0 && state.players[idx]) state.players[idx].sips += n;
  }
  function nextGuesser(from) {
    const n = state.players.length;
    let i = (from + 1) % n;
    while (i !== from && (state.mode === 'maker' && i === state.maker)) i = (i + 1) % n;
    return i;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function vibrate(pattern) { if (navigator.vibrate) navigator.vibrate(pattern); }
  function say(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'it-IT';
    if (window.speechSynthesis) speechSynthesis.speak(u);
  }
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
      else if (!on && wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch (e) { /* ignora */ }
  }
  function confetti() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 70; i++) {
      const d = document.createElement('div');
      d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw';
      d.style.background = COLORS[i % COLORS.length];
      d.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
      d.style.animationDelay = (Math.random() * 0.4) + 's';
      frag.appendChild(d);
    }
    document.body.appendChild(frag);
    setTimeout(() => { const all = document.querySelectorAll('.confetti'); all.forEach((x) => x.remove()); }, 3500);
  }

  /* ---------------- screens ---------------- */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  /* ---------------- setup ---------------- */
  function renderPacks() {
    const box = $('packList');
    box.innerHTML = '';
    Object.keys(G.PACKS).forEach((key) => {
      const p = G.PACKS[key];
      const lens = p.words.reduce((acc, w) => { acc.add(w.length); return acc; }, new Set());
      const range = Math.min(...lens) + '-' + Math.max(...lens);
      const btn = document.createElement('button');
      btn.className = 'pack-card' + (state.pack === key ? ' sel' : '');
      btn.innerHTML =
        '<span class="p-emoji">' + p.emoji + '</span>' +
        '<span class="p-name">' + p.name + '</span>' +
        '<span class="p-hint">' + p.hint + '</span>' +
        '<span class="p-meta">' + p.words.length + ' parole · ' + range + ' lettere</span>';
      btn.onclick = () => { state.pack = key; renderPacks(); };
      box.appendChild(btn);
    });
  }

  function renderPlayers() {
    const box = $('playerChips');
    box.innerHTML = '';
    state.players.forEach((p, i) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = p.name + ' <button data-i="' + i + '" aria-label="rimuovi">✕</button>';
      chip.querySelector('button').onclick = () => {
        state.players.splice(i, 1);
        if (state.maker >= state.players.length) state.maker = 0;
        if (state.guesser >= state.players.length) state.guesser = 0;
        renderPlayers(); renderMaker();
        updateStart();
      };
      box.appendChild(chip);
    });
  }

  function renderMaker() {
    const box = $('makerList');
    const label = $('makerLabel');
    if (state.mode !== 'maker') { box.innerHTML = ''; label.style.display = 'none'; return; }
    label.style.display = '';
    box.innerHTML = '';
    state.players.forEach((p, i) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.style.cursor = 'pointer';
      chip.innerHTML = p.name + (i === state.maker ? ' 👑' : '');
      chip.onclick = () => { state.maker = i; renderMaker(); };
      box.appendChild(chip);
    });
  }

  function updateStart() {
    const min = state.mode === 'maker' ? 2 : 1;
    $('btnStart').disabled = state.players.length < min;
  }

  function initSetup() {
    renderPacks();
    renderPlayers();
    renderMaker();
    updateStart();
  }

  /* ---------------- scelta parola (cantiniere) ---------------- */
  function renderWordList() {
    const box = $('wordList');
    box.innerHTML = '';
    shuffle(G.PACKS[state.pack].words).forEach((w) => {
      const b = document.createElement('button');
      b.textContent = w;
      b.onclick = () => startGame(w);
      box.appendChild(b);
    });
  }

  function submitCustomWord(e) {
    e.preventDefault();
    const input = $('customWordInput');
    const w = G.normalize(input.value);
    if (!G.validWord(w)) {
      input.style.borderColor = '#ff3d6e';
      setTimeout(() => { input.style.borderColor = ''; }, 900);
      return;
    }
    startGame(w);
  }

  /* ---------------- gioco ---------------- */
  function buildBoard() {
    const len = state.secret.length;
    const board = $('board');
    board.innerHTML = '';
    for (let r = 0; r < G.MAX_ATTEMPTS; r++) {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.row = r;
      for (let c = 0; c < len; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.c = c;
        row.appendChild(tile);
      }
      board.appendChild(row);
    }
  }

  function buildKeyboard() {
    const kb = $('keyboard');
    kb.innerHTML = '';
    LETTERS.forEach((l) => {
      const k = document.createElement('button');
      k.className = 'key';
      k.textContent = l;
      k.onclick = () => pressKey(l);
      kb.appendChild(k);
    });
    const del = document.createElement('button');
    del.className = 'key wide'; del.textContent = '⌫';
    del.onclick = () => pressKey('BACK');
    kb.appendChild(del);
    const go = document.createElement('button');
    go.className = 'key wide'; go.id = 'keyGo'; go.textContent = 'INVIA';
    go.onclick = () => pressKey('GO');
    kb.appendChild(go);
  }

  function pressKey(k) {
    if (state.locked || !state.running) return;
    const len = state.secret.length;
    if (k === 'BACK') { state.current = state.current.slice(0, -1); }
    else if (k === 'GO') { if (state.current.length === len) submitGuess(); return; }
    else { if (state.current.length < len) state.current += k; }
    renderInput();
  }

  function renderInput() {
    const row = document.querySelector('.row[data-row="' + state.attempt + '"]');
    if (!row) return;
    const len = state.secret.length;
    for (let c = 0; c < len; c++) {
      const t = row.children[c];
      t.textContent = state.current[c] || '';
      t.className = 'tile' + (state.current[c] ? ' filled' : '');
      if (c === state.current.length) t.classList.add('cur');
    }
    $('keyGo').disabled = state.current.length !== len;
  }

  function revealRow(guess, feedback) {
    const row = document.querySelector('.row[data-row="' + state.attempt + '"]');
    const len = guess.length;
    for (let c = 0; c < len; c++) {
      const t = row.children[c];
      t.textContent = guess[c];
      t.classList.remove('cur', 'filled');
      t.className = 'tile ' + (feedback[c] === 'G' ? 'g' : feedback[c] === 'Y' ? 'y' : 'b');
    }
  }

  function updateDots() {
    const box = $('attemptDots');
    box.innerHTML = '';
    for (let i = 0; i < G.MAX_ATTEMPTS; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (i < state.attempt ? ' used' : '');
      box.appendChild(d);
    }
  }

  function renderScoreStrip() {
    const strip = $('scoreStrip');
    strip.innerHTML = '';
    state.players.forEach((p) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = p.name + ' <span class="sips">🍺 ' + p.sips + '</span>';
      strip.appendChild(chip);
    });
  }

  function showDrink(text, sips) {
    const banner = $('drinkBanner');
    const glass = $('glass');
    $('drinkText').textContent = text;
    glass.classList.remove('full');
    void glass.offsetWidth;
    if (sips > 0) { glass.classList.add('full'); vibrate([60, 30, 60]); }
    banner.hidden = false;
    banner.classList.remove('shake');
    void banner.offsetWidth;
    if (sips >= 3) { banner.classList.add('shake'); }
  }

  function submitGuess() {
    const guess = state.current;
    const fb = G.evalGuess(state.secret, guess);
    const drinks = G.drinkRule(state.secret, guess);

    revealRow(guess, fb);
    addSips(state.guesser, drinks.guesserSips);
    addSips(state.maker, drinks.makerSips);
    state.history.push({ guess, feedback: fb, drinks, guesser: state.guesser, maker: state.maker });

    const gName = state.players[state.guesser].name;
    const mName = state.mode === 'maker' ? state.players[state.maker].name : 'l\u2019App';
    let text = '';
    if (drinks.guesserSips) text += '🥴 ' + gName + ' beve ' + drinks.guesserSips + ' sorso' + (drinks.guesserSips > 1 ? 'i' : '') + ' (nere)';
    if (drinks.makerSips) text += (text ? '\n' : '') + '👑 ' + mName + ' beve ' + drinks.makerSips + ' sorso' + (drinks.makerSips > 1 ? 'i' : '') + ' (gialle)';
    if (!text) text = '😌 Giro pulito: nessuno beve';
    showDrink(text, drinks.guesserSips + drinks.makerSips);
    renderScoreStrip();

    state.attempt++;
    state.current = '';
    updateDots();

    const won = fb.every((f) => f === 'G');
    if (won) { endGame(true); return; }
    if (state.attempt >= G.MAX_ATTEMPTS) { endGame(false); return; }

    state.locked = true;
    setTimeout(() => { state.locked = false; renderInput(); }, 900);
  }

  /* ---------------- fine giro ---------------- */
  function endGame(won) {
    state.running = false;
    keepAwake(false);
    const used = state.attempt;
    const gName = state.players[state.guesser].name;
    const mName = state.mode === 'maker' ? state.players[state.maker].name : 'l\u2019App';
    const recap = [];

    if (won) {
      addSips(state.maker, used);
      recap.push({ who: mName, what: used + ' sorsi (perde il giro) 🍺', hot: true });
      recap.push({ who: gName + ' 🏆', what: 'salvo questa volta', hot: false });
      $('endTitle').textContent = '🏆 ' + gName + ' ha scoperto la parola!';
      $('endTitle').className = 'end-title win';
      confetti();
      vibrate([50, 40, 150]);
    } else {
      state.players.forEach((p, i) => { if (i !== state.maker) addSips(i, 1); });
      recap.push({ who: 'Tutti tranne ' + mName, what: '1 sorso (la maledizione) 💀', hot: true });
      $('endTitle').textContent = '💀 Nessuno ha indovinato!';
      $('endTitle').className = 'end-title lose';
      vibrate([200, 80, 200]);
      $('victimBox').hidden = false;
    }

    $('endWord').textContent = state.secret;
    const box = $('endRecap');
    box.innerHTML = '';
    recap.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'recap-item' + (r.hot ? ' hot' : '');
      item.innerHTML = '<span class="who">' + r.who + '</span><span class="what">' + r.what + '</span>';
      box.appendChild(item);
    });
    renderVictims();
    renderScoreStrip();
    show('screen-end');
  }

  function renderVictims() {
    const box = $('victimList');
    box.innerHTML = '';
    if (state.mode === 'maker') {
      state.players.forEach((p, i) => {
        if (i === state.maker) return;
        const b = document.createElement('button');
        b.className = 'chip';
        b.style.cursor = 'pointer';
        b.textContent = p.name;
        b.onclick = () => drinkShot(i);
        box.appendChild(b);
      });
    } else {
      state.players.forEach((p, i) => {
        const b = document.createElement('button');
        b.className = 'chip';
        b.style.cursor = 'pointer';
        b.textContent = p.name;
        b.onclick = () => drinkShot(i);
        box.appendChild(b);
      });
    }
  }

  function drinkShot(idx) {
    addSips(idx, G.SIPS_PER_SHOT);
    const p = state.players[idx];
    const item = document.createElement('div');
    item.className = 'recap-item hot';
    item.innerHTML = '<span class="who">' + p.name + '</span><span class="what">SHOT da ' + G.SIPS_PER_SHOT + ' sorsi 🥃</span>';
    $('endRecap').appendChild(item);
    $('victimBox').hidden = true;
    renderScoreStrip();
    vibrate([150, 50, 150]);
    say('brinda a ' + p.name);
  }

  /* ---------------- avvio giro ---------------- */
  function startGame(secret) {
    state.secret = G.normalize(secret);
    state.attempt = 0;
    state.current = '';
    state.history = [];
    state.running = true;
    state.locked = false;
    $('victimBox').hidden = true;
    $('drinkBanner').hidden = true;

    if (state.mode === 'app') state.maker = -1;

    $('guesserName').textContent = state.players[state.guesser].name;
    $('makerName').textContent = state.mode === 'maker' ? state.players[state.maker].name : 'l\u2019App 🎲';

    buildBoard();
    buildKeyboard();
    updateDots();
    renderScoreStrip();
    show('screen-game');
    renderInput();
    keepAwake(true);
  }

  function goToSecret() {
    renderWordList();
    show('screen-secret');
  }

  function nextRound() {
    state.round++;
    state.guesser = nextGuesser(state.guesser);
    if (state.mode === 'maker') {
      goToSecret();
    } else {
      startGame(G.randomWord(state.pack));
    }
  }

  /* ---------------- init ---------------- */
  function init() {
    state.players = [{ name: 'Tu', sips: 0 }, { name: 'Amico', sips: 0 }];
    state.maker = 0;
    state.guesser = 1;

    $('addPlayerForm').onsubmit = (e) => {
      e.preventDefault();
      const input = $('playerInput');
      const name = input.value.trim();
      if (!name) return;
      state.players.push({ name: name, sips: 0 });
      input.value = '';
      renderPlayers(); renderMaker(); updateStart();
    };

    $('modeMaker').onclick = () => { state.mode = 'maker'; toggleMode(); };
    $('modeApp').onclick = () => { state.mode = 'app'; toggleMode(); };
    function toggleMode() {
      $('modeMaker').classList.toggle('active', state.mode === 'maker');
      $('modeApp').classList.toggle('active', state.mode === 'app');
      renderMaker(); updateStart();
    }

    $('btnStart').onclick = () => {
      if (state.players.length < (state.mode === 'maker' ? 2 : 1)) return;
      if (state.mode === 'maker') goToSecret();
      else startGame(G.randomWord(state.pack));
    };
    $('btnBackSetup').onclick = () => show('screen-setup');
    $('btnBackSecret').onclick = () => show('screen-setup');
    $('customWordForm').onsubmit = submitCustomWord;
    $('btnGiveUp').onclick = () => endGame(false);
    $('btnAgain').onclick = nextRound;
    $('btnMenu').onclick = () => { state.running = false; keepAwake(false); initSetup(); show('screen-setup'); };

    $('btnRules').onclick = () => { $('modalRules').hidden = false; };
    $('btnCloseRules').onclick = () => { $('modalRules').hidden = true; };

    document.addEventListener('keydown', (e) => {
      if (!state.running || state.locked) return;
      if (/^[a-z]$/i.test(e.key)) pressKey(e.key.toUpperCase());
      else if (e.key === 'Backspace') pressKey('BACK');
      else if (e.key === 'Enter') pressKey('GO');
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    initSetup();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
