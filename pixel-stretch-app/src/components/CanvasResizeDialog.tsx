import { useState } from 'react'
import { X, Maximize } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'

const PRESETS = [
  { label: '1:1', w: 1, h: 1 },
  { label: '4:3', w: 4, h: 3 },
  { label: '16:9', w: 16, h: 9 },
  { label: '3:2', w: 3, h: 2 },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function CanvasResizeDialog({ open, onClose }: Props) {
  const { layers, canvasSize, setCanvasSize } = useLayerStore()
  const [width, setWidth] = useState(canvasSize.width)
  const [height, setHeight] = useState(canvasSize.height)
  const [mode, setMode] = useState<'custom' | 'fit'>('custom')

  if (!open) return null

  const fitToContent = () => {
    if (layers.length === 0) return
    let maxX = 0
    let maxY = 0
    for (const l of layers) {
      const rx = l.position.x + l.width
      const ry = l.position.y + l.height
      if (rx > maxX) maxX = rx
      if (ry > maxY) maxY = ry
    }
    setWidth(Math.max(1, maxX))
    setHeight(Math.max(1, maxY))
  }

  const handleApply = () => {
    setCanvasSize({ width: Math.round(width), height: Math.round(height) })
    onClose()
  }

  const applyPreset = (wRatio: number, hRatio: number) => {
    const base = Math.max(width, height)
    setWidth(Math.round(base * wRatio / Math.max(wRatio, hRatio)))
    setHeight(Math.round(base * hRatio / Math.max(wRatio, hRatio)))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ridimensiona Canvas</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="resize-mode-toggle">
            <button
              className={`toggle-btn ${mode === 'custom' ? 'active' : ''}`}
              onClick={() => setMode('custom')}
            >
              Personalizzato
            </button>
            <button
              className={`toggle-btn ${mode === 'fit' ? 'active' : ''}`}
              onClick={() => { setMode('fit'); fitToContent() }}
            >
              <Maximize size={14} /> Adatta
            </button>
          </div>

          {mode === 'custom' && (
            <>
              <div className="resize-inputs">
                <label>
                  Larghezza:
                  <input
                    type="number"
                    min={1}
                    max={4000}
                    value={width}
                    onChange={e => setWidth(Number(e.target.value))}
                    className="modal-input"
                  />
                </label>
                <label>
                  Altezza:
                  <input
                    type="number"
                    min={1}
                    max={4000}
                    value={height}
                    onChange={e => setHeight(Number(e.target.value))}
                    className="modal-input"
                  />
                </label>
              </div>
              <div className="resize-presets">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    className="btn"
                    onClick={() => applyPreset(p.w, p.h)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <button className="btn btn-primary btn-export" onClick={handleApply}>
            Applica
          </button>
        </div>
      </div>
    </div>
  )
}
