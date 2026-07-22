import type { BlendMode } from '../types'

export interface StretchResult {
  imageData: ImageData
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

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

  const sx = Math.floor(centerX)
  const sy = Math.floor(centerY)

  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return out

  const srcPixels = srcData.data
  const outPixels = outData.data

  const clampX = (v: number) => Math.max(0, Math.min(width - 1, v))
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, v))
  const idx = (x: number, y: number) => (y * width + x) * 4

  for (let i = 1; i <= stretchH; i++) {
    const rawAlpha = Math.max(0, 1 - i / stretchH)
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
    const rawAlpha = Math.max(0, 1 - j / stretchV)
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
      const rawAlpha = Math.max(0, 1 - i / stretchUp)
      const ti = idx(x, clampY(r - i))
      outPixels[ti] = pr
      outPixels[ti + 1] = pg
      outPixels[ti + 2] = pb
      outPixels[ti + 3] = computeAlpha(x, r - i, rawAlpha * pa / 255, blendMode)
    }

    for (let i = 1; i <= stretchDown; i++) {
      const rawAlpha = Math.max(0, 1 - i / stretchDown)
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
