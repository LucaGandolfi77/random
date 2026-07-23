import type { Layer } from '../types'

export function compositeLayers(
  layers: Layer[],
  width: number,
  height: number
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')!

  for (const layer of layers) {
    if (!layer.visible) continue
    ctx.globalAlpha = layer.opacity
    ctx.drawImage(layer.canvas, layer.position.x, layer.position.y)
  }
  ctx.globalAlpha = 1
  return out
}

export function compositeToCanvas(
  layers: Layer[],
  targetCanvas: HTMLCanvasElement
) {
  const ctx = targetCanvas.getContext('2d')!
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
  for (const layer of layers) {
    if (!layer.visible) continue
    ctx.globalAlpha = layer.opacity
    ctx.globalCompositeOperation = layer.compositeOperation || 'source-over'
    ctx.drawImage(layer.canvas, layer.position.x, layer.position.y)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
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

export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  size = 10
) {
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle =
        (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0
          ? '#2a2a2a'
          : '#333333'
      ctx.fillRect(x, y, size, size)
    }
  }
}
