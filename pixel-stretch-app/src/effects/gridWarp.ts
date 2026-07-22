import type { WarpGridPoint, BlendMode } from '../types'

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

export function getDefaultGridPoints(
  width: number,
  height: number
): WarpGridPoint[] {
  const points: WarpGridPoint[] = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      points.push({
        x: (col / 3) * width,
        y: (row / 3) * height,
      })
    }
  }
  return points
}

function bilinearInterpolate(
  u: number,
  v: number,
  p00: WarpGridPoint,
  p10: WarpGridPoint,
  p01: WarpGridPoint,
  p11: WarpGridPoint
): { x: number; y: number } {
  const x =
    p00.x * (1 - u) * (1 - v) +
    p10.x * u * (1 - v) +
    p01.x * (1 - u) * v +
    p11.x * u * v

  const y =
    p00.y * (1 - u) * (1 - v) +
    p10.y * u * (1 - v) +
    p01.y * (1 - u) * v +
    p11.y * u * v

  return { x, y }
}

function findSourcePoint(
  destX: number,
  destY: number,
  gridPoints: WarpGridPoint[],
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } | null {
  const cellWidth = canvasWidth / 3
  const cellHeight = canvasHeight / 3

  const col = Math.min(2, Math.max(0, Math.floor(destX / cellWidth)))
  const row = Math.min(2, Math.max(0, Math.floor(destY / cellHeight)))

  const u = (destX - col * cellWidth) / cellWidth
  const v = (destY - row * cellHeight) / cellHeight

  const i00 = row * 4 + col
  const i10 = row * 4 + col + 1
  const i01 = (row + 1) * 4 + col
  const i11 = (row + 1) * 4 + col + 1

  const p00 = gridPoints[i00]
  const p10 = gridPoints[i10]
  const p01 = gridPoints[i01]
  const p11 = gridPoints[i11]

  return bilinearInterpolate(u, v, p00, p10, p01, p11)
}

export function applyGridWarp(
  sourceCanvas: HTMLCanvasElement,
  gridPoints: WarpGridPoint[],
  blendMode: BlendMode = 'normal'
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)
  const srcPixels = srcData.data

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  const outData = outCtx.createImageData(width, height)
  const outPixels = outData.data

  const clampX = (v: number) => Math.max(0, Math.min(width - 1, v))
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, v))
  const srcIdx = (x: number, y: number) => (y * width + x) * 4

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const src = findSourcePoint(dx, dy, gridPoints, width, height)
      if (!src) continue

      const sx = clampX(Math.round(src.x))
      const sy = clampY(Math.round(src.y))

      const si = srcIdx(sx, sy)
      const di = srcIdx(dx, dy)

      const rawAlpha = srcPixels[si + 3] / 255

      if (blendMode === 'dissolve') {
        const show = BAYER_4X4[dy % 4][dx % 4] / 16 < rawAlpha
        outPixels[di] = srcPixels[si]
        outPixels[di + 1] = srcPixels[si + 1]
        outPixels[di + 2] = srcPixels[si + 2]
        outPixels[di + 3] = show ? 255 : 0
      } else {
        outPixels[di] = srcPixels[si]
        outPixels[di + 1] = srcPixels[si + 1]
        outPixels[di + 2] = srcPixels[si + 2]
        outPixels[di + 3] = Math.round(rawAlpha * 255)
      }
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return out
}
