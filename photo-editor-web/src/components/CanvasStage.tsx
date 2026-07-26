import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '../state/store'
import { invalidate } from '../canvas/renderer'
import {
  handleMovePointerDown,
  handleMovePointerMove,
  handleMovePointerUp,
} from '../tools/moveTool'
import {
  handleLinePointerDown,
  handleLinePointerMove,
  handleLinePointerUp,
} from '../tools/lineTool'
import {
  handlePanPointerDown,
  handlePanPointerMove,
  handlePanPointerUp,
  handleZoomWheel,
} from '../tools/panZoom'

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isPointerDown = useRef(false)
  const spaceHeld = useRef(false)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const state = useStore.getState()
    invalidate(ctx, state)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const cont = container
    const cv = canvas

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const w = cont.clientWidth
      const h = cont.clientHeight
      cv.width = w * dpr
      cv.height = h * dpr
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
      render()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(cont)
    resize()

    return () => ro.disconnect()
  }, [render])

  useEffect(() => {
    const unsub = useStore.subscribe(() => render())
    return unsub
  }, [render])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spaceHeld.current = true
        e.preventDefault()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          useStore.getState().redo()
        } else {
          useStore.getState().undo()
        }
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spaceHeld.current = false
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  function getCanvasSize() {
    const canvas = canvasRef.current
    if (!canvas) return { w: 0, h: 0 }
    const dpr = window.devicePixelRatio || 1
    return { w: canvas.width / dpr, h: canvas.height / dpr }
  }

  function handlePointerDown(e: React.PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const { w, h } = getCanvasSize()

    isPointerDown.current = true
    canvas.setPointerCapture(e.pointerId)

    const activeTool = useStore.getState().activeTool

    if (spaceHeld.current || activeTool === 'pan') {
      handlePanPointerDown(screenX, screenY)
      return
    }

    switch (activeTool) {
      case 'move':
        handleMovePointerDown(screenX, screenY, w, h)
        break
      case 'line':
        handleLinePointerDown(screenX, screenY)
        break
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const { w, h } = getCanvasSize()

    const state = useStore.getState()

    if (state.isDrawingLine) {
      handleLinePointerMove(screenX, screenY)
      return
    }

    if (spaceHeld.current || state.activeTool === 'pan') {
      handlePanPointerMove(screenX, screenY)
      return
    }

    if (isPointerDown.current && state.activeTool === 'move') {
      handleMovePointerMove(screenX, screenY, w, h)
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    isPointerDown.current = false

    const state = useStore.getState()

    if (state.isDrawingLine) {
      handleLinePointerUp(screenX, screenY)
      return
    }

    if (spaceHeld.current || state.activeTool === 'pan') {
      handlePanPointerUp()
      return
    }

    if (state.activeTool === 'move') {
      handleMovePointerUp()
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const { w, h } = getCanvasSize()
    handleZoomWheel(e.deltaY > 0 ? 1 : -1, screenX, screenY, w, h)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      useStore.getState().openImage(file)
    }
  }

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        className="canvas-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    </div>
  )
}
