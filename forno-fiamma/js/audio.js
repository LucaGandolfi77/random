let ctx = null;
let enabled = true;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setEnabled(v) { enabled = v; }
export function isEnabled() { return enabled; }

function play(fn) {
  if (!enabled) return;
  try {
    const ctx = getCtx();
    fn(ctx);
  } catch (e) {
    console.warn('[FornoFiamma] Audio error:', e.message);
  }
}

export function playDing() {
  play(ctx => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.3);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2000, t);
    f.frequency.exponentialRampToValueAtTime(600, t + 0.5);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(f).connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.6);
  });
}

export function playKnead() {
  play(ctx => {
    const t = ctx.currentTime;
    const bufSize = ctx.sampleRate * 0.3;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
  });
}

export function playGacha() {
  play(ctx => {
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t + i * 0.1);
      g.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.1);
      o.stop(t + i * 0.1 + 0.3);
    });
  });
}

export function playCoins() {
  play(ctx => {
    const t = ctx.currentTime;
    [1200, 1500, 1800].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.1, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.06 + 0.1);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.1);
    });
  });
}

export function playOvenHum() {
  play(ctx => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 55;
    g.gain.setValueAtTime(0.03, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.5);
  });
}

export function playChirp() {
  play(ctx => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(2000, t);
    o.frequency.exponentialRampToValueAtTime(3000, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.15);
  });
}

export function playLevelUp() {
  play(ctx => {
    const t = ctx.currentTime;
    const notes = [392, 494, 587, 784, 988, 1175];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t + i * 0.12);
      g.gain.linearRampToValueAtTime(0.25, t + i * 0.12 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.12);
      o.stop(t + i * 0.12 + 0.4);
    });
  });
}
