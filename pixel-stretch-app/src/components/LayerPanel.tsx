import { useState, useRef } from 'react'
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  GripVertical,
} from 'lucide-react'
import { useLayerStore } from '../store/layerStore'

export function LayerPanel() {
  const {
    layers,
    activeLayerId,
    setActiveLayer,
    toggleVisibility,
    setOpacity,
    setLocked,
    renameLayer,
    removeLayer,
    duplicateLayer,
    reorderLayer,
  } = useLayerStore()

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onDragStart = (idx: number) => setDragIdx(idx)
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    reorderLayer(dragIdx, idx)
    setDragIdx(idx)
  }
  const onDragEnd = () => setDragIdx(null)

  const startRename = (id: string) => {
    setEditingId(id)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const commitRename = (id: string, value: string) => {
    if (value.trim()) renameLayer(id, value.trim())
    setEditingId(null)
  }

  return (
    <div className="layer-panel">
      <div className="panel-header">
        <h3>Layers</h3>
      </div>
      <div className="layer-list">
        {[...layers].reverse().map((layer, reversedIdx) => {
          const realIdx = layers.length - 1 - reversedIdx
          return (
            <div
              key={layer.id}
              className={`layer-item ${layer.id === activeLayerId ? 'active' : ''}`}
              draggable
              onDragStart={() => onDragStart(realIdx)}
              onDragOver={e => onDragOver(e, realIdx)}
              onDragEnd={onDragEnd}
              onClick={() => setActiveLayer(layer.id)}
            >
              <GripVertical size={14} className="drag-handle" />
              <div className="layer-thumb">
                <canvas
                  ref={el => {
                    if (!el) return
                    el.width = 32
                    el.height = 32
                    const ctx = el.getContext('2d')!
                    const scale = Math.min(32 / layer.width, 32 / layer.height)
                    ctx.drawImage(
                      layer.canvas,
                      0, 0, layer.width, layer.height,
                      (32 - layer.width * scale) / 2,
                      (32 - layer.height * scale) / 2,
                      layer.width * scale,
                      layer.height * scale
                    )
                  }}
                />
              </div>
              <div className="layer-info">
                {editingId === layer.id ? (
                  <input
                    ref={inputRef}
                    className="layer-name-input"
                    defaultValue={layer.name}
                    onBlur={e => commitRename(layer.id, e.target.value)}
                    onKeyDown={e =>
                      e.key === 'Enter' &&
                      commitRename(layer.id, (e.target as HTMLInputElement).value)
                    }
                  />
                ) : (
                  <span
                    className="layer-name"
                    onDoubleClick={() => startRename(layer.id)}
                  >
                    {layer.name}
                  </span>
                )}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={layer.opacity}
                  onChange={e => setOpacity(layer.id, parseFloat(e.target.value))}
                  className="opacity-slider"
                  onClick={e => e.stopPropagation()}
                />
              </div>
              <div className="layer-actions">
                <button
                  onClick={e => { e.stopPropagation(); toggleVisibility(layer.id) }}
                  title={layer.visible ? 'Nascondi' : 'Mostra'}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setLocked(layer.id, !layer.locked) }}
                  title={layer.locked ? 'Sblocca' : 'Blocca'}
                >
                  {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); duplicateLayer(layer.id) }}
                  title="Duplica"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); removeLayer(layer.id) }}
                  title="Elimina"
                  className="btn-delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {layers.length === 0 && (
        <div className="layer-empty">
          <p>Nessun layer.</p>
          <p>Carica un'immagine per iniziare.</p>
        </div>
      )}
    </div>
  )
}
