/* AUDIO — WebAudio procedurale: cha-ching, fanfare, suoni comici. Zero file. */
'use strict';

const audio = {
  ctx: null,
  muted: false,
  _ready: false,
  unlock(){
    this._ready = true;
    const ctx = this._ensure();
    if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
  },
  _ensure(){
    if (this.ctx) return this.ctx;
    if (!this._ready) return null;
    const AC = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
    if (!AC) return null;
    this.ctx = new AC();
    return this.ctx;
  },
  tone(freq, dur, type, vol, when, slide){
    const ctx = this._ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol || 0.08, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },
  click(){ this.tone(520, 0.06, 'square', 0.05); },
  buy(){ // cha-ching
    this.tone(988, 0.09, 'square', 0.07);
    this.tone(1319, 0.16, 'square', 0.07, 0.09);
    this.tone(988, 0.05, 'square', 0.04, 0.28);
  },
  sad(){ this.tone(240, 0.25, 'triangle', 0.08, 0, 160); },
  comedy(){ // wah-wah
    this.tone(400, 0.12, 'sawtooth', 0.06, 0, 300);
    this.tone(300, 0.18, 'sawtooth', 0.06, 0.12, 500);
  },
  tick(){ this.tone(660, 0.04, 'square', 0.04); },
  fanfare(){
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => this.tone(f, 0.14, 'square', 0.08, i * 0.13));
    this.tone(1319, 0.3, 'square', 0.07, seq.length * 0.13);
  },
  happy(){ this.tone(523, 0.1, 'triangle', 0.08, 0, 784); this.tone(784, 0.16, 'triangle', 0.07, 0.1); },
  success(){ this.tone(659, 0.12, 'square', 0.07); this.tone(880, 0.2, 'square', 0.07, 0.12); }
};