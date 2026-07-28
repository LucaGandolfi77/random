class Browser {
  constructor() {
    this.frame = gid('browser-frame')
    this.input = gid('url-input')
    this.goBtn = gid('go-btn')
    this.blocked = gid('browser-blocked')
    this.quickLinks = document.querySelectorAll('[data-url]')

    this.input.addEventListener('keydown', e => { if (e.key === 'Enter') this.go() })
    this.goBtn.addEventListener('click', () => this.go())
    this.quickLinks.forEach(el => el.addEventListener('click', () => this.navigate(el.dataset.url)))

    this.frame.addEventListener('error', () => this._blocked())
    let loadTimer
    this.frame.addEventListener('load', () => {
      clearTimeout(loadTimer)
      loadTimer = setTimeout(() => {
        try {
          const doc = this.frame.contentDocument || this.frame.contentWindow?.document
          if (doc && (doc.body?.innerHTML?.trim() === '' || doc.title === '')) {
            this._blocked()
          }
        } catch (_) {}
      }, 2000)
    })
  }

  go() {
    let url = this.input.value.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    this.navigate(url)
  }

  navigate(url) {
    this.input.value = url
    this.blocked.hidden = true
    try { this.frame.src = url } catch (_) { this._blocked() }
  }

  _blocked() {
    this.blocked.hidden = false
  }
}
