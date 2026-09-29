import { clamp01 } from './math'

/**
 * One bank of four chords per region, plus how bright the pad sits and how
 * long it lingers before it turns over.
 */
const REGION_MUSIC: Record<
  string,
  { chords: number[][]; cutoff: number; interval: number }
> = {
  // Am add9, the most consonant thing in the game
  flux: {
    chords: [
      [110, 164.81, 220, 277.18, 329.63],
      [110, 164.81, 246.94, 329.63],
      [123.47, 185, 246.94, 293.66, 369.99],
      [98, 146.83, 196, 246.94, 293.66],
    ],
    cutoff: 900,
    interval: 9000,
  },
  // low fifths: braced for impact
  tunnel: {
    chords: [
      [82.41, 123.47, 164.81, 246.94],
      [73.42, 110, 146.83, 220],
      [87.31, 130.81, 174.61, 261.63],
      [65.41, 98, 130.81, 196],
    ],
    cutoff: 520,
    interval: 8000,
  },
  // a major triad rubbing against a minor one
  interference: {
    chords: [
      [116.54, 174.61, 233.08, 293.66],
      [130.81, 196, 261.63, 329.63],
      [110, 164.81, 233.08, 311.13],
      [123.47, 185, 246.94, 349.23],
    ],
    cutoff: 1200,
    interval: 7000,
  },
  // suspended: nothing quite lands
  entanglement: {
    chords: [
      [98, 146.83, 196, 261.63, 293.66],
      [110, 164.81, 220, 293.66, 329.63],
      [87.31, 130.81, 196, 261.63, 311.13],
      [103.83, 155.56, 207.65, 311.13, 349.23],
    ],
    cutoff: 780,
    interval: 11000,
  },
  // a semitone grinding against a tritone
  uncertainty: {
    chords: [
      [92.5, 138.59, 196, 233.08],
      [103.83, 146.83, 207.65, 277.18],
      [98, 146.83, 196, 246.94],
      [110, 155.56, 220, 261.63],
    ],
    cutoff: 1000,
    interval: 6000,
  },
  // the machine's own chord, and it is not happy about it
  collapser: {
    chords: [
      [55, 82.41, 110, 164.81],
      [61.74, 92.5, 123.47, 185],
      [51.91, 77.78, 103.83, 155.56],
      [58.27, 87.31, 116.54, 174.61],
    ],
    cutoff: 420,
    interval: 6500,
  },
}

/** Lazily created WebAudio synth. No assets, all tones generated at runtime. */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private ambientTimer = 0
  private chordIndex = 0
  private started = false
  private region = ''
  private lastIntensityAt = 0
  muted = false
  volume = 0.7

  private ensure(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    }
    type WinWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext ?? (window as WinWithWebkit).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : this.volume
    master.connect(ctx.destination)

    const musicGain = ctx.createGain()
    musicGain.gain.value = 0.32
    musicGain.connect(master)

    const sfxGain = ctx.createGain()
    sfxGain.gain.value = 0.75
    sfxGain.connect(master)

    // shared noise buffer for whooshes and static
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

    this.ctx = ctx
    this.master = master
    this.musicGain = musicGain
    this.sfxGain = sfxGain
    this.noiseBuffer = buf
    return ctx
  }

  /** Must be called from a user gesture the first time. */
  unlock() {
    const ctx = this.ensure()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    if (!this.started) {
      this.started = true
      this.startAmbient()
    }
  }

  /**
   * Each region gets its own mode. The pad is the only music, so it has to
   * change character when you walk into a new physics.
   */
  setRegion(id: string) {
    if (id === this.region) return
    this.region = id
    if (this.started) this.startAmbient()
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05)
    }
  }

  setVolume(v: number) {
    this.volume = v
    if (this.master && this.ctx && !this.muted) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
    }
  }

  private tone(opts: {
    freq: number
    dur: number
    type?: OscillatorType
    gain?: number
    slideTo?: number
    dest?: GainNode | null
    delay?: number
    attack?: number
  }) {
    const ctx = this.ensure()
    if (!ctx || !this.sfxGain) return
    const t0 = ctx.currentTime + (opts.delay ?? 0)
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = opts.type ?? 'sine'
    osc.frequency.setValueAtTime(opts.freq, t0)
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t0 + opts.dur)
    const peak = (opts.gain ?? 0.25) * (opts.attack ?? 0.005)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.005))
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
    osc.connect(g)
    g.connect(opts.dest ?? this.sfxGain)
    osc.start(t0)
    osc.stop(t0 + opts.dur + 0.02)
  }

  private noise(opts: { dur: number; gain?: number; freq?: number; q?: number; type?: BiquadFilterType; delay?: number; sweepTo?: number }) {
    const ctx = this.ensure()
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return
    const t0 = ctx.currentTime + (opts.delay ?? 0)
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const filt = ctx.createBiquadFilter()
    filt.type = opts.type ?? 'bandpass'
    filt.frequency.setValueAtTime(opts.freq ?? 900, t0)
    if (opts.sweepTo) filt.frequency.exponentialRampToValueAtTime(Math.max(40, opts.sweepTo), t0 + opts.dur)
    filt.Q.value = opts.q ?? 1.2
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t0 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.sfxGain)
    src.start(t0)
    src.stop(t0 + opts.dur + 0.02)
  }

  jump() {
    this.tone({ freq: 420, slideTo: 760, dur: 0.16, type: 'triangle', gain: 0.16 })
    this.noise({ dur: 0.18, freq: 1800, sweepTo: 3600, gain: 0.07 })
  }

  phase() {
    this.tone({ freq: 180, slideTo: 60, dur: 0.4, type: 'sine', gain: 0.16 })
    this.noise({ dur: 0.45, freq: 600, sweepTo: 240, gain: 0.1, type: 'lowpass' })
  }

  collect() {
    this.tone({ freq: 880, dur: 0.1, type: 'sine', gain: 0.16 })
    this.tone({ freq: 1320, dur: 0.16, type: 'sine', gain: 0.12, delay: 0.05 })
  }

  bad() {
    this.tone({ freq: 200, slideTo: 60, dur: 0.4, type: 'sawtooth', gain: 0.2 })
    this.noise({ dur: 0.4, freq: 300, gain: 0.14, type: 'lowpass' })
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) =>
      this.tone({ freq: f, dur: 0.5, type: 'triangle', gain: 0.16, delay: i * 0.1 }),
    )
    this.noise({ dur: 0.7, freq: 3000, sweepTo: 800, gain: 0.06 })
  }

  lose() {
    const notes = [392, 329.6, 261.6, 196]
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.45, type: 'sawtooth', gain: 0.12, delay: i * 0.13 }))
  }

  blip(freq = 660, gain = 0.12) {
    this.tone({ freq, dur: 0.08, type: 'square', gain })
  }

  collapse() {
    this.noise({ dur: 0.5, freq: 2400, sweepTo: 120, gain: 0.2, type: 'lowpass' })
    this.tone({ freq: 1200, slideTo: 90, dur: 0.5, type: 'sine', gain: 0.18 })
  }

  /** Slow generative pad, refreshed on the game clock. */
  startAmbient() {
    const ctx = this.ensure()
    if (!ctx || !this.musicGain) return
    const bank = REGION_MUSIC[this.region] ?? REGION_MUSIC.flux
    const chords = bank.chords
    const cutoff = bank.cutoff
    const interval = bank.interval
    this.musicGain.disconnect()
    const bus = ctx.createGain()
    bus.gain.value = 0.0001
    bus.gain.setTargetAtTime(0.5, ctx.currentTime, 2)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    filter.Q.value = 0.7
    filter.connect(bus)
    bus.connect(this.musicGain)

    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.06
    lfoGain.gain.value = cutoff * 0.55
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start()

    let current: OscillatorNode[] = []
    const playChord = (i: number) => {
      for (const o of current) {
        try {
          o.stop(ctx.currentTime + 3)
        } catch {
          /* already stopped */
        }
      }
      current = chords[i % chords.length].map((f, k) => {
        const o = ctx.createOscillator()
        o.type = k % 2 ? 'sine' : 'triangle'
        o.frequency.value = f
        const g = ctx.createGain()
        g.gain.value = 0.0001
        g.gain.setTargetAtTime(0.09 / (k + 1), ctx.currentTime, 1.2)
        o.connect(g)
        g.connect(filter)
        o.start()
        return o
      })
      this.chordIndex = i + 1
    }
    playChord(0)
    this.ambientTimer = window.setInterval(() => playChord(this.chordIndex), interval)
  }

  /**
   * Drive the pad brightness from gameplay intensity. Throttled: scenes call
   * this every frame and 60 automation events a second is just noise.
   */
  setIntensity(v: number) {
    const ctx = this.ctx
    if (!ctx || !this.musicGain) return
    const now = ctx.currentTime
    if (now - this.lastIntensityAt < 0.12) return
    this.lastIntensityAt = now
    this.musicGain.gain.setTargetAtTime(0.18 + 0.35 * clamp01(v), now, 0.6)
  }

  dispose() {
    if (this.ambientTimer) window.clearInterval(this.ambientTimer)
    this.ambientTimer = 0
    void this.ctx?.close()
    this.ctx = null
    this.started = false
  }
}

export const audio = new AudioEngine()
