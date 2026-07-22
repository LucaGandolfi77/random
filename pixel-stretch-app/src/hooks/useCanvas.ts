import { useRef, useCallback, useEffect } from 'react'
import { useLayerStore } from '../store/layerStore'
import { compositeToCanvas, drawCheckerboard } from '../utils/canvas'

export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    layers,
    canvasSize,
  } = useLayerStore()

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

  return { canvasRef, render }
}
