/* ===================================================
   🎚 Audio Editor PWA — Test moduli puri
   project.js (modello timeline) + wav.js (encoder PCM).
   =================================================== */
'use strict';

const path = require('path');
const Project = require(path.join(__dirname, '..', 'project.js'));
const Wav = require(path.join(__dirname, '..', 'wav.js'));

let pass = 0;
let fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`  ✔ ${name}`); }
  catch (e) { fail++; console.log(`  ✘ ${name} — ${e.message}`); }
}
const approx = (a, b, eps) => Math.abs(a - b) < (eps || 1e-6);

console.log('Project (modello):');
check('createProject + track + clip di base', () => {
  const p = Project.createProject();
  const t = Project.createTrack(p, 'A');
  const clip = Project.defaultClip(p, 'asset_1', { trimStart: 1, trimEnd: 3, offset: 0.5 });
  Project.addClip(p, t.id, clip);
  if (p.tracks.length !== 1) throw new Error('manca track');
  if (t.clips.length !== 1) throw new Error('manca clip');
  if (!approx(Project.clipSourceLength(clip), 2)) throw new Error('durata sorgente errata');
});

check('tempo cambia la durata effettiva', () => {
  const p = Project.createProject();
  const clip = Project.defaultClip(p, 'a', { trimStart: 0, trimEnd: 4, tempo: 2 });
  if (!approx(Project.clipEffectiveDuration(clip), 2)) throw new Error('attesa 2s');
});

check('projectDuration = max offset + durata', () => {
  const p = Project.createProject();
  const t = Project.createTrack(p);
  Project.addClip(p, t.id, Project.defaultClip(p, 'a', { offset: 1, trimStart: 0, trimEnd: 1.5 }));
  if (!approx(Project.projectDuration(p), 2.5)) throw new Error(`durata ${Project.projectDuration(p)}`);
});

check('clampTrim rispetta limiti e lunghezza minima', () => {
  const r = Project.clampTrim(-5, 999, 10);
  if (!approx(r.trimStart, 0) || !approx(r.trimEnd, 10)) throw new Error('clamp fallito');
  const short = Project.clampTrim(5, 5.02, 10);
  if (short.trimEnd - short.trimStart < 0.049) throw new Error('durata minima non rispettata');
});

check('splitClip divide e restituisce la parte destra', () => {
  const p = Project.createProject();
  const t = Project.createTrack(p);
  const clip = Project.defaultClip(p, 'a', { offset: 0, trimStart: 0, trimEnd: 4 });
  Project.addClip(p, t.id, clip);
  const right = Project.splitClip(p, clip.id, 1.5);
  if (!right) throw new Error('split nullo');
  Project.addClip(p, t.id, right);
  if (!approx(clip.trimEnd, 1.5)) throw new Error('sinistra: trimEnd errato');
  if (!approx(right.offset, 1.5)) throw new Error('destra: offset errato');
  if (!approx(right.trimStart, 1.5)) throw new Error('destra: trimStart errato');
  if (t.clips.length !== 2) throw new Error('servono 2 clip');
});

check('splitClip rifiuta fuori range', () => {
  const p = Project.createProject();
  const t = Project.createTrack(p);
  const clip = Project.defaultClip(p, 'a', { trimStart: 0, trimEnd: 1 });
  Project.addClip(p, t.id, clip);
  if (Project.splitClip(p, clip.id, 4)) throw new Error('split oltre durata accettato');
  if (Project.splitClip(p, 'nope', 0)) throw new Error('clip inesistente accettato');
});

check('serialize/deserialize roundtrip', () => {
  const p = Project.createProject();
  const t = Project.createTrack(p, 'T1');
  Project.addClip(p, t.id, Project.defaultClip(p, 'a1', { offset: 0.25, trimStart: 0.1, trimEnd: 5 }));
  const meta = [{ id: 'a1', name: 'x.wav', mime: 'audio/wav', size: 10, duration: 5, sampleRate: 44100, channels: 2 }];
  const json = Project.serialize(p, meta);
  const back = Project.deserialize(json);
  if (back.project.tracks[0].clips[0].trimEnd !== 5) throw new Error('roundtrip fallito');
  if (!back.project.counters.clip) throw new Error('manca counters');
});

check('snapValue arrotonda alla griglia', () => {
  if (!approx(Project.snapValue(0.74, 0.5), 0.5)) throw new Error('snap 0.5');
  if (!approx(Project.snapValue(1.26, 0.5), 1.5)) throw new Error('snap 1.5');
});

console.log('\nWAV (encoder):');
check('header RIFF/WAVE corretto', () => {
  const ch = [new Float32Array([0, 0.5, -0.5]), new Float32Array([1, -1, 0])];
  const buf = Wav.encodeWav(ch, 44100, 16);
  const dv = new DataView(buf);
  if (dv.getUint32(0, false) !== 0x52494646) throw new Error('manca RIFF');
  if (dv.getUint32(8, false) !== 0x57415645) throw new Error('manca WAVE');
  if (dv.getUint16(22, true) !== 2) throw new Error('canali');
  if (dv.getUint32(24, true) !== 44100) throw new Error('sampleRate');
  if (dv.getUint16(34, true) !== 16) throw new Error('bits');
  if (dv.getUint32(40, true) !== 12) throw new Error('dataSize'); // 3 frame * 2ch * 2B
  if (buf.byteLength !== 44 + 12) throw new Error('lunghezza');
});

check('PCM 16-bit: i campioni tornano dopo il roundtrip', () => {
  const src = new Float32Array([0, 0.25, -0.5, 1, -1, 0.123]);
  const buf = Wav.encodeWav([src], 8000, 16);
  const dv = new DataView(buf);
  const frames = 6;
  for (let i = 0; i < frames; i++) {
    const s16 = dv.getInt16(44 + i * 2, true);
    const expected = Math.round(src[i] * 32767);
    if (s16 !== expected) throw new Error(`frame ${i}: ${s16} != ${expected}`);
  }
});

check('PCM 24-bit: interleaving stereo', () => {
  const L = new Float32Array([0.5, -0.5]);
  const R = new Float32Array([0.25, -0.25]);
  const buf = Wav.encodeWav([L, R], 44100, 24);
  const dv = new DataView(buf);
  if (dv.getUint16(34, true) !== 24) throw new Error('bits');
  if (dv.getUint16(32, true) !== 6) throw new Error('blockAlign');
  // frame 0: L=0.5 -> 4194304
  const v = dv.getUint8(44) | (dv.getUint8(45) << 8) | (dv.getUint8(46) << 16);
  if (v !== 4194304) throw new Error(`L frame0 ${v}`);
});

check('clip audio oltre 1.0 viene saturato', () => {
  const buf = Wav.encodeWav([new Float32Array([5])], 44100, 16);
  if (new DataView(buf).getInt16(44, true) !== 32767) throw new Error('no clip');
});

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok, ${fail} falliti`);
process.exit(fail === 0 ? 0 : 1);
