import type { BlendMode, EasingCurve } from '../types'

export interface StretchResult {
  imageData: ImageData
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

export function easedFactor(i: number, total: number, easing: EasingCurve): number {
  const t = total > 1 ? Math.min(1, i / total) : 1
  switch (easing) {
    case 'exponential':
      return (1 - t) * (1 - t)
    case 'sine':
      return Math.cos((t * Math.PI) / 2)
    case 'bounce': {
      const b = 1 - t
      if (b < 1 / 2.75) return 7.5625 * b * b
      if (b < 2 / 2.75) return 7.5625 * (b - 1.5 / 2.75) ** 2 + 0.75
      if (b < 2.5 / 2.75) return 7.5625 * (b - 2.25 / 2.75) ** 2 + 0.9375
      return 7.5625 * (b - 2.625 / 2.75) ** 2 + 0.984375
    }
    default:
      return 1 - t
  }
}

function shouldDissolve(x: number, y: number, alpha: number): boolean {
  return BAYER_4X4[y % 4][x % 4] / 16 < alpha
}

function computeAlpha(
  x: number,
  y: number,
  rawAlpha: number,
  blendMode: BlendMode
): number {
  if (blendMode === 'dissolve') {
    return shouldDissolve(x, y, rawAlpha) ? 255 : 0
  }
  return Math.round(rawAlpha * 255)
}

export function radialStretch(
  sourceCanvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  stretchH: number,
  stretchV: number,
  blendMode: BlendMode = 'normal',
  easing: EasingCurve = 'linear'
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  const outData = outCtx.createImageData(width, height)

  const sx = Math.floor(centerX)
  const sy = Math.floor(centerY)

  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return out

  const srcPixels = srcData.data
  const outPixels = outData.data

  const clampX = (v: number) => Math.max(0, Math.min(width - 1, v))
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, v))
  const idx = (x: number, y: number) => (y * width + x) * 4

  for (let i = 1; i <= stretchH; i++) {
    const rawAlpha = easedFactor(i, stretchH, easing)
    const si = idx(sx, sy)

    const rx = idx(clampX(sx + i), sy)
    outPixels[rx] = srcPixels[si]
    outPixels[rx + 1] = srcPixels[si + 1]
    outPixels[rx + 2] = srcPixels[si + 2]
    outPixels[rx + 3] = computeAlpha(sx + i, sy, rawAlpha * srcPixels[si + 3] / 255, blendMode)

    const lx = idx(clampX(sx - i), sy)
    outPixels[lx] = srcPixels[si]
    outPixels[lx + 1] = srcPixels[si + 1]
    outPixels[lx + 2] = srcPixels[si + 2]
    outPixels[lx + 3] = computeAlpha(sx - i, sy, rawAlpha * srcPixels[si + 3] / 255, blendMode)
  }

  for (let j = 1; j <= stretchV; j++) {
    const rawAlpha = easedFactor(j, stretchV, easing)
    const si = idx(sx, sy)

    const dy = idx(sx, clampY(sy + j))
    outPixels[dy] = srcPixels[si]
    outPixels[dy + 1] = srcPixels[si + 1]
    outPixels[dy + 2] = srcPixels[si + 2]
    outPixels[dy + 3] = computeAlpha(sx, sy + j, rawAlpha * srcPixels[si + 3] / 255, blendMode)

    const uy = idx(sx, clampY(sy - j))
    outPixels[uy] = srcPixels[si]
    outPixels[uy + 1] = srcPixels[si + 1]
    outPixels[uy + 2] = srcPixels[si + 2]
    outPixels[uy + 3] = computeAlpha(sx, sy - j, rawAlpha * srcPixels[si + 3] / 255, blendMode)
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}

export function rowStretch(
  sourceCanvas: HTMLCanvasElement,
  row: number,
  stretchUp: number,
  stretchDown: number,
  blendMode: BlendMode = 'normal',
  easing: EasingCurve = 'linear'
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  const outData = outCtx.createImageData(width, height)

  const srcPixels = srcData.data
  const outPixels = outData.data
  const r = Math.floor(row)
  const idx = (x: number, y: number) => (y * width + x) * 4
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, v))

  for (let x = 0; x < width; x++) {
    const si = idx(x, r)
    const pr = srcPixels[si]
    const pg = srcPixels[si + 1]
    const pb = srcPixels[si + 2]
    const pa = srcPixels[si + 3]

    for (let i = 1; i <= stretchUp; i++) {
      const rawAlpha = easedFactor(i, stretchUp, easing)
              const ti = idx(x, clampY(r - i))
              outPixels[ti] = pr
              outPixels[ti + 1] = pg
              outPixels[ti + 2] = pb
              outPixels[ti + 3] = computeAlpha(x, r - i, rawAlpha * pa / 255, blendMode)
            }

            for (let i = 1; i <= stretchDown; i++) {
              const rawAlpha = easedFactor(i, stretchDown, easing)
      const bi = idx(x, clampY(r + i))
      outPixels[bi] = pr
      outPixels[bi + 1] = pg
      outPixels[bi + 2] = pb
      outPixels[bi + 3] = computeAlpha(x, r + i, rawAlpha * pa / 255, blendMode)
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}

export function columnStretch(
  sourceCanvas: HTMLCanvasElement,
  col: number,
  stretchLeft: number,
  stretchRight: number,
  blendMode: BlendMode = 'normal',
  easing: EasingCurve = 'linear'
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  const outData = outCtx.createImageData(width, height)

  const srcPixels = srcData.data
  const outPixels = outData.data
  const c = Math.floor(col)
  const idx = (x: number, y: number) => (y * width + x) * 4
  const clampX = (v: number) => Math.max(0, Math.min(width - 1, v))

  for (let y = 0; y < height; y++) {
    const si = idx(c, y)
    const pr = srcPixels[si]
    const pg = srcPixels[si + 1]
    const pb = srcPixels[si + 2]
    const pa = srcPixels[si + 3]

    for (let i = 1; i <= stretchLeft; i++) {
      const rawAlpha = easedFactor(i, stretchLeft, easing)
              const ti = idx(clampX(c - i), y)
              outPixels[ti] = pr
              outPixels[ti + 1] = pg
              outPixels[ti + 2] = pb
              outPixels[ti + 3] = computeAlpha(c - i, y, rawAlpha * pa / 255, blendMode)
            }

            for (let i = 1; i <= stretchRight; i++) {
              const rawAlpha = easedFactor(i, stretchRight, easing)
      const bi = idx(clampX(c + i), y)
      outPixels[bi] = pr
      outPixels[bi + 1] = pg
      outPixels[bi + 2] = pb
      outPixels[bi + 3] = computeAlpha(c + i, y, rawAlpha * pa / 255, blendMode)
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}

export function radialStretchFull(
  sourceCanvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  maxRadius: number,
  blendMode: BlendMode = 'normal',
  easing: EasingCurve = 'linear'
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  const outData = outCtx.createImageData(width, height)

  const sx = Math.floor(centerX)
  const sy = Math.floor(centerY)

  if (sx < 0 || sx >= width || sy < 0 || sy >= height || maxRadius < 2) return out

  const srcPixels = srcData.data
  const outPixels = outData.data

  const si = (sy * width + sx) * 4
  const sr = srcPixels[si]
  const sg = srcPixels[si + 1]
  const sb = srcPixels[si + 2]
  const sa = srcPixels[si + 3]

  const idx = (x: number, y: number) => (y * width + x) * 4
  const clampX = (v: number) => Math.max(0, Math.min(width - 1, v))
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, v))

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - sx
      const dy = y - sy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1 || dist > maxRadius) continue

      const rawAlpha = easedFactor(dist, maxRadius, easing)
      const di = idx(clampX(x), clampY(y))
      outPixels[di] = sr
      outPixels[di + 1] = sg
      outPixels[di + 2] = sb
      outPixels[di + 3] = computeAlpha(x, y, rawAlpha * sa / 255, blendMode)
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}

export function mirrorStretch(
  sourceCanvas: HTMLCanvasElement,
  lineType: 'row' | 'column',
  linePos: number,
  mirrorDist: number,
  blendMode: BlendMode = 'normal'
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  const outData = outCtx.createImageData(width, height)

  const srcPixels = srcData.data
  const outPixels = outData.data
  const idx = (x: number, y: number) => (y * width + x) * 4
  const clampX = (v: number) => Math.max(0, Math.min(width - 1, v))
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, v))

  const pos = Math.floor(linePos)

  if (lineType === 'row') {
    for (let x = 0; x < width; x++) {
      for (let d = 1; d <= mirrorDist; d++) {
        const above = clampY(pos - d)
        const below = clampY(pos + d)
        const srcI = idx(x, below)
        const dstI = idx(x, above)
        outPixels[dstI] = srcPixels[srcI]
        outPixels[dstI + 1] = srcPixels[srcI + 1]
        outPixels[dstI + 2] = srcPixels[srcI + 2]
        outPixels[dstI + 3] = computeAlpha(x, above, srcPixels[srcI + 3] / 255, blendMode)
      }
    }
  } else {
    for (let y = 0; y < height; y++) {
      for (let d = 1; d <= mirrorDist; d++) {
        const left = clampX(pos - d)
        const right = clampX(pos + d)
        const srcI = idx(right, y)
        const dstI = idx(left, y)
        outPixels[dstI] = srcPixels[srcI]
        outPixels[dstI + 1] = srcPixels[srcI + 1]
        outPixels[dstI + 2] = srcPixels[srcI + 2]
        outPixels[dstI + 3] = computeAlpha(left, y, srcPixels[srcI + 3] / 255, blendMode)
      }
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}

export function twirlEffect(
  sourceCanvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  intensity: number,
  blendMode: BlendMode = 'normal'
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  const outData = outCtx.createImageData(width, height)

  const srcPixels = srcData.data
  const outPixels = outData.data
  const cx = Math.floor(centerX)
  const cy = Math.floor(centerY)
  const maxDist = Math.sqrt(
    Math.max(cx, width - cx) ** 2 + Math.max(cy, height - cy) ** 2
  )

  const idx = (x: number, y: number) => (y * width + x) * 4
  const clampX = (v: number) => Math.max(0, Math.min(width - 1, Math.round(v)))
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, Math.round(v)))

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) {
        const di = idx(x, y)
        const si = idx(x, y)
        outPixels[di] = srcPixels[si]
        outPixels[di + 1] = srcPixels[si + 1]
        outPixels[di + 2] = srcPixels[si + 2]
        outPixels[di + 3] = computeAlpha(x, y, srcPixels[si + 3] / 255, blendMode)
        continue
      }
      const angle = Math.atan2(dy, dx) + intensity * (dist / maxDist)
      const srcX = clampX(cx + dist * Math.cos(angle))
      const srcY = clampY(cy + dist * Math.sin(angle))
      const si = idx(srcX, srcY)
      const di = idx(x, y)
      outPixels[di] = srcPixels[si]
      outPixels[di + 1] = srcPixels[si + 1]
      outPixels[di + 2] = srcPixels[si + 2]
      outPixels[di + 3] = computeAlpha(x, y, srcPixels[si + 3] / 255, blendMode)
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}

export function selectionWarp(
  sourceCanvas: HTMLCanvasElement,
  selX: number,
  selY: number,
  selW: number,
  selH: number,
  dragX: number,
  dragY: number,
  blendMode: BlendMode = 'normal'
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!

  const srcPixels = srcData.data

  const sx = Math.floor(selX)
  const sy = Math.floor(selY)
  const sw = Math.floor(selW)
  const sh = Math.floor(selH)

  if (sw <= 0 || sh <= 0) return out

  const clampX = (v: number) => Math.max(0, Math.min(width - 1, v))
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, v))
  const srcIdx = (x: number, y: number) => (y * width + x) * 4

  const outData = outCtx.createImageData(width, height)
  const outPix = outData.data

  const maxDist = Math.max(Math.abs(dragX), Math.abs(dragY))
  if (maxDist < 2) return out

  for (let py = sy; py < sy + sh; py++) {
    for (let px = sx; px < sx + sw; px++) {
      if (px < 0 || px >= width || py < 0 || py >= height) continue

      const tx = (px - sx) / sw
      const ty = (py - sy) / sh

      const offsetX = dragX * tx
      const offsetY = dragY * ty

      const srcPx = clampX(Math.round(px - offsetX))
      const srcPy = clampY(Math.round(py - offsetY))

      const srcI = srcIdx(srcPx, srcPy)
      const dstI = srcIdx(px, py)

      const rawAlpha = srcPixels[srcI + 3] / 255
      outPix[dstI] = srcPixels[srcI]
      outPix[dstI + 1] = srcPixels[srcI + 1]
      outPix[dstI + 2] = srcPixels[srcI + 2]
      outPix[dstI + 3] = computeAlpha(px, py, rawAlpha, blendMode)
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}
