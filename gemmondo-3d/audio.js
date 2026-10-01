/* ============================================================
   GEMMONDO — Audio
   Suoni generati al volo con WebAudio: nessun file, nessuna
   dipendenza, nessun costo di download.

   Regole:
   - L'AudioContext nasce solo al primo gesto utente (autoplay policy).
   - Tutto passa da un master gain: il toggle mute è un ramo, non
     un interruttore che smette di suonare.
   - Ogni suono è costruito e lasciato morire da solo: nessun
     oscillator resta appeso, quindi nessun leak di nodi audio.
   ============================================================ */

/** Scala pentatonica minore: suona bene qualunque sia la zona. */
const PENTA = [0, 3, 5, 7, 10];
const hz = (semi) => 220 * Math.pow(2, semi / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
    this._ambient = null;
    this._lastPlay = new Map();
  }

  /** Va chiamata dentro un gestore di evento utente. Idempotente. */
  unlock() {
    if (!this.ctx) {
      const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctor) return false;
      try {
        this.ctx = new Ctor();
      } catch {
        return false;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this._makeNoise();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, t, 0.02);
    }
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _ready() {
    return this.ctx && this.master && this.ctx.state === 'running' && !this.muted;
  }

  /**
   * Anti-saturazione: lo stesso suono non può ripetersi più di una volta
   * ogni `ms`. Senza questo, tenendo premuto E si genererebbero centinaia
   * di oscillatori al secondo.
   */
  _throttle(key, ms) {
    const now = performance.now();
    /* -Infinity, non 0: il valore di default "0" faceva scartare anche
       il primo suono se il gioco partiva entro la finestra di throttle
       (cosa che succede sempre, perché l'utente prema Gioca subito). */
    const last = this._lastPlay.has(key) ? this._lastPlay.get(key) : -Infinity;
    if (now - last < ms) return false;
    this._lastPlay.set(key, now);
    return true;
  }

  /** Un tono con inviluppo ADSR minimale. */
  tone(freq, { dur = 0.14, type = 'sine', gain = 0.2, attack = 0.006, slideTo = null, delay = 0 } = {}) {
    if (!this._ready()) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  }

  /** Un colpo di rumore filtrato: la base di tutti gli impatti. */
  noise({ dur = 0.12, freq = 900, q = 1.2, gain = 0.16, type = 'bandpass', slideTo = null } = {}) {
    if (!this._ready()) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(freq, t0);
    if (slideTo) filt.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filt).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
    src.onended = () => { src.disconnect(); filt.disconnect(); g.disconnect(); };
  }

  /* ── suoni di gioco ────────────────────────────────── */

  /** Raccolta gemma: il pitch sale con la combo, poi si resetta. */
  collect(combo = 0) {
    if (!this._throttle('collect', 45)) return;
    const step = PENTA[Math.min(combo, PENTA.length - 1)];
    this.tone(hz(12 + step), { dur: 0.1, type: 'triangle', gain: 0.13 });
    this.tone(hz(24 + step), { dur: 0.07, type: 'sine', gain: 0.05, delay: 0.02 });
  }

  collectGold() {
    [0, 4, 7, 12].forEach((s, i) => {
      this.tone(hz(12 + s), { dur: 0.16, type: 'triangle', gain: 0.12, delay: i * 0.045 });
    });
  }

  /** Colpo all'albero: rumore grave + schiocco legnoso. */
  chop() {
    if (!this._throttle('chop', 120)) return;
    this.noise({ dur: 0.1, freq: 1600, q: 0.8, slideTo: 260, gain: 0.16 });
    this.tone(96, { dur: 0.13, type: 'square', gain: 0.07, slideTo: 62 });
  }

  /** Colpo alla roccia: più secco e metallico. */
  mine() {
    if (!this._throttle('mine', 120)) return;
    this.noise({ dur: 0.07, freq: 3200, q: 1.6, slideTo: 700, gain: 0.15 });
    this.tone(180, { dur: 0.09, type: 'triangle', gain: 0.06, slideTo: 90 });
  }

  /** Estrazione del cristallo: un brillio che sale. */
  mineCrystal() {
    if (!this._throttle('crystal', 120)) return;
    this.tone(hz(19), { dur: 0.22, type: 'sine', gain: 0.1, slideTo: hz(31) });
  }

  craft() {
    this.tone(660, { dur: 0.09, type: 'square', gain: 0.1 });
    this.tone(990, { dur: 0.14, type: 'triangle', gain: 0.1, delay: 0.07 });
    this.noise({ dur: 0.06, freq: 2400, q: 1, gain: 0.1 });
  }

  coin() {
    this.tone(1180, { dur: 0.08, type: 'square', gain: 0.09 });
    this.tone(1560, { dur: 0.12, type: 'square', gain: 0.08, delay: 0.05 });
  }

  upgrade() {
    [0, 5, 9].forEach((s, i) => this.tone(hz(12 + s), { dur: 0.18, type: 'triangle', gain: 0.1, delay: i * 0.06 }));
  }

  error() {
    this.tone(150, { dur: 0.16, type: 'sawtooth', gain: 0.09, slideTo: 96 });
  }

  /** Cambio zona: un soffio che attraversa. */
  travel() {
    this.noise({ dur: 0.5, freq: 300, q: 0.5, slideTo: 2600, gain: 0.1, type: 'bandpass' });
    this.tone(hz(-5), { dur: 0.55, type: 'sine', gain: 0.09, slideTo: hz(12) });
  }

  unlockZone() {
    [0, 7, 12, 19].forEach((s, i) => this.tone(hz(12 + s), { dur: 0.3, type: 'triangle', gain: 0.11, delay: i * 0.08 }));
  }

  /** Esplosione cosmica: swell + accordo. */
  prestige() {
    this.noise({ dur: 1.2, freq: 200, q: 0.4, slideTo: 3000, gain: 0.2 });
    [0, 7, 12, 16, 19].forEach((s, i) => {
      this.tone(hz(s), { dur: 1.1, type: 'sawtooth', gain: 0.07, delay: i * 0.05 });
    });
  }

  milestone() {
    [0, 7, 12].forEach((s, i) => this.tone(hz(24 + s), { dur: 0.24, type: 'sine', gain: 0.1, delay: i * 0.09 }));
  }

  /* ── ambiente per zona ─────────────────────────────── */

  /**
   * Drone continuo che cambia carattere con il bioma. Un solo par di
   * oscillatori stonati più un LFO sul filtro: Costa quasi nulla e rende
   * ogni zona riconoscibile a orecchio.
   */
  setAmbient(zoneIdx) {
    if (!this.ctx || !this.master) return;
    if (this._ambient && this._ambient.zone === zoneIdx) return;
    this.stopAmbient();

    const root = [0, 3, -2, -5, -8, -12, -3][zoneIdx] ?? 0;
    const timbre = ['sine', 'triangle', 'sine', 'sine', 'sawtooth', 'sine', 'triangle'][zoneIdx] ?? 'sine';
    const cutoff = [900, 1300, 700, 600, 800, 400, 1100][zoneIdx] ?? 900;

    const t0 = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.035, t0 + 2.5);

    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    filt.Q.value = 3;

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = cutoff * 0.45;
    lfo.connect(lfoGain).connect(filt.frequency);

    const oscs = [lfo, this.tone_ambient(hz(root - 12), timbre, filt), this.tone_ambient(hz(root - 12) * 1.005, timbre, filt)];
    oscs.forEach((o) => o.start(t0));

    filt.connect(g).connect(this.master);
    this._ambient = { zone: zoneIdx, nodes: oscs, gain: g, filt };
  }

  /** Oscillatore perpetuo per l'ambiente (non usa tone(): non deve spegnersi). */
  tone_ambient(freq, type, dest) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(dest);
    return o;
  }

  stopAmbient() {
    const a = this._ambient;
    if (!a) return;
    const t = this.ctx.currentTime;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setTargetAtTime(0.0001, t, 0.3);
    for (const n of a.nodes) {
      try { n.stop(t + 1.2); } catch { /* già fermo */ }
      n.onended = () => { try { n.disconnect(); } catch { /* noop */ } };
    }
    this._ambient = null;
  }
}