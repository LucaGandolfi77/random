import { AppState, ImageLayer, LineLayer, FilterSettings } from '../types'
import { cssFilterString } from '../filters/filters'

export type ExportFormat = 'png' | 'jpeg'
export type ExportScale = 1 | 2

export interface ExportOptions {
  format: ExportFormat
  quality: number
  scale: ExportScale
}

export async function exportImage(
  state: AppState,
  options: ExportOptions,
): Promise<Blob | null> {
  const doc = state.document
  if (!doc) return null

  const s = options.scale
  const canvas = document.createElement('canvas')
  canvas.width = doc.width * s
  canvas.height = doc.height * s
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  if (options.format === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.scale(s, s)

  for (const layer of doc.layers) {
    if (!layer.visible) continue
    ctx.save()
    ctx.globalAlpha = layer.opacity
    ctx.globalCompositeOperation = layer.blendMode

    if (layer.type === 'image') {
      renderImageLayerForExport(ctx, layer)
    } else if (layer.type === 'line') {
      renderLineLayerForExport(ctx, layer)
    }

    ctx.restore()
  }

  const mimeType = options.format === 'png' ? 'image/png' : 'image/jpeg'
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, options.quality)
  })
}

function renderImageLayerForExport(
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
) {
  const { filters } = layer
  const filterStr = cssFilterString(filters)
  if (filterStr) ctx.filter = filterStr

  const bw = layer.bitmap.width
  const bh = layer.bitmap.height
  ctx.translate(layer.x + bw / 2, layer.y + bh / 2)
  ctx.rotate(layer.rotation)
  ctx.scale(layer.scaleX, layer.scaleY)
  ctx.drawImage(layer.bitmap, -bw / 2, -bh / 2)
}

function renderLineLayerForExport(
  ctx: CanvasRenderingContext2D,
  layer: LineLayer,
) {
  const { start, end, color, width, pattern, dashArray, cap, border, warp } = layer

  ctx.lineCap = cap
  ctx.setLineDash(getDashArray(pattern, dashArray, width))

  if (border.enabled && border.width > 0) {
    ctx.strokeStyle = border.color
    ctx.lineWidth = width + border.width * 2
    if (warp.enabled) {
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.quadraticCurveTo(warp.control.x, warp.control.y, end.x, end.y)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
    }
  }

  ctx.strokeStyle = color
  ctx.lineWidth = width
  if (warp.enabled) {
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.quadraticCurveTo(warp.control.x, warp.control.y, end.x, end.y)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  }

  ctx.setLineDash([])
}

function getDashArray(pattern: string, custom: number[], width: number): number[] {
  switch (pattern) {
    case 'dashed': return [12 / (width || 1) * 2, 6 / (width || 1) * 2]
    case 'dotted': return [2, 6 / (width || 1) * 2]
    case 'custom': return custom.length > 0 ? custom : []
    default: return []
  }
}
