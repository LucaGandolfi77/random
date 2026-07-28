class Reader {
  constructor() {
    this.type = null
    this.pdfDoc = null
    this.pdfPage = 1
    this.pdfTotal = 0
    this.epubBook = null
    this.epubRend = null
    this.epubUrl = null
    this.onPageChange = null
    this._hist = JSON.parse(localStorage.getItem('shhh_hist') || '[]')
  }

  get history() { return this._hist }

  async open(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const ab = await file.arrayBuffer()
    this.type = ext

    gid('home-view').hidden = true
    gid('reader-view').hidden = false
    gid('reader-title').textContent = file.name

    gid('pdf-container').hidden = true
    gid('epub-container').hidden = true
    gid('text-container').hidden = true

    if (ext === 'pdf') await this._pdf(ab)
    else if (ext === 'epub') await this._epub(ab)
    else await this._text(ab, ext)

    this._addHist(file.name)
  }

  async _pdf(ab) {
    if (!window.pdfjsLib) return this._err('PDF.js non caricato')
    window.pdfjsLib.disableWorker = true
    this.pdfDoc = await window.pdfjsLib.getDocument({ data: ab }).promise
    this.pdfTotal = this.pdfDoc.numPages
    this.pdfPage = 1
    gid('pdf-container').hidden = false
    await this._renderPDF()
  }

  async _renderPDF() {
    const page = await this.pdfDoc.getPage(this.pdfPage)
    const canvas = gid('pdf-canvas')
    const ctx = canvas.getContext('2d')
    const container = canvas.parentElement
    const maxW = container.clientWidth - 32
    const vp = page.getViewport({ scale: 1 })
    const scale = Math.min(2, maxW / vp.width)
    const svp = page.getViewport({ scale })
    canvas.width = svp.width
    canvas.height = svp.height
    await page.render({ canvasContext: ctx, viewport: svp }).promise
    gid('reader-page').textContent = `${this.pdfPage} / ${this.pdfTotal}`
    if (this.onPageChange) this.onPageChange(this.pdfPage, this.pdfTotal)
  }

  async _epub(ab) {
    if (!window.ePub) return this._err('epub.js non caricato')
    const blob = new Blob([ab], { type: 'application/epub+zip' })
    const url = URL.createObjectURL(blob)
    this.epubUrl = url
    this.epubBook = new window.ePub(url)
    gid('epub-container').hidden = false
    this.epubRend = this.epubBook.renderTo('epub-container', {
      width: '100%', height: '100%', spread: 'none', flow: 'paginated',
    })
    await this.epubRend.display()
    this.epubRend.on('relocated', loc => {
      if (this.onPageChange) this.onPageChange(loc.start?.index ?? 0, loc.end?.index ?? 0)
    })
  }

  async _text(ab, ext) {
    let txt = new TextDecoder().decode(ab)
    gid('text-container').hidden = false
    const el = gid('text-container')
    if (ext === 'md' && window.marked) {
      el.innerHTML = window.marked.parse(txt)
    } else if (ext === 'html' || ext === 'htm') {
      el.innerHTML = txt
    } else {
      el.textContent = txt
    }
    el.className = 'text-content'
  }

  _addHist(name) {
    this._hist = this._hist.filter(h => h !== name)
    this._hist.unshift(name)
    if (this._hist.length > 10) this._hist.pop()
    localStorage.setItem('shhh_hist', JSON.stringify(this._hist))
  }

  prev() {
    if (this.type === 'pdf' && this.pdfPage > 1) { this.pdfPage--; this._renderPDF() }
    else if (this.epubRend) this.epubRend.prev()
  }

  next() {
    if (this.type === 'pdf' && this.pdfPage < this.pdfTotal) { this.pdfPage++; this._renderPDF() }
    else if (this.epubRend) this.epubRend.next()
  }

  close() {
    if (this.epubRend) { this.epubRend.destroy(); this.epubRend = null }
    if (this.epubBook) { this.epubBook.destroy(); this.epubBook = null }
    if (this.epubUrl) { URL.revokeObjectURL(this.epubUrl); this.epubUrl = null }
    this.pdfDoc = null
    this.pdfPage = 1
    this.type = null
    gid('home-view').hidden = false
    gid('reader-view').hidden = true
  }

  _err(msg) {
    gid('text-container').hidden = false
    gid('text-container').innerHTML = `<p class="error">${msg}</p>`
  }
}
