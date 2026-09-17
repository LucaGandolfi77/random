import { useState, useEffect, useRef, useCallback } from 'react'
import sound from '../../os/sound.js'
import { TRACKS, freqFor, UNIT_MS } from './tracks.js'

export default function MusicApp({ sys, kernel }) {
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [noteIdx, setNoteIdx] = useState(0)
  const [tick, setTick] = useState(0)

  const track = TRACKS[trackIdx]

  // scheduler delle note: un timer controlla se la nota corrente è finita
  useEffect(() => {
    if (!playing) return
    let cancelled = false
    const schedule = () => {
      if (cancelled) return
      const note = track.notes[noteIdx % track.notes.length]
      const dur = note.dur * UNIT_MS / track.bpm
      if (note.note) {
        sound.playNote(freqFor(note.note), (dur / 1000) * 0.9, 'square', 0.55)
        // basso d'accompagnamento un'ottava sotto, più piano
        sound.playNote(freqFor(note.note) / 2, (dur / 1000) * 0.9, 'triangle', 0.3)
      }
      const t = setTimeout(() => {
        if (cancelled) return
        setNoteIdx(i => (i + 1) % track.notes.length)
      }, dur)
      return t
    }
    const timer = schedule()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [playing, noteIdx, track])

  // visualizer a tempo
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setTick(n => n + 1), 150)
    return () => clearInterval(t)
  }, [playing])

  // all'uscita (kill): STOP alla musica
  useEffect(() => {
    return () => { setPlaying(false) }
  }, [])

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'softRight') { sys.exit(); return true }
      if (key === 'ok') { setPlaying(p => !p); return true }
      if (key === 'right') {
        setTrackIdx(i => (i + 1) % TRACKS.length)
        setNoteIdx(0)
        return true
      }
      if (key === 'left') {
        setTrackIdx(i => (i - 1 + TRACKS.length) % TRACKS.length)
        setNoteIdx(0)
        return true
      }
      if (key === 'up') {
        // riavvia dal capo
        setNoteIdx(0)
        setPlaying(true)
        return true
      }
      if (key === 'down') { setPlaying(false); return true }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, trackIdx])

  const currentNote = track.notes[noteIdx]

  return (
    <div className="app-music">
      <div className="music-title">Musica</div>
      <div className="music-track-name">{track.name}</div>
      <div className="music-track-artist">{track.artist}</div>

      <div className={`music-visualizer ${playing ? 'playing' : ''}`}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div
            key={i}
            className="music-bar"
            style={{
              animationDelay: `${i * 0.12}s`,
              animationDuration: `${0.5 + (i % 3) * 0.15}s`,
            }}
          />
        ))}
      </div>

      <div className="music-note">
        {playing ? (currentNote.note ? `♪ ${currentNote.note}` : '· · ·') : '⏸'}
      </div>
      <div className="music-progress">
        {track.notes.map((n, i) => (
          <span key={i} className={`music-dot ${i === noteIdx && playing ? 'music-dot-active' : ''}`}>●</span>
        ))}
      </div>

      <div className="music-controls">
        <button className="clock-sw-btn" onClick={() => { setTrackIdx(i => (i - 1 + TRACKS.length) % TRACKS.length); setNoteIdx(0) }}>◀◀</button>
        <button className="clock-sw-btn" onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pausa' : '▶ Play'}</button>
        <button className="clock-sw-btn" onClick={() => { setTrackIdx(i => (i + 1) % TRACKS.length); setNoteIdx(0) }}>▶▶</button>
      </div>
      <div className="contacts-add-hint">OK: play/pausa · ←/→: traccia · ↓: stop</div>
      {playing && <div className="music-bg-hint">♪ suona anche in background ♪</div>}
    </div>
  )
}
