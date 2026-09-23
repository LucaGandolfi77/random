let ctx = null;
let masterGain = null;
let sfxGain = null;
let musicNodes = [];
let musicInterval = null;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(masterGain);
  } catch (err) {
    console.warn('[audio] no audio', err);
    return null;
  }
  return ctx;
}

function resume() {
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(freq, duration, type = 'sine', gainValue = 0.4, when = 0) {
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gainValue, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(masterGain);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function sfxEnabled() {
  return stateRef()?.settings?.sfx ?? true;
}

export function initAudio(stateRef) {
  // stateRef is the app state; we read settings lazily
}

export function playSfx(name) {
  if (!stateRef()) return;
  if (!sfxEnabled()) return;
  const c = ensureCtx();
  if (!c) return;
  resume();
  const v = stateRef()?.settings?.volume ?? 1;
  switch (name) {
    case 'tap': tone(620, 0.08, 'sine', 0.25); break;
    case 'grind': tone(220, 0.18, 'triangle', 0.3); tone(180, 0.18, 'sawtooth', 0.12); break;
    case 'pour': tone(440, 0.35, 'sine', 0.28); break;
    case 'serve': tone(523, 0.12); tone(659, 0.12, 'sine', 0.28, 0.1); tone(784, 0.2, 'sine', 0.3, 0.2); break;
    case 'perfect': tone(784, 0.15); tone(988, 0.15, 'sine', 0.28, 0.1); tone(1175, 0.3, 'sine', 0.32, 0.2); break;
    case 'discover': tone(880, 0.15, 'sine', 0.3); tone(1109, 0.15, 'sine', 0.28, 0.12); tone(1320, 0.3, 'sine', 0.3, 0.24); break;
    case 'coin': tone(1200, 0.08, 'square', 0.2); tone(1500, 0.1, 'square', 0.22, 0.08); break;
    case 'open': tone(330, 0.12, 'sine', 0.28); tone(440, 0.16, 'sine', 0.28, 0.1); break;
    case 'close': tone(440, 0.12, 'sine', 0.28); tone(330, 0.16, 'sine', 0.28, 0.1); break;
    case 'levelup': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.28, i * 0.12)); break;
    case 'error': tone(180, 0.25, 'sawtooth', 0.18); break;
    default: tone(440, 0.1);
  }
  if (masterGain) masterGain.gain.value = v;
}

let stateRef = () => ({});
export function setAudioStateRef(fn) { stateRef = fn; }

export function setVolume(v) {
  if (masterGain) masterGain.gain.value = clamp(v, 0, 1);
}

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

export function startMusic() {
  const c = ensureCtx();
  if (!c) return;
  stopMusic();
  resume();
  let step = 0;
  const notes = [262, 294, 330, 349, 392, 349, 330, 294];
  musicInterval = setInterval(() => {
    if (!stateRef()?.settings?.music) return;
    const f = notes[step % notes.length];
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(g).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.45);
    step++;
  }, 900);
}

export function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

export function toggleMusic(playing) {
  if (playing) startMusic(); else stopMusic();
}

export function audioSupported() {
  return !!ensureCtx();
}

export function unlockAudio() {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
}
