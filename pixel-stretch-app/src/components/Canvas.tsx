import { useCallback, useRef, useState, useEffect } from 'react'
import { useLayerStore } from '../store/layerStore'
import { useModifierKeys } from '../hooks/useKeyboard'
import { radialStretch, rowStretch, columnStretch, selectionWarp } from '../effects/pixelStretch'
import { applyGridWarp, getDefaultGridPoints } from '../effects/gridWarp'
import { drawCheckerboard, compositeToCanvas } from '../utils/canvas'
import { WarpGridOverlay } from './WarpGridOverlay'

interface DragState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  mode: 'radial' | 'stretch' | 'selection-warp' | 'pan'
  sourceType?: 'row' | 'column'
  startPanX?: number
  startPanY?: number
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
    warpGrid,
    zoom,
    panOffset,
    sourceLine,
    setPanOffset,
    setSourceLine,
    setStretchPreview,
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
  }, [drawMarchingAnts])

  // Persistent overlay loop for source line + preview
  useEffect(() => {
    if (!isLineTool && !dragRef.current) return

    const loop = () => {
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

      if (!activeLayer || activeLayer.locked) return
      if (tool === 'warp-grid') return

      const overlay = overlayRef.current
      if (overlay) overlay.setPointerCapture(e.pointerId)

      const pos = getCanvasCoords(e.clientX, e.clientY)

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

      if (drag.mode === 'stretch' && drag.sourceType) {
        const currentPos = drag.sourceType === 'row' ? pos.y : pos.x
        setStretchPreview({ type: drag.sourceType, sourcePos: 0, currentPos })
      }
    },
    [getCanvasCoords, setPanOffset, setStretchPreview]
  )

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

    if (drag.mode === 'pan') {
      dragRef.current = null
      forceRender(n => n + 1)
      return
    }

    const { addLayer } = useLayerStore.getState()

    if (drag.mode === 'radial') {
      const stretchH = Math.abs(Math.round(drag.currentX - drag.startX))
      const stretchV = Math.abs(Math.round(drag.currentY - drag.startY))
      if (stretchH > 2 || stretchV > 2) {
        const result = radialStretch(activeLayer.canvas, drag.startX, drag.startY, stretchH, stretchV, blendMode)
        addLayer(result, `${activeLayer.name} - Stretch Radiale`)
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
        addLayer(result, `${activeLayer.name} - Stretch Warp`)
      }
    } else if (drag.mode === 'stretch') {
      const store = useLayerStore.getState()
      const sl = store.sourceLine
      if (sl) {
        if (sl.type === 'row') {
          const dy = Math.round(drag.currentY - drag.startY)
          const stretchUp = dy < 0 ? Math.abs(dy) : 0
          const stretchDown = dy > 0 ? dy : 0
          if (stretchUp > 2 || stretchDown > 2) {
            const result = rowStretch(activeLayer.canvas, sl.position, stretchUp, stretchDown, blendMode)
            addLayer(result, `${activeLayer.name} - Stretch Riga`)
          }
        } else {
          const dx = Math.round(drag.currentX - drag.startX)
          const stretchLeft = dx < 0 ? Math.abs(dx) : 0
          const stretchRight = dx > 0 ? dx : 0
          if (stretchLeft > 2 || stretchRight > 2) {
            const result = columnStretch(activeLayer.canvas, sl.position, stretchLeft, stretchRight, blendMode)
            addLayer(result, `${activeLayer.name} - Stretch Colonna`)
          }
        }
      }
    }

    dragRef.current = null
    setStretchPreview(null)
    forceRender(n => n + 1)
  }, [activeLayer, blendMode, setStretchPreview])

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
      useLayerStore.getState().addLayer(result, `${activeLayer.name} - Warp Griglia`)
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
