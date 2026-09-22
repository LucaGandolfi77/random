const SOUNDSTATES = {
  idle:      { label: 'Paziente',     color: '#27ae60' },
  baking:    { label: 'Cottura',       color: '#e67e22' },
  ready:     { label: 'Pane Pronto',   color: '#f1c40f' },
  gacha:     { label: 'Gacha',         color: '#9b59b6' },
  dream:     { label: 'Sogno',         color: '#3498db' },
  error:     { label: 'Errore',        color: '#e74c3c' },
};

const STATE_BPM = {
  idle: 80,
  baking: 100,
  ready: 130,
  gacha: 140,
  dream: 70,
  error: 60,
};

const STATE_SCALE = {
  idle: [60, 62, 64, 65, 67, 69, 71, 72],
  baking: [53, 55, 58, 60, 62, 65, 67, 69],
  ready: [52, 55, 59, 64, 67, 64, 59, 55],
  gacha: [48, 50, 53, 57, 60, 64, 67, 72],
  dream: [40, 43, 47, 50, 53, 57, 60, 64],
  error: [36, 38, 40, 41, 43, 45, 47, 48],
};

class SoundtrackEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.bassGain = null;
    this.melodyGain = null;
    this.ambientGain = null;
    this.filterNode = null;
    this.currentState = 'idle';
    this.isPlaying = false;
    this.bassOsc = null;
    this.melodyOsc = null;
    this.ambientNoise = null;
    this.bassInterval = null;
    this.melodyInterval = null;
    this.ambientInterval = null;
    this.bassNoteIndex = 0;
    this.melodyNoteIndex = 0;
    this.volume = 0.3;
    this.muted = false;
  }

  async init() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.volume;

      this.bassGain = this.audioCtx.createGain();
      this.bassGain.gain.value = 0.15;
      this.melodyGain = this.audioCtx.createGain();
      this.melodyGain.gain.value = 0.08;
      this.ambientGain = this.audioCtx.createGain();
      this.ambientGain.gain.value = 0.05;

      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 800;

      this.bassGain.connect(this.filterNode);
      this.melodyGain.connect(this.filterNode);
      this.ambientGain.connect(this.filterNode);
      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);

      this.isPlaying = true;
      this._startIdle();
    } catch (e) {
      console.warn('[Soundtrack] AudioContext init failed:', e);
      this.isPlaying = false;
    }
  }

  _createOsc(type, freq) {
    if (!this.audioCtx) return null;
    const osc = this.audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    return osc;
  }

  _createNoise() {
    if (!this.audioCtx) return null;
    const bufferSize = 2 * this.audioCtx.sampleRate;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  _startIdle() {
    this._stopAll();
    this.currentState = 'idle';
    this.bassInterval = setInterval(() => this._playBass(), 500);
    this.melodyInterval = setInterval(() => this._playMelody(), 1000);
    this._startAmbient();
  }

  _startBaking() {
    this._stopAll();
    this.currentState = 'baking';
    const bpm = STATE_BPM.baking;
    this.bassInterval = setInterval(() => this._playBass(), 60000 / bpm);
    this.melodyInterval = setInterval(() => this._playMelody(), 60000 / bpm / 2);
    this._startAmbient();
  }

  _startReady() {
    this._stopAll();
    this.currentState = 'ready';
    this.bassInterval = setInterval(() => this._playBass(), 400);
    this.melodyInterval = setInterval(() => this._playMelody(), 200);
    this._startAmbient();
    this._playAlert();
  }

  _startGacha() {
    this._stopAll();
    this.currentState = 'gacha';
    const bpm = STATE_BPM.gacha;
    this.bassInterval = setInterval(() => this._playBass(), 60000 / bpm);
    this.melodyInterval = setInterval(() => this._playMelody(), 60000 / bpm / 3);
    this._startAmbient();
  }

  _startDream() {
    this._stopAll();
    this.currentState = 'dream';
    const bpm = STATE_BPM.dream;
    this.bassInterval = setInterval(() => this._playBass(), 800);
    this.melodyInterval = setInterval(() => this._playMelody(), 1600);
    this._startAmbient();
    this.filterNode.frequency.value = 400;
  }

  _startError() {
    this._stopAll();
    this.currentState = 'error';
    this.bassInterval = setInterval(() => this._playBass(), 1200);
    this.melodyInterval = setInterval(() => this._playMelody(), 2400);
    this._startAmbient();
    this.filterNode.frequency.value = 300;
  }

  _startAmbient() {
    this._stopAmbient();
    const noise = this._createNoise();
    if (noise && this.ambientGain) {
      noise.connect(this.ambientGain);
      noise.start();
      this.ambientNoise = noise;
    }
  }

  _stopAmbient() {
    if (this.ambientNoise) {
      try { this.ambientNoise.stop(); } catch {}
      this.ambientNoise = null;
    }
  }

  _playBass() {
    if (!this.audioCtx || !this.bassGain || this.muted) return;
    const scale = STATE_SCALE[this.currentState] || STATE_SCALE.idle;
    const note = scale[this.bassNoteIndex % scale.length];
    const osc = this._createOsc('sine', note);
    if (!osc) return;
    osc.connect(this.bassGain);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.3);
    this.bassNoteIndex++;
  }

  _playMelody() {
    if (!this.audioCtx || !this.melodyGain || this.muted) return;
    const scale = STATE_SCALE[this.currentState] || STATE_SCALE.idle;
    const note = scale[this.melodyNoteIndex % scale.length];
    const osc = this._createOsc('triangle', note);
    if (!osc) return;
    osc.connect(this.melodyGain);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.15);
    this.melodyNoteIndex++;
  }

  _playAlert() {
    if (!this.audioCtx || this.muted) return;
    const now = this.audioCtx.currentTime;
    const osc = this._createOsc('square', 880);
    if (!osc) return;
    osc.connect(this.melodyGain);
    osc.start(now);
    osc.stop(now + 0.1);
    const osc2 = this._createOsc('square', 1100);
    if (osc2) {
      osc2.connect(this.melodyGain);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.25);
    }
  }

  _stopAll() {
    this._stopAmbient();
    if (this.bassInterval) { clearInterval(this.bassInterval); this.bassInterval = null; }
    if (this.melodyInterval) { clearInterval(this.melodyInterval); this.melodyInterval = null; }
    this.bassNoteIndex = 0;
    this.melodyNoteIndex = 0;
    if (this.filterNode) {
      this.filterNode.frequency.value = 800;
    }
  }

  setState(state) {
    if (!SOUNDSTATES[state]) return;
    if (state === this.currentState && this.isPlaying) return;
    this.currentState = state;
    if (this.isPlaying) {
      switch (state) {
        case 'idle': this._startIdle(); break;
        case 'baking': this._startBaking(); break;
        case 'ready': this._startReady(); break;
        case 'gacha': this._startGacha(); break;
        case 'dream': this._startDream(); break;
        case 'error': this._startError(); break;
      }
    }
  }

  getState() {
    return this.currentState;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume * (this.muted ? 0 : 1);
    }
  }

  getVolume() {
    return this.volume;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  dispose() {
    this._stopAll();
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
    this.isPlaying = false;
  }
}

let _engine = null;

export function getSoundtrackEngine() {
  return _engine;
}

export function initSoundtrack() {
  _engine = new SoundtrackEngine();
  return _engine.init();
}

export function setSoundtrackState(state) {
  if (_engine) _engine.setState(state);
}

export function getSoundtrackState() {
  return _engine ? _engine.getState() : 'idle';
}

export function toggleSoundtrackMute() {
  if (_engine) return _engine.toggleMute();
  return false;
}

export function isSoundtrackMuted() {
  return _engine ? _engine.isMuted() : true;
}

export function setSoundtrackVolume(vol) {
  if (_engine) _engine.setVolume(vol);
}

export function getSoundtrackVolume() {
  return _engine ? _engine.getVolume() : 0.3;
}

export function disposeSoundtrack() {
  if (_engine) {
    _engine.dispose();
    _engine = null;
  }
}

export function getSoundtrackStateLabel(state) {
  return SOUNDSTATES[state]?.label || 'Sconosciuto';
}

export function getSoundtrackStateColor(state) {
  return SOUNDSTATES[state]?.color || '#95a5a6';
}

export function getSoundtrackStates() {
  return SOUNDSTATES;
}

export function getSoundtrackBPM(state) {
  return STATE_BPM[state] || 80;
}
