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
    setLayerCompositeOperation,
    mergeDown,
    flattenLayers,
  } = useLayerStore()

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const opacityBeforeDrag = useRef<number | null>(null)

  const commitOpacityHistory = (layerId: string) => {
    const before = opacityBeforeDrag.current
    opacityBeforeDrag.current = null
    const current = useLayerStore.getState().layers.find(l => l.id === layerId)?.opacity
    if (before !== null && current !== undefined && before !== current) {
      useLayerStore.getState().pushHistory('Opacità layer')
    }
  }

  const onDragStart = (idx: number) => setDragIdx(idx)
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    // No history push here: dragover fires continuously, push once on drag end
    reorderLayer(dragIdx, idx)
    setDragIdx(idx)
  }
  const onDragEnd = () => {
    if (dragIdx !== null) useLayerStore.getState().pushHistory('Riordina layer')
    setDragIdx(null)
  }

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
        <div className="panel-header-actions">
          <button
            className="btn btn-icon"
            onClick={mergeDown}
            disabled={layers.length < 2 || !(layers.findIndex(l => l.id === activeLayerId) > 0)}
            title="Unisci al layer sottostante"
            aria-label="Unisci al layer sottostante"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button
            className="btn btn-icon"
            onClick={flattenLayers}
            disabled={layers.length < 2}
            title="Appiattisci tutti i layer visibili"
            aria-label="Appiattisci"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>
          </button>
        </div>
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
                  onPointerDown={() => { opacityBeforeDrag.current = layer.opacity }}
                  onPointerUp={() => commitOpacityHistory(layer.id)}
                  onKeyDown={() => { if (opacityBeforeDrag.current === null) opacityBeforeDrag.current = layer.opacity }}
                  onKeyUp={() => commitOpacityHistory(layer.id)}
                  className="opacity-slider"
                  onClick={e => e.stopPropagation()}
                  aria-label={`Opacità ${layer.name}`}
                />
                {layer.id === activeLayerId && (
                  <select
                    className="layer-blend-mode"
                    value={layer.compositeOperation || 'source-over'}
                    onChange={e => {
                      const val = e.target.value
                      setLayerCompositeOperation(layer.id, val === 'source-over' ? undefined : val as GlobalCompositeOperation)
                    }}
                    onClick={e => e.stopPropagation()}
                    aria-label={`Blend mode ${layer.name}`}
                  >
                    <option value="source-over">Normale</option>
                    <option value="multiply">Moltiplica</option>
                    <option value="screen">Schermo</option>
                    <option value="overlay">Sovrapponi</option>
                    <option value="difference">Differenza</option>
                    <option value="lighten">Schiarisci</option>
                    <option value="darken">Scuosisci</option>
                  </select>
                )}
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
