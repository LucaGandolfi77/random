// ===== Bar Blu — Audio Service =====
// Single AudioContext, lazy resume, gain-managed. No external assets.

let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicInterval = null;
let vol = 0.5;
let musicOn = false;

function getContext() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (_) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function ensureGains() {
  if (!musicGain || !sfxGain) {
    const ctx = getContext();
    if (!ctx) return;
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(ctx.destination);
    sfxGain.connect(ctx.destination);
    applyGains();
  }
}

function applyGains() {
  if (musicGain) musicGain.gain.value = vol * 0.08;
  if (sfxGain) sfxGain.gain.value = vol * 0.2;
}

function playTone(freq, duration, type, gainNode) {
  const ctx = getContext();
  if (!ctx || !gainNode) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(gainNode);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration + 0.05);
}

function playNoise(duration, gainNode) {
  const ctx = getContext();
  if (!ctx || !gainNode) return;
  const n = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.15, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  src.connect(g);
  g.connect(gainNode);
  src.start();
}

// SFX definitions: base tone + optional sequence (freq, duration, delayMs)
const SFX_CFG = {
  click:    { f: 600,  d: 0.06, type: 'sine' },
  serve:    { f: 523,  d: 0.12, type: 'sine', seq: [[659, 0.12, 100]] },
  collect:  { f: 880,  d: 0.08, type: 'sine', seq: [[1100, 0.12, 80], [1320, 0.18, 160]] },
  coin:     { f: 1200, d: 0.06, type: 'square', seq: [[1500, 0.08, 60]] },
  spin:     { f: 220,  d: 0.35, type: 'sawtooth' },
  result:   { f: 440,  d: 0.12, type: 'sine', seq: [[660, 0.12, 120], [880, 0.18, 240]] },
  error:    { f: 200,  d: 0.18, type: 'triangle' },
  milestone:{ f: 523,  d: 0.18, type: 'sine', seq: [[659, 0.18, 150], [784, 0.18, 300], [1047, 0.28, 450]] },
  scratch:  { f: 0,    d: 0, type: 'sine', noise: 0.12 },
};

export function playSFX(type) {
  if (!audioCtx || vol <= 0) return;
  ensureGains();
  const cfg = SFX_CFG[type];
  if (!cfg) return;
  if (cfg.noise) {
    playNoise(cfg.noise, sfxGain);
  } else if (cfg.f > 0) {
    playTone(cfg.f, cfg.d, cfg.type, sfxGain);
    if (cfg.seq) {
      cfg.seq.forEach(([f, d, delay]) => setTimeout(() => playTone(f, d, cfg.type, sfxGain), delay));
    }
  }
}

const CHORDS = [[261.63, 329.63, 392.00], [293.66, 369.99, 440.00]];

export function startMusic() {
  const ctx = getContext();
  if (!ctx) return;
  ensureGains();
  if (musicInterval) return;
  let i = 0;
  const chord = () => {
    if (!musicGain || !audioCtx) return;
    const c = i % 2 === 0 ? CHORDS[0] : CHORDS[1];
    c.forEach(f => playTone(f, 2.8, 'sine', musicGain));
    i++;
  };
  chord();
  musicInterval = setInterval(chord, 3200);
  musicOn = true;
}

export function stopMusic() {
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  musicOn = false;
}

export function setVolume(v) {
  vol = Math.max(0, Math.min(1, v));
  applyGains();
}

export function getVolume() { return vol; }
export function isMusicOn() { return musicOn; }
export { getContext };
