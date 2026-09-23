// Audio: piccolo synth WebAudio (nessun asset esterno), gestione cicli e SFX.
// Completamente indipendente da DOM/game rules — espone un'API booleana per settings.

let ctx = null;
let master = null;
let musicNodes = null;
let musicOn = false;
let sfxOn = true;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
  return ctx;
}

function setMusic(on) {
  musicOn = Boolean(on);
  if (musicOn) startMusic(); else stopMusic();
}

function setSfx(on) {
  sfxOn = Boolean(on);
}

// Tonalità calda di sottofondo: due oscillatori + filtro, loop finché non fermato.
function startMusic() {
  const c = ensureCtx();
  if (!c || musicNodes) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const g = c.createGain();
  g.gain.value = 0;
  g.connect(master);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  filter.connect(g);

  const o1 = c.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = 110; // A2
  const o2 = c.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = 164.81; // E3
  const o3 = c.createOscillator();
  o3.type = 'sine';
  o3.frequency.value = 220; // A3
  o1.connect(filter);
  o2.connect(filter);
  o3.connect(filter);

  // LFO per un lento "respiro"
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.04;
  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);

  [o1, o2, o3, lfo].forEach((n) => n.start());
  g.gain.linearRampToValueAtTime(0.09, c.currentTime + 3);

  musicNodes = { g, filter, o1, o2, o3, lfo, lfoGain };
}

function stopMusic() {
  if (!musicNodes || !ctx) return;
  const { g, o1, o2, o3, lfo } = musicNodes;
  const t = ctx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(0, t + 1.2);
  setTimeout(() => {
    [o1, o2, o3, lfo].forEach((n) => { try { n.stop(); } catch { /* già fermato */ } });
    try { g.disconnect(); } catch { /* ok */ }
  }, 1400);
  musicNodes = null;
}

// Breve impulso per feedback d'azione.
function blip(freq = 520, dur = 0.09, type = 'triangle', vol = 0.2) {
  if (!sfxOn) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(master);
  o.start();
  o.stop(c.currentTime + dur);
}

const SFX = {
  lantern: () => blip(660, 0.12, 'triangle', 0.22),
  shelve: () => blip(392, 0.1, 'sine', 0.2),
  tea: () => blip(523.25, 0.14, 'sine', 0.2),
  reader: () => { blip(440, 0.1, 'triangle', 0.2); setTimeout(() => blip(554.37, 0.12, 'triangle', 0.18), 90); },
  catalog: () => { blip(523.25, 0.1, 'sine', 0.2); setTimeout(() => blip(659.25, 0.14, 'sine', 0.18), 80); },
  milestone: () => { [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.22), i * 110)); },
  letter: () => blip(740, 0.16, 'sine', 0.18),
  click: () => blip(480, 0.05, 'square', 0.1),
};

function play(name) {
  const fn = SFX[name];
  if (fn) fn();
}

// Pausa/ripresa quando la scheda va in background.
function handleVisibility(hidden) {
  if (!ctx) return;
  if (hidden && ctx.state === 'running') ctx.suspend().catch(() => {});
  else if (!hidden && ctx.state === 'suspended' && musicOn) ctx.resume().catch(() => {});
}

export const audio = {
  setMusic,
  setSfx,
  play,
  handleVisibility,
  get musicOn() { return musicOn; },
  get sfxOn() { return sfxOn; },
};
