class AudioMonitor {
  constructor() {
    this.onLevel = null
    this.onError = null
    this.running = false
    this.stream = null
    this.ctx = null
    this.analyser = null
    this.smoothed = -60
    this.smoothFactor = 0.85
    this._frame = null
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        echoCancellation: false,
      })
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      const src = this.ctx.createMediaStreamSource(this.stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 512
      src.connect(this.analyser)
      this.running = true
      this._tick()
    } catch (e) {
      if (this.onError) this.onError(e)
    }
  }

  _tick() {
    if (!this.running) return
    const buf = new Uint8Array(this.analyser.fftSize)
    this.analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i] / 128 - 1
      sum += v * v
    }
    const rms = Math.sqrt(sum / buf.length)
    const dB = 20 * Math.log10(rms + 1e-10)
    this.smoothed = this.smoothed * this.smoothFactor + dB * (1 - this.smoothFactor)
    if (this.onLevel) this.onLevel(this.smoothed)
    this._frame = requestAnimationFrame(() => this._tick())
  }

  stop() {
    this.running = false
    if (this._frame) cancelAnimationFrame(this._frame)
    if (this.stream) this.stream.getTracks().forEach(t => t.stop())
    if (this.ctx) this.ctx.close()
  }

  get level() { return this.smoothed }
}
