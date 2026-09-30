/* audio.js — synth cozy WebAudio, zero asset */
'use strict';
let ctx = null;
function ac() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function enabled() { try { return window.MH?.save?.settings?.sound !== false; } catch { return true; } }
function tone(freq, dur = .18, type = 'sine', gain = .12, when = 0) {
  if (!enabled()) return;
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  const t = c.currentTime + when;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + .02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
}
function pop(combo = 1) { tone(420 + combo * 90, .16, 'triangle', .14); tone(630 + combo * 90, .14, 'sine', .08, .05); }
function swapSnd() { tone(300, .08, 'sine', .07); }
function badSnd() { tone(180, .2, 'sawtooth', .06); }
function chime() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .5, 'sine', .07, i * .12)); }
function whisk() { for (let i = 0; i < 6; i++) tone(900 + Math.random() * 600, .05, 'square', .03, i * .05); }
function rainTick() { tone(2000 + Math.random() * 2000, .03, 'sine', .015); }
window.MHAudio = { pop, swapSnd, badSnd, chime, whisk, rainTick, ac };
