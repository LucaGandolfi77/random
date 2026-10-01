/* audio.js — suono sintetizzato, zero file.
 *
 * Tutto qui è Web Audio puro: nessun sample, nessuna licenza, nulla da
 * scaricare. Il suono è "terra, acqua e legno": rumore filtrato, tintinnii
 * brevi, niente musica.
 *
 * Nota iOS: AudioContext va creato e ripreso dentro un gesto dell'utente.
 * Per questo `ac()` chiama resume() ogni volta che suona.
 */
(function () {
'use strict';

let ctx = null;
let rumore = null;

function attivo() {
  try { return window.FSTSave?.carica()?.impostazioni?.suono !== false; } catch { return true; }
}

function ac() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/* Un solo buffer di rumore bianco, riusato da tutto: 2 secondi stereo. */
function bufferRumore(c) {
  if (rumore && rumore.sampleRate === c.sampleRate) return rumore;
  const len = Math.floor(c.sampleRate * 2);
  rumore = c.createBuffer(1, len, c.sampleRate);
  const d = rumore.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return rumore;
}

function tono(freq, dur, tipo, gain, quando = 0, detune = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + quando;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (detune) o.detune.setValueAtTime(detune, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.04);
}

/* Rumore filtrato: è la base di tutto. Il filtro fa il timbro. */
function fruscio(dur, centro, q, gain, quando = 0, tipo = 'bandpass') {
  const c = ac(); if (!c) return;
  const t = c.currentTime + quando;
  const s = c.createBufferSource();
  s.buffer = bufferRumore(c);
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = tipo;
  f.frequency.setValueAtTime(centro, t);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
  s.stop(t + dur + 0.05);
}

/* ── suoni del gioco ─────────────────────────────────────── */

/* Il dito sulla terra: più forza = più grave e più lungo. */
function semina(forza = 1) {
  const f = Math.max(0.15, Math.min(1, forza));
  fruscio(0.10 + f * 0.16, 700 + (1 - f) * 1500, 1.1, 0.035 + f * 0.05);
  tono(150 - f * 60, 0.07, 'triangle', 0.012);
}

/* La terra che beve: rumore alto, attacchi brevi. */
function appassisce() {
  for (let i = 0; i < 3; i++) fruscio(0.035, 2800 + i * 800, 6, 0.02, i * 0.045);
}

/* La resa riuscita: il fiore che si apre. Un accordo aperto, e la quinta
 * sopra che non torna mai al basso. */
function resa() {
  fruscio(0.035, 5200, 3, 0.05);
  tono(523.3, 0.30, 'sine', 0.075);
  tono(784.0, 0.34, 'sine', 0.045, 0.01);
  tono(1046.5, 0.22, 'sine', 0.022, 0.02);
}

/* La resa fallita: legno che strappa, e poi il vuoto. */
function errore() {
  fruscio(0.22, 1100, 0.9, 0.06, 0, 'lowpass');
  tono(92, 0.36, 'sawtooth', 0.03);
  tono(61, 0.5, 'sine', 0.028, 0.03);
}

/* Una scheda data al terreno: un grido breve che scende, e niente dopo. */
function brucia() {
  fruscio(0.30, 700, 0.7, 0.05, 0, 'lowpass');
  tono(330, 0.26, 'sawtooth', 0.030);
  tono(196, 0.42, 'sine', 0.026, 0.05);
  tono(131, 0.6, 'sine', 0.020, 0.10);
}

/* Una scheda ritrovata: terza maggiore, sale di un gradino. */
function scoperta() {
  tono(392, 0.24, 'sine', 0.05);
  tono(587, 0.30, 'sine', 0.038, 0.07);
  fruscito();
}
function fruscito() { fruscio(0.18, 800, 1.4, 0.022); }

/* Il vaso che domanda: due note che non si concludono. */
function domanda() {
  tono(196, 0.5, 'sine', 0.035);
  tono(233, 0.5, 'sine', 0.030, 0.16);
  appassisce();
}

/* Cambio di atto: una campana, lontanissima. */
function campana() {
  tono(261.6, 2.4, 'sine', 0.055);
  tono(392.0, 2.0, 'sine', 0.030, 0.01);
  tono(523.3, 1.6, 'sine', 0.016, 0.02);
  fruscio(0.6, 2200, 2, 0.012);
}

/* L'orto che si riempie: un soffio lungo. */
function copre(quota) {
  fruscio(0.24, 420 + quota * 1200, 0.9, 0.04, 0, 'lowpass');
}

/* Il finale: quattro note discendenti, poi silenzio. */
function finale() {
  const f = [392, 349.2, 311.1, 261.6];
  f.forEach((hz, i) => {
    tono(hz, 1.8, 'sine', 0.05, i * 0.55);
    tono(hz * 2, 1.2, 'sine', 0.014, i * 0.55);
  });
  fruscio(1.6, 500, 0.6, 0.018, 2.3, 'lowpass');
}

/* Tocco di interfaccia. */
function tick() {
  fruscio(0.02, 2600, 4, 0.018);
  tono(880, 0.05, 'sine', 0.014);
}

/* Tocco di interfaccia. */
function tasto() {
  if (!attivo()) return;
  const c = ac();
  if (!c) return;
  fruscio(0.02, 3000, 4, 0.014);
}

function silenzia() {
  if (ctx) { try { ctx.suspend(); } catch {} }
}
function riprendi() {
  if (ctx) { try { ctx.resume(); } catch {} }
}

window.FSTAudio = {
  ac, attivo, semina, appassisce, resa, errore, brucia, scoperta, domanda,
  campana, copre, finale, tick, tasto, silenzia, riprendi,
};
})();
