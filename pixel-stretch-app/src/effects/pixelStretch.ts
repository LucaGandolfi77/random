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
  // total === 1 => single step at full intensity (t = 0)
  const t = total > 1 ? i / total : 0
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
  // JS % keeps the sign of the dividend: normalize to [0, 4)
  const bx = ((x % 4) + 4) % 4
  const by = ((y % 4) + 4) % 4
  return BAYER_4X4[by][bx] / 16 < alpha
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

  const idx = (x: number, y: number) => (y * width + x) * 4
  const si = idx(sx, sy)
  const sr = srcPixels[si]
  const sg = srcPixels[si + 1]
  const sb = srcPixels[si + 2]
  const sa = srcPixels[si + 3]

  for (let i = 1; i <= stretchH; i++) {
    const rawAlpha = easedFactor(i, stretchH, easing) * sa / 255

    const rpx = sx + i
    if (rpx < width) {
      const rx = idx(rpx, sy)
      outPixels[rx] = sr
      outPixels[rx + 1] = sg
      outPixels[rx + 2] = sb
      outPixels[rx + 3] = computeAlpha(rpx, sy, rawAlpha, blendMode)
    }

    const lpx = sx - i
    if (lpx >= 0) {
      const lx = idx(lpx, sy)
      outPixels[lx] = sr
      outPixels[lx + 1] = sg
      outPixels[lx + 2] = sb
      outPixels[lx + 3] = computeAlpha(lpx, sy, rawAlpha, blendMode)
    }
  }

  for (let j = 1; j <= stretchV; j++) {
    const rawAlpha = easedFactor(j, stretchV, easing) * sa / 255

    const dpy = sy + j
    if (dpy < height) {
      const dy = idx(sx, dpy)
      outPixels[dy] = sr
      outPixels[dy + 1] = sg
      outPixels[dy + 2] = sb
      outPixels[dy + 3] = computeAlpha(sx, dpy, rawAlpha, blendMode)
    }

    const upy = sy - j
    if (upy >= 0) {
      const uy = idx(sx, upy)
      outPixels[uy] = sr
      outPixels[uy + 1] = sg
      outPixels[uy + 2] = sb
      outPixels[uy + 3] = computeAlpha(sx, upy, rawAlpha, blendMode)
    }
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

  const r = Math.floor(row)
  if (r < 0 || r >= height) return out

  const srcPixels = srcData.data
  const outPixels = outData.data
  const idx = (x: number, y: number) => (y * width + x) * 4

  for (let x = 0; x < width; x++) {
    const si = idx(x, r)
    const pr = srcPixels[si]
    const pg = srcPixels[si + 1]
    const pb = srcPixels[si + 2]
    const pa = srcPixels[si + 3]

    for (let i = 1; i <= stretchUp; i++) {
      const ty = r - i
      if (ty < 0) break
      const rawAlpha = easedFactor(i, stretchUp, easing)
      const ti = idx(x, ty)
      outPixels[ti] = pr
      outPixels[ti + 1] = pg
      outPixels[ti + 2] = pb
      outPixels[ti + 3] = computeAlpha(x, ty, rawAlpha * pa / 255, blendMode)
    }

    for (let i = 1; i <= stretchDown; i++) {
      const by = r + i
      if (by >= height) break
      const rawAlpha = easedFactor(i, stretchDown, easing)
      const bi = idx(x, by)
      outPixels[bi] = pr
      outPixels[bi + 1] = pg
      outPixels[bi + 2] = pb
      outPixels[bi + 3] = computeAlpha(x, by, rawAlpha * pa / 255, blendMode)
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

  const c = Math.floor(col)
  if (c < 0 || c >= width) return out

  const srcPixels = srcData.data
  const outPixels = outData.data
  const idx = (x: number, y: number) => (y * width + x) * 4

  for (let y = 0; y < height; y++) {
    const si = idx(c, y)
    const pr = srcPixels[si]
    const pg = srcPixels[si + 1]
    const pb = srcPixels[si + 2]
    const pa = srcPixels[si + 3]

    for (let i = 1; i <= stretchLeft; i++) {
      const tx = c - i
      if (tx < 0) break
      const rawAlpha = easedFactor(i, stretchLeft, easing)
      const ti = idx(tx, y)
      outPixels[ti] = pr
      outPixels[ti + 1] = pg
      outPixels[ti + 2] = pb
      outPixels[ti + 3] = computeAlpha(tx, y, rawAlpha * pa / 255, blendMode)
    }

    for (let i = 1; i <= stretchRight; i++) {
      const bx = c + i
      if (bx >= width) break
      const rawAlpha = easedFactor(i, stretchRight, easing)
      const bi = idx(bx, y)
      outPixels[bi] = pr
      outPixels[bi + 1] = pg
      outPixels[bi + 2] = pb
      outPixels[bi + 3] = computeAlpha(bx, y, rawAlpha * pa / 255, blendMode)
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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - sx
      const dy = y - sy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1 || dist > maxRadius) continue

      const rawAlpha = easedFactor(dist, maxRadius, easing)
      const di = idx(x, y)
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

  const pos = Math.floor(linePos)

  if (lineType === 'row') {
    if (pos < 0 || pos >= height) return out
    for (let x = 0; x < width; x++) {
      for (let d = 1; d <= mirrorDist; d++) {
        const above = pos - d
        const below = pos + d
        if (above < 0 || below >= height) break
        const srcI = idx(x, below)
        const dstI = idx(x, above)
        outPixels[dstI] = srcPixels[srcI]
        outPixels[dstI + 1] = srcPixels[srcI + 1]
        outPixels[dstI + 2] = srcPixels[srcI + 2]
        outPixels[dstI + 3] = computeAlpha(x, above, srcPixels[srcI + 3] / 255, blendMode)
      }
    }
  } else {
    if (pos < 0 || pos >= width) return out
    for (let y = 0; y < height; y++) {
      for (let d = 1; d <= mirrorDist; d++) {
        const left = pos - d
        const right = pos + d
        if (left < 0 || right >= width) break
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

const TWIRL_MAX_INTENSITY = Math.PI * 4

export function twirlEffectPixels(
  srcPixels: Uint8ClampedArray,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  intensity: number,
  blendMode: BlendMode = 'normal',
  radius?: number
): Uint8ClampedArray {
  const outPixels = new Uint8ClampedArray(width * height * 4)
  const cx = Math.floor(centerX)
  const cy = Math.floor(centerY)
  const clampedIntensity = Math.max(-TWIRL_MAX_INTENSITY, Math.min(TWIRL_MAX_INTENSITY, intensity))
  const maxRadius = radius !== undefined
    ? radius
    : Math.sqrt(Math.max(cx, width - cx) ** 2 + Math.max(cy, height - cy) ** 2)

  if (maxRadius < 1) return outPixels

  const idx = (x: number, y: number) => (y * width + x) * 4
  const clampX = (v: number) => Math.max(0, Math.min(width - 1, Math.round(v)))
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, Math.round(v)))

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > maxRadius) continue

      const di = idx(x, y)
      let si: number
      if (dist < 1) {
        si = di
      } else {
        const falloff = 1 - dist / maxRadius
        const angle = Math.atan2(dy, dx) + clampedIntensity * falloff
        si = idx(clampX(cx + dist * Math.cos(angle)), clampY(cy + dist * Math.sin(angle)))
      }
      outPixels[di] = srcPixels[si]
      outPixels[di + 1] = srcPixels[si + 1]
      outPixels[di + 2] = srcPixels[si + 2]
      outPixels[di + 3] = computeAlpha(x, y, srcPixels[si + 3] / 255, blendMode)
    }
  }

  return outPixels
}

export function twirlEffect(
  sourceCanvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  intensity: number,
  blendMode: BlendMode = 'normal',
  radius?: number
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const ctx = sourceCanvas.getContext('2d')!
  const srcData = ctx.getImageData(0, 0, width, height)
  const outPixels = twirlEffectPixels(srcData.data, width, height, centerX, centerY, intensity, blendMode, radius)
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  out.getContext('2d')!.putImageData(new ImageData(outPixels.slice(), width, height), 0, 0)
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

      // Map to [0, 1] inclusive so the far edge reaches the full drag offset
      const tx = sw > 1 ? (px - sx) / (sw - 1) : 1
      const ty = sh > 1 ? (py - sy) / (sh - 1) : 1

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
