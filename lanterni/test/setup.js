// test/setup.js — Canvas and Audio mocks for Vitest

class MockCanvasRenderingContext2D {
  constructor() {
    this.fillStyle = '';
    this.strokeStyle = '';
    this.lineWidth = 1;
    this.globalAlpha = 1;
    this.font = '';
    this.textAlign = 'center';
    this.textBaseline = 'middle';
    this.shadowColor = '';
    this.shadowBlur = 0;
  }
  save() {}
  restore() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  ellipse() {}
  quadraticCurveTo() {}
  closePath() {}
  fill() {}
  stroke() {}
  fillRect() {}
  fillText() {}
  clearRect() {}
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  setTransform() {}
  translate() {}
  rotate() {}
  clip() {}
  drawImage() {}
}

// Mock HTMLCanvasElement.getContext
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(type) {
    if (type === '2d') return new MockCanvasRenderingContext2D();
    return null;
  };
  HTMLCanvasElement.prototype.toBlob = function(cb) {
    cb(new Blob([]));
  };
}

// Mock window dimensions
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
  Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true });
}

// Mock OffscreenCanvas
if (typeof OffscreenCanvas === 'undefined') {
  globalThis.OffscreenCanvas = class {
    constructor(w, h) {
      this.width = w;
      this.height = h;
    }
    getContext() {
      return new MockCanvasRenderingContext2D();
    }
  };
}

// Mock Web Audio API
class MockAudioParam {
  constructor() { this.value = 0; }
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class MockAudioNode {
  constructor() { this._gain = { value: 1 }; }
  connect() {}
  disconnect() {}
}

class MockGainNode extends MockAudioNode {
  constructor() {
    super();
    this.gain = new MockAudioParam();
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor() {
    super();
    this.type = 'sine';
    this.frequency = new MockAudioParam();
  }
  start() {}
  stop() {}
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor() {
    super();
    this.type = 'lowpass';
    this.frequency = new MockAudioParam();
    this.Q = { value: 1 };
  }
}

class MockBufferSourceNode extends MockAudioNode {
  constructor() { super(); this.buffer = null; }
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = {};
  }
  resume() {}
  createGain() { return new MockGainNode(); }
  createOscillator() { return new MockOscillatorNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createBuffer(ch, len, sr) {
    return { getChannelData: () => new Float32Array(len) };
  }
  createBufferSource() { return new MockBufferSourceNode(); }
}

if (typeof window !== 'undefined') {
  window.AudioContext = MockAudioContext;
  window.webkitAudioContext = MockAudioContext;
}

// Mock localStorage
if (typeof localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: k => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

// Mock IndexedDB
if (typeof indexedDB === 'undefined') {
  const dbStore = {};
  globalThis.indexedDB = {
    open: () => {
      const req = { onupgradeneeded: null, onsuccess: null, onerror: null };
      setTimeout(() => {
        const db = {
          objectStoreNames: { contains: () => false },
          createObjectStore: () => {},
          transaction: () => ({
            objectStore: () => ({
              get: () => {
                const r = { onsuccess: null, onerror: null };
                setTimeout(() => { if (r.onsuccess) r.onsuccess({ target: { result: undefined } }); }, 0);
                return r;
              },
              put: () => {},
              delete: () => {}
            }),
            oncomplete: null,
            onerror: null
          })
        };
        if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: db } });
        if (req.onsuccess) req.onsuccess({ target: { result: db } });
      }, 0);
      return req;
    }
  };
}

// Mock navigator.vibrate
if (typeof navigator !== 'undefined' && !navigator.vibrate) {
  navigator.vibrate = () => {};
}
