/* helpers — explicitly global so reader.js/browser.js can use them */
var gid = id => document.getElementById(id)
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
var ls = (k, def) => { try { const v = JSON.parse(localStorage.getItem('shhh_' + k)); return v !== null ? v : def } catch { return def } }
var lss = (k, v) => localStorage.setItem('shhh_' + k, JSON.stringify(v))

const App = {
  /* state */
  mode: 'threshold',        // 'threshold' | 'fade'
  tab: 'library',
  overlayVisible: false,
  graceTimer: null,
  contentOpacity: 1,
  settings: {
    threshold: -20,
    floor: -40,
    ceiling: -15,
    gracePeriod: 1.5,
    hysteresis: 3,
  },
  stats: { today: 0, total: 0, streak: 0, pages: 0 },

  async init() {
    this.loadPrefs()
    this.renderHistory()

    /* audio */
    this.audio = new AudioMonitor()
    this.audio.onLevel = dB => this.onLevel(dB)
    this.audio.onError = () => {
      gid('mic-dot').className = 'dot off'
      gid('level-text').textContent = '🎤 no'
    }

    try {
      await this.audio.start()
      gid('mic-dot').className = 'dot green'
      /* resume context on first user gesture if suspended */
      const resumeCtx = () => {
        if (this.audio.ctx && this.audio.ctx.state === 'suspended')
          this.audio.ctx.resume()
      }
      document.addEventListener('click', resumeCtx, { once: true })
      document.addEventListener('touchstart', resumeCtx, { once: true })
    } catch {
      gid('mic-dot').className = 'dot off'
      gid('level-text').textContent = '🎤 no'
    }

    /* reader & browser */
    this.reader = new Reader()
    this.browser = new Browser()
    this.reader.onPageChange = () => { this.stats.pages++; this.saveStats() }

    /* events */
    this.bindEvents()

    /* ui */
    this.updateUI()
    this.showTab('library')

    /* stats tick */
    this._silenceAccum = 0
    this._silenceTimer = setInterval(() => {
      if (this._silenceAccum > 0) {
        this.stats.today += this._silenceAccum
        this.stats.total += this._silenceAccum
        this._silenceAccum = 0
        this.saveStats()
        this.renderStats()
      }
    }, 1000)
  },

  /* ── audio processing ── */
  onLevel(dB) {
    this.updateMeter(dB)

    if (this.mode === 'threshold') {
      this.thresholdLogic(dB)
    } else {
      this.fadeLogic(dB)
    }

    /* accumulate silence (below threshold - 5dB) */
    if (dB < this.settings.threshold - 5) {
      this._silenceAccum += 0.066 // ~15fps worth
    }
  },

  thresholdLogic(dB) {
    const { threshold, hysteresis, gracePeriod } = this.settings
    if (dB > threshold) {
      /* too loud → hide immediately */
      if (this.graceTimer) { clearTimeout(this.graceTimer); this.graceTimer = null }
      this.showOverlay()
    } else if (dB < threshold - hysteresis) {
      /* quiet enough → start grace timer */
      if (this.overlayVisible && !this.graceTimer) {
        this.graceTimer = setTimeout(() => {
          this.hideOverlay()
          this.graceTimer = null
        }, gracePeriod * 1000)
      }
    } else {
      /* hysteresis zone → do nothing (cancel grace if level rises back) */
      if (this.graceTimer && dB >= threshold - hysteresis * 0.5) {
        clearTimeout(this.graceTimer)
        this.graceTimer = null
      }
    }
  },

  fadeLogic(dB) {
    const { floor, ceiling } = this.settings
    let t = (dB - floor) / (ceiling - floor)
    t = clamp(t, 0, 1)
    this.contentOpacity = 1 - t
    gid('content').style.opacity = this.contentOpacity
    this.overlayVisible = false
    gid('overlay-shhh').hidden = true
  },

  /* ── overlay ── */
  showOverlay() {
    if (this.overlayVisible) return
    this.overlayVisible = true
    gid('overlay-shhh').hidden = false
    gid('content').style.opacity = '1'
    if (navigator.vibrate) navigator.vibrate(30)
  },

  hideOverlay() {
    if (!this.overlayVisible) return
    this.overlayVisible = false
    gid('overlay-shhh').hidden = true
  },

  /* ── meter ── */
  updateMeter(dB) {
    const norm = clamp((dB + 55) / 50, 0, 1)
    gid('level-fill').style.width = (norm * 100) + '%'
    gid('level-text').textContent = dB.toFixed(1) + ' dB'
    gid('shhh-fill').style.width = (norm * 100) + '%'
    gid('shhh-level').textContent = dB.toFixed(1) + ' dB'

    /* mic dot color */
    const dot = gid('mic-dot')
    if (dB < this.settings.threshold - 5) dot.className = 'dot green'
    else if (dB < this.settings.threshold) dot.className = 'dot yellow'
    else dot.className = 'dot red'
  },

  /* ── tabs ── */
  showTab(name) {
    this.tab = name
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.tab === name))
    document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === 'tab-' + name))
  },

  /* ── settings / prefs ── */
  loadPrefs() {
    const s = ls('settings', null)
    if (s) Object.assign(this.settings, s)
    this.mode = ls('mode', 'threshold')
    const st = ls('stats', null)
    if (st) {
      /* check if same day */
      const now = new Date()
      const dayKey = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()
      if (st.day === dayKey) this.stats.today = st.today
      this.stats.total = st.total || 0
      this.stats.streak = st.streak || 0
      this.stats.pages = st.pages || 0
    }
    this.graceTimer = null
  },

  saveStats() {
    const now = new Date()
    const dayKey = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()
    const st = { day: dayKey, today: this.stats.today, total: this.stats.total, streak: this.stats.streak, pages: this.stats.pages }
    lss('stats', st)
  },

  savePrefs() {
    lss('settings', { ...this.settings })
    lss('mode', this.mode)
  },

  renderStats() {
    gid('stat-today').textContent = Math.round(this.stats.today) + 's'
    gid('stat-total').textContent = Math.round(this.stats.total) + 's'
    gid('stat-streak').textContent = this.stats.streak + '🔥'
    gid('stat-pages').textContent = this.stats.pages
  },

  renderHistory() {
    const el = gid('recent-books')
    const hist = JSON.parse(localStorage.getItem('shhh_hist') || '[]')
    if (!hist.length) { el.innerHTML = ''; return }
    el.innerHTML = '<h3>Aperti di recente</h3>' + hist.map(n => `<div class="recent-item">${n}</div>`).join('')
  },

  updateUI() {
    gid('mode-badge').textContent = this.mode === 'threshold' ? '🚫 Soglia' : '🌫️ Dissolvenza'
    gid('mode-toggle').textContent = this.mode === 'threshold' ? '🌫️' : '🚫'
    gid('sel-mode').value = this.mode
    gid('threshold-slider').value = this.settings.threshold
    gid('threshold-val').textContent = this.settings.threshold
    gid('floor-slider').value = this.settings.floor
    gid('floor-val').textContent = this.settings.floor
    gid('ceiling-slider').value = this.settings.ceiling
    gid('ceiling-val').textContent = this.settings.ceiling
    gid('grace-slider').value = this.settings.gracePeriod
    gid('grace-val').textContent = this.settings.gracePeriod.toFixed(1)
    gid('threshold-settings').hidden = this.mode !== 'threshold'
    gid('fade-settings').hidden = this.mode !== 'fade'
    this.renderStats()
  },

  switchMode(mode) {
    this.mode = mode
    if (mode === 'threshold') {
      gid('content').style.opacity = '1'
      this.contentOpacity = 1
    } else {
      this.hideOverlay()
    }
    this.savePrefs()
    this.updateUI()
  },

  /* ── events ── */
  bindEvents() {
    /* tabs */
    document.querySelectorAll('.tab').forEach(el => {
      el.addEventListener('click', () => this.showTab(el.dataset.tab))
    })

    /* mode toggle (audiobar) */
    gid('mode-toggle').addEventListener('click', () => {
      this.switchMode(this.mode === 'threshold' ? 'fade' : 'threshold')
    })

    /* settings panel */
    gid('settings-btn').addEventListener('click', () => { gid('settings-panel').hidden = false })
    gid('settings-close').addEventListener('click', () => { gid('settings-panel').hidden = true })

    gid('sel-mode').addEventListener('change', e => this.switchMode(e.target.value))

    gid('threshold-slider').addEventListener('input', e => {
      this.settings.threshold = +e.target.value
      gid('threshold-val').textContent = this.settings.threshold
      this.savePrefs()
    })

    gid('floor-slider').addEventListener('input', e => {
      this.settings.floor = +e.target.value
      gid('floor-val').textContent = this.settings.floor
      this.savePrefs()
    })

    gid('ceiling-slider').addEventListener('input', e => {
      this.settings.ceiling = +e.target.value
      gid('ceiling-val').textContent = this.settings.ceiling
      this.savePrefs()
    })

    gid('grace-slider').addEventListener('input', e => {
      this.settings.gracePeriod = +e.target.value
      gid('grace-val').textContent = this.settings.gracePeriod.toFixed(1)
      this.savePrefs()
    })

    gid('reset-stats-btn').addEventListener('click', () => {
      if (confirm('Resettare tutte le statistiche?')) {
        this.stats = { today: 0, total: 0, streak: 0, pages: 0 }
        this._silenceAccum = 0
        this.saveStats()
        this.renderStats()
      }
    })

    /* file picker / dropzone */
    gid('file-picker-link').addEventListener('click', () => gid('file-input').click())
    gid('file-input').addEventListener('change', () => {
      if (gid('file-input').files[0]) {
        this.reader.open(gid('file-input').files[0])
        this.renderHistory()
      }
    })

    const dz = gid('dropzone')
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover') })
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'))
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('dragover')
      const f = e.dataTransfer.files[0]
      if (f) {
        this.reader.open(f)
        this.renderHistory()
      }
    })
    dz.addEventListener('click', () => gid('file-input').click())

    /* reader nav */
    gid('reader-back').addEventListener('click', () => this.reader.close())
    gid('prev-page').addEventListener('click', () => this.reader.prev())
    gid('next-page').addEventListener('click', () => this.reader.next())

    /* keyboard shortcuts */
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' && !gid('reader-view').hidden) this.reader.prev()
      if (e.key === 'ArrowRight' && !gid('reader-view').hidden) this.reader.next()
      if (e.key === 'Escape') {
        gid('settings-panel').hidden = true
        if (!gid('reader-view').hidden) this.reader.close()
      }
    })
  },
}

document.addEventListener('DOMContentLoaded', () => App.init())
