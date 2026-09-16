/*
 * Keyfall — MIDI engine (parser + builder).
 * Zero dependencies, works in browser and Node.
 * Parses SMF format 0 and 1 (tolerates format 2 tracks).
 *
 * Exposes:
 *   parse(arrayBuffer, fileName?) -> Song
 *   buildMidi({ bpm, ppq?, tracks: [{ name?, channel?, program?, notes: [{ time(sec), dur(sec), midi, velocity }] }] }) -> ArrayBuffer
 *   nameOfMidi(midi) -> string
 *   freqOfMidi(midi) -> number
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MidiEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function nameOfMidi(m) {
    const p = Math.round(m);
    if (p < 0 || p > 127) return String(p);
    return NOTE_NAMES[p % 12] + (Math.floor(p / 12) - 1);
  }

  function freqOfMidi(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  /* ─────────────────────────── PARSER ─────────────────────────── */

  function parse(buffer, fileName) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let o = 0;

    function readU16() { const v = dv.getUint16(o); o += 2; return v; }
    function readU32() { const v = dv.getUint32(o); o += 4; return v; }
    function readStr(n) { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[o + i]); o += n; return s; }

    if (bytes.length < 14) throw new Error('File troppo piccolo per essere un MIDI.');
    if (readStr(4) !== 'MThd') throw new Error('Formato MIDI non valido: header MThd mancante.');
    const headerLen = readU32();
    if (headerLen < 6) throw new Error('Header MIDI non valido.');
    const format = readU16();
    const trackCount = readU16();
    const division = readU16();
    o += headerLen - 6;

    const isSmpte = (division & 0x8000) !== 0;
    let ppq = 480;
    let smpteInfo = null;
    if (isSmpte) {
      smpteInfo = { fps: 256 - ((division >> 8) & 0xff), ticksPerFrame: division & 0xff };
    } else {
      ppq = division & 0x7fff;
      if (!ppq) ppq = 480;
    }

    const rawTracks = [];
    for (let t = 0; t < trackCount && o + 8 <= bytes.length; t++) {
      if (readStr(4) !== 'MTrk') throw new Error('Formato MIDI non valido: chunk MTrk mancante nella traccia ' + (t + 1) + '.');
      const len = readU32();
      const end = Math.min(o + len, bytes.length);
      rawTracks.push(parseTrack(bytes, o, end));
      o = end;
    }

    const tracks = [];
    const allNotes = [];
    const tempoEvents = [];
    const timeSignatures = [];

    for (let t = 0; t < rawTracks.length; t++) {
      const rt = rawTracks[t];
      const track = {
        index: t,
        name: rt.name || '',
        program: rt.programs.length ? rt.programs[rt.programs.length - 1].program : 0,
        channel: rt.channel != null ? rt.channel : (rt.programs.length ? rt.programs[0].channel : 0),
        notes: [],
      };
      tracks.push(track);
      for (const te of rt.tempo) tempoEvents.push(te);
      for (const ts of rt.timeSig) timeSignatures.push(ts);

      const active = new Map();
      const close = (ch, pitch, offTick) => {
        const key = ch * 128 + pitch;
        const note = active.get(key);
        if (!note) return;
        active.delete(key);
        note.offTick = offTick;
        if (offTick > note.onTick) {
          track.notes.push(note);
          allNotes.push(note);
        }
      };
      for (const ev of rt.events) {
        if (ev.type === 'on') {
          if (ev.velocity === 0) { close(ev.channel, ev.pitch, ev.tick); continue; }
          close(ev.channel, ev.pitch, ev.tick); // overlapping same pitch
          active.set(ev.channel * 128 + ev.pitch, { midi: ev.pitch, onTick: ev.tick, offTick: ev.tick, velocity: ev.velocity, channel: ev.channel, track: t });
        } else if (ev.type === 'off') {
          close(ev.channel, ev.pitch, ev.tick);
        }
      }
      for (const note of active.values()) {
        note.offTick = Math.max(note.offTick, rt.endTick);
        allNotes.push(note);
        track.notes.push(note);
      }
    }

    let durationTicks = 0;
    for (const n of allNotes) if (n.offTick > durationTicks) durationTicks = n.offTick;

    tempoEvents.sort((a, b) => a.tick - b.tick);
    if (!tempoEvents.length) tempoEvents.push({ tick: 0, bpm: 120 });
    timeSignatures.sort((a, b) => a.tick - b.tick);

    const secondsAt = makeTimeMapper(ppq, smpteInfo, tempoEvents);

    let title = fileName ? String(fileName).replace(/\.midi?$/i, '').replace(/[_]+/g, ' ') : '';
    if (!title) for (const tr of tracks) if (tr.name) { title = tr.name; break; }

    const notes = allNotes
      .map((n) => {
        const start = secondsAt(n.onTick);
        const end = secondsAt(n.offTick);
        return {
          midi: n.midi,
          start,
          end,
          duration: Math.max(0.04, end - start),
          velocity: n.velocity,
          channel: n.channel,
          track: n.track,
        };
      })
      .filter((n) => n.end > n.start)
      .sort((a, b) => a.start - b.start || a.midi - b.midi);

    const durationSeconds = Math.max(notes.length ? notes[notes.length - 1].end : 0, secondsAt(durationTicks));

    const channelMap = new Map();
    for (const tr of tracks) {
      if (!tr.notes.length) continue;
      const ch = tr.channel;
      if (!channelMap.has(ch)) channelMap.set(ch, { channel: ch, name: tr.name || ('Traccia ' + (tr.index + 1)), program: tr.program, count: 0 });
      channelMap.get(ch).count += tr.notes.length;
    }

    let low = notes.length ? Infinity : 60;
    let high = notes.length ? -Infinity : 72;
    for (const n of notes) { if (n.midi < low) low = n.midi; if (n.midi > high) high = n.midi; }

    // sustain pedal (CC64) timeline per channel, in seconds
    const openPedal = new Map();
    const pedalRaws = [];
    for (const rt of rawTracks) {
      for (const ev of rt.events) {
        if (ev.type !== 'cc' || ev.cc !== 64) continue;
        if (ev.value >= 64 && !openPedal.has(ev.channel)) {
          openPedal.set(ev.channel, ev.tick);
        } else if (ev.value < 64 && openPedal.has(ev.channel)) {
          pedalRaws.push({ channel: ev.channel, down: openPedal.get(ev.channel), up: ev.tick });
          openPedal.delete(ev.channel);
        }
      }
    }
    for (const [channel, down] of openPedal) pedalRaws.push({ channel, down, up: durationTicks });
    const pedal = pedalRaws
      .filter((p) => p.up > p.down)
      .map((p) => ({ channel: p.channel, down: secondsAt(p.down), up: secondsAt(p.up) }))
      .sort((a, b) => a.down - b.down);

    return {
      format,
      ppq,
      smpteInfo,
      tempoEvents,
      timeSignatures,
      title: title || 'Senza titolo',
      tracks,
      notes,
      pedal,
      channelMap: Array.from(channelMap.values()),
      durationTicks,
      durationSeconds,
      secondsAt,
      bpm: tempoEvents[0].bpm,
      noteCount: notes.length,
      lowMidi: low,
      highMidi: high,
    };
  }

  function parseTrack(bytes, start, end) {
    let o = start;
    let tick = 0;
    let lastStatus = 0;
    let name = '';
    let channel = null;
    let endTick = 0;
    const events = [];
    const tempo = [];
    const timeSig = [];
    const programs = [];

    function readVLQ() {
      let v = 0, b;
      do {
        b = bytes[o++];
        v = (v << 7) | (b & 0x7f);
      } while (b & 0x80);
      return v >>> 0;
    }
    function readText(len) {
      let s = '';
      for (let i = 0; i < len; i++) {
        const c = bytes[o + i];
        if (!c) break;
        s += String.fromCharCode(c);
      }
      return s.trim();
    }

    while (o < end) {
      tick += readVLQ();
      let status = bytes[o++];
      if (status < 0x80) { status = lastStatus; o--; }
      lastStatus = status;

      if (status === 0xff) {
        const type = bytes[o++];
        const len = readVLQ();
        if (type === 0x2f) { endTick = tick; o += len; break; }
        if (type === 0x03) { const s = readText(len); o += len; if (!name) name = s; }
        else if (type === 0x51 && len >= 3) {
          const uspq = (bytes[o] << 16) | (bytes[o + 1] << 8) | bytes[o + 2];
          tempo.push({ tick, bpm: Math.round((60000000 / uspq) * 100) / 100 });
          o += len;
        } else if (type === 0x58 && len >= 4) {
          timeSig.push({ tick, numerator: bytes[o], denominator: Math.pow(2, bytes[o + 1]) });
          o += len;
        } else {
          o += len;
        }
        continue;
      }
      if (status === 0xf0 || status === 0xf7) { o += readVLQ(); continue; }

      const kind = status >> 4;
      const ch = status & 0x0f;
      if (kind === 0x8 || kind === 0x9) {
        const pitch = bytes[o++];
        const vel = bytes[o++];
        events.push(kind === 0x8 || vel === 0
          ? { type: 'off', tick, channel: ch, pitch }
          : { type: 'on', tick, channel: ch, pitch, velocity: vel });
        if (channel == null) channel = ch;
      } else if (kind === 0xb) {
        const cc = bytes[o++];
        const value = bytes[o++];
        events.push({ type: 'cc', tick, channel: ch, cc, value });
        if (channel == null) channel = ch;
      } else if (kind === 0xc) {
        programs.push({ tick, channel: ch, program: bytes[o++] });
        if (channel == null) channel = ch;
      } else if (kind === 0xa) { o += 2; }
      else if (kind === 0xd) { o += 1; }
      else if (kind === 0xe) { o += 2; }
      else break;
    }
    return { name, events, tempo, timeSig, programs, endTick: Math.max(endTick, tick), channel };
  }

  // Piecewise-linear tick -> seconds from tempo map.
  function makeTimeMapper(ppq, smpteInfo, tempoEvents) {
    if (smpteInfo) {
      const ticksPerSec = smpteInfo.fps * smpteInfo.ticksPerFrame;
      return function (tick) { return tick / ticksPerSec; };
    }
    const segs = [];
    let acc = 0;
    for (let i = 0; i < tempoEvents.length; i++) {
      const te = tempoEvents[i];
      const fromTick = i ? tempoEvents[i - 1].tick : 0;
      const fromBpm = i ? tempoEvents[i - 1].bpm : te.bpm;
      acc += Math.max(0, te.tick - fromTick) * (60 / fromBpm) / ppq;
      segs.push({ tick: te.tick, sec: acc, bpm: te.bpm });
    }
    return function (tick) {
      if (tick <= 0) return 0;
      let lo = 0, hi = segs.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (segs[mid].tick <= tick) lo = mid;
        else hi = mid - 1;
      }
      const s = segs[lo];
      return s.sec + (tick - s.tick) * (60 / s.bpm) / ppq;
    };
  }

  /* ─────────────────────────── BUILDER ─────────────────────────── */

  function buildMidi(opts) {
    const bpm = opts.bpm || 120;
    const ppq = opts.ppq || 480;
    const tracksIn = opts.tracks || [];
    const secToTick = (sec) => Math.max(0, Math.round(sec * ppq * bpm / 60));

    function vlqBytes(v) {
      const a = [];
      do {
        a.unshift(v & 0x7f);
        v = Math.floor(v / 128);
      } while (v);
      for (let i = 0; i < a.length - 1; i++) a[i] |= 0x80;
      return a;
    }
    function asciiBytes(str) {
      const raw = String(str == null ? '' : str);
      const enc = [];
      for (let i = 0; i < raw.length; i++) {
        const c = raw.charCodeAt(i);
        enc.push(c < 128 ? c : 63);
      }
      return enc;
    }

    const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, (tracksIn.length >> 8) & 0xff, tracksIn.length & 0xff, (ppq >> 8) & 0xff, ppq & 0xff];
    const out = header.slice();

    for (const tr of tracksIn) {
      const body = [];
      let prevTick = 0;
      const emit = (tick, arr) => {
        const delta = Math.max(0, tick - prevTick);
        prevTick = tick;
        for (const b of vlqBytes(delta)) body.push(b);
        for (const b of arr) body.push(b);
      };

      const channel = (tr.channel == null ? 0 : tr.channel) & 0x0f;
      const notes = (tr.notes || []).slice().sort((a, b) => a.time - b.time || a.midi - b.midi);
      let lastEndTick = 1;

      if (tr.name) {
        const enc = asciiBytes(tr.name);
        emit(0, [0xff, 0x03, enc.length].concat(enc));
      }
      const trackBpm = tr.tempoBPM || bpm;
      if (Math.abs(trackBpm - bpm) > 0.01) {
        const us = Math.round(60000000 / trackBpm);
        emit(0, [0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff]);
      }
      if (tr.program != null) emit(0, [0xc0 | channel, tr.program & 0x7f]);

      for (const n of notes) {
        const onTick = secToTick(n.time);
        const offTick = Math.max(onTick + 1, secToTick(n.time + Math.max(0.03, n.dur)));
        const vel = Math.max(1, Math.min(127, Math.round(n.velocity == null ? 96 : n.velocity)));
        emit(onTick, [0x90 | channel, n.midi & 0x7f, vel]);
        emit(offTick, [0x80 | channel, n.midi & 0x7f, 0]);
        lastEndTick = Math.max(lastEndTick, offTick);
      }
      emit(lastEndTick, [0xff, 0x2f, 0x00]);

      const len = body.length;
      out.push(0x4d, 0x54, 0x72, 0x6b);
      out.push((len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff);
      for (const b of body) out.push(b);
    }
    return new Uint8Array(out).buffer;
  }

  return { parse, buildMidi, nameOfMidi, freqOfMidi, NOTE_NAMES };
});
