import {
  AppState,
  Layer,
  ImageLayer,
  LineLayer,
  Point,
  Viewport,
  defaultFilters,
} from '../types'
import { docToScreen } from './coordinates'

let renderRequested = false
let scheduledCtx: CanvasRenderingContext2D | null = null
let scheduledState: AppState | null = null

export function invalidate(ctx: CanvasRenderingContext2D, state: AppState) {
  scheduledCtx = ctx
  scheduledState = state
  if (!renderRequested) {
    renderRequested = true
    requestAnimationFrame(doRender)
  }
}

function doRender() {
  renderRequested = false
  if (!scheduledCtx || !scheduledState) return
  const ctx = scheduledCtx
  const state = scheduledState
  scheduledCtx = null
  scheduledState = null

  const dpr = window.devicePixelRatio || 1
  const w = ctx.canvas.width / dpr
  const h = ctx.canvas.height / dpr

  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = '#2d2d2d'
  ctx.fillRect(0, 0, w, h)

  if (!state.document) {
    ctx.fillStyle = '#888'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '18px system-ui, sans-serif'
    ctx.fillText('Trascina un\'immagine o usa "Apri immagine"', w / 2, h / 2)
    ctx.restore()
    return
  }

  const vp = state.viewport

  ctx.save()
  ctx.translate(vp.offsetX, vp.offsetY)
  ctx.scale(vp.zoom, vp.zoom)

  drawCheckerboard(ctx, state.document.width, state.document.height)

  for (const layer of state.document.layers) {
    if (!layer.visible) continue
    ctx.save()

    ctx.globalAlpha = layer.opacity
    ctx.globalCompositeOperation = layer.blendMode

    if (layer.type === 'image') {
      renderImageLayer(ctx, layer)
    } else if (layer.type === 'line') {
      renderLineLayer(ctx, layer)
    }

    ctx.restore()
  }

  ctx.restore()

  drawOverlay(ctx, state, dpr)

  ctx.restore()
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = 16
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const isEven = ((x / size) + (y / size)) % 2 === 0
      ctx.fillStyle = isEven ? '#999' : '#bbb'
      ctx.fillRect(x, y, size, size)
    }
  }
}

function renderImageLayer(ctx: CanvasRenderingContext2D, layer: ImageLayer) {
  const { filters } = layer
  const parts: string[] = []

  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`)
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`)
  if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`)
  if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`)
  if (filters.grayscale > 0) parts.push(`grayscale(${filters.grayscale}%)`)
  if (filters.sepia > 0) parts.push(`sepia(${filters.sepia}%)`)
  if (filters.invert > 0) parts.push(`invert(${filters.invert}%)`)
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`)

  if (parts.length > 0) {
    ctx.filter = parts.join(' ')
  }

  const bw = layer.bitmap.width
  const bh = layer.bitmap.height

  ctx.translate(layer.x + bw / 2, layer.y + bh / 2)
  ctx.rotate(layer.rotation)
  ctx.scale(layer.scaleX, layer.scaleY)
  ctx.drawImage(layer.bitmap, -bw / 2, -bh / 2)
}

function renderLineLayer(ctx: CanvasRenderingContext2D, layer: LineLayer) {
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

function drawOverlay(ctx: CanvasRenderingContext2D, state: AppState, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  if (state.isDrawingLine && state.linePreview) {
    drawPreviewLine(ctx, state)
  }

  if (state.selectedLayerId && state.document) {
    const layer = state.document.layers.find(l => l.id === state.selectedLayerId)
    if (layer && layer.visible) {
      drawSelectionHandles(ctx, layer, state.viewport)
    }
  }
}

function drawPreviewLine(ctx: CanvasRenderingContext2D, state: AppState) {
  const { start, end } = state.linePreview!
  const vp = state.viewport

  const a = docToScreen(start.x, start.y, vp)
  const b = docToScreen(end.x, end.y, vp)

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
  ctx.setLineDash([])

  drawCircle(ctx, a.x, a.y, 4, '#4a90d9')
  drawCircle(ctx, b.x, b.y, 4, '#4a90d9')
}

function drawSelectionHandles(ctx: CanvasRenderingContext2D, layer: Layer, vp: Viewport) {
  if (layer.type === 'line') {
    const a = docToScreen(layer.start.x, layer.start.y, vp)
    const b = docToScreen(layer.end.x, layer.end.y, vp)

    drawCircle(ctx, a.x, a.y, 6, '#4a90d9', '#fff')
    drawCircle(ctx, b.x, b.y, 6, '#4a90d9', '#fff')

    if (layer.warp.enabled) {
      const c = docToScreen(layer.warp.control.x, layer.warp.control.y, vp)
      drawCircle(ctx, c.x, c.y, 6, '#f5a623', '#fff')
    }
  } else if (layer.type === 'image') {
    const x = layer.x
    const y = layer.y
    const w = layer.bitmap.width * layer.scaleX
    const h = layer.bitmap.height * layer.scaleY

    const tl = docToScreen(x, y, vp)
    const tr = docToScreen(x + w, y, vp)
    const bl = docToScreen(x, y + h, vp)
    const br = docToScreen(x + w, y + h, vp)

    ctx.strokeStyle = '#4a90d9'
    ctx.lineWidth = 2
    ctx.strokeRect(tl.x, tl.y, tr.x - tl.x, br.y - tl.y)
  }
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 2
    ctx.stroke()
  }
}
