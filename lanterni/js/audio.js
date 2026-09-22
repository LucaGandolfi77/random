// js/audio.js — Web Audio synthesized sounds

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.ambientNode = null;
    this.ambientGain = null;
    this.enabled = true;
    this._noiseBuffers = new Map();
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  ensure() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(name) {
    this.ensure();
    if (!this.enabled || !this.ctx) return;

    switch (name) {
      case 'throw': this.playThrow(); break;
      case 'catch': this.playCatch(); break;
      case 'place': this.playPlace(); break;
      case 'open': this.playOpen(); break;
      case 'dawn': this.playDawn(); break;
      case 'levelUp': this.playLevelUp(); break;
    }
  }

  playThrow() {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Swoosh sound
    const noise = this.createNoise(0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.25);
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.3);
  }

  playCatch() {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Magical chime
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.5);
    });
  }

  playPlace() {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Soft thud + paper crinkle
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);

    // Paper noise
    const noise = this.createNoise(0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.04, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.15);
  }

  playOpen() {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Unfold sound
    [440, 554, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.7);
    });
  }

  playDawn() {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Rising chord pad
    const freqs = [261, 329, 392, 523];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 1);
      gain.gain.linearRampToValueAtTime(0, t + 3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 3.5);
    });
  }

  playLevelUp() {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.1, t + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.7);
    });
  }

  startAmbient() {
    this.ensure();
    if (!this.ctx || this.ambientNode) return;

    const ctx = this.ctx;

    // Low drone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;

    const gain = ctx.createGain();
    gain.gain.value = 0.03;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();

    this.ambientNode = osc;
    this.ambientGain = gain;
  }

  stopAmbient() {
    if (this.ambientNode) {
      this.ambientNode.stop();
      this.ambientNode = null;
      this.ambientGain = null;
    }
    this.stopWeatherSound();
  }

  playWeatherSound(type) {
    this.ensure();
    if (!this.enabled || !this.ctx) return;
    this.stopWeatherSound();

    if (type === 'clear') return;

    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.1;
    gain.connect(this.masterGain);

    if (type === 'rain' || type === 'storm') {
      const noise = this.createNoise(10);
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      noise.connect(filter);
      filter.connect(gain);
      noise.start();
      this._weatherNode = noise;
      this._weatherGain = gain;
    } else if (type === 'snow') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 4000;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 100;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.gain.value = 0.02;
      osc.start();
      lfo.start();
      this._weatherNode = osc;
      this._weatherLfo = lfo;
      this._weatherGain = gain;
    } else if (type === 'fog') {
      const noise = this.createNoise(10);
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      noise.connect(filter);
      filter.connect(gain);
      gain.gain.value = 0.05;
      noise.start();
      this._weatherNode = noise;
      this._weatherGain = gain;
    } else if (type === 'wind') {
      const noise = this.createNoise(10);
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 0.5;
      noise.connect(filter);
      filter.connect(gain);
      gain.gain.value = 0.08;
      noise.start();
      this._weatherNode = noise;
      this._weatherGain = gain;
    }
  }

  stopWeatherSound() {
    if (this._weatherNode) {
      try { this._weatherNode.stop(); } catch (_) {}
      this._weatherNode = null;
    }
    if (this._weatherLfo) {
      try { this._weatherLfo.stop(); } catch (_) {}
      this._weatherLfo = null;
    }
    this._weatherGain = null;
  }

  _getNoiseBuffer(duration) {
    const key = Math.round(duration * 100) / 100;
    if (this._noiseBuffers.has(key)) return this._noiseBuffers.get(key);

    const ctx = this.ctx;
    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this._noiseBuffers.set(key, buffer);
    return buffer;
  }

  createNoise(duration) {
    const node = this.ctx.createBufferSource();
    node.buffer = this._getNoiseBuffer(duration);
    return node;
  }

  playZenDrone() {
    this.ensure();
    if (!this.enabled || !this.ctx) return;

    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    gain.connect(this.masterGain);

    const notes = [110, 164.81, 220, 329.63];
    const oscillators = [];

    for (const freq of notes) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const noteGain = ctx.createGain();
      noteGain.gain.value = 0.1;
      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start();
      oscillators.push({ osc, gain: noteGain });
    }

    this._zenOscillators = oscillators;
    this._zenGain = gain;
  }

  stopZenDrone() {
    if (this._zenOscillators) {
      for (const { osc } of this._zenOscillators) {
        try { osc.stop(); } catch (_) {}
      }
      this._zenOscillators = null;
    }
    this._zenGain = null;
  }
}
