// Motore audio di sistema: WebAudio, zero dipendenze
// beep, click, notifiche, toni di chiamata, suoneria, vibrazione

let profile = 2   // 0=Silenzioso, 1=Vibrazione, 2=Suoneria
let volume = 6    // 0-10

function getCtx() {
  try {
    if (!sound._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      sound._ctx = new AC()
    }
    if (sound._ctx.state === 'suspended') sound._ctx.resume()
    return sound._ctx
  } catch (e) { return null }
}

function tone(freq, dur, type = 'square', vol = 1) {
  if (profile === 0) return // silenzioso: niente suoni
  const ctx = getCtx()
  if (!ctx) return
  const gain = ctx.createGain()
  const osc = ctx.createOscillator()
  const v = vol * (volume / 10) * 0.25
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(v, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + dur + 0.02)
}

const sound = {
  _ctx: null,
  _ringInterval: null,
  _vibrateInterval: null,

  // --- API di sistema ---
  setProfile(p) { profile = p },
  getProfile() { return profile },
  setVolume(v) { volume = Math.max(0, Math.min(10, v)) },
  getVolume() { return volume },

  vibrate(ms) {
    if (profile === 0) return
    try { navigator.vibrate && navigator.vibrate(ms) } catch (e) {}
  },

  // --- Suoni di sistema ---
  click() { tone(1800, 0.03, 'square', 0.35) },
  keyTone() { tone(1245, 0.035, 'square', 0.4) },
  confirm() { tone(880, 0.07); setTimeout(() => tone(1318, 0.09), 80) },
  notify() { tone(1318, 0.09); setTimeout(() => tone(1760, 0.12), 110); this.vibrate(80) },
  error() { tone(196, 0.18, 'sawtooth', 0.8); this.vibrate(150) },

  /** Beep melodico a scadenza timer */
  alarmLoopStart() {
    this.alarmLoopStop()
    const pattern = [0, 150, 300, 450]
    let i = 0
    this._ringInterval = setInterval(() => {
      tone(pattern[i % pattern.length] === 0 ? 1568 : 2093, 0.12, 'square', 0.9)
      i++
    }, 200)
    this.vibrate([300, 100, 300])
  },
  alarmLoopStop() {
    if (this._ringInterval) { clearInterval(this._ringInterval); this._ringInterval = null }
  },

  /** Tono di chiamata in uscita (attesa collegamento) */
  ringbackStart() {
    this.ringbackStop()
    let on = true
    this._ringInterval = setInterval(() => {
      tone(425, 0.35, 'sine', 0.7)
      on = !on
    }, 900)
  },
  ringbackStop() {
    if (this._ringInterval) { clearInterval(this._ringInterval); this._ringInterval = null }
  },

  /** Suoneria per chiamate in entrata: du-du-li-da (omaggio alla Gran Vals) */
  ringStart() {
    this.ringStop()
    const melody = [
      [659.25, 0.18], [587.33, 0.18], [369.99, 0.18], [415.30, 0.18], // E5 D5 F#4 G#4
      [277.18, 0.18], [493.88, 0.18],                                 // C#4 B4
    ]
    let i = 0
    this._ringInterval = setInterval(() => {
      const [freq, dur] = melody[i % melody.length]
      tone(freq, dur, 'square', 0.9)
      i++
    }, 220)
  },
  ringStop() {
    if (this._ringInterval) { clearInterval(this._ringInterval); this._ringInterval = null }
    try { navigator.vibrate && navigator.vibrate(0) } catch (e) {}
  },

  /** Suona una nota con durata custom (per il synth chiptune) */
  playNote(freq, dur, type = 'square', vol = 0.8) {
    tone(freq, dur, type, vol)
  },
}

export default sound
