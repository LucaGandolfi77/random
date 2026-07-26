import { useState, useRef, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { useStore } from '../state/store'
import { Layer } from '../types'

function LayerThumbnail({ layer }: { layer: Layer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (layer.type === 'image') {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const w = layer.bitmap.width
      const h = layer.bitmap.height
      const s = Math.min(32 / w, 32 / h, 1)
      canvas.width = Math.round(w * s)
      canvas.height = Math.round(h * s)
      ctx.drawImage(layer.bitmap, 0, 0, canvas.width, canvas.height)
    }
  }, [layer])

  if (layer.type === 'line') {
    return (
      <div
        style={{
          width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 24, height: 3, borderRadius: 2,
            backgroundColor: layer.color,
          }}
        />
      </div>
    )
  }

  return <canvas ref={canvasRef} style={{ width: 32, height: 32, borderRadius: 3 }} />
}

export function LayersPanel() {
  const document = useStore(s => s.document)
  const selectedLayerId = useStore(s => s.selectedLayerId)
  const selectLayer = useStore(s => s.selectLayer)
  const setLayerVisibility = useStore(s => s.setLayerVisibility)
  const setLayerOpacity = useStore(s => s.setLayerOpacity)
  const removeLayer = useStore(s => s.removeLayer)
  const duplicateLayer = useStore(s => s.duplicateLayer)
  const reorderLayer = useStore(s => s.reorderLayer)
  const renameLayer = useStore(s => s.renameLayer)
  const pushHistory = useStore(s => s.pushHistory)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!document) {
    return (
      <div className="panel">
        <div className="panel-title">Livelli</div>
        <div className="panel-empty">Nessun documento aperto</div>
      </div>
    )
  }

  const layers = [...document.layers].reverse()

  function startRename(id: string, currentName: string) {
    setEditingId(id)
    setEditName(currentName)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function finishRename(id: string) {
    if (editName.trim()) {
      renameLayer(id, editName.trim())
    }
    setEditingId(null)
  }

  const canMoveUp = (index: number) => index < layers.length - 1
  const canMoveDown = (index: number) => index > 0

  return (
    <div className="panel">
      <div className="panel-title">Livelli</div>
      <div className="layers-list">
        {layers.map((layer, displayIndex) => {
          const actualIndex = document.layers.length - 1 - displayIndex
          const isSelected = layer.id === selectedLayerId

          return (
            <div
              key={layer.id}
              className={`layer-item ${isSelected ? 'selected' : ''}`}
              onClick={() => selectLayer(layer.id)}
            >
              <button
                className="layer-vis-btn"
                onClick={e => {
                  e.stopPropagation()
                  setLayerVisibility(layer.id, !layer.visible)
                }}
                title={layer.visible ? 'Nascondi' : 'Mostra'}
              >
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              <div className="layer-thumb">
                <LayerThumbnail layer={layer} />
              </div>

              {editingId === layer.id ? (
                <input
                  ref={inputRef}
                  className="layer-name-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => finishRename(layer.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') finishRename(layer.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span
                  className="layer-name"
                  onDoubleClick={() => startRename(layer.id, layer.name)}
                >
                  {layer.name}
                </span>
              )}

              <input
                type="range"
                className="layer-opacity-slider"
                min={0}
                max={1}
                step={0.05}
                value={layer.opacity}
                onClick={e => e.stopPropagation()}
                onChange={e => {
                  setLayerOpacity(layer.id, Number(e.target.value))
                }}
                title={`Opacità: ${Math.round(layer.opacity * 100)}%`}
              />

              <div className="layer-actions">
                <button
                  className="layer-action-btn"
                  onClick={e => {
                    e.stopPropagation()
                    pushHistory()
                    duplicateLayer(layer.id)
                  }}
                  title="Duplica"
                >
                  <Copy size={12} />
                </button>
                <button
                  className="layer-action-btn"
                  onClick={e => {
                    e.stopPropagation()
                    if (canMoveUp(displayIndex)) {
                      pushHistory()
                      reorderLayer(actualIndex, actualIndex + 1)
                    }
                  }}
                  title="Sposta su"
                  disabled={!canMoveUp(displayIndex)}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  className="layer-action-btn"
                  onClick={e => {
                    e.stopPropagation()
                    if (canMoveDown(displayIndex)) {
                      pushHistory()
                      reorderLayer(actualIndex, actualIndex - 1)
                    }
                  }}
                  title="Sposta giù"
                  disabled={!canMoveDown(displayIndex)}
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  className="layer-action-btn danger"
                  onClick={e => {
                    e.stopPropagation()
                    removeLayer(layer.id)
                  }}
                  title="Elimina"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
