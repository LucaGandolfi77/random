// services/audio.js — Web Audio API generato; nessun asset esterno.
let actx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let musicPlaying = false;
let musicWanted = false;
let musicTimer = null;
let enabled = true;

export function startAudio(initialVolume) {
  if (actx) { if (actx.state === 'suspended') actx.resume().catch(() => {}); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { enabled = false; return; }
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.4;
    master.connect(actx.destination);
    musicGain = actx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);
    sfxGain = actx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(master);
    if (initialVolume) playClick(initialVolume);
  } catch { enabled = false; }
}

function playTone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.2, dest = 'sfx', delay = 0 }) {
  if (!enabled || !actx || actx.state === 'suspended') return;
  try {
    const now = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    const gainNode = dest === 'music' ? musicGain : sfxGain;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(gainNode);
    o.start(now);
    o.stop(now + dur);
  } catch { /* ignore */ }
}

export function setSound(on) { if (sfxGain) sfxGain.gain.value = on ? 0.9 : 0; }
export function setMusic(on) {
  if (!musicGain) return;
  musicWanted = on;
  musicGain.gain.value = on ? 0.5 : 0;
  if (on && !musicPlaying) loopMusic();
  if (!on && musicPlaying) { musicPlaying = false; if (musicTimer) clearTimeout(musicTimer); }
}
export function setVolume(v) { if (master) master.gain.value = v; }
export function isEnabled() { return enabled && !!actx; }

const MELODY = [523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25];
const MELODY_FAMA = [415.30, 392.00, 349.23, 329.63, 392.00, 349.23, 329.63];
function loopMusic() {
  if (!actx || !musicWanted) return;
  musicPlaying = true;
  MELODY.forEach((f, i) => playTone({ freq: f, type: 'triangle', dur: 0.4, vol: 0.12, dest: 'music', delay: i * 0.42 }));
  musicTimer = setTimeout(loopMusic, MELODY.length * 420);
}

export function playClick(vol = 0.18) { playTone({ freq: 880, type: 'sine', dur: 0.06, vol }); }
export function playSuccess(vol = 0.22) {
  playTone({ freq: 660, type: 'sine', dur: 0.12, vol, delay: 0 });
  playTone({ freq: 880, type: 'sine', dur: 0.18, vol, delay: 0.12 });
}
export function playVote(vol = 0.2) {
  playTone({ freq: 523.25, type: 'triangle', dur: 0.2, vol, delay: 0 });
  playTone({ freq: 659.25, type: 'triangle', dur: 0.2, vol, delay: 0.12 });
}
export function playCollect(vol = 0.25) {
  [523.25, 659.25, 783.99].forEach((f, i) => playTone({ freq: f, type: 'sine', dur: 0.18, vol, delay: i * 0.08 }));
}
export function playBadge(vol = 0.25) {
  [660, 784, 880, 1046].forEach((f, i) => playTone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.16, delay: i * 0.12, dest: 'music' }));
}
export function playError(vol = 0.15) { playTone({ freq: 200, type: 'sawtooth', dur: 0.18, vol }); }

// Modalità adattiva: 'autentico' (maggiore) o 'fama' (minore/inflat).
export function setMusicMode(mode) {
  if (!actx) return;
  if (mode === 'fama') {
    _melody = MELODY_FAMA;
  } else {
    _melody = MELODY;
  }
}
let _melody = MELODY;
export function speak(text, lang) {
  if (!('speechSynthesis' in window)) return false;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'EN' ? 'en-US' : 'it-IT';
    u.rate = 0.95; u.volume = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
