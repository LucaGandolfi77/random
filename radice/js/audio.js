const AUDIO = {
  ctx: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) { console.warn('Audio not supported'); }
  },

  playTone(freq, duration, type, volume) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    type = type || 'sine';
    volume = volume || 0.1;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  playPageTurn() {
    this.playTone(800, 0.15, 'triangle', 0.08);
    setTimeout(() => this.playTone(1000, 0.1, 'triangle', 0.05), 80);
  },

  playGacha() {
    this.playTone(400, 0.3, 'sine', 0.1);
    setTimeout(() => this.playTone(600, 0.3, 'sine', 0.1), 150);
    setTimeout(() => this.playTone(800, 0.4, 'sine', 0.15), 300);
    setTimeout(() => this.playTone(1000, 0.5, 'sine', 0.1), 450);
  },

  playUnlock() {
    this.playTone(523, 0.2, 'sine', 0.1);
    setTimeout(() => this.playTone(659, 0.2, 'sine', 0.1), 200);
    setTimeout(() => this.playTone(784, 0.4, 'sine', 0.12), 400);
  },

  playChapter() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.08), i * 150);
    });
  },

  playOwl() {
    this.playTone(350, 0.4, 'sine', 0.06);
    setTimeout(() => this.playTone(400, 0.3, 'sine', 0.05), 200);
    setTimeout(() => this.playTone(350, 0.5, 'sine', 0.06), 400);
  },

  playSuccess() {
    [523, 659, 784, 1047, 784].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'triangle', 0.06), i * 120);
    });
    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
  },

  playFail() {
    this.playTone(200, 0.5, 'sawtooth', 0.05);
    setTimeout(() => this.playTone(150, 0.6, 'sawtooth', 0.04), 300);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  },

  playGacha() {
    this.playTone(400, 0.3, 'sine', 0.1);
    setTimeout(() => this.playTone(600, 0.3, 'sine', 0.1), 150);
    setTimeout(() => this.playTone(800, 0.4, 'sine', 0.15), 300);
    setTimeout(() => this.playTone(1000, 0.5, 'sine', 0.1), 450);
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  },

  playAmbient() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = 60;
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    gain.gain.value = 0.03;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    return { osc, gain };
  }
};
