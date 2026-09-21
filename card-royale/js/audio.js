export class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.volume = 0.8;
    this.muted = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  setVolume(vol) {
    this.volume = vol;
    this.muted = vol <= 0;
  }

  playTone(freq, duration, type = 'sine', volume = 0.3) {
    if (navigator.vibrate && !this.muted) {
      const intensity = volume > 0.2 ? 30 : 10;
      navigator.vibrate(intensity);
    }
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playChord(freqs, duration, type = 'sine', volume = 0.2) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const interval = duration * 1000 / freqs.length;
    freqs.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, duration, type, volume), i * interval);
    });
  }

  cardPlay() {
    this.playTone(600, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(800, 0.1, 'sine', 0.15), 80);
    setTimeout(() => this.playTone(1000, 0.08, 'sine', 0.1), 160);
  }

  unitAttack() {
    this.playTone(300, 0.08, 'square', 0.15);
    setTimeout(() => this.playTone(500, 0.06, 'square', 0.1), 60);
  }

  unitHit() {
    this.playTone(200, 0.1, 'sawtooth', 0.1);
  }

  unitDeath() {
    this.playTone(400, 0.2, 'sine', 0.15);
    setTimeout(() => this.playTone(300, 0.2, 'sine', 0.1), 150);
    setTimeout(() => this.playTone(200, 0.3, 'sine', 0.08), 300);
  }

  heal() {
    this.playTone(500, 0.15, 'sine', 0.15);
    setTimeout(() => this.playTone(700, 0.15, 'sine', 0.12), 120);
    setTimeout(() => this.playTone(900, 0.2, 'sine', 0.1), 240);
  }

  ability() {
    this.playChord([440, 554, 659, 880], 0.4, 'sine', 0.15);
  }

  victory() {
    this.playChord([523, 659, 784, 1047], 0.6, 'sine', 0.2);
    setTimeout(() => this.playChord([659, 784, 988, 1319], 0.6, 'sine', 0.2), 300);
  }

  defeat() {
    this.playTone(300, 0.5, 'sine', 0.15);
    setTimeout(() => this.playTone(250, 0.5, 'sine', 0.12), 300);
    setTimeout(() => this.playTone(200, 0.8, 'sine', 0.1), 600);
  }

  elixir() {
    this.playTone(1200, 0.05, 'sine', 0.08);
  }

  taunt() {
    this.playTone(440, 0.15, 'triangle', 0.1);
    setTimeout(() => this.playTone(550, 0.15, 'triangle', 0.1), 150);
  }

  fusion() {
    this.playChord([523, 659, 784, 1047, 1319], 0.6, 'sine', 0.2);
    setTimeout(() => this.playChord([659, 784, 988, 1319, 1568], 0.5, 'sine', 0.15), 400);
    setTimeout(() => this.playChord([784, 988, 1319, 1568], 0.4, 'sine', 0.12), 800);
  }

  fusionReady() {
    this.playTone(880, 0.2, 'sine', 0.15);
    setTimeout(() => this.playTone(1100, 0.2, 'sine', 0.12), 200);
    setTimeout(() => this.playTone(1320, 0.3, 'sine', 0.1), 400);
  }

  weatherChange(weather) {
    const freqs = {
      'SUNNY': [523, 659, 784],
      'MOONLIGHT': [440, 523, 659],
      'RAIN': [600, 660, 720],
      'STORM': [200, 250, 300],
      'FOG': [400, 480, 560],
      'DAWN': [587, 698, 880]
    };
    const notes = freqs[weather] || freqs['SUNNY'];
    this.playChord(notes, 0.8, 'sine', 0.15);
  }

  bossEncounter(boss) {
    const freqs = {
      'thorn_king': [100, 150, 200],
      'shadow_queen': [400, 500, 600],
      'ancient_dragon': [200, 300, 400]
    };
    const notes = freqs[boss.id] || [300, 400, 500];
    this.playChord(notes, 1.0, 'sawtooth', 0.15);
  }

  bossDefeat(boss) {
    this.playChord([523, 659, 784, 1047], 0.8, 'sine', 0.2);
    setTimeout(() => this.playChord([659, 784, 988, 1319], 0.6, 'sine', 0.15), 500);
  }

  bossAttack() {
    this.playTone(150, 0.15, 'sawtooth', 0.2);
  }

  ultimateActivate() {
    this.playChord([396, 494, 587, 784, 988, 1319], 1.2, 'sine', 0.2);
    setTimeout(() => this.playChord([587, 784, 988, 1319, 1568], 0.8, 'sine', 0.15), 600);
  }
}
