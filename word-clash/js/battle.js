/* BATTLE — battaglia in tempo reale contro una libreria rivale.
   Logica pura in step(dt) (testabile in Node), rendering DOM opzionale via render(). */
'use strict';

const battle = {
  _s: null,
  _unitId: 0,
  _raf: 0,

  start(rivalId){
    const rival = getRival(rivalId);
    if (!rival) return null;
    if (catalogoLevel() < rival.needCatalogo) return null;
    const s = this._s = {
      rival,
      cols: 10, rows: 7, cell: 44,
      timeLeft: BALANCE.battleDuration,
      buildings: [], units: [],
      deployed: 0, capacity: warCapacity(),
      over: false, freeUsed: false,
      destroyedHp: 0, totalHp: 0, loot: 0,
      _els: null
    };
    this._layout(rival);
    return s;
  },

  _layout(rival){
    const s = this._s;
    const sp = rival.spec;
    const cellCenter = (r, c) => ({ x: c * s.cell + s.cell / 2, y: r * s.cell + s.cell / 2 });

    const mk = (key, id, name, emoji, r, c, hp, size, extra) => {
      const pos = cellCenter(r, c);
      const half = (s.cell * (size || 1)) / 2;
      const b = Object.assign({
        key, id, name, emoji, level: 0,
        x: pos.x, y: pos.y, w: half * 2, h: half * 2,
        hp, maxHp: hp, destroyed: false, coinValue: 0,
        wall: false, dps: 0, slow: 0, range: 0
      }, extra);
      s.buildings.push(b);
      s.totalHp += hp;
    };

    const wallHp = getBuilding('muro').wallHp[Math.max(0, (sp.muroLv || 1) - 1)];

    /* perimetro: muri */
    const perim = [];
    for (let c = 0; c < s.cols; c++){ perim.push([0, c]); perim.push([s.rows - 1, c]); }
    for (let r = 1; r < s.rows - 1; r++){ perim.push([r, 0]); perim.push([r, s.cols - 1]); }
    const walls = Math.min(sp.muro || 0, perim.length);
    for (let i = 0; i < walls; i++){
      const [r, c] = perim[i];
      mk('wall' + i, 'muro', 'Muro di Enciclopedie', '🧱', r, c, wallHp, 1, { wall: true, coinValue: Math.floor(rival.loot * 0.01) });
    }

    /* catalogo centrale (2×2) */
    mk('cat', 'catalogo', 'Catalogo Centrale', '🏛️', 2.25, 3.5, 300 + (sp.catalogo || 1) * 150, 2,
      { coinValue: Math.floor(rival.loot * 0.3), level: sp.catalogo || 1 });

    /* difese: torrette ai quattro angoli interni */
    const towerSlots = [[1, 1], [1, 8], [5, 1], [5, 8]];
    const towers = Math.min(sp.torretta || 0, towerSlots.length);
    const tDps = getBuilding('torretta').dps[Math.max(0, (sp.torretta || 0) - 1)] || 0;
    for (let i = 0; i < towers; i++){
      const [r, c] = towerSlots[i];
      mk('tor' + i, 'torretta', 'Torretta del Correttore', '🎯', r, c, 140 + (sp.torretta || 1) * 40, 1,
        { dps: tDps, range: 120, coinValue: Math.floor(rival.loot * 0.05) });
    }

    /* trappole */
    const trapSlots = [[3, 1], [3, 8], [2, 1], [2, 8]];
    const traps = Math.min(sp.trappola || 0, trapSlots.length);
    const tSlow = getBuilding('trappola').slow[Math.max(0, (sp.trappola || 0) - 1)] || 0;
    for (let i = 0; i < traps; i++){
      const [r, c] = trapSlots[i];
      mk('trap' + i, 'trappola', 'Trappola Grammaticale', '🕸️', r, c, 60, 1,
        { slow: tSlow, coinValue: Math.floor(rival.loot * 0.05) });
    }

    /* produzione: lo spec rivale usa nomi corti (banco, caffe…) → mappa agli id edificio */
    const prodId = { banco: 'banco_prestito', caffe: 'caffe', edicola: 'edicola', cassaforte: 'cassaforte' };
    const prodSlots = { banco_prestito: [1, 2], caffe: [1, 5], edicola: [2, 6], cassaforte: [3, 6] };
    const prodNames = { banco_prestito: 'Banco di Prestito', caffe: 'Caffè Letterario', edicola: 'Edicola Fumetti', cassaforte: 'Cassaforte di Note' };
    const prodEmoji = { banco_prestito: '📚', caffe: '☕', edicola: '🦸', cassaforte: '🔐' };
    const prodWeight = { banco_prestito: 0.1, caffe: 0.08, edicola: 0.12, cassaforte: 0.12 };
    for (const specKey in prodId){
      const lv = sp[specKey] || 0;
      if (lv <= 0) continue;
      const id = prodId[specKey];
      const [r, c] = prodSlots[id];
      mk(id, id, prodNames[id], prodEmoji[id], r, c, 120 + lv * 40, 1,
        { coinValue: Math.floor(rival.loot * prodWeight[id]), level: lv });
    }
  },

  deployAt(wordId, r, c){
    const s = this._s;
    if (!s || s.over) return { ok:false, reason:'Battaglia finita.' };
    if (s.deployed >= s.capacity) return { ok:false, reason:'Capienza del Quaderno esaurita.' };
    if (!G.army[wordId] || G.army[wordId] <= 0) return { ok:false, reason:'Nessuna ' + wordId.toUpperCase() + ' addestrata.' };
    G.army[wordId]--;
    const stats = computeWordStats(getWord(wordId));
    this._spawn(stats, r, c);
    return { ok:true };
  },

  deployFree(word, r, c){
    const s = this._s;
    if (!s || s.over) return { ok:false, reason:'Battaglia finita.' };
    if (s.freeUsed) return { ok:false, reason:'La Parola Libera si usa una volta sola.' };
    if (s.deployed >= s.capacity) return { ok:false, reason:'Capienza del Quaderno esaurita.' };
    const v = validateFreeWord(word);
    if (!v.ok) return { ok:false, reason:v.reason };
    s.freeUsed = true;
    const stats = computeWordStats(v.word);
    this._spawn(stats, r, c);
    return { ok:true, stats };
  },

  _spawn(stats, r, c){
    const s = this._s;
    const u = {
      id: ++this._unitId,
      stats,
      word: stats.word,
      emoji: stats.emoji,
      x: c * s.cell + s.cell / 2,
      y: r * s.cell + s.cell / 2,
      hp: stats.hp,
      target: null,
      attackTimer: 0,
      slow: 1,
      dead: false
    };
    s.units.push(u);
    s.deployed++;
    audio.pop();
    return u;
  },

  _aliveBuildings(){ return this._s.buildings.filter(b => !b.destroyed); },

  step(dt){
    const s = this._s;
    if (!s || s.over) return true;
    s.timeLeft -= dt;

    const buildings = this._aliveBuildings();
    if (!buildings.length) this._finish();
    if (s.timeLeft <= 0) this._finish();
    if (s.over) return true;

    for (const u of s.units){
      if (u.dead) continue;
      /* lentezza da trappola */
      let slow = 1;
      for (const b of buildings){
        if (b.slow > 0){
          const dx = u.x - b.x, dy = u.y - b.y;
          if (dx * dx + dy * dy < 55 * 55) slow = Math.max(slow, 1 - b.slow);
        }
      }
      u.slow = slow;

      /* bersaglio: edificio vivo più vicino */
      if (!u.target || u.target.destroyed){
        u.target = null;
        let best = null, bd = Infinity;
        for (const b of buildings){
          const d = (u.x - b.x) * (u.x - b.x) + (u.y - b.y) * (u.y - b.y);
          if (d < bd){ bd = d; best = b; }
        }
        u.target = best;
      }
      if (!u.target) continue;

      const reach = u.stats.range + u.target.w / 2;
      const dx = u.target.x - u.x, dy = u.target.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= reach){
        u.attackTimer -= dt;
        if (u.attackTimer <= 0){
          u.attackTimer = 1 / u.stats.attackRate;
          let dmg = u.stats.dps;
          if (u.stats.crit > 0 && chance(u.stats.crit)) dmg *= 2;
          u.target.hp -= dmg;
          if (u.stats.splash){
            for (const b of buildings){
              if (b === u.target) continue;
              const dd = (u.target.x - b.x) * (u.target.x - b.x) + (u.target.y - b.y) * (u.target.y - b.y);
              if (dd < u.stats.splashRadius * u.stats.splashRadius) b.hp -= dmg * 0.5;
            }
          }
          audio.hit();
        }
      }else{
        u.x += (dx / dist) * u.stats.speed * u.slow * dt;
        u.y += (dy / dist) * u.stats.speed * u.slow * dt;
      }
    }

    /* difese nemiche: torrette */
    for (const b of buildings){
      if (b.dps <= 0) continue;
      let best = null, bd = b.range * b.range;
      for (const u of s.units){
        if (u.dead) continue;
        const dx = u.x - b.x, dy = u.y - b.y;
        const d = dx * dx + dy * dy;
        if (d < bd){ bd = d; best = u; }
      }
      if (best) best.hp -= b.dps * dt;
    }

    /* pulizia */
    for (const u of s.units){
      if (u.hp <= 0){
        u.dead = true;
        G.stats.wordsKilled++;
        audio.pop();
      }
    }
    for (const b of s.buildings){
      if (b.destroyed) continue;
      if (b.hp <= 0){
        b.destroyed = true;
        s.destroyedHp += b.maxHp;
        s.loot += b.coinValue;
        audio.boom();
      }
    }
    s.units = s.units.filter(u => !u.dead);
    this._destroyed = s.buildings.filter(b => b.destroyed).length;
    if (!this._aliveBuildings().length) this._finish();

    return s.over;
  },

  _finish(){
    const s = this._s;
    if (!s) return;
    s.over = true;
  },

  result(){
    const s = this._s;
    const pct = s.totalHp > 0 ? s.destroyedHp / s.totalHp : 0;
    let stars = 0;
    for (let i = 0; i < BALANCE.starThresholds.length; i++) if (pct >= BALANCE.starThresholds[i]) stars = i + 1;
    return { stars, pct, loot: s.loot, dobloni: stars >= 3 ? s.rival.dobloni : 0, timeLeft: Math.max(0, s.timeLeft) };
  },

  end(){
    const s = this._s;
    if (!s) return null;
    const r = this.result();
    addCoins(r.loot);
    if (r.dobloni > 0) addDobloni(r.dobloni);
    G.stats.battles++;
    if (r.stars >= 1) G.stats.wins++;
    if (r.stars >= 3) G.stats.threeStars++;
    const icon = r.stars >= 3 ? '🏆' : r.stars >= 1 ? '⭐' : '💔';
    addLog(icon, (r.stars >= 3 ? '3 stelle su ' : 'Assalto a ') + s.rival.name + ': ' + r.stars + '⭐, +€' + fmt(r.loot) + (r.dobloni ? ' e 💛' + r.dobloni : '') + '.');
    const res = { stars: r.stars, loot: r.loot, dobloni: r.dobloni, rival: s.rival };
    this._s = null;
    return res;
  },

  /* ---- rendering DOM (solo browser) ---- */
  bindDom(ui){
    const s = this._s;
    if (!s) return;
    s._els = { units: new Map() };
    const field = $id('battle-field');
    s._els.field = field;
    field.innerHTML = '';
    for (const b of s.buildings){
      const el = document.createElement('div');
      el.className = 'bf-building' + (b.wall ? ' wall' : '');
      el.style.left = (b.x / (s.cols * s.cell) * 100) + '%';
      el.style.top = (b.y / (s.rows * s.cell) * 100) + '%';
      el.style.width = (b.w / (s.cols * s.cell) * 100) + '%';
      el.style.height = (b.h / (s.rows * s.cell) * 100) + '%';
      el.innerHTML = `<div class="bf-icon">${b.emoji}</div><div class="bf-hp"><i></i></div>`;
      b._el = el;
      field.appendChild(el);
    }
    ui._bindFieldDeploy();
  },

  render(){
    const s = this._s;
    if (!s || !s._els) return;
    const fw = s.cols * s.cell, fh = s.rows * s.cell;
    for (const b of s.buildings){
      if (!b._el) continue;
      const pct = Math.max(0, b.hp / b.maxHp);
      b._el.querySelector('.bf-hp i').style.width = (pct * 100) + '%';
      b._el.classList.toggle('dead', b.destroyed);
    }
    const seen = new Set();
    for (const u of s.units){
      seen.add(u.id);
      let el = s._els.units.get(u.id);
      if (!el){
        el = document.createElement('div');
        el.className = 'bf-unit';
        el.textContent = u.emoji;
        el.innerHTML = `${u.emoji}<div class="bf-uhp"><i></i></div>`;
        s._els.field.appendChild(el);
        s._els.units.set(u.id, el);
      }
      el.style.left = (u.x / fw * 100) + '%';
      el.style.top = (u.y / fh * 100) + '%';
      const upct = Math.max(0, u.hp / u.stats.hp);
      el.querySelector('.bf-uhp i').style.width = (upct * 100) + '%';
    }
    for (const [id, el] of s._els.units){
      if (!seen.has(id)) el.remove();
    }
  },

  startLoop(ui){
    if (typeof requestAnimationFrame === 'undefined') return;
    const s = this._s;
    if (!s) return;
    let last = 0;
    const frame = (t) => {
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
      last = t;
      this.step(dt);
      this.render();
      if (s.over){
        this._raf = 0;
        if (ui) ui._onBattleEnd();
        return;
      }
      this._raf = requestAnimationFrame(frame);
    };
    this._raf = requestAnimationFrame(frame);
  },

  cancel(){
    if (this._raf){ cancelAnimationFrame(this._raf); this._raf = 0; }
    this._s = null;
  }
};