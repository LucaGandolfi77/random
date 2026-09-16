'use strict'
// Round-trip test: build a MIDI with buildMidi() then parse it back.
const path = require('path')
const Midi = require(path.join(__dirname, '..', 'js', 'midi.js'))

let failures = 0
function eq(actual, expected, label) {
  const ok = Math.abs(actual - expected) < (typeof expected === 'number' ? 1e-6 : 0.5) || actual === expected
  if (!ok) { failures++; console.error('FAIL ' + label + ': atteso ' + expected + ', ottenuto ' + actual) }
  else console.log('PASS ' + label + ' = ' + actual)
}
function truthy(v, label) {
  if (!v) { failures++; console.error('FAIL ' + label) } else console.log('PASS ' + label)
}

// C major scale, 8 notes of 0.25s starting at 1s, bpm 120
const melody = { name: 'Melodia', channel: 0, program: 0, notes: [] }
const scale = [60, 62, 64, 65, 67, 69, 71, 72]
scale.forEach((m, i) => melody.notes.push({ time: 1 + i * 0.25, dur: 0.24, midi: m, velocity: 90 }))
const bass = { name: 'Basso', channel: 1, notes: [{ time: 0, dur: 2, midi: 48, velocity: 100 }] }

const buf = Midi.buildMidi({ bpm: 120, ppq: 480, tracks: [melody, bass] })
truthy(buf && buf.byteLength > 100, 'buildMidi produce un buffer (' + buf.byteLength + ' byte)')

const song = Midi.parse(buf, 'test-suite.mid')
eq(song.format, 1, 'format')
eq(song.ppq, 480, 'ppq')
eq(song.noteCount, 9, 'noteCount (8 + 1)')
eq(song.bpm, 120, 'bpm')
eq(song.title, 'test-suite', 'title da filename')
truthy(song.channelMap.length >= 2, 'channelMap con 2 canali')
eq(song.tracks.length, 2, 'tracce')

const first = song.notes.find((n) => n.midi === 60)
truthy(first, 'nota C4 presente')
eq(first.start, 1, 'start prima nota C4')
eq(Math.round(first.duration * 100) / 100, 0.24, 'durata prima nota C4 (quantizzata ai tick)')
const bassNote = song.notes.find((n) => n.midi === 48)
eq(Math.round(bassNote.duration * 100) / 100, 2, 'durata nota basso')
truthy(Math.abs(song.durationSeconds - (1 + 8 * 0.25)) < 0.05, 'durata totale ~3s (got ' + song.durationSeconds + ')')
eq(song.lowMidi, 48, 'lowMidi')
eq(song.highMidi, 72, 'highMidi')
eq(Midi.nameOfMidi(60), 'C4', 'nameOfMidi C4')
eq(Midi.nameOfMidi(69), 'A4', 'nameOfMidi A4')
eq(Midi.nameOfMidi(61), 'C#4', 'nameOfMidi C#4')

// format 0 single track round trip
const buf0 = Midi.buildMidi({ bpm: 90, tracks: [{ name: 'Solo', notes: [{ time: 0.5, dur: 1, midi: 64, velocity: 70 }] }] })
const song0 = Midi.parse(buf0)
eq(song0.format, 1, 'format0? (builder usa format 1) — ' + song0.format)
eq(song0.noteCount, 1, 'noteCount formato1')
eq(song0.notes[0].midi, 64, 'midi nota unica')

// parse deve fallire con garbage
let threw = false
try { Midi.parse(new Uint8Array(64).buffer) } catch (e) { threw = true }
truthy(threw, 'garbage rifiutato')

console.log(failures ? 'ENGINE TEST: ' + failures + ' FAILURES' : 'ENGINE TEST OK')
process.exit(failures ? 1 : 0)
