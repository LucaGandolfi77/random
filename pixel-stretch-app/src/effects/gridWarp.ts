import type { WarpGridPoint, BlendMode } from '../types'

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

const GRID_SIZE = 4
const CELL_COUNT = GRID_SIZE - 1

export function getDefaultGridPoints(
  width: number,
  height: number
): WarpGridPoint[] {
  const points: WarpGridPoint[] = []
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      points.push({
        x: (col / CELL_COUNT) * width,
        y: (row / CELL_COUNT) * height,
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
  return {
    x: p00.x * (1 - u) * (1 - v) + p10.x * u * (1 - v) + p01.x * (1 - u) * v + p11.x * u * v,
    y: p00.y * (1 - u) * (1 - v) + p10.y * u * (1 - v) + p01.y * (1 - u) * v + p11.y * u * v,
  }
}

interface WarpCell {
  p00: WarpGridPoint
  p10: WarpGridPoint
  p01: WarpGridPoint
  p11: WarpGridPoint
  minX: number
  minY: number
  maxX: number
  maxY: number
  srcX: number
  srcY: number
  cellW: number
  cellH: number
}

function invertBilinear(
  px: number,
  py: number,
  cell: WarpCell
): { u: number; v: number } | null {
  const { p00, p10, p01, p11 } = cell
  let u = 0.5
  let v = 0.5

  for (let iter = 0; iter < 8; iter++) {
    const pt = bilinearInterpolate(u, v, p00, p10, p01, p11)
    const ex = pt.x - px
    const ey = pt.y - py
    if (Math.abs(ex) < 0.01 && Math.abs(ey) < 0.01) break

    const dudx = (p10.x - p00.x) * (1 - v) + (p11.x - p01.x) * v
    const dudy = (p10.y - p00.y) * (1 - v) + (p11.y - p01.y) * v
    const dvdx = (p01.x - p00.x) * (1 - u) + (p11.x - p10.x) * u
    const dvdy = (p01.y - p00.y) * (1 - u) + (p11.y - p10.y) * u

    const det = dudx * dvdy - dudy * dvdx
    if (Math.abs(det) < 1e-8) return null

    u -= (dvdy * ex - dudy * ey) / det
    v -= (-dvdx * ex + dudx * ey) / det

    if (u < -0.5 || u > 1.5 || v < -0.5 || v > 1.5) return null
  }

  const EPS = 0.02
  if (u < -EPS || u > 1 + EPS || v < -EPS || v > 1 + EPS) return null
  return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) }
}

export function applyGridWarpPixels(
  srcPixels: Uint8ClampedArray,
  width: number,
  height: number,
  gridPoints: WarpGridPoint[],
  blendMode: BlendMode = 'normal'
): Uint8ClampedArray {
  if (gridPoints.length < GRID_SIZE * GRID_SIZE) {
    return new Uint8ClampedArray(width * height * 4)
  }

  const outPixels = new Uint8ClampedArray(width * height * 4)
  const clampX = (v: number) => Math.max(0, Math.min(width - 1, v))
  const clampY = (v: number) => Math.max(0, Math.min(height - 1, v))
  const srcIdx = (x: number, y: number) => (y * width + x) * 4

  const cells: WarpCell[] = []
  for (let row = 0; row < CELL_COUNT; row++) {
    for (let col = 0; col < CELL_COUNT; col++) {
      const p00 = gridPoints[row * GRID_SIZE + col]
      const p10 = gridPoints[row * GRID_SIZE + col + 1]
      const p01 = gridPoints[(row + 1) * GRID_SIZE + col]
      const p11 = gridPoints[(row + 1) * GRID_SIZE + col + 1]
      cells.push({
        p00, p10, p01, p11,
        minX: Math.min(p00.x, p10.x, p01.x, p11.x),
        minY: Math.min(p00.y, p10.y, p01.y, p11.y),
        maxX: Math.max(p00.x, p10.x, p01.x, p11.x),
        maxY: Math.max(p00.y, p10.y, p01.y, p11.y),
        srcX: (col / CELL_COUNT) * width,
        srcY: (row / CELL_COUNT) * height,
        cellW: width / CELL_COUNT,
        cellH: height / CELL_COUNT,
      })
    }
  }

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      let fx = dx
      let fy = dy
      for (const cell of cells) {
        if (dx < cell.minX || dx > cell.maxX || dy < cell.minY || dy > cell.maxY) continue
        const uv = invertBilinear(dx, dy, cell)
        if (!uv) continue
        fx = cell.srcX + uv.u * cell.cellW
        fy = cell.srcY + uv.v * cell.cellH
        break
      }

      const sx = clampX(Math.round(fx))
      const sy = clampY(Math.round(fy))
      const si = srcIdx(sx, sy)
      const di = srcIdx(dx, dy)

      if (blendMode === 'dissolve') {
        const show = BAYER_4X4[dy % 4][dx % 4] / 16 < (srcPixels[si + 3] / 255)
        outPixels[di] = srcPixels[si]
        outPixels[di + 1] = srcPixels[si + 1]
        outPixels[di + 2] = srcPixels[si + 2]
        outPixels[di + 3] = show ? 255 : 0
      } else {
        outPixels[di] = srcPixels[si]
        outPixels[di + 1] = srcPixels[si + 1]
        outPixels[di + 2] = srcPixels[si + 2]
        outPixels[di + 3] = Math.round((srcPixels[si + 3] / 255) * 255)
      }
    }
  }

  return outPixels
}

export function applyGridWarp(
  sourceCanvas: HTMLCanvasElement,
  gridPoints: WarpGridPoint[],
  blendMode: BlendMode = 'normal'
): HTMLCanvasElement {
  const { width, height } = sourceCanvas
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, width, height)

  const outPixels = applyGridWarpPixels(srcData.data, width, height, gridPoints, blendMode)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const outCtx = out.getContext('2d')!
  outCtx.putImageData(new ImageData(outPixels.slice(), width, height), 0, 0)
  return out
}
