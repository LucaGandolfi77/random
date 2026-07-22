import { useCallback, useRef, useState, useEffect } from 'react'
import { useLayerStore } from '../store/layerStore'
import { radialStretch, rowStretch, selectionWarp } from '../effects/pixelStretch'
import { applyGridWarp, getDefaultGridPoints } from '../effects/gridWarp'
import { drawCheckerboard, compositeToCanvas } from '../utils/canvas'
import { WarpGridOverlay } from './WarpGridOverlay'

interface DragState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  mode: 'radial' | 'row' | 'selection-warp' | 'pan'
  targetRow?: number
  startPanX?: number
  startPanY?: number
}

export function Canvas() {
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
    setPanOffset,
    zoomIn,
    zoomOut,
  } = useLayerStore()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [, forceRender] = useState(0)
  const animationRef = useRef<number>(0)
  const marchingAntsOffset = useRef(0)

  const activeLayer = layers.find(l => l.id === activeLayerId)

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
      const offset = marchingAntsOffset.current
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

  const renderOverlay = useCallback(
    (d: DragState | null) => {
      const ov = overlayRef.current
      if (!ov) return
      const ctx = ov.getContext('2d')!
      ctx.clearRect(0, 0, ov.width, ov.height)

      if (!d) return

      if (d.mode === 'radial') {
        const dx = d.currentX - d.startX
        const dy = d.currentY - d.startY
        ctx.strokeStyle = 'rgba(0,200,255,0.6)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])

        ctx.beginPath()
        ctx.moveTo(d.startX - Math.abs(dx), d.startY)
        ctx.lineTo(d.startX + Math.abs(dx), d.startY)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(d.startX, d.startY - Math.abs(dy))
        ctx.lineTo(d.startX, d.startY + Math.abs(dy))
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(d.startX, d.startY, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,200,255,0.8)'
        ctx.fill()
        ctx.setLineDash([])
      } else if (d.mode === 'row' && d.targetRow !== undefined) {
        ctx.strokeStyle = 'rgba(255,100,100,0.7)'
        ctx.lineWidth = 1
        ctx.setLineDash([6, 3])
        ctx.beginPath()
        ctx.moveTo(0, d.targetRow)
        ctx.lineTo(ov.width, d.targetRow)
        ctx.stroke()
        ctx.setLineDash([])

        const dy = d.currentY - d.startY
        if (Math.abs(dy) > 2) {
          const stretchLen = Math.abs(dy)
          const dir = dy < 0 ? -1 : 1
          ctx.fillStyle = 'rgba(255,100,100,0.15)'
          ctx.fillRect(
            0,
            dir > 0 ? d.targetRow : d.targetRow - stretchLen,
            ov.width,
            stretchLen
          )
        }
      } else if (d.mode === 'selection-warp') {
        const x = Math.min(d.startX, d.currentX)
        const y = Math.min(d.startY, d.currentY)
        const w = Math.abs(d.currentX - d.startX)
        const h = Math.abs(d.currentY - d.startY)

        if (w > 2 && h > 2) {
          ctx.fillStyle = 'rgba(0,200,255,0.08)'
          ctx.fillRect(x, y, w, h)
          drawMarchingAnts(ctx, x, y, w, h)
        }
      }
    },
    [drawMarchingAnts]
  )

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
        if (e.altKey) {
          zoomOut()
        } else {
          zoomIn()
        }
        return
      }

      if (!activeLayer || activeLayer.locked) return
      if (tool === 'warp-grid') return

      const overlay = overlayRef.current
      if (overlay) {
        overlay.setPointerCapture(e.pointerId)
      }

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
      } else if (tool === 'stretch-radial') {
        dragRef.current = {
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          mode: 'radial',
        }
      } else if (tool === 'stretch-row') {
        dragRef.current = {
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          mode: 'row',
          targetRow: Math.floor(pos.y),
        }
      } else if (tool === 'stretch-warp') {
        dragRef.current = {
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          mode: 'selection-warp',
        }
      }
      forceRender(n => n + 1)
    },
    [tool, activeLayer, getCanvasCoords, panOffset, zoomIn, zoomOut]
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
      renderOverlay(drag)
    },
    [getCanvasCoords, renderOverlay, setPanOffset]
  )

  const applyStretch = useCallback(() => {
    const drag = dragRef.current
    if (!drag || !activeLayer || activeLayer.locked) {
      dragRef.current = null
      renderOverlay(null)
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
        const result = radialStretch(
          activeLayer.canvas,
          drag.startX,
          drag.startY,
          stretchH,
          stretchV,
          blendMode
        )
        addLayer(result, `${activeLayer.name} - Stretch Radiale`)
      }
    } else if (drag.mode === 'row' && drag.targetRow !== undefined) {
      const dy = Math.round(drag.currentY - drag.startY)
      const stretchUp = dy < 0 ? Math.abs(dy) : 0
      const stretchDown = dy > 0 ? dy : 0

      if (stretchUp > 2 || stretchDown > 2) {
        const result = rowStretch(
          activeLayer.canvas,
          drag.targetRow,
          stretchUp,
          stretchDown,
          blendMode
        )
        addLayer(result, `${activeLayer.name} - Stretch Riga`)
      }
    } else if (drag.mode === 'selection-warp') {
      const selX = Math.min(drag.startX, drag.currentX)
      const selY = Math.min(drag.startY, drag.currentY)
      const selW = Math.abs(drag.currentX - drag.startX)
      const selH = Math.abs(drag.currentY - drag.startY)

      if (selW > 4 && selH > 4) {
        const dragX = drag.currentX - drag.startX
        const dragY = drag.currentY - drag.startY
        const result = selectionWarp(
          activeLayer.canvas,
          selX,
          selY,
          selW,
          selH,
          dragX,
          dragY,
          blendMode
        )
        addLayer(result, `${activeLayer.name} - Stretch Warp`)
      }
    }

    dragRef.current = null
    renderOverlay(null)
    forceRender(n => n + 1)
  }, [activeLayer, renderOverlay, blendMode])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const overlay = overlayRef.current
      if (overlay) {
        overlay.releasePointerCapture(e.pointerId)
      }
      applyStretch()
    },
    [applyStretch]
  )

  const applyGridWarpToActive = useCallback(() => {
    if (!activeLayer || activeLayer.locked) return

    const defaults = getDefaultGridPoints(
      activeLayer.canvas.width,
      activeLayer.canvas.height
    )
    const isDefault = warpGrid.controlPoints.length === 16 &&
      warpGrid.controlPoints.every((p, i) =>
        Math.abs(p.x - defaults[i].x) < 1 &&
        Math.abs(p.y - defaults[i].y) < 1
      )

    if (!isDefault && warpGrid.controlPoints.length === 16) {
      const result = applyGridWarp(
        activeLayer.canvas,
        warpGrid.controlPoints,
        blendMode
      )
      const { addLayer } = useLayerStore.getState()
      addLayer(result, `${activeLayer.name} - Warp Griglia`)
    }
  }, [activeLayer, warpGrid.controlPoints, blendMode])

  useEffect(() => {
    if (tool !== 'warp-grid' || !warpGrid.active) return

    const tick = () => {
      marchingAntsOffset.current = (marchingAntsOffset.current + 0.5) % 20
      const ov = overlayRef.current
      if (ov) {
        const ctx = ov.getContext('2d')!
        ctx.clearRect(0, 0, ov.width, ov.height)
        const cs = useLayerStore.getState().canvasSize
        drawMarchingAnts(ctx, 0, 0, cs.width, cs.height)
      }
      animationRef.current = requestAnimationFrame(tick)
    }
    animationRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(animationRef.current)
  }, [tool, warpGrid.active, drawMarchingAnts])

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const state = useLayerStore.getState()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      state.setZoom(state.zoom + delta)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  // Arrow keys pan + zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const state = useLayerStore.getState()

      // Ctrl/Cmd + 0 = reset view
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        state.resetView()
        forceRender(n => n + 1)
        return
      }

      // Ctrl/Cmd + = / + = zoom in
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        state.zoomIn()
        forceRender(n => n + 1)
        return
      }

      // Ctrl/Cmd + - = zoom out
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        state.zoomOut()
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
    tool === 'zoom'
      ? 'zoom-in'
      : tool === 'stretch-radial' || tool === 'stretch-row' || tool === 'stretch-warp'
        ? 'crosshair'
        : tool === 'move'
          ? 'grab'
          : tool === 'warp-grid'
            ? 'default'
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
              <WarpGridOverlay
                canvasWidth={canvasSize.width}
                canvasHeight={canvasSize.height}
                onApply={applyGridWarpToActive}
              />
              <div className="warp-grid-actions">
                <button className="btn btn-primary" onClick={applyGridWarpToActive}>
                  Applica Warp
                </button>
                <button className="btn" onClick={() => useLayerStore.getState().resetWarpGrid()}>
                  Reset Griglia
                </button>
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