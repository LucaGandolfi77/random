import { useCallback, useRef, useState, useEffect } from 'react'
import { useLayerStore } from '../store/layerStore'
import { useModifierKeys } from '../hooks/useKeyboard'
import { radialStretch, radialStretchFull, rowStretch, columnStretch, selectionWarp, mirrorStretch, twirlEffect } from '../effects/pixelStretch'
import { applyGridWarp, getDefaultGridPoints } from '../effects/gridWarp'
import { drawCheckerboard, compositeToCanvas } from '../utils/canvas'
import { WarpGridOverlay } from './WarpGridOverlay'

interface DragState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  mode: 'radial' | 'radial-full' | 'stretch' | 'selection-warp' | 'pan' | 'move-layer' | 'mirror' | 'twirl'
  sourceType?: 'row' | 'column'
  startPanX?: number
  startPanY?: number
  layerId?: string
  startLayerX?: number
  startLayerY?: number
}

export function Canvas() {
  useModifierKeys()

  const {
    layers,
    activeLayerId,
    tool,
    canvasSize,
    isProcessing,
    processingMessage,
    blendMode,
    easing,
    symmetricStretch,
    warpGrid,
    zoom,
    panOffset,
    sourceLine,
    setPanOffset,
    setSourceLine,
    setStretchPreview,
    setActiveLayer,
    moveLayerPosition,
    zoomIn,
    zoomOut,
  } = useLayerStore()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [, forceRender] = useState(0)
  const animRef = useRef<number>(0)
  const marchOffset = useRef(0)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastPreviewParams = useRef<string>('')

  const activeLayer = layers.find(l => l.id === activeLayerId)
  const isLineTool = tool === 'stretch-row' || tool === 'stretch-column'

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawCheckerboard(ctx, canvas.width, canvas.height)
    compositeToCanvas(layers, canvas)
  }, [layers])

  useEffect(() => {
    render()
  }, [render, canvasSize])

  const drawMarchingAnts = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      const offset = marchOffset.current
      ctx.save()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.lineDashOffset = -offset
      ctx.strokeRect(x, y, w, h)
      ctx.strokeStyle = '#000'
      ctx.lineDashOffset = -offset + 5
      ctx.strokeRect(x, y, w, h)
      ctx.restore()
    },
    []
  )

  const renderOverlay = useCallback(() => {
    const ov = overlayRef.current
    if (!ov) return
    const ctx = ov.getContext('2d')!
    ctx.clearRect(0, 0, ov.width, ov.height)

    // Draw live preview if available
    const pv = previewCanvasRef.current
    if (pv) {
      ctx.drawImage(pv, 0, 0, ov.width, ov.height)
      // Don't draw selection indicators when preview is shown
      return
    }

    const drag = dragRef.current
    const store = useLayerStore.getState()
    const sl = store.sourceLine
    const sp = store.stretchPreview

    if (drag && drag.mode === 'radial') {
      const dx = drag.currentX - drag.startX
      const dy = drag.currentY - drag.startY
      ctx.strokeStyle = 'rgba(0,200,255,0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(drag.startX - Math.abs(dx), drag.startY)
      ctx.lineTo(drag.startX + Math.abs(dx), drag.startY)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(drag.startX, drag.startY - Math.abs(dy))
      ctx.lineTo(drag.startX, drag.startY + Math.abs(dy))
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(drag.startX, drag.startY, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,200,255,0.8)'
      ctx.fill()
      ctx.setLineDash([])
      return
    }

    if (drag && drag.mode === 'radial-full') {
      const radius = Math.sqrt(
        (drag.currentX - drag.startX) ** 2 + (drag.currentY - drag.startY) ** 2
      )
      ctx.strokeStyle = 'rgba(0,200,255,0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(drag.startX, drag.startY, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(drag.startX, drag.startY, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,200,255,0.8)'
      ctx.fill()
      ctx.setLineDash([])
      return
    }

    if (drag && drag.mode === 'twirl') {
      const radius = Math.sqrt(
        (drag.currentX - drag.startX) ** 2 + (drag.currentY - drag.startY) ** 2
      )
      ctx.strokeStyle = 'rgba(200,100,255,0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(drag.startX, drag.startY, radius, 0, Math.PI * 2)
      ctx.stroke()
      // Draw spiral hint lines
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath()
        ctx.moveTo(drag.startX, drag.startY)
        ctx.lineTo(
          drag.startX + radius * Math.cos(a + radius / 20),
          drag.startY + radius * Math.sin(a + radius / 20)
        )
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(drag.startX, drag.startY, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(200,100,255,0.8)'
      ctx.fill()
      ctx.setLineDash([])
      return
    }

    if (drag && drag.mode === 'mirror') {
      const dx = Math.abs(drag.currentX - drag.startX)
      const dy = Math.abs(drag.currentY - drag.startY)
      ctx.strokeStyle = 'rgba(255,200,0,0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      if (dx >= dy) {
        ctx.beginPath()
        ctx.moveTo(drag.startX - dx, drag.startY)
        ctx.lineTo(drag.startX + dx, drag.startY)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.moveTo(drag.startX, drag.startY - dy)
        ctx.lineTo(drag.startX, drag.startY + dy)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(drag.startX, drag.startY, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,200,0,0.8)'
      ctx.fill()
      ctx.setLineDash([])
      return
    }

    if (drag && drag.mode === 'selection-warp') {
      const x = Math.min(drag.startX, drag.currentX)
      const y = Math.min(drag.startY, drag.currentY)
      const w = Math.abs(drag.currentX - drag.startX)
      const h = Math.abs(drag.currentY - drag.startY)
      if (w > 2 && h > 2) {
        ctx.fillStyle = 'rgba(0,200,255,0.08)'
        ctx.fillRect(x, y, w, h)
        drawMarchingAnts(ctx, x, y, w, h)
      }
      return
    }

    if (sl && sl.type === 'row') {
      ctx.strokeStyle = 'rgba(255,100,100,0.7)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 3])
      ctx.beginPath()
      ctx.moveTo(0, sl.position)
      ctx.lineTo(ov.width, sl.position)
      ctx.stroke()
      ctx.setLineDash([])

      if (sp) {
        const dy = sp.currentPos - sp.sourcePos
        if (Math.abs(dy) > 2) {
          const len = Math.abs(dy)
          const dir = dy < 0 ? -1 : 1
          ctx.fillStyle = 'rgba(255,100,100,0.15)'
          ctx.fillRect(0, dir > 0 ? sl.position : sl.position - len, ov.width, len)
        }
      }
    }

    if (sl && sl.type === 'column') {
      ctx.strokeStyle = 'rgba(100,200,255,0.7)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 3])
      ctx.beginPath()
      ctx.moveTo(sl.position, 0)
      ctx.lineTo(sl.position, ov.height)
      ctx.stroke()
      ctx.setLineDash([])

      if (sp) {
        const dx = sp.currentPos - sp.sourcePos
        if (Math.abs(dx) > 2) {
          const len = Math.abs(dx)
          const dir = dx < 0 ? -1 : 1
          ctx.fillStyle = 'rgba(100,200,255,0.15)'
          ctx.fillRect(dir > 0 ? sl.position : sl.position - len, 0, len, ov.height)
        }
      }
    }

    // Draw persistent warp grid on the stretched result
    const lwp = store.lastWarpPoints
    if (lwp && lwp.length === 16 && tool !== 'warp-grid') {
      ctx.save()
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)'
      ctx.lineWidth = 0.5
      for (let row = 0; row < 4; row++) {
        ctx.beginPath()
        for (let col = 0; col < 4; col++) {
          const p = lwp[row * 4 + col]
          col === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }
      for (let col = 0; col < 4; col++) {
        ctx.beginPath()
        for (let row = 0; row < 4; row++) {
          const p = lwp[row * 4 + col]
          row === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.35)'
      ctx.fillStyle = 'rgba(0, 200, 255, 0.25)'
      for (const p of lwp) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
    }
  }, [drawMarchingAnts])

  // Persistent overlay loop for source line + preview
  useEffect(() => {
    if (!isLineTool && !dragRef.current) return

    const loop = () => {
      const state = useLayerStore.getState()
      if (!isLineTool && !state.sourceLine) {
        const ov = overlayRef.current
        if (ov) ov.getContext('2d')!.clearRect(0, 0, ov.width, ov.height)
        return
      }
      marchOffset.current = (marchOffset.current + 0.5) % 20
      renderOverlay()
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [isLineTool, renderOverlay])

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      }
    },
    []
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (tool === 'zoom') {
        if (e.altKey) zoomOut()
        else zoomIn()
        return
      }

      const overlay = overlayRef.current
      if (overlay) overlay.setPointerCapture(e.pointerId)

      const pos = getCanvasCoords(e.clientX, e.clientY)

      if (tool === 'select') {
        for (let i = layers.length - 1; i >= 0; i--) {
          const layer = layers[i]
          if (!layer.visible || layer.locked) continue
          const lx = pos.x - layer.position.x
          const ly = pos.y - layer.position.y
          if (lx >= 0 && lx < layer.width && ly >= 0 && ly < layer.height) {
            const ctx = layer.canvas.getContext('2d')!
            const pixel = ctx.getImageData(Math.floor(lx), Math.floor(ly), 1, 1).data
            if (pixel[3] > 0) {
              setActiveLayer(layer.id)
              dragRef.current = {
                startX: pos.x,
                startY: pos.y,
                currentX: pos.x,
                currentY: pos.y,
                mode: 'move-layer' as const,
                layerId: layer.id,
                startLayerX: layer.position.x,
                startLayerY: layer.position.y,
              }
              forceRender(n => n + 1)
              return
            }
          }
        }
        return
      }

      if (!activeLayer || activeLayer.locked) return
      if (tool === 'warp-grid') return

      if (tool === 'move') {
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
          mode: 'pan',
          startPanX: panOffset.x,
          startPanY: panOffset.y,
        }
        forceRender(n => n + 1)
        return
      }

      if (tool === 'stretch-radial') {
        dragRef.current = {
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          mode: 'radial',
        }
        forceRender(n => n + 1)
        return
      }

      if (tool === 'stretch-radial-full') {
        dragRef.current = {
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          mode: 'radial-full',
        }
        forceRender(n => n + 1)
        return
      }

      if (tool === 'stretch-warp') {
        dragRef.current = {
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          mode: 'selection-warp',
        }
        forceRender(n => n + 1)
        return
      }

      if (tool === 'stretch-mirror') {
        dragRef.current = {
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          mode: 'mirror',
        }
        forceRender(n => n + 1)
        return
      }

      if (tool === 'twirl') {
        dragRef.current = {
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          mode: 'twirl',
        }
        forceRender(n => n + 1)
        return
      }

      if (tool === 'stretch-row' || tool === 'stretch-column') {
        const type = tool === 'stretch-row' ? 'row' : 'column'
        const position = type === 'row' ? Math.floor(pos.y) : Math.floor(pos.x)

        if (e.shiftKey && sourceLine) {
          // Shift+click = start stretch from existing source line
          dragRef.current = {
            startX: type === 'column' ? position : pos.x,
            startY: type === 'row' ? position : pos.y,
            currentX: pos.x,
            currentY: pos.y,
            mode: 'stretch',
            sourceType: type,
          }
          setStretchPreview({ type, sourcePos: position, currentPos: position })
        } else {
          // Simple click = set/update source line
          setSourceLine({ type, position })
          setStretchPreview(null)
          dragRef.current = null
        }
        forceRender(n => n + 1)
      }
    },
    [tool, activeLayer, sourceLine, getCanvasCoords, panOffset, zoomIn, zoomOut, setSourceLine, setStretchPreview]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      if (drag.mode === 'pan' && drag.startPanX !== undefined && drag.startPanY !== undefined) {
        const dx = e.clientX - drag.startX
        const dy = e.clientY - drag.startY
        setPanOffset({ x: drag.startPanX + dx, y: drag.startPanY + dy })
        return
      }

      const pos = getCanvasCoords(e.clientX, e.clientY)
      drag.currentX = pos.x
      drag.currentY = pos.y

      if (drag.mode === 'move-layer' && drag.layerId !== undefined) {
        const dx = pos.x - drag.startX
        const dy = pos.y - drag.startY
        moveLayerPosition(drag.layerId, drag.startLayerX! + dx, drag.startLayerY! + dy)
        return
      }

      if (drag.mode === 'stretch' && drag.sourceType) {
        const currentPos = drag.sourceType === 'row' ? pos.y : pos.x
        const sl = useLayerStore.getState().sourceLine
        setStretchPreview({ type: drag.sourceType, sourcePos: sl?.position ?? 0, currentPos })
      }

      updatePreview(activeLayer, drag)
    },
    [getCanvasCoords, setPanOffset, setStretchPreview, activeLayer]
  )

  const updatePreview = useCallback((layer: typeof activeLayer, drag: DragState) => {
    if (!layer) return
    const PREVIEW_MAX = 300
    const scale = Math.min(1, PREVIEW_MAX / Math.max(layer.canvas.width, layer.canvas.height))
    const pw = Math.round(layer.canvas.width * scale)
    const ph = Math.round(layer.canvas.height * scale)

    const ds = `(${pw}x${ph})-(${Math.round(drag.currentX)}-${Math.round(drag.currentY)})`
    if (ds === lastPreviewParams.current) return
    lastPreviewParams.current = ds

    // Create a downscaled source canvas
    let src = layer.canvas
    if (scale < 1) {
      const small = document.createElement('canvas')
      small.width = pw
      small.height = ph
      const sctx = small.getContext('2d')!
      sctx.imageSmoothingEnabled = true
      sctx.drawImage(layer.canvas, 0, 0, pw, ph)
      src = small
    }

    const store = useLayerStore.getState()
    let result: HTMLCanvasElement | null = null
    const sx = drag.startX * scale
    const sy = drag.startY * scale
    const cx = drag.currentX * scale
    const cy = drag.currentY * scale

    try {
      if (drag.mode === 'radial') {
        const h = Math.abs(Math.round(cx - sx))
        const v = Math.abs(Math.round(cy - sy))
        if (h > 2 || v > 2) result = radialStretch(src, sx, sy, h, v, store.blendMode, store.easing)
      } else if (drag.mode === 'radial-full') {
        const r = Math.round(Math.sqrt((cx - sx) ** 2 + (cy - sy) ** 2))
        if (r > 2) result = radialStretchFull(src, sx, sy, r, store.blendMode, store.easing)
      } else if (drag.mode === 'stretch') {
        const sl = store.sourceLine
        if (sl) {
          const sp = sl.type === 'row' ? sl.position * scale : sl.position * scale
          if (sl.type === 'row') {
            const dy = Math.round(cy - sy)
            const up = store.symmetricStretch ? Math.abs(dy) : (dy < 0 ? Math.abs(dy) : 0)
            const down = store.symmetricStretch ? Math.abs(dy) : (dy > 0 ? dy : 0)
            if (up > 2 || down > 2) result = rowStretch(src, sp, up, down, store.blendMode, store.easing)
          } else {
            const dx = Math.round(cx - sx)
            const left = store.symmetricStretch ? Math.abs(dx) : (dx < 0 ? Math.abs(dx) : 0)
            const right = store.symmetricStretch ? Math.abs(dx) : (dx > 0 ? dx : 0)
            if (left > 2 || right > 2) result = columnStretch(src, sp, left, right, store.blendMode, store.easing)
          }
        }
      } else if (drag.mode === 'mirror') {
        const dx = Math.round(Math.abs(cx - sx))
        const dy = Math.round(Math.abs(cy - sy))
        if (dx > dy && dx > 2) result = mirrorStretch(src, 'column', sx, dx, store.blendMode)
        else if (dy > 2) result = mirrorStretch(src, 'row', sy, dy, store.blendMode)
      } else if (drag.mode === 'twirl') {
        const r = Math.round(Math.sqrt((cx - sx) ** 2 + (cy - sy) ** 2))
        if (r > 5) result = twirlEffect(src, sx, sy, r / 3, store.blendMode)
      }
    } catch {
      // Preview failed silently
    }

    if (result) {
      previewCanvasRef.current = result
    }
  }, [lastPreviewParams])

  const applyStretch = useCallback(() => {
    const drag = dragRef.current
    if (!activeLayer || activeLayer.locked) {
      dragRef.current = null
      forceRender(n => n + 1)
      return
    }

    if (!drag) {
      forceRender(n => n + 1)
      return
    }

    if (drag.mode === 'pan' || drag.mode === 'move-layer') {
      if (drag.mode === 'move-layer') useLayerStore.getState().pushHistory()
      dragRef.current = null
      forceRender(n => n + 1)
      return
    }

    const { addLayer } = useLayerStore.getState()
    const compositeOp: GlobalCompositeOperation | undefined =
      blendMode !== 'normal' && blendMode !== 'dissolve' ? blendMode : undefined

    if (drag.mode === 'radial') {
      const stretchH = Math.abs(Math.round(drag.currentX - drag.startX))
      const stretchV = Math.abs(Math.round(drag.currentY - drag.startY))
      if (stretchH > 2 || stretchV > 2) {
        const result = radialStretch(activeLayer.canvas, drag.startX, drag.startY, stretchH, stretchV, blendMode, easing)
        addLayer(result, `${activeLayer.name} - Stretch Radiale`, compositeOp)
      }
    } else if (drag.mode === 'radial-full') {
      const radius = Math.round(
        Math.sqrt((drag.currentX - drag.startX) ** 2 + (drag.currentY - drag.startY) ** 2)
      )
      if (radius > 2) {
        const result = radialStretchFull(activeLayer.canvas, drag.startX, drag.startY, radius, blendMode, easing)
        addLayer(result, `${activeLayer.name} - Stretch Radiale Full`, compositeOp)
      }
    } else if (drag.mode === 'twirl') {
      const radius = Math.round(
        Math.sqrt((drag.currentX - drag.startX) ** 2 + (drag.currentY - drag.startY) ** 2)
      )
      if (radius > 5) {
        const intensity = radius / 3
        const result = twirlEffect(activeLayer.canvas, drag.startX, drag.startY, intensity, blendMode)
        addLayer(result, `${activeLayer.name} - Twirl`, compositeOp)
      }
    } else if (drag.mode === 'mirror') {
      const dx = Math.round(Math.abs(drag.currentX - drag.startX))
      const dy = Math.round(Math.abs(drag.currentY - drag.startY))
      if (dx > dy && dx > 2) {
        const result = mirrorStretch(activeLayer.canvas, 'column', drag.startX, dx, blendMode)
        addLayer(result, `${activeLayer.name} - Mirror Colonna`, compositeOp)
      } else if (dy > 2) {
        const result = mirrorStretch(activeLayer.canvas, 'row', drag.startY, dy, blendMode)
        addLayer(result, `${activeLayer.name} - Mirror Riga`, compositeOp)
      }
    } else if (drag.mode === 'selection-warp') {
      const selX = Math.min(drag.startX, drag.currentX)
      const selY = Math.min(drag.startY, drag.currentY)
      const selW = Math.abs(drag.currentX - drag.startX)
      const selH = Math.abs(drag.currentY - drag.startY)
      if (selW > 4 && selH > 4) {
        const dX = drag.currentX - drag.startX
        const dY = drag.currentY - drag.startY
        const result = selectionWarp(activeLayer.canvas, selX, selY, selW, selH, dX, dY, blendMode)
        addLayer(result, `${activeLayer.name} - Stretch Warp`, compositeOp)
      }
    } else if (drag.mode === 'stretch') {
      const store = useLayerStore.getState()
      const sl = store.sourceLine
      if (sl) {
        if (sl.type === 'row') {
          const dy = Math.round(drag.currentY - drag.startY)
          const stretchUp = symmetricStretch ? Math.abs(dy) : (dy < 0 ? Math.abs(dy) : 0)
          const stretchDown = symmetricStretch ? Math.abs(dy) : (dy > 0 ? dy : 0)
          if (stretchUp > 2 || stretchDown > 2) {
            const result = rowStretch(activeLayer.canvas, sl.position, stretchUp, stretchDown, blendMode, easing)
            addLayer(result, `${activeLayer.name} - Stretch Riga`, compositeOp)
          }
        } else {
          const dx = Math.round(drag.currentX - drag.startX)
          const stretchLeft = symmetricStretch ? Math.abs(dx) : (dx < 0 ? Math.abs(dx) : 0)
          const stretchRight = symmetricStretch ? Math.abs(dx) : (dx > 0 ? dx : 0)
          if (stretchLeft > 2 || stretchRight > 2) {
            const result = columnStretch(activeLayer.canvas, sl.position, stretchLeft, stretchRight, blendMode, easing)
            addLayer(result, `${activeLayer.name} - Stretch Colonna`, compositeOp)
          }
        }
      }
    }

    previewCanvasRef.current = null
    lastPreviewParams.current = ''
    dragRef.current = null
    setStretchPreview(null)
    forceRender(n => n + 1)
  }, [activeLayer, blendMode, easing, setStretchPreview])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const ov = overlayRef.current
      if (ov) ov.releasePointerCapture(e.pointerId)
      applyStretch()
    },
    [applyStretch]
  )

  const applyGridWarpToActive = useCallback(() => {
    if (!activeLayer || activeLayer.locked) return
    const defaults = getDefaultGridPoints(activeLayer.canvas.width, activeLayer.canvas.height)
    const isDefault = warpGrid.controlPoints.length === 16 &&
      warpGrid.controlPoints.every((p, i) => Math.abs(p.x - defaults[i].x) < 1 && Math.abs(p.y - defaults[i].y) < 1)
    if (!isDefault && warpGrid.controlPoints.length === 16) {
      const result = applyGridWarp(activeLayer.canvas, warpGrid.controlPoints, blendMode)
      // Draw warp grid points on the result canvas
      const ctx = result.getContext('2d')!
      ctx.save()
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)'
      ctx.lineWidth = 0.5
      for (let row = 0; row < 4; row++) {
        ctx.beginPath()
        for (let col = 0; col < 4; col++) {
          const p = warpGrid.controlPoints[row * 4 + col]
          col === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }
      for (let col = 0; col < 4; col++) {
        ctx.beginPath()
        for (let row = 0; row < 4; row++) {
          const p = warpGrid.controlPoints[row * 4 + col]
          row === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }
      for (const p of warpGrid.controlPoints) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 200, 255, 0.4)'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      ctx.restore()
      const compOp: GlobalCompositeOperation | undefined =
        blendMode !== 'normal' && blendMode !== 'dissolve' ? blendMode : undefined
      useLayerStore.getState().addLayer(result, `${activeLayer.name} - Warp Griglia`, compOp)
    }
  }, [activeLayer, warpGrid.controlPoints, blendMode])

  useEffect(() => {
    if (tool !== 'warp-grid' || !warpGrid.active) return
    const tick = () => {
      marchOffset.current = (marchOffset.current + 0.5) % 20
      const ov = overlayRef.current
      if (ov) {
        const ctx = ov.getContext('2d')!
        ctx.clearRect(0, 0, ov.width, ov.height)
        const cs = useLayerStore.getState().canvasSize
        drawMarchingAnts(ctx, 0, 0, cs.width, cs.height)
      }
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [tool, warpGrid.active, drawMarchingAnts])

  // Pinch-to-zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let lastDist = 0
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
      }
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !lastDist) return
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const scale = dist / lastDist
      const state = useLayerStore.getState()
      state.setZoom(state.zoom * scale)
      lastDist = dist
    }
    const handleTouchEnd = () => { lastDist = 0 }
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const state = useLayerStore.getState()
      state.setZoom(state.zoom + (e.deltaY > 0 ? -0.1 : 0.1))
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const state = useLayerStore.getState()

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        state.redo()
        forceRender(n => n + 1)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        state.undo()
        forceRender(n => n + 1)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        state.resetView()
        forceRender(n => n + 1)
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        state.zoomIn()
        forceRender(n => n + 1)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        state.zoomOut()
        forceRender(n => n + 1)
        return
      }
      if (e.key === 'Escape') {
        state.setSourceLine(null)
        state.setStretchPreview(null)
        dragRef.current = null
        forceRender(n => n + 1)
        return
      }

      const step = e.shiftKey ? 10 : 50
      let handled = false
      switch (e.key) {
        case 'ArrowLeft':
          state.setPanOffset({ x: state.panOffset.x + step, y: state.panOffset.y })
          handled = true
          break
        case 'ArrowRight':
          state.setPanOffset({ x: state.panOffset.x - step, y: state.panOffset.y })
          handled = true
          break
        case 'ArrowUp':
          state.setPanOffset({ x: state.panOffset.x, y: state.panOffset.y + step })
          handled = true
          break
        case 'ArrowDown':
          state.setPanOffset({ x: state.panOffset.x, y: state.panOffset.y - step })
          handled = true
          break
      }
      if (handled) {
        e.preventDefault()
        forceRender(n => n + 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const cursorStyle =
    tool === 'zoom' ? 'zoom-in'
    : tool === 'stretch-radial' || tool === 'stretch-row' || tool === 'stretch-column' || tool === 'stretch-warp' ? 'crosshair'
    : tool === 'move' ? 'grab'
    : 'default'

  const showWarpGrid = tool === 'warp-grid' && warpGrid.active && warpGrid.controlPoints.length === 16

  return (
    <div className="canvas-container" ref={containerRef}>
      {layers.length === 0 ? (
        <div className="canvas-empty">
          <p>Carica un'immagine per iniziare</p>
        </div>
      ) : (
        <div
          className="canvas-wrapper"
          style={{
            position: 'relative',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{ cursor: cursorStyle }}
            className="main-canvas"
          />
          <canvas
            ref={overlayRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="overlay-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {showWarpGrid && activeLayer && (
            <>
              <WarpGridOverlay canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} onApply={applyGridWarpToActive} />
              <div className="warp-grid-actions">
                <button className="btn btn-primary" onClick={applyGridWarpToActive}>Applica Warp</button>
                <button className="btn" onClick={() => useLayerStore.getState().resetWarpGrid()}>Reset Griglia</button>
              </div>
            </>
          )}
        </div>
      )}
      {isProcessing && (
        <div className="processing-overlay">
          <div className="spinner" />
          <p>{processingMessage}</p>
        </div>
      )}
    </div>
  )
}
