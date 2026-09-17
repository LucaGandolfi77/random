// Tracce chiptune 8-bit generate proceduralmente
// Frequenze in Hz, durata in "unit" (moltiplicata per UNIT_MS nel player)

export const UNIT_MS = 280

const NOTE_FREQ = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
  'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00,
  'A#5': 932.33, 'B5': 987.77, 'C6': 1046.5,
}

export const freqFor = (name) => NOTE_FREQ[name] || 440

// Ogni traccia: [{ note: 'E5' | null (pausa), dur: unit }]
export const TRACKS = [
  {
    name: 'Gran Vals',
    artist: 'La mitica suoneria',
    bpm: 1.0,
    notes: [
      { note: 'E5', dur: 1 }, { note: 'D5', dur: 1 }, { note: 'F#4', dur: 1 }, { note: 'G#4', dur: 1 },
      { note: 'C#4', dur: 1 }, { note: 'B4', dur: 1 }, { note: 'D4', dur: 1 }, { note: 'E4', dur: 1 },
      { note: 'B4', dur: 1 }, { note: 'A4', dur: 1 }, { note: 'C#4', dur: 1 }, { note: 'E4', dur: 1 },
      { note: 'A4', dur: 3 },
    ],
  },
  {
    name: 'Snake Dance',
    artist: 'Pentatonica da rettile',
    bpm: 1.15,
    notes: [
      { note: 'E4', dur: 1 }, { note: 'G4', dur: 1 }, { note: 'A4', dur: 1 }, { note: 'G4', dur: 1 },
      { note: 'E4', dur: 1 }, { note: 'D4', dur: 1 }, { note: 'E4', dur: 2 },
      { note: 'G4', dur: 1 }, { note: 'A4', dur: 1 }, { note: 'C5', dur: 1 }, { note: 'A4', dur: 1 },
      { note: 'G4', dur: 1 }, { note: 'E4', dur: 1 }, { note: 'D4', dur: 2 },
      { note: 'E4', dur: 1 }, { note: 'G4', dur: 1 }, { note: 'A4', dur: 1 }, { note: 'C5', dur: 1 },
      { note: 'D5', dur: 1 }, { note: 'C5', dur: 1 }, { note: 'A4', dur: 2 },
    ],
  },
  {
    name: 'Boot Sequence',
    artist: 'Arpeggio di sistema',
    bpm: 1.3,
    notes: [
      { note: 'C4', dur: 1 }, { note: 'E4', dur: 1 }, { note: 'G4', dur: 1 }, { note: 'C5', dur: 1 },
      { note: 'G4', dur: 1 }, { note: 'E4', dur: 1 }, { note: 'C4', dur: 1 }, { note: 'E4', dur: 1 },
      { note: 'G4', dur: 1 }, { note: 'C5', dur: 1 }, { note: 'E5', dur: 2 },
      { note: null, dur: 1 },
      { note: 'C5', dur: 1 }, { note: 'G4', dur: 1 }, { note: 'E4', dur: 1 }, { note: 'C4', dur: 2 },
    ],
  },
  {
    name: 'Midnight Bass',
    artist: 'Per le notti insonni',
    bpm: 0.9,
    notes: [
      { note: 'A4', dur: 2 }, { note: 'A4', dur: 1 }, { note: 'C5', dur: 1 },
      { note: 'A4', dur: 1 }, { note: 'G4', dur: 1 }, { note: 'A4', dur: 2 },
      { note: 'E4', dur: 2 }, { note: 'E4', dur: 1 }, { note: 'G4', dur: 1 },
      { note: 'E4', dur: 1 }, { note: 'D4', dur: 1 }, { note: 'E4', dur: 2 },
      { note: 'F4', dur: 1 }, { note: 'G4', dur: 1 }, { note: 'A4', dur: 1 }, { note: 'G4', dur: 1 },
      { note: 'F4', dur: 1 }, { note: 'E4', dur: 1 }, { note: 'D4', dur: 1 }, { note: 'C4', dur: 1 },
      { note: 'A4', dur: 3 },
    ],
  },
]
