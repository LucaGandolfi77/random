import { useEffect, useRef } from 'react'
import { useStreamerStore } from '../store/streamerStore'

export function MultiGrid() {
  const { gridMode, controlMode, viewports } = useStreamerStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Setup canvas for TV display
    canvas.width = 1920
    canvas.height = 1080

    // Draw grid based on mode
    const drawGrid = () => {
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const cols = gridMode === '1x1' ? 1 : gridMode === '2x2' ? 2 : 3
      const rows = gridMode === '1x1' ? 1 : gridMode === '2x2' ? 2 : 3

      const cellWidth = canvas.width / cols
      const cellHeight = canvas.height / rows

      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2

      for (let i = 0; i <= cols; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cellWidth, 0)
        ctx.lineTo(i * cellWidth, canvas.height)
        ctx.stroke()
      }

      for (let i = 0; i <= rows; i++) {
        ctx.beginPath()
        ctx.moveTo(0, i * cellHeight)
        ctx.lineTo(canvas.width, i * cellHeight)
        ctx.stroke()
      }

      // Draw viewport labels
      ctx.fillStyle = '#94a3b8'
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'center'
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col
          ctx.fillText(
            `Viewport ${idx + 1}`,
            (col + 0.5) * cellWidth,
            (row + 0.1) * cellHeight
          )
        }
      }
    }

    drawGrid()
  }, [gridMode, controlMode])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
      <canvas
        ref={canvasRef}
        className="border-2 border-slate-700 rounded-lg shadow-2xl"
      />
    </div>
  )
}