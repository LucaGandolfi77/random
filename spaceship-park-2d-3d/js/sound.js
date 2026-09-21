class SoundEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.masterGain = null;
    this.muted = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch(e) {
      console.warn('Audio not supported:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(type, opts = {}) {
    if (!this.initialized || this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    switch(type) {
      case 'engine': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = opts.freq || 80;
        gain.gain.value = opts.volume || 0.08;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc = osc;
        const stopGain = gain;
        osc.stop(now + 0.1);
        break;
      }
      case 'thrust': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 100 + (opts.intensity || 1) * 150;
        gain.gain.value = opts.volume || 0.05;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      case 'rotate': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 200 + (opts.dir || 1) * 100;
        gain.gain.value = 0.03;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'brake': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 150;
        osc.frequency.linearRampToValueAtTime(50, now + 0.2);
        gain.gain.value = 0.08;
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case 'collision': {
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i/bufferSize) * (opts.intensity || 1);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = opts.volume || 0.2;
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start(now);
        break;
      }
      case 'park': {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.value = 0;
          gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.3);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.3);
        });
        break;
      }
      case 'gameover': {
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          gain.gain.value = 0;
          gain.gain.linearRampToValueAtTime(0.08, now + i * 0.2);
          gain.gain.linearRampToValueAtTime(0, now + i * 0.2 + 0.4);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now + i * 0.2);
          osc.stop(now + i * 0.2 + 0.4);
        });
        break;
      }
      case 'boost': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 100;
        osc.frequency.linearRampToValueAtTime(400, now + 0.3);
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'pickup': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800;
        osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
    }
  }

  playEngineLoop(ship) {
    if (!this.initialized || this.muted || !this.ctx || !ship) return;
    const speed = Math.sqrt(ship.vx**2 + ship.vy**2);
    if (speed > 0.1 && ship.fuel > 0) {
      const freq = 60 + speed * 40;
      this.play('engine', { freq, volume: Math.min(0.08, speed * 0.05), intensity: speed });
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    return this.muted;
  }
}
