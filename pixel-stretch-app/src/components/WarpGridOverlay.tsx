import { useCallback, useRef, useState } from 'react'
import { useLayerStore } from '../store/layerStore'
import type { WarpGridPoint } from '../types'

interface WarpGridOverlayProps {
  canvasWidth: number
  canvasHeight: number
  onApply: () => void
}

const HANDLE_RADIUS = 6

export function WarpGridOverlay({ canvasWidth, canvasHeight }: WarpGridOverlayProps) {
  const { warpGrid, setWarpGridPoint } = useLayerStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const toSvgCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current!
      const rect = svg.getBoundingClientRect()
      const scaleX = canvasWidth / rect.width
      const scaleY = canvasHeight / rect.height
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      }
    },
    [canvasWidth, canvasHeight]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.stopPropagation()
      e.preventDefault()
      const target = e.currentTarget as SVGElement
      target.setPointerCapture(e.pointerId)
      setDraggingIndex(index)
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null) return
      e.preventDefault()
      const pos = toSvgCoords(e.clientX, e.clientY)
      const clamped: WarpGridPoint = {
        x: Math.max(0, Math.min(canvasWidth, pos.x)),
        y: Math.max(0, Math.min(canvasHeight, pos.y)),
      }
      setWarpGridPoint(draggingIndex, clamped)
    },
    [draggingIndex, toSvgCoords, canvasWidth, canvasHeight, setWarpGridPoint]
  )

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null)
  }, [])

  const handleDoubleClick = useCallback(
    (index: number) => {
      const col = index % 4
      const row = Math.floor(index / 4)
      const defaultPoint: WarpGridPoint = {
        x: (col / 3) * canvasWidth,
        y: (row / 3) * canvasHeight,
      }
      setWarpGridPoint(index, defaultPoint)
    },
    [canvasWidth, canvasHeight, setWarpGridPoint]
  )

  const scaleX = (x: number) => (x / canvasWidth) * 100
  const scaleY = (y: number) => (y / canvasHeight) * 100

  const points = warpGrid.controlPoints
  if (points.length !== 16) return null

  const gridLines: React.ReactNode[] = []
  for (let row = 0; row < 4; row++) {
    const rowData = points.slice(row * 4, row * 4 + 4)
    const pathD = rowData
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`)
      .join(' ')
    gridLines.push(
      <path key={`h${row}`} d={pathD} className="warp-grid-line" />
    )
  }
  for (let col = 0; col < 4; col++) {
    const colData = [0, 1, 2, 3].map(r => points[r * 4 + col])
    const pathD = colData
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`)
      .join(' ')
    gridLines.push(
      <path key={`v${col}`} d={pathD} className="warp-grid-line" />
    )
  }

  return (
    <svg
      ref={svgRef}
      className="warp-grid-overlay"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 5,
      }}
    >
      {gridLines}

      {points.map((p, i) => (
        <circle
          key={i}
          cx={scaleX(p.x)}
          cy={scaleY(p.y)}
          r={`${(HANDLE_RADIUS / canvasWidth) * 100}%`}
          className={`warp-control-point ${draggingIndex === i ? 'dragging' : ''} ${hoverIndex === i ? 'hover' : ''}`}
          style={{ pointerEvents: 'all', cursor: 'grab' }}
          onPointerDown={(e) => handlePointerDown(e, i)}
          onPointerEnter={() => setHoverIndex(i)}
          onPointerLeave={() => setHoverIndex(null)}
          onDoubleClick={() => handleDoubleClick(i)}
        />
      ))}
    </svg>
  )
}