let ctx = null;
let musicGain = null;
let musicOsc = null;
let musicPlaying = false;
let masterVol = 0.6;
let soundOn = true;
let musicOn = false;

export function setupAudio(state = {}) {
  if (state.audioOn === false) soundOn = false; else soundOn = true;
  if (state.musicOn) musicOn = true; else musicOn = false;
  if (state.volume != null) masterVol = state.volume;
}

export function setSound(on) { soundOn = on; if (!on) stopAll(); }
export function setMusic(on) {
  musicOn = on;
  if (on) startAmbient(); else stopAll();
}
export function setVolume(v) { masterVol = v; }

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch { return null; }
  return ctx;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
  return c;
}

export function playTone(freq, dur = 0.06, vol = 0.08) {
  if (!soundOn) return;
  const c = unlockAudio(); if (!c) return;
  const g = c.createGain();
  const o = c.createOscillator();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vol * masterVol, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + dur);
}

function startAmbient() {
  if (!musicOn) return;
  const c = ensureCtx(); if (!c) return;
  if (musicPlaying) return;
  stopAll(true);
  musicGain = c.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(c.destination);
  musicOsc = c.createOscillator();
  musicOsc.type = 'triangle'; musicOsc.frequency.value = 55;
  musicOsc.connect(musicGain); musicOsc.start();
  musicGain.gain.linearRampToValueAtTime(0.02 * masterVol, c.currentTime + 2);
  musicPlaying = true;
}

export function stopAll(silent) {
  if (musicGain && ctx && !silent) { try { musicGain.gain.cancelScheduledValues(ctx.currentTime); } catch {} }
  musicPlaying = false;
  musicGain = null; musicOsc = null;
}
