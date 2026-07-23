export function brightnessContrast(
  sourceCanvas: HTMLCanvasElement,
  brightness: number,
  contrast: number
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  const outData = outCtx.createImageData(width, height)
  const d = srcData.data
  const o = outData.data

  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast))

  for (let i = 0; i < d.length; i += 4) {
    o[i] = Math.max(0, Math.min(255, contrastFactor * (d[i] + brightness - 128) + 128))
    o[i + 1] = Math.max(0, Math.min(255, contrastFactor * (d[i + 1] + brightness - 128) + 128))
    o[i + 2] = Math.max(0, Math.min(255, contrastFactor * (d[i + 2] + brightness - 128) + 128))
    o[i + 3] = d[i + 3]
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}

export function saturation(
  sourceCanvas: HTMLCanvasElement,
  saturation: number
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  const outData = outCtx.createImageData(width, height)
  const d = srcData.data
  const o = outData.data

  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    o[i] = Math.max(0, Math.min(255, gray + (d[i] - gray) * (1 + saturation / 100)))
    o[i + 1] = Math.max(0, Math.min(255, gray + (d[i + 1] - gray) * (1 + saturation / 100)))
    o[i + 2] = Math.max(0, Math.min(255, gray + (d[i + 2] - gray) * (1 + saturation / 100)))
    o[i + 3] = d[i + 3]
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}

export function gaussianBlur(
  sourceCanvas: HTMLCanvasElement,
  radius: number
): HTMLCanvasElement {
  if (radius < 1) {
    const out = document.createElement('canvas')
    out.width = sourceCanvas.width
    out.height = sourceCanvas.height
    out.getContext('2d')!.drawImage(sourceCanvas, 0, 0)
    return out
  }

  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)
  const out1 = srcCtx.createImageData(width, height)
  const out2 = srcCtx.createImageData(width, height)

  const size = Math.round(radius * 3)
  const kernel = new Float32Array(size * 2 + 1)
  let sum = 0
  for (let i = -size; i <= size; i++) {
    kernel[i + size] = Math.exp(-(i * i) / (2 * radius * radius))
    sum += kernel[i + size]
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum

  const src = srcData.data
  const buf1 = out1.data
  const buf2 = out2.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let k = -size; k <= size; k++) {
        const sx = Math.max(0, Math.min(width - 1, x + k))
        const si = (y * width + sx) * 4
        const w = kernel[k + size]
        r += src[si] * w
        g += src[si + 1] * w
        b += src[si + 2] * w
        a += src[si + 3] * w
      }
      const di = (y * width + x) * 4
      buf1[di] = r
      buf1[di + 1] = g
      buf1[di + 2] = b
      buf1[di + 3] = a
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let k = -size; k <= size; k++) {
        const sy = Math.max(0, Math.min(height - 1, y + k))
        const si = (sy * width + x) * 4
        const w = kernel[k + size]
        r += buf1[si] * w
        g += buf1[si + 1] * w
        b += buf1[si + 2] * w
        a += buf1[si + 3] * w
      }
      const di = (y * width + x) * 4
      buf2[di] = r
      buf2[di + 1] = g
      buf2[di + 2] = b
      buf2[di + 3] = a
    }
  }

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  outCtx.putImageData(out2, 0, 0)
  return out
}
