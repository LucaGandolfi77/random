/* board.js — motore match-3 swap 8x8, touch-first */
(function () {
'use strict';
/* Spazi di valore: [0..TILE_COUNT) semplice · +BLOOM_BASE bocciolo · +FROZEN_BASE gelo · INK */
const BLOOM_BASE = 10, FROZEN_BASE = 20, INK = 30;
class MHBoard {
  constructor(el, opts = {}) {
    this.el = el;
    this.size = 8;
    this.grid = [];
    this.sel = null;
    this.moves = opts.moves ?? 22;
    this.targetTile = opts.targetTile ?? 0;
    this.targetCount = opts.targetCount ?? 15;
    this.collected = 0;
    this.score = 0; // schiuma %
    this.combo = 0;
    this.over = false;
    this.onUpdate = opts.onUpdate || (() => {});
    this.onWin = opts.onWin || (() => {});
    this.onLose = opts.onLose || (() => {});
    this.biasTile = opts.biasTile ?? -1; // rabbia Ren: più Kurogoma
    this.mechanic = opts.mechanic || null; // 'bloom' | 'gelo' | 'ink' | 'mix'
    this.bloomRate = opts.bloomRate ?? 0.12;
    this.frozenRate = opts.frozenRate ?? ((this.mechanic === 'gelo' || this.mechanic === 'mix') ? 0.10 : 0);
    this.inkCount = opts.inkCount ?? (this.mechanic === 'ink' ? 4 : 0);
    this.inkEvery = opts.inkEvery ?? 3;
    this.inkMax = opts.inkMax ?? 12;
    this.inkTick = 0;
    this.quota = opts.quota ?? 0; // % schiuma minima per vincere
    this.skin = opts.skin || 'canon';
    this.build();
    this.seedInk();
  }
  isBloom(v) { return v >= BLOOM_BASE && v < BLOOM_BASE + window.MHTiles.TILE_COUNT; }
  isPlain(v) { return v >= 0 && v < window.MHTiles.TILE_COUNT; }
  isFrozen(v) { return v >= FROZEN_BASE && v < FROZEN_BASE + window.MHTiles.TILE_COUNT; }
  isInk(v) { return v === INK; }
  movable(v) { return v >= 0 && v < FROZEN_BASE; } // solo i boccioli si spostano; gelo e inchiostro no
  rnd() {
    if ((this.mechanic === 'bloom' || this.mechanic === 'mix') && Math.random() < this.bloomRate) {
      return BLOOM_BASE + Math.floor(Math.random() * window.MHTiles.TILE_COUNT);
    }
    if ((this.mechanic === 'gelo' || this.mechanic === 'mix') && Math.random() < this.frozenRate) {
      return FROZEN_BASE + Math.floor(Math.random() * window.MHTiles.TILE_COUNT);
    }
    if (this.biasTile >= 0 && Math.random() < 0.28) return this.biasTile;
    return Math.floor(Math.random() * window.MHTiles.TILE_COUNT);
  }
  build() {
    this.el.innerHTML = '';
    this.cells = []; this.rows = [];
    do { this.grid = Array.from({ length: this.size }, () => Array.from({ length: this.size }, () => this.rnd())); }
    while (this.findMatches().length > 0);
    /* role="grid" esige che i gridcell siano dentro role="row": senza righe
       reali l'ARIA è invalido e gli screen reader annunciano una tabella
       non operabile. E le celle devono essere navigabili da tastiera. */
    for (let r = 0; r < this.size; r++) {
      const row = document.createElement('div');
      row.className = 'board-row'; row.setAttribute('role', 'row');
      for (let c = 0; c < this.size; c++) {
        const d = document.createElement('div');
        d.className = 'tile'; d.setAttribute('role', 'gridcell');
        d.tabIndex = (r === 0 && c === 0) ? 0 : -1;
        d.dataset.r = r; d.dataset.c = c;
        row.appendChild(d); this.cells.push(d);
      }
      this.rows.push(row); this.el.appendChild(row);
    }
    this.cur = { r: 0, c: 0 };
    this.render(); this.bindSwipe(); this.onUpdate(this.state());
  }
  cell(r, c) { return this.cells[r * this.size + c]; }
  glyphOf(v, set) {
    if (v === -1) return '';
    if (this.isBloom(v)) return '🌱';
    if (this.isFrozen(v)) return '🧊';
    if (this.isInk(v)) return '⬛';
    return (set[v] && set[v].emoji) || '❓';
  }
  render() {
    const set = (window.MHTiles.SKINS && window.MHTiles.SKINS[this.skin]) || window.MHTiles.TILES;
    for (let r = 0; r < this.size; r++) for (let c = 0; c < this.size; c++) {
      const d = this.cell(r, c), v = this.grid[r][c];
      const g = this.glyphOf(v, set);
      d.textContent = g;
      d.setAttribute('aria-label', `${r + 1},${c + 1} ${g || 'vuota'}`);
      d.style.background = v === -1 ? 'transparent' : '';
      const on = this.sel && this.sel.r === r && this.sel.c === c;
      d.classList.toggle('sel', !!on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }
  /* --- tastiera: navigazione a griglia roving tabindex --- */
  moveCur(dr, dc) {
    const r = Math.min(this.size - 1, Math.max(0, this.cur.r + dr));
    const c = Math.min(this.size - 1, Math.max(0, this.cur.c + dc));
    if (r === this.cur.r && c === this.cur.c) return;
    const from = this.cell(this.cur.r, this.cur.c);
    from.tabIndex = -1;
    this.cur = { r, c };
    const to = this.cell(r, c);
    to.tabIndex = 0;
    to.focus({ preventScroll: true });
  }
  bindKeys() {
    const on = (key, fn, opts) => { this.el.addEventListener(key, fn, opts); this._off.push(() => this.el.removeEventListener(key, fn, opts)); };
    on('keydown', (e) => {
      if (this.over) return;
      const k = e.key;
      if (k === 'ArrowUp') { e.preventDefault(); this.moveCur(-1, 0); return; }
      if (k === 'ArrowDown') { e.preventDefault(); this.moveCur(1, 0); return; }
      if (k === 'ArrowLeft') { e.preventDefault(); this.moveCur(0, -1); return; }
      if (k === 'ArrowRight') { e.preventDefault(); this.moveCur(0, 1); return; }
      if (k === 'Enter' || k === ' ' || k === 'Spacebar') { e.preventDefault(); this.tap(this.cur.r, this.cur.c); return; }
      if (k === 'Escape' && this.sel) { e.preventDefault(); this.sel = null; this.render(); }
    });
  }
  seedInk() {
    // macchie d'inchiostro iniziali sparse, mai adiacenti tra loro
    let placed = 0, guard = 0;
    while (placed < this.inkCount && guard++ < 300) {
      const r = Math.floor(Math.random() * this.size), c = Math.floor(Math.random() * this.size);
      if (this.grid[r][c] === INK) continue;
      let adj = false;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (this.inBounds(nr, nc) && this.grid[nr][nc] === INK) { adj = true; break; }
      }
      if (adj) continue;
      this.grid[r][c] = INK; placed++;
    }
    if (placed) this.render();
  }
  spreadInk() {
    // ogni inkEvery mosse l'inchiostro macchia un vicino (mai oltre inkMax)
    const inks = [];
    for (let r = 0; r < this.size; r++) for (let c = 0; c < this.size; c++) {
      if (this.grid[r][c] === INK) inks.push([r, c]);
    }
    if (!inks.length || inks.length >= this.inkMax) return;
    const [r, c] = inks[Math.floor(Math.random() * inks.length)];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5);
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (this.inBounds(nr, nc) && this.isPlain(this.grid[nr][nc])) { this.grid[nr][nc] = INK; break; }
    }
    this.render();
  }
  /* B3: #board è un nodo persistente e veniva ri-bindato a ogni livello.
     Le arrow function erano nuove a ogni build() → nessun dedupe di
     addEventListener → 1 swipe lanciava N trySwap(), e le copie eccedenti
     annullavano lo swap valido. Qui: un solo set di handler, rimosso
     esplicitamente a ogni ri-bind e in destroy(). */
  bindSwipe() {
    this.unbindSwipe();
    const off = (this._off = []);
    let start = null;
    const on = (type, fn, opts) => { this.el.addEventListener(type, fn, opts); off.push(() => this.el.removeEventListener(type, fn, opts)); };
    const tileAt = (t) => (t && t.closest ? t.closest('.tile') : null);

    on('pointerdown', (e) => {
      const t = tileAt(e.target); if (!t) return;
      start = { r: +t.dataset.r, c: +t.dataset.c, x: e.clientX, y: e.clientY };
      this.tap(+t.dataset.r, +t.dataset.c);
    });
    on('pointerup', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      const r = start.r, c = start.c;
      start = null;
      if (Math.abs(dx) > 18 || Math.abs(dy) > 18) {
        let nr = 0, nc = 0;
        if (Math.abs(dx) > Math.abs(dy)) nc = dx > 0 ? 1 : -1; else nr = dy > 0 ? 1 : -1;
        this.sel = null; this.render();       // uno swipe non lascia selezione pendente
        this.trySwap(r, c, r + nr, c + nc);
      }
    });
    on('pointercancel', () => { start = null; });
    this.bindKeys();
  }
  unbindSwipe() {
    if (this._off) { this._off.forEach((fn) => fn()); this._off = null; }
  }
  destroy() {
    this.unbindSwipe();
    this.over = true;
    this.sel = null;
  }
  tap(r, c) {
    if (this.over) return;
    if (!this.sel) { this.sel = { r, c }; window.MHAudio.swapSnd(); this.render(); return; }
    const s = this.sel;
    if (s.r === r && s.c === c) { this.sel = null; this.render(); return; }
    if (Math.abs(s.r - r) + Math.abs(s.c - c) === 1) { this.sel = null; this.trySwap(s.r, s.c, r, c); }
    else { this.sel = { r, c }; this.render(); }
  }
  inBounds(r, c) { return r >= 0 && c >= 0 && r < this.size && c < this.size; }
  async trySwap(r1, c1, r2, c2) {
    if (!this.inBounds(r2, c2) || this.over) return;
    if (!this.movable(this.grid[r1][c1]) || !this.movable(this.grid[r2][c2])) {
      // 🧊 gelo e ⬛ inchiostro non si spostano: si sciolgono/puliscono coi match vicini
      window.MHAudio.badSnd();
      if (navigator.vibrate) try { navigator.vibrate(30); } catch {}
      return;
    }
    [this.grid[r1][c1], this.grid[r2][c2]] = [this.grid[r2][c2], this.grid[r1][c1]];
    this.render();
    let m = this.findMatches();
    if (!m.length) {
      [this.grid[r1][c1], this.grid[r2][c2]] = [this.grid[r2][c2], this.grid[r1][c1]];
      this.render(); window.MHAudio.badSnd();
      if (navigator.vibrate) try { navigator.vibrate(30); } catch {}
      return;
    }
    this.moves--; window.MHAudio.swapSnd();
    await this.resolve(m);
    // ⬛ l'inchiostro avanza ogni inkEvery mosse (solo se la partita continua)
    if (this.mechanic === 'ink' && !this.over) {
      this.inkTick++;
      if (this.inkTick % this.inkEvery === 0) this.spreadInk();
    }
    this.checkEnd();
    this.onUpdate(this.state());
  }
  findMatches() {
    // solo tessere semplici matchano: i 🌱 boccioli (10+t) sbocciano per adiacenza
    const S = this.size, out = [];
    for (let r = 0; r < S; r++) {
      let run = 1;
      for (let c = 1; c <= S; c++) {
        if (c < S && this.isPlain(this.grid[r][c]) && this.grid[r][c] === this.grid[r][c - 1]) run++;
        else { if (run >= 3) for (let k = c - run; k < c; k++) out.push([r, k]); run = 1; }
      }
    }
    for (let c = 0; c < S; c++) {
      let run = 1;
      for (let r = 1; r <= S; r++) {
        if (r < S && this.isPlain(this.grid[r][c]) && this.grid[r][c] === this.grid[r - 1][c]) run++;
        else { if (run >= 3) for (let k = r - run; k < r; k++) out.push([k, c]); run = 1; }
      }
    }
    return [...new Map(out.map(p => [p[0] + ',' + p[1], p])).values()];
  }
  async resolve(first) {
    let matches = first, chain = 0;
    while (matches.length && !this.over) {
      chain++; this.combo = chain;
      for (const [r, c] of matches) {
        const v = this.grid[r][c];
        if (v === this.targetTile) this.collected++;
        this.grid[r][c] = -1;
        const d = this.cell(r, c); d.classList.add('pop');
      }
      window.MHAudio.pop(chain);
      if (navigator.vibrate && chain >= 2) try { navigator.vibrate(20 * chain); } catch {}
      window.MHCombo?.(chain);
      // 🌱 i boccioli adiacenti a un match sbocciano: diventano la tessera sotto e valgono doppio
      // 🧊 il gelo adiacente si scioglie (vale 1) · ⬛ l'inchiostro adiacente si pulisce
      let hatched = 0, thawed = 0, cleaned = 0;
      if (this.mechanic === 'bloom' || this.mechanic === 'mix' || this.mechanic === 'gelo' || this.mechanic === 'ink') {
        for (const [r, c] of matches) {
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr, nc = c + dc;
            if (!this.inBounds(nr, nc)) continue;
            const nv = this.grid[nr][nc];
            if (this.isBloom(nv) && (this.mechanic === 'bloom' || this.mechanic === 'mix')) {
              const hid = nv - BLOOM_BASE;
              this.grid[nr][nc] = hid;
              if (hid === this.targetTile) this.collected += 2;
              hatched++;
            } else if (this.isFrozen(nv) && (this.mechanic === 'gelo' || this.mechanic === 'mix')) {
              const hid = nv - FROZEN_BASE;
              this.grid[nr][nc] = hid;
              if (hid === this.targetTile) this.collected += 1;
              thawed++;
            } else if (this.isInk(nv) && this.mechanic === 'ink') {
              this.grid[nr][nc] = Math.floor(Math.random() * window.MHTiles.TILE_COUNT);
              cleaned++;
            }
          }
        }
        if (hatched > 0) { this.score = Math.min(100, this.score + hatched * 2); window.MHAudio.whisk(); }
        if (thawed > 0 || cleaned > 0) { this.score = Math.min(100, this.score + (thawed + cleaned) * 2); window.MHAudio.whisk(); }
      }
      this.score = Math.min(100, this.score + matches.length * 2 + chain * 3);
      this.render();
      await new Promise(res => setTimeout(res, 240));
      // gravità
      for (let c = 0; c < this.size; c++) {
        let write = this.size - 1;
        for (let r = this.size - 1; r >= 0; r--) {
          if (this.grid[r][c] !== -1) { this.grid[write][c] = this.grid[r][c]; if (write !== r) this.grid[r][c] = -1; write--; }
        }
        for (let r = write; r >= 0; r--) this.grid[r][c] = this.rnd();
      }
      this.render();
      await new Promise(res => setTimeout(res, 160));
      matches = this.findMatches();
      this.onUpdate(this.state());
    }
    this.combo = 0;
  }
  state() { return { moves: this.moves, collected: this.collected, need: this.targetCount, score: this.score, over: this.over, quota: this.quota, quotaMet: this.score >= (this.quota || 0) }; }
  checkEnd() {
    const q = this.quota || 0;
    if (this.collected >= this.targetCount && this.score >= q) { this.over = true; window.MHAudio.chime(); this.onWin(this.state()); }
    else if (this.moves <= 0) { this.over = true; this.onLose(this.state()); }
  }
  booster(kind) {
    if (this.over) return false;
    const S = this.size;
    if (kind === 'chasen') {
      /* B4: guardia esplicita — il while precedente non terminava mai
         su un board già saturo di targetTile (freeze della UI). */
      let n = 0, guard = 0;
      while (n < 8 && guard++ < 200) {
        const r = Math.floor(Math.random() * S), c = Math.floor(Math.random() * S);
        if (this.grid[r][c] !== this.targetTile) { this.grid[r][c] = this.targetTile; n++; }
      }
      if (n === 0) return false;
      window.MHAudio.whisk();
    } else {
      const r = Math.floor(Math.random() * S), c = Math.floor(Math.random() * S);
      this.grid[r][c] = this.targetTile;
      this.grid[(r + 3) % S][c] = this.targetTile;
      this.grid[r][(c + 3) % S] = this.targetTile;
      window.MHAudio.chime();
    }
    this.render();
    const m = this.findMatches();
    if (m.length) this.resolve(m).then(() => { this.checkEnd(); this.onUpdate(this.state()); });
    else this.onUpdate(this.state());
    return true;
  }
}
window.MHBoard = MHBoard;
})();
