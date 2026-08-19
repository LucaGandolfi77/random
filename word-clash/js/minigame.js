/* MINIGAME — i 4 giochi di parole. resolve() è pura e testabile; start() apre il modal. */
'use strict';

const MGAME = {
  _g: null,

  resolve(id, outcome){
    const c = getMinigame(id);
    if (!c) return { coins:0, dobloni:0 };
    if (id === 'anagramma'){
      const ok = outcome.word === outcome.expected;
      const coins = ok ? c.rewardBase + c.rewardSpeed * Math.max(0, outcome.timeLeft || 0) : 5;
      return { coins, dobloni:0, ok, msg: ok ? 'Anagramma risolto!' : 'Tempo scaduto…' };
    }
    if (id === 'catena'){
      const chains = Math.max(0, outcome.chains || 0);
      const coins = c.rewardBase + c.rewardPerChain * chains;
      return { coins, dobloni:0, ok: chains >= 3, msg: chains + ' anelli di catena.' };
    }
    if (id === 'dattilo'){
      const time = Math.max(0, outcome.time || c.parTime);
      const bonus = Math.max(0, c.parTime - time);
      const coins = c.rewardBase + c.rewardFast * bonus;
      return { coins, dobloni:0, ok: true, msg: 'Dattilo in ' + time.toFixed(1) + 's!' };
    }
    if (id === 'impiccato'){
      if (outcome.win) return { coins: c.rewardCoins, dobloni: c.rewardDobloni, ok:true, msg:'Il bibliotecario è salvo. E ricco di dobloni.' };
      return { coins: 0, dobloni:0, ok:false, msg:'Impiccato… il bibliotecario si è dato al teatro.' };
    }
    return { coins:0, dobloni:0 };
  },

  start(id, ui){
    const c = getMinigame(id);
    if (cooldownLeft(id) > 0) return;
    this._g = { id, ui };
    if (id === 'anagramma') this._anagramma(c, ui);
    else if (id === 'catena') this._catena(c, ui);
    else if (id === 'dattilo') this._dattilo(c, ui);
    else if (id === 'impiccato') this._impiccato(c, ui);
  },

  _shuffle(s){
    const a = s.split('');
    for (let i = a.length - 1; i > 0; i--){
      const j = Math.floor(rnd() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a.join(' ');
  },
  _finish(outcome){
    const g = this._g;
    const c = getMinigame(g.id);
    G.cooldowns[g.id] = now();
    const r = this.resolve(g.id, outcome);
    if (r.coins > 0) addCoins(r.coins);
    if (r.dobloni > 0) addDobloni(r.dobloni);
    G.stats.minigames++;
    g.ui.closeModal();
    g.ui.toast((r.dobloni > 0 ? '💛 ' + r.dobloni + ' dobloni! ' : '') + '🪙 +' + fmt(r.coins) + ' · ' + r.msg);
    audio.success();
    g.ui.refreshUI();
  },

  /* 🔀 anagramma lampo */
  _anagramma(c, ui){
    const word = pick(DICT.anagram);
    const correct = word;
    let timeLeft = c.time;
    const sheet = `
      <button class="close" data-close>✕</button>
      <div class="result-hero"><div class="emoji">${c.emoji}</div><h2>${esc(c.name)}</h2><p>Riordina le lettere: <b>${this._shuffle(word)}</b></p></div>
      <div class="mg-timer">⏱️ <b data-timer>${timeLeft}s</b></div>
      <input class="mg-input" data-input placeholder="Scrivi la parola…" autocomplete="off">
      <button class="btn green mt" data-go>Indovina!</button>`;
    ui.openModal(sheet);
    const mod = $id('modal');
    const close = () => { clearInterval(iv); ui.closeModal(); };
    mod.querySelector('[data-close]').addEventListener('click', close);
    const iv = setInterval(() => {
      timeLeft--;
      const el = mod.querySelector('[data-timer]');
      if (el) el.textContent = timeLeft + 's';
      if (timeLeft <= 0){ clearInterval(iv); this._finish({ word:'', expected: correct, timeLeft: 0 }); }
    }, 1000);
    mod.querySelector('[data-go]').addEventListener('click', () => {
      const val = (mod.querySelector('[data-input]').value || '').toLowerCase().trim();
      if (val === correct){ clearInterval(iv); this._finish({ word: val, expected: correct, timeLeft }); }
      else { audio.sad(); ui.toast('No… quelle lettere fanno un\'altra parola.'); }
    });
  },

  /* 🔗 catena di parole */
  _catena(c, ui){
    const used = new Set();
    let current = pick(DICT.chainStart).toLowerCase();
    let chains = 0;
    const sheet = `
      <button class="close" data-close>✕</button>
      <div class="result-hero"><div class="emoji">${c.emoji}</div><h2>${esc(c.name)}</h2></div>
      <p>Anello <b data-n>1</b>/${c.chains} — ultima parola: <b data-cur>${current.toUpperCase()}</b></p>
      <p class="sub">Continua con una parola che inizia con <b>${current.slice(-1).toUpperCase()}</b></p>
      <input class="mg-input" data-input placeholder="Prossima parola…" autocomplete="off">
      <button class="btn green mt" data-go>Catena!</button>`;
    ui.openModal(sheet);
    const mod = $id('modal');
    const close = () => { clearInterval(iv); ui.closeModal(); };
    mod.querySelector('[data-close]').addEventListener('click', close);
    const iv = setInterval(() => {
      const el = mod.querySelector('[data-timer]');
      if (el) el.textContent = cooldownLeft(c.id) + 's';
    }, 1000);
    const next = () => {
      const el = mod.querySelector('[data-cur]');
      const en = mod.querySelector('[data-n]');
      if (el) el.textContent = current.toUpperCase();
      if (en) en.textContent = (chains + 1);
    };
    mod.querySelector('[data-go]').addEventListener('click', () => {
      const val = (mod.querySelector('[data-input]').value || '').toLowerCase().trim();
      const last = current.slice(-1);
      if (!val || val[0] !== last) return ui.toast('Deve iniziare con "' + last.toUpperCase() + '".');
      if (val.length < 4) return ui.toast('Almeno 4 lettere, questa è una catena seria.');
      if (!DICT.set[val]) return ui.toast('"' + val.toUpperCase() + '" non è nel vocabolario del gioco.');
      if (used.has(val)) return ui.toast('Già usata. Il vocabolario è vasto, osa.');
      used.add(val);
      current = val;
      chains++;
      audio.tick();
      mod.querySelector('[data-input]').value = '';
      if (chains >= c.chains){ clearInterval(iv); this._finish({ chains }); }
      else next();
    });
  },

  /* ⚡ dattilo-fulmine */
  _dattilo(c, ui){
    const word = pick(DICT.typing);
    const t0 = Date.now();
    const sheet = `
      <button class="close" data-close>✕</button>
      <div class="result-hero"><div class="emoji">${c.emoji}</div><h2>${esc(c.name)}</h2></div>
      <div class="mg-bigword">${word.toUpperCase()}</div>
      <input class="mg-input" data-input placeholder="Scrivila! Vai!" autocomplete="off">
      <button class="btn green mt" data-go>Conferma</button>`;
    ui.openModal(sheet);
    const mod = $id('modal');
    const close = () => ui.closeModal();
    mod.querySelector('[data-close]').addEventListener('click', close);
    mod.querySelector('[data-go]').addEventListener('click', () => {
      const val = (mod.querySelector('[data-input]').value || '').toLowerCase().trim();
      if (val === word){
        const sec = (Date.now() - t0) / 1000;
        this._finish({ time: sec });
      }else{
        audio.sad();
        ui.toast('Non è quella! Guarda bene: ' + word.toUpperCase());
      }
    });
    mod.querySelector('[data-input]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') mod.querySelector('[data-go]').click();
    });
  },

  /* 😵 impiccato */
  _impiccato(c, ui){
    const chosen = pick(DICT.hangman);
    const word = chosen.w;
    const hint = chosen.hint;
    let wrong = 0;
    const found = {};
    const sheet = `
      <button class="close" data-close>✕</button>
      <div class="result-hero"><div class="emoji">${c.emoji}</div><h2>${esc(c.name)}</h2></div>
      <p class="sub">Indizio: ${esc(hint)}</p>
      <div class="mg-word mg-hang" data-word></div>
      <div class="mg-hang-figure" data-fig>😊</div>
      <input class="mg-input" data-input placeholder="Una lettera…" maxlength="1" autocomplete="off">
      <button class="btn green mt" data-go>Prova</button>`;
    ui.openModal(sheet);
    const mod = $id('modal');
    const close = () => ui.closeModal();
    mod.querySelector('[data-close]').addEventListener('click', close);
    const wordEl = mod.querySelector('[data-word]');
    const figEl = mod.querySelector('[data-fig]');
    const render = () => {
      wordEl.textContent = word.split('').map(ch => (found[ch] ? ch.toUpperCase() : '_')).join(' ');
      figEl.textContent = ['😊','😐','😟','😨','😱','💀','⚰️'][Math.min(6, wrong)];
    };
    render();
    const finish = (win) => { this._finish({ win }); };
    mod.querySelector('[data-go]').addEventListener('click', () => {
      const ch = (mod.querySelector('[data-input]').value || '').toLowerCase();
      if (!ch) return;
      mod.querySelector('[data-input]').value = '';
      if (word.indexOf(ch) !== -1){
        found[ch] = true;
        audio.tick();
        render();
        if (word.split('').every(l => found[l])) finish(true);
      }else{
        wrong++;
        audio.sad();
        render();
        if (wrong >= c.guesses) finish(false);
      }
    });
  }
};