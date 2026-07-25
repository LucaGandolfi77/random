import type { Layer } from '../types'

function compositeLayersInto(
  layers: Layer[],
  ctx: CanvasRenderingContext2D
) {
  for (const layer of layers) {
    if (!layer.visible) continue
    ctx.globalAlpha = layer.opacity
    ctx.globalCompositeOperation = layer.compositeOperation || 'source-over'
    ctx.drawImage(layer.canvas, layer.position.x, layer.position.y)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

export function compositeLayers(
  layers: Layer[],
  width: number,
  height: number
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')!
  compositeLayersInto(layers, ctx)
  return out
}

export function compositeToCanvas(
  layers: Layer[],
  targetCanvas: HTMLCanvasElement
) {
  const ctx = targetCanvas.getContext('2d')!
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
  compositeLayersInto(layers, ctx)
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      type
    )
  })
}

export function resizeForProcessing(
  canvas: HTMLCanvasElement,
  maxDim = 1500
): HTMLCanvasElement {
  const maxSide = Math.max(canvas.width, canvas.height)
  if (maxSide <= maxDim) return canvas

  const scale = maxDim / maxSide
  const w = Math.round(canvas.width * scale)
  const h = Math.round(canvas.height * scale)

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(canvas, 0, 0, w, h)
  return out
}

let _checkerboardCache: HTMLCanvasElement | null = null
let _checkerboardW = 0
let _checkerboardH = 0

function getCheckerboard(width: number, height: number): HTMLCanvasElement {
  if (_checkerboardCache && _checkerboardW === width && _checkerboardH === height) {
    return _checkerboardCache
  }
  const size = 10
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')!
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle =
        (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0
          ? '#2a2a2a'
          : '#333333'
      ctx.fillRect(x, y, size, size)
    }
  }
  _checkerboardCache = c
  _checkerboardW = width
  _checkerboardH = height
  return c
}

export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const cached = getCheckerboard(width, height)
  ctx.drawImage(cached, 0, 0)
}
