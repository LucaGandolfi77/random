import { useLayerStore } from '../store/layerStore'

export function StretchControls() {
  const { tool, blendMode, setBlendMode, sourceLine, clearSourceLine } = useLayerStore()

  const isStretchTool = tool === 'stretch-radial' || tool === 'stretch-row' || tool === 'stretch-column' || tool === 'stretch-warp' || tool === 'warp-grid'
  const isZoom = tool === 'zoom'
  const isMove = tool === 'move'

  if (!isStretchTool && !isZoom && !isMove) return null

  return (
    <div className="stretch-controls">
      {isStretchTool && (
        <div className="blend-mode-toggle">
          <span className="blend-label">Dissoluzione</span>
          <button
            className={`toggle-btn ${blendMode === 'dissolve' ? 'active' : ''}`}
            onClick={() => setBlendMode(blendMode === 'normal' ? 'dissolve' : 'normal')}
          >
            {blendMode === 'dissolve' ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {sourceLine && (tool === 'stretch-row' || tool === 'stretch-column') && (
        <div className="source-line-info">
          <span className="source-line-label">
            Linea attiva: {sourceLine.type === 'row' ? 'Riga' : 'Colonna'} {sourceLine.position}
          </span>
          <button className="toggle-btn" onClick={clearSourceLine}>X</button>
        </div>
      )}

      {tool === 'stretch-radial' && (
        <div className="stretch-hint">
          <p><strong>Stretch Radiale</strong></p>
          <p>Clicca sul canvas e trascina per creare uno stretch radiale. Si genera un nuovo layer con solo i pixel stretch.</p>
          <p className="hint-small">Trascina orizzontale = stretch sinistra/destra<br/>Trascina verticale = stretch su/giu'</p>
        </div>
      )}

      {tool === 'stretch-row' && (
        <div className="stretch-hint">
          <p><strong>Stretch da Riga</strong></p>
          <p><strong>Click</strong> per selezionare la riga sorgente. Poi tieni <strong>Shift</strong> e trascina per stirare.</p>
          <p className="hint-small">Shift+trascina su = stretch verso l'alto<br/>Shift+trascina giù = stretch verso il basso<br/>ESC = deseleziona</p>
        </div>
      )}

      {tool === 'stretch-column' && (
        <div className="stretch-hint">
          <p><strong>Stretch da Colonna</strong></p>
          <p><strong>Click</strong> per selezionare la colonna sorgente. Poi tieni <strong>Shift</strong> e trascina per stirare.</p>
          <p className="hint-small">Shift+trascina sinistra = stretch a sinistra<br/>Shift+trascina destra = stretch a destra<br/>ESC = deseleziona</p>
        </div>
      )}

      {tool === 'stretch-warp' && (
        <div className="stretch-hint">
          <p><strong>Stretch Warp</strong></p>
          <p>Seleziona un'area rettangolare, poi trascina per distorcere. Si genera un nuovo layer con solo i pixel distorti.</p>
          <p className="hint-small">Come il Free Transform di Photoshop: i pixel si distorcono in base alla selezione e alla direzione.</p>
        </div>
      )}

      {tool === 'warp-grid' && (
        <div className="stretch-hint">
          <p><strong>Warp Griglia 3x3</strong></p>
          <p>Trascina i punti di controllo per deformare. Clicca "Applica Warp" per generare un nuovo layer con la distorsione.</p>
          <p className="hint-small">Doppio click su un punto per resettarlo. Ogni punto controlla una zona locale.</p>
        </div>
      )}

      {isZoom && (
        <div className="stretch-hint">
          <p><strong>Lente di Ingrandimento</strong></p>
          <p>Clicca per ingrandire, Alt+click per rimpicciolire.</p>
          <p className="hint-small">Ctrl+Scroll = zoom graduale<br/>Ctrl+0 = reset vista</p>
        </div>
      )}

      {isMove && (
        <div className="stretch-hint">
          <p><strong>Sposta Vista</strong></p>
          <p>Trascina per spostare la vista della foto.</p>
          <p className="hint-small">Frecce direzionali = sposta di 50px<br/>Shift+frecce = sposta di 10px</p>
        </div>
      )}
    </div>
  )
}