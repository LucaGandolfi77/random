import { useStore } from '../state/store'
import { ImageLayer, LineLayer, defaultFilters } from '../types'

export function PropertiesPanel() {
  const document = useStore(s => s.document)
  const selectedLayerId = useStore(s => s.selectedLayerId)
  const updateLayer = useStore(s => s.updateLayer)
  const pushHistory = useStore(s => s.pushHistory)

  if (!document) {
    return (
      <div className="panel">
        <div className="panel-title">Proprietà</div>
        <div className="panel-empty">Nessun livello selezionato</div>
      </div>
    )
  }

  const layer = document.layers.find(l => l.id === selectedLayerId)
  if (!layer) {
    return (
      <div className="panel">
        <div className="panel-title">Proprietà</div>
        <div className="panel-empty">Nessun livello selezionato</div>
      </div>
    )
  }

  if (layer.type === 'image') {
    return <ImagePropertiesPanel layer={layer} updateLayer={updateLayer} pushHistory={pushHistory} />
  }

  return <LinePropertiesPanel layer={layer} updateLayer={updateLayer} pushHistory={pushHistory} />
}

function ImagePropertiesPanel({
  layer,
  updateLayer,
  pushHistory,
}: {
  layer: ImageLayer
  updateLayer: (id: string, u: any) => void
  pushHistory: () => void
}) {
  const f = layer.filters

  function setFilter(key: string, value: number | boolean) {
    updateLayer(layer.id, {
      filters: { ...layer.filters, [key]: value },
    })
  }

  function resetFilters() {
    pushHistory()
    updateLayer(layer.id, { filters: { ...defaultFilters } })
  }

  return (
    <div className="panel">
      <div className="panel-title">Proprietà immagine</div>

      <div className="prop-group">
        <div className="prop-group-title">Filtri</div>

        <SliderProp label="Luminosità" value={f.brightness} min={0} max={200} onChange={v => setFilter('brightness', v)} />
        <SliderProp label="Contrasto" value={f.contrast} min={0} max={200} onChange={v => setFilter('contrast', v)} />
        <SliderProp label="Saturazione" value={f.saturate} min={0} max={200} onChange={v => setFilter('saturate', v)} />
        <SliderProp label="Sfocatura" value={f.blur} min={0} max={20} onChange={v => setFilter('blur', v)} />
        <SliderProp label="B/N" value={f.grayscale} min={0} max={100} onChange={v => setFilter('grayscale', v)} />
        <SliderProp label="Seppia" value={f.sepia} min={0} max={100} onChange={v => setFilter('sepia', v)} />
        <SliderProp label="Inverti" value={f.invert} min={0} max={100} onChange={v => setFilter('invert', v)} />
        <SliderProp label="Tonalità" value={f.hueRotate} min={0} max={360} onChange={v => setFilter('hueRotate', v)} />

        <label className="prop-checkbox">
          <input
            type="checkbox"
            checked={f.sharpen}
            onChange={e => {
              pushHistory()
              setFilter('sharpen', e.target.checked)
            }}
          />
          <span>Nitidezza</span>
        </label>

        <button className="prop-btn" onClick={resetFilters}>Reset filtri</button>
      </div>

      <div className="prop-group">
        <div className="prop-group-title">Scontornamento</div>
        <button
          className="prop-btn primary"
          onClick={async () => {
            pushHistory()
            const state = useStore.getState()
            state.setProcessing('Scontornamento in corso...', 0)

            try {
              const { removeImageBackground } = await import('../ml/backgroundRemoval')
              const canvas = document.createElement('canvas')
              canvas.width = layer.bitmap.width
              canvas.height = layer.bitmap.height
              const ctx = canvas.getContext('2d')!
              ctx.drawImage(layer.bitmap, 0, 0)

              const blob = await new Promise<Blob | null>(resolve =>
                canvas.toBlob(b => resolve(b), 'image/png')
              )

              if (!blob) throw new Error('Failed to create blob')

              const resultBlob = await removeImageBackground(blob, (progress) => {
                state.setProcessing('Scontornamento in corso...', progress)
              })

              const resultBitmap = await createImageBitmap(resultBlob)
              state.addImageLayer(resultBitmap)
            } catch (err) {
              console.error('Background removal error:', err)
            }

            state.clearProcessing()
          }}
        >
          Scontorna soggetto
        </button>
      </div>
    </div>
  )
}

function LinePropertiesPanel({
  layer,
  updateLayer,
  pushHistory,
}: {
  layer: LineLayer
  updateLayer: (id: string, u: any) => void
  pushHistory: () => void
}) {
  function update(updates: Partial<LineLayer>) {
    if (!updates.type) {
      updateLayer(layer.id, updates)
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">Proprietà linea</div>

      <div className="prop-group">
        <div className="prop-group-title">Aspetto</div>

        <label className="prop-row">
          <span>Colore</span>
          <div className="color-row">
            <input
              type="color"
              value={layer.color}
              onChange={e => update({ color: e.target.value })}
            />
            <button
              className="color-btn"
              onClick={() => update({ color: '#ffffff' })}
              title="Bianco"
            >
              <div style={{ width: 16, height: 16, borderRadius: 2, border: '1px solid #555', backgroundColor: '#fff' }} />
            </button>
            <button
              className="color-btn"
              onClick={() => update({ color: '#000000' })}
              title="Nero"
            >
              <div style={{ width: 16, height: 16, borderRadius: 2, border: '1px solid #555', backgroundColor: '#000' }} />
            </button>
          </div>
        </label>

        <SliderProp label="Spessore" value={layer.width} min={1} max={100} onChange={v => update({ width: v })} />

        <label className="prop-row">
          <span>Pattern</span>
          <select
            value={layer.pattern}
            onChange={e => update({ pattern: e.target.value as any })}
            className="prop-select"
          >
            <option value="solid">Continua</option>
            <option value="dashed">Tratteggiata</option>
            <option value="dotted">Punteggiata</option>
            <option value="custom">Personalizzata</option>
          </select>
        </label>

        {layer.pattern === 'custom' && (
          <label className="prop-row">
            <span>Dash array</span>
            <input
              type="text"
              className="prop-input"
              value={layer.dashArray.join(', ')}
              onChange={e => {
                const arr = e.target.value.split(',').map(Number).filter(n => !isNaN(n) && n > 0)
                update({ dashArray: arr })
              }}
              placeholder="es. 12, 6, 2, 6"
            />
          </label>
        )}

        <label className="prop-row">
          <span>Terminazione</span>
          <select
            value={layer.cap}
            onChange={e => update({ cap: e.target.value as any })}
            className="prop-select"
          >
            <option value="butt">Piatto</option>
            <option value="round">Tondo</option>
            <option value="square">Quadrato</option>
          </select>
        </label>

        <label className="prop-checkbox">
          <input
            type="checkbox"
            checked={layer.border.enabled}
            onChange={e => update({ border: { ...layer.border, enabled: e.target.checked } })}
          />
          <span>Bordo</span>
        </label>

        {layer.border.enabled && (
          <>
            <label className="prop-row">
              <span>Colore bordo</span>
              <input
                type="color"
                value={layer.border.color}
                onChange={e => update({ border: { ...layer.border, color: e.target.value } })}
              />
            </label>
            <SliderProp label="Spessore bordo" value={layer.border.width} min={1} max={20} onChange={v => update({ border: { ...layer.border, width: v } })} />
          </>
        )}
      </div>

      <div className="prop-group">
        <div className="prop-group-title">Warp</div>

        <label className="prop-checkbox">
          <input
            type="checkbox"
            checked={layer.warp.enabled}
            onChange={e => update({ warp: { ...layer.warp, enabled: e.target.checked } })}
          />
          <span>Attiva warp (curva)</span>
        </label>
      </div>

      <div className="prop-group">
        <div className="prop-group-title">Punti</div>

        <label className="prop-row">
          <span>A X</span>
          <input
            type="number"
            className="prop-input narrow"
            value={Math.round(layer.start.x)}
            onChange={e => update({ start: { ...layer.start, x: Number(e.target.value) } })}
          />
        </label>
        <label className="prop-row">
          <span>A Y</span>
          <input
            type="number"
            className="prop-input narrow"
            value={Math.round(layer.start.y)}
            onChange={e => update({ start: { ...layer.start, y: Number(e.target.value) } })}
          />
        </label>
        <label className="prop-row">
          <span>B X</span>
          <input
            type="number"
            className="prop-input narrow"
            value={Math.round(layer.end.x)}
            onChange={e => update({ end: { ...layer.end, x: Number(e.target.value) } })}
          />
        </label>
        <label className="prop-row">
          <span>B Y</span>
          <input
            type="number"
            className="prop-input narrow"
            value={Math.round(layer.end.y)}
            onChange={e => update({ end: { ...layer.end, y: Number(e.target.value) } })}
          />
        </label>
      </div>
    </div>
  )
}

function SliderProp({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="prop-row">
      <span>{label}</span>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="prop-slider"
        />
        <span className="slider-value">{Math.round(value)}</span>
      </div>
    </label>
  )
}
