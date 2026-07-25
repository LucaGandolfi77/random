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

export function gaussianBlurPixels(
  srcPixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const outPixels = new Uint8ClampedArray(width * height * 4)
  if (radius < 1) {
    for (let i = 0; i < srcPixels.length; i++) outPixels[i] = srcPixels[i]
    return outPixels
  }

  const buf1 = new Uint8ClampedArray(width * height * 4)

  const size = Math.round(radius * 3)
  const kernel = new Float32Array(size * 2 + 1)
  let sum = 0
  for (let i = -size; i <= size; i++) {
    kernel[i + size] = Math.exp(-(i * i) / (2 * radius * radius))
    sum += kernel[i + size]
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum

  // Premultiply RGB by alpha before blurring to prevent dark halos
  // around semi-transparent edges.
  const src = new Uint8ClampedArray(srcPixels.length)
  for (let i = 0; i < srcPixels.length; i += 4) {
    const a = srcPixels[i + 3] / 255
    src[i] = srcPixels[i] * a
    src[i + 1] = srcPixels[i + 1] * a
    src[i + 2] = srcPixels[i + 2] * a
    src[i + 3] = srcPixels[i + 3]
  }

  // Horizontal pass
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

  // Vertical pass
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
      outPixels[di] = r
      outPixels[di + 1] = g
      outPixels[di + 2] = b
      outPixels[di + 3] = a
    }
  }

  // Un-premultiply
  for (let i = 0; i < outPixels.length; i += 4) {
    const a = outPixels[i + 3]
    if (a > 0) {
      outPixels[i] = Math.min(255, (outPixels[i] * 255) / a)
      outPixels[i + 1] = Math.min(255, (outPixels[i + 1] * 255) / a)
      outPixels[i + 2] = Math.min(255, (outPixels[i + 2] * 255) / a)
    } else {
      outPixels[i] = 0
      outPixels[i + 1] = 0
      outPixels[i + 2] = 0
    }
  }

  return outPixels
}

export function gaussianBlur(
  sourceCanvas: HTMLCanvasElement,
  radius: number
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const ctx = sourceCanvas.getContext('2d')!
  const srcData = ctx.getImageData(0, 0, width, height)
  const outPixels = gaussianBlurPixels(srcData.data, width, height, radius)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  out.getContext('2d')!.putImageData(new ImageData(outPixels.slice(), width, height), 0, 0)
  return out
}
