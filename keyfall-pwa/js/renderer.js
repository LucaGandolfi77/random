/*
 * Keyfall — Canvas renderer: falling tiles onto a horizontal piano.
 * DPI-aware 2D canvas, zero dependencies.
 *
 * API:
 *   new KeyfallRenderer(canvas)
 *   setSong(song) / clearSong()
 *   setSettings(partial)      // { fitKeys, speed, scheme, transpose, labels }
 *   resize()                  // re-measure (call on window resize)
 *   draw(time, dt)            // render one frame; time = song seconds
 *   keyAt(cssX, cssY)         // midi under pointer inside keyboard zone (or null)
 *   get activeKeys()          // midi set currently sounding (for auditions/sync)
 *   visualEvent              // callback hook (optional): (type, midi, strength)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KeyfallRenderer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BLACK = new Set([1, 3, 6, 8, 10]);

  const SCHEMES = {
    aurora: ['#ff5d8f', '#ffb45e', '#ffe066', '#7ee081', '#38d6c0', '#4cc3ff', '#7a8cff', '#c07dff', '#ff7de1', '#8ce99a', '#ffa94d', '#74c0fc'],
    ember:   ['#ff6b35', '#ffd166', '#f7c948', '#ef476f', '#ff8fa3', '#faa916', '#e56b6f', '#ffb703', '#fb8500', '#d62828', '#f77f00', '#ffafcc'],
    ice:     ['#7df9ff', '#4cc9f0', '#90e0ef', '#b8f2e6', '#48cae4', '#a2d2ff', '#80ed99', '#bde0fe', '#8ecae6', '#6fffe9', '#5e60ce', '#64dfdf'],
  };

  function hslToRgb(h, s, l) { /* unused fallback */ }
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function withAlpha(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function lighten(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const f = (v) => Math.min(255, Math.round(v + (255 - v) * amt));
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (h <= 0 || w <= 0) return;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  const NOTENAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  class KeyfallRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dpr = 1;
      this.cssW = 0;
      this.cssH = 0;
      this.song = null;
      this.settings = { fitKeys: true, speed: 1, scheme: 'aurora', transpose: 0, labels: true };
      this.layout = null;
      this.flash = [];      // { time, midi }
      this.visualEvent = null;
      this.activeMidi = new Set();
      this.particles = [];
      this.lastT = -1;
      this._boundPointer = null;
    }

    setSettings(patch) {
      Object.assign(this.settings, patch);
      this.layoutDirty = true;
    }

    setSong(song) {
      this.song = song;
      this.layoutDirty = true;
      this.flash = [];
      this.activeMidi.clear();
    }

    clearSong() {
      this.song = null;
      this.layoutDirty = true;
      this.flash = [];
      this.activeMidi.clear();
    }

    resize() {
      const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
      this.cssW = Math.max(320, rect.width);
      this.cssH = Math.max(240, rect.height);
      this.dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
      this.canvas.width = Math.round(this.cssW * this.dpr);
      this.canvas.height = Math.round(this.cssH * this.dpr);
      this.layoutDirty = true;
    }

    keyRange() {
      const st = this.settings;
      let low, high;
      if (st.fitKeys && this.song && this.song.notes.length) {
        low = this.song.lowMidi + st.transpose;
        high = this.song.highMidi + st.transpose;
        // pad to octave + minimum span
        low = Math.max(12, Math.floor(low / 12) * 12);
        high = Math.min(120, Math.ceil((high + 1) / 12) * 12 - 1);
        if (high - low < 24) { const mid = (low + high) >> 1; low = Math.max(0, mid - 12); high = low + 24; }
      } else {
        low = 21; high = 108;
      }
      return { low, high };
    }

    buildLayout() {
      const W = this.cssW;
      const H = this.cssH;
      const kbH = Math.max(96, Math.min(210, H * 0.16));
      const keyTop = H - kbH;
      const { low, high } = this.keyRange();

      // count white keys below
      const whiteBelow = (midi) => {
        let c = 0;
        for (let m = low; m < midi; m++) if (!BLACK.has(m % 12)) c++;
        return c;
      };
      const whiteCount = whiteBelow(high + 1);
      const ww = W / whiteCount;
      const keyMap = new Map();
      let whiteIdx = 0;
      for (let m = low; m <= high; m++) {
        const black = BLACK.has(m % 12);
        const x = black ? (whiteIdx - 0.5) * ww + ww * 0.55 : whiteIdx * ww;
        keyMap.set(m, {
          midi: m,
          black,
          x,
          w: black ? ww * 0.62 : ww,
          whiteIdx: black ? whiteIdx - 1 : whiteIdx,
        });
        if (!black) whiteIdx++;
      }

      this.layout = { low, high, keyTop, kbH, ww, whiteCount, keyMap };
      this.layoutDirty = false;
      this.buildKeyCache();
    }

    buildKeyCache() {
      // Pre-render two full-width strips the height of the keyboard:
      //  - white strip: white-key gradient background + separators
      //  - black strip: transparent background with black-key silhouettes
      const ctx = this.ctx;
      const { keyTop, kbH, keyMap, ww } = this.layout;
      const W = Math.max(2, Math.ceil(this.cssW * this.dpr));
      const H = Math.max(2, Math.ceil(kbH * this.dpr));

      const mk = () => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        return c;
      };
      const scale = (c) => {
        const c2 = c.getContext('2d');
        c2.scale(this.dpr, this.dpr);
        return c2;
      };

      // white strip
      const white = mk();
      const wc = scale(white);
      const grad = wc.createLinearGradient(0, 0, 0, kbH);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.14, '#f5f2ec');
      grad.addColorStop(0.75, '#e7e1d6');
      grad.addColorStop(1, '#c9c2b6');
      wc.fillStyle = grad;
      wc.fillRect(0, 0, this.cssW, kbH);
      wc.strokeStyle = 'rgba(30,20,10,0.28)';
      wc.lineWidth = 1;
      wc.beginPath();
      for (const key of keyMap.values()) {
        if (key.black) continue;
        wc.moveTo(key.x + key.w + 0.5, 0);
        wc.lineTo(key.x + key.w + 0.5, kbH);
      }
      wc.stroke();

      // black strip (transparent background, silhouettes only)
      const black = mk();
      const bc = scale(black);
      for (const key of keyMap.values()) {
        if (!key.black) continue;
        const kx = key.x;
        const kw = key.w;
        const bg = bc.createLinearGradient(0, 0, 0, kbH);
        bg.addColorStop(0, '#262b3a');
        bg.addColorStop(0.08, '#3a4156');
        bg.addColorStop(0.6, '#20242f');
        bg.addColorStop(1, '#0b0c12');
        bc.fillStyle = bg;
        roundRect(bc, kx + 0.5, 1, kw - 1, kbH - 2, Math.min(3, kw * 0.18));
        bc.fill();
        bc.fillStyle = 'rgba(255,255,255,0.16)';
        roundRect(bc, kx + 1.5, 2.5, kw - 3, Math.max(2, kbH * 0.1), 2);
        bc.fill();
      }

      this.keyCache = { white, black, kbH };
    }

    /* draw one frame at song time `t` */
    draw(t, dt) {
      const ctx = this.ctx;
      if (this.layoutDirty || !this.layout) this.buildLayout();
      const L = this.layout;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.cssW, this.cssH);

      const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = this.settings;
      const scheme = SCHEMES[st.scheme] || SCHEMES.aurora;

      // px/sec so the default window shows ~2.2s of music above the keys
      const leadSec = 2.2 / Math.max(0.5, Math.min(2, st.speed));
      const pxPerSec = (L.keyTop - 4) / leadSec;

      // channel colours
      const channelColor = (ch) => scheme[(ch % scheme.length + scheme.length) % scheme.length];

      // ---- falling tiles ----
      const notes = this.song ? this.song.notes : [];
      const trans = st.transpose || 0;
      const lo = L.low, hi = L.high;
      const startArr = this._startArr || [];
      if (this.song !== this._songCache) {
        this._songCache = this.song;
        this._startArr = notes.map((n) => n.start);
      }
      const t0 = t - 0.03;
      const tEnd = t + leadSec + 1;

      const kMap = L.keyMap;
      const lowIdx = this.lowerBound(this._startArr, t0 - 0.001);
      const maxTile = Math.min(220, L.keyTop * 0.5);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = lowIdx; i < notes.length; i++) {
        const n = notes[i];
        if (n.start > tEnd) break;
        const m = n.midi + trans;
        if (m < lo || m > hi) continue;
        const key = kMap.get(m);
        if (!key) continue;

        const gap = key.black ? Math.max(1, key.w * 0.14) : Math.max(2, this.layout.ww * 0.06);
        const x = key.x + gap / 2;
        const bw = key.w - gap;

        if (n.start >= t) {
          // falling: tile top at its hit time
          const yTop = L.keyTop - (n.start - t) * pxPerSec;
          const hTile = Math.min(maxTile, Math.max(8, n.duration * pxPerSec));
          if (yTop + hTile < 0 || yTop > L.keyTop) continue;

          const col = channelColor(n.channel);
          const vel = Math.max(0.2, Math.min(1, n.velocity / 127));
          const grad = ctx.createLinearGradient(0, yTop, 0, yTop + hTile);
          grad.addColorStop(0, lighten(col, 0.35 + vel * 0.25));
          grad.addColorStop(1, col);
          ctx.globalAlpha = 0.55 + vel * 0.45;
          ctx.fillStyle = grad;
          ctx.shadowColor = withAlpha(col, 0.55);
          ctx.shadowBlur = reduce ? 0 : 10 + vel * 10;
          roundRect(ctx, x, yTop, bw, hTile, Math.min(8, bw * 0.3));
          ctx.fill();

          // inner gloss line
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = '#ffffff';
          roundRect(ctx, x + bw * 0.14, yTop + 3, bw * 0.72, Math.min(5, hTile * 0.16), 3);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }

      // ---- active (sounding) keys glow ----
      this.activeMidi.clear();
      const recentFlash = [];
      for (let i = lowIdx; i < notes.length; i++) {
        const n = notes[i];
        if (n.start > t) break;
        const m = n.midi + trans;
        if (m < lo || m > hi) continue;
        if (t < n.end && n.end > t - 0.02) this.activeMidi.add(m);
        if (t >= n.start && t - n.start < 0.28) recentFlash.push({ midi: m, channel: n.channel, age: t - n.start });
      }

      // ---- hit flashes (glow burst right at the key edge) ----
      for (const f of recentFlash) {
        const key = kMap.get(f.midi);
        if (!key) continue;
        const col = channelColor(f.channel);
        const k = f.age / 0.28;
        const rad = 16 + k * 54;
        ctx.globalAlpha = (1 - k) * 0.42;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(key.x + key.w / 2, L.keyTop - 2, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ---- keys ----
      this.drawKeyboard(L, t, scheme, channelColor, reduce);

      // frame time tracking for idle particle drift
      this.lastT = t;
    }

    drawKeyboard(L, t, scheme, channelColor, reduce) {
      const ctx = this.ctx;
      const { keyTop, kbH, keyMap } = L;

      // hit-line beam
      const beam = ctx.createLinearGradient(0, keyTop - 16, 0, keyTop + 2);
      beam.addColorStop(0, 'rgba(255,255,255,0)');
      beam.addColorStop(1, 'rgba(255,255,255,0.12)');
      ctx.fillStyle = beam;
      ctx.fillRect(0, keyTop - 16, this.cssW, 18);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, keyTop, this.cssW, kbH);
      ctx.clip();

      // white strip
      ctx.drawImage(this.keyCache.white, 0, keyTop, this.cssW, kbH);

      // glow on sounding keys (under black keys)
      const pulse = 0.5 + 0.5 * Math.sin((this.lastT || 0) * 14);
      for (const key of keyMap.values()) {
        if (key.black || !this.activeMidi.has(key.midi)) continue;
        ctx.fillStyle = withAlpha('#ffd166', 0.06 + 0.16 * pulse);
        ctx.fillRect(key.x, keyTop, key.w, kbH);
        const edge = ctx.createLinearGradient(0, keyTop, 0, keyTop + Math.min(26, kbH * 0.2));
        edge.addColorStop(0, withAlpha('#ffe9a8', 0.65));
        edge.addColorStop(1, withAlpha('#ffd166', 0.05));
        ctx.fillStyle = edge;
        ctx.fillRect(key.x + 1, keyTop, key.w - 2, Math.min(26, kbH * 0.2));
      }

      // black silhouettes
      ctx.drawImage(this.keyCache.black, 0, keyTop, this.cssW, kbH);

      // sounding black keys glow
      for (const key of keyMap.values()) {
        if (!key.black || !this.activeMidi.has(key.midi)) continue;
        ctx.fillStyle = withAlpha('#ffd166', 0.14 + 0.2 * pulse);
        roundRect(ctx, key.x + 1, keyTop + 1, key.w - 2, kbH - 2, Math.min(3, key.w * 0.18));
        ctx.fill();
        ctx.shadowColor = withAlpha('#ffd166', 0.85);
        ctx.shadowBlur = reduce ? 0 : 14 + pulse * 8;
        ctx.fillStyle = withAlpha('#fff3c4', 0.85);
        roundRect(ctx, key.x + 1.5, keyTop + 2, key.w - 3, Math.min(8, kbH * 0.1), 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // key labels on C
      if (this.settings.labels && L.ww >= 26) {
        ctx.fillStyle = 'rgba(70,55,20,0.5)';
        ctx.font = '600 ' + Math.min(12, L.ww * 0.3) + 'px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const key of keyMap.values()) {
          if (key.black) continue;
          const pc = ((key.midi % 12) + 12) % 12;
          if (pc === 0) {
            const oct = Math.floor(key.midi / 12) - 1;
            ctx.fillText('C' + oct, key.x + key.w / 2, keyTop + kbH - 13);
          }
        }
      }
      ctx.restore();

      // top edge light
      const edge = ctx.createLinearGradient(0, keyTop - 2, 0, keyTop + 7);
      edge.addColorStop(0, 'rgba(255,255,255,0)');
      edge.addColorStop(0.5, 'rgba(255,255,255,0.22)');
      edge.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = edge;
      ctx.fillRect(0, keyTop - 2, this.cssW, 9);
    }

    lowerBound(arr, value) {
      let lo = 0, hi = arr.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] < value) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }

    keyAt(cssX, cssY) {
      if (!this.layout) return null;
      const L = this.layout;
      if (cssY < L.keyTop || cssY > L.keyTop + L.kbH) return null;
      // test black keys first (they overlap)
      for (const key of L.keyMap.values()) {
        if (!key.black) continue;
        if (cssX >= key.x && cssX <= key.x + key.w) return key.midi;
      }
      for (const key of L.keyMap.values()) {
        if (key.black) continue;
        if (cssX >= key.x && cssX <= key.x + key.w) return key.midi;
      }
      return null;
    }

    /* geometry helpers for the FX layer */
    geometry() {
      if (this.layoutDirty || !this.layout) this.buildLayout();
      return this.layout;
    }

    keyCenterX(midi) {
      const L = this.geometry();
      const k = L.keyMap.get(midi);
      return k ? k.x + k.w / 2 : L.ww / 2;
    }

    keyTopY() {
      return this.geometry().keyTop;
    }
  }

  KeyfallRenderer.SCHEMES = SCHEMES;
  return KeyfallRenderer;
});
