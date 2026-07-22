/* eslint-disable @typescript-eslint/no-explicit-any */

const canvasStore = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>()

function getBuffer(canvas: HTMLCanvasElement): Uint8ClampedArray {
  let buf = canvasStore.get(canvas)
  if (!buf) {
    buf = new Uint8ClampedArray(canvas.width * canvas.height * 4)
    canvasStore.set(canvas, buf)
  }
  return buf
}

function parseColor(color: string): [number, number, number, number] {
  if (color === 'transparent' || color === '') return [0, 0, 0, 0]
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        255,
      ]
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      255,
    ]
  }
  return [0, 0, 0, 255]
}

class MockImageData {
  data: Uint8ClampedArray
  width: number
  height: number
  constructor(dataOrWidth: Uint8ClampedArray | number, height?: number, _h2?: number) {
    if (dataOrWidth instanceof Uint8ClampedArray) {
      this.data = dataOrWidth
      this.width = height!
      this.height = _h2 || 0
    } else {
      this.width = dataOrWidth
      this.height = height || 0
      this.data = new Uint8ClampedArray(this.width * this.height * 4)
    }
  }
}

class MockCanvasRenderingContext2D {
  private _canvas: any
  fillStyle = '#000000'
  strokeStyle = '#000000'
  lineWidth = 1
  globalAlpha = 1
  private _lineDash: number[] = []
  lineDashOffset = 0

  get lineDash() { return this._lineDash }
  set lineDash(v: number[]) { this._lineDash = v }

  constructor(canvas: any) {
    this._canvas = canvas
  }

  clearRect(_x: number, _y: number, w: number, h: number) {
    const buf = getBuffer(this._canvas)
    const cw = this._canvas.width
    for (let py = Math.max(0, _y); py < Math.min(h, this._canvas.height); py++) {
      for (let px = Math.max(0, _x); px < Math.min(w, cw); px++) {
        const i = (py * cw + px) * 4
        buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0
      }
    }
  }

  fillRect(x: number, y: number, w: number, h: number) {
    const buf = getBuffer(this._canvas)
    const cw = this._canvas.width
    const ch = this._canvas.height
    const [r, g, b, a] = parseColor(this.fillStyle)
    for (let py = Math.max(0, Math.floor(y)); py < Math.min(Math.floor(y + h), ch); py++) {
      for (let px = Math.max(0, Math.floor(x)); px < Math.min(Math.floor(x + w), cw); px++) {
        const i = (py * cw + px) * 4
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a
      }
    }
  }

  strokeRect(_x: number, _y: number, _w: number, _h: number) {}

  beginPath() {}
  closePath() {}
  moveTo(_x: number, _y: number) {}
  lineTo(_x: number, _y: number) {}
  arc(_x: number, _y: number, _r: number, _s: number, _e: number) {}
  stroke() {}
  fill() {}

  drawImage(img: any, sx: number, sy: number) {
    if (img instanceof HTMLCanvasElement) {
      const srcBuf = getBuffer(img)
      const dstBuf = getBuffer(this._canvas)
      const dw = this._canvas.width
      const sw = img.width
      const sh = img.height
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const si = (y * sw + x) * 4
          const di = ((y + Math.floor(sy)) * dw + (x + Math.floor(sx))) * 4
          if (di >= 0 && di + 3 < dstBuf.length) {
            dstBuf[di] = srcBuf[si]
            dstBuf[di + 1] = srcBuf[si + 1]
            dstBuf[di + 2] = srcBuf[si + 2]
            dstBuf[di + 3] = srcBuf[si + 3]
          }
        }
      }
    }
  }

  createImageData(w: number, h: number): MockImageData {
    return new MockImageData(w, h)
  }

  getImageData(x: number, y: number, w: number, h: number): MockImageData {
    const buf = getBuffer(this._canvas)
    const cw = this._canvas.width
    const out = new Uint8ClampedArray(w * h * 4)
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const si = ((y + py) * cw + (x + px)) * 4
        const di = (py * w + px) * 4
        if (si >= 0 && si + 3 < buf.length) {
          out[di] = buf[si]
          out[di + 1] = buf[si + 1]
          out[di + 2] = buf[si + 2]
          out[di + 3] = buf[si + 3]
        }
      }
    }
    return new MockImageData(out, w, h)
  }

  putImageData(data: MockImageData, x: number, y: number) {
    const buf = getBuffer(this._canvas)
    const cw = this._canvas.width
    const sw = data.width
    const sh = data.height
    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const si = (py * sw + px) * 4
        const di = ((y + py) * cw + (x + px)) * 4
        if (di >= 0 && di + 3 < buf.length) {
          buf[di] = data.data[si]
          buf[di + 1] = data.data[si + 1]
          buf[di + 2] = data.data[si + 2]
          buf[di + 3] = data.data[si + 3]
        }
      }
    }
  }

  save() {}
  restore() {}
}

;(globalThis as any).ImageData = MockImageData

const origCreateElement = document.createElement.bind(document)
document.createElement = function (tag: string) {
  const el = origCreateElement(tag)
  if (tag === 'canvas') {
    let w = 300
    let h = 150
    Object.defineProperty(el, 'width', {
      get() { return w },
      set(v: number) {
        w = v
        canvasStore.delete(el as HTMLCanvasElement)
      },
      configurable: true,
    })
    Object.defineProperty(el, 'height', {
      get() { return h },
      set(v: number) {
        h = v
        canvasStore.delete(el as HTMLCanvasElement)
      },
      configurable: true,
    })

    const origGetContext = (el as HTMLCanvasElement).getContext.bind(el)
    ;(el as HTMLCanvasElement).getContext = function (type: string) {
      if (type === '2d') {
        return new MockCanvasRenderingContext2D(el) as any
      }
      return origGetContext(type)
    } as any

    ;(el as any).toBlob = function (cb: BlobCallback, _type?: string) {
      cb(new Blob(['mock'], { type: _type || 'image/png' }))
    }
  }
  return el
}
