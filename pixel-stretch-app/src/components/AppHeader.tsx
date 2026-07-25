import { useRef } from 'react'
import { Download, Zap, Undo2, Redo2, RotateCcw, Maximize, Save, Upload, Blend } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'

interface AppHeaderProps {
  onResize?: () => void
  onFilter?: () => void
  onExport?: () => void
}

export function AppHeader({ onResize, onFilter, onExport }: AppHeaderProps) {
  const { layers, activeLayerId, setProcessing, historyIndex, history, undo, redo, resetAll, saveProject, loadProject } = useLayerStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <header className="app-header">
      <div className="header-brand">
        <Zap size={24} />
        <h1>Pixel Stretch</h1>
      </div>
      <div className="header-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={async e => {
            const file = e.target.files?.[0]
            if (file) {
              setProcessing(true, 'Caricamento progetto...')
              try {
                await loadProject(file)
              } catch (err) {
                window.alert(`Impossibile caricare il progetto: ${err instanceof Error ? err.message : 'file non valido'}`)
              }
              setProcessing(false)
            }
            e.target.value = ''
          }}
        />
        <button
          className="btn"
          onClick={() => fileInputRef.current?.click()}
          title="Carica progetto"
        >
          <Upload size={16} />
        </button>
        <button
          className="btn"
          onClick={saveProject}
          disabled={layers.length === 0}
          title="Salva progetto"
        >
          <Save size={16} />
        </button>
        <button
          className="btn"
          onClick={onFilter}
          disabled={!activeLayerId}
          title="Filtri immagine"
        >
          <Blend size={16} />
        </button>
        <button
          className="btn"
          onClick={onResize}
          disabled={layers.length === 0}
          title="Ridimensiona canvas"
        >
          <Maximize size={16} />
        </button>
        <button
          className="btn"
          onClick={() => { if (window.confirm('Cancellare tutto e ricominciare da capo?')) resetAll() }}
          disabled={layers.length === 0}
          title="Reset tutto"
        >
          <RotateCcw size={16} />
        </button>
        <button
          className="btn"
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Annulla (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          className="btn"
          onClick={redo}
          disabled={historyIndex < 0 || historyIndex >= history.length - 1}
          title="Ripristina (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
        <button
          className="btn btn-primary"
          onClick={onExport}
          disabled={layers.length === 0}
          title="Esporta immagine"
        >
          <Download size={16} />
          <span>Esporta</span>
        </button>
      </div>
    </header>
  )
}
