import { useRef, useState } from 'react'
import {
  Upload,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { useStore } from '../state/store'
import { ExportFormat, ExportScale, exportImage } from '../export/exportImage'

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const openImage = useStore(s => s.openImage)
  const undo = useStore(s => s.undo)
  const redo = useStore(s => s.redo)
  const zoomTo = useStore(s => s.zoomTo)
  const fitToCanvas = useStore(s => s.fitToCanvas)
  const viewport = useStore(s => s.viewport)
  const doc = useStore(s => s.document)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
  const [exportScale, setExportScale] = useState<ExportScale>(1)
  const [exportQuality, setExportQuality] = useState(0.92)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) openImage(file)
    e.target.value = ''
  }

  async function handleExport() {
    const state = useStore.getState()
    if (!state.document) return

    const blob = await exportImage(state, {
      format: exportFormat,
      quality: exportQuality,
      scale: exportScale,
    })

    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export.${exportFormat}`
      a.click()
      URL.revokeObjectURL(url)
    }

    setShowExportMenu(false)
  }

  return (
    <div className="topbar">
      <div className="topbar-section">
        <span className="app-title">PhotoEditor</span>
      </div>

      <div className="topbar-section">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          className="topbar-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Apri immagine"
        >
          <Upload size={18} />
          <span>Apri</span>
        </button>

        <div className="export-wrapper">
          <button
            className="topbar-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!doc}
            title="Esporta"
          >
            <Download size={18} />
            <span>Esporta</span>
          </button>
          {showExportMenu && (
            <div className="export-menu">
              <label>Formato</label>
              <select
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value as ExportFormat)}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
              </select>

              <label>Scala</label>
              <select
                value={exportScale}
                onChange={e => setExportScale(Number(e.target.value) as ExportScale)}
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
              </select>

              {exportFormat === 'jpeg' && (
                <>
                  <label>Qualità</label>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.02}
                    value={exportQuality}
                    onChange={e => setExportQuality(Number(e.target.value))}
                  />
                  <span>{Math.round(exportQuality * 100)}%</span>
                </>
              )}

              <button className="topbar-btn" onClick={handleExport}>
                Scarica
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="topbar-section">
        <button className="topbar-btn" onClick={undo} title="Annulla (Ctrl+Z)">
          <Undo2 size={18} />
        </button>
        <button className="topbar-btn" onClick={redo} title="Ripristina (Ctrl+Shift+Z)">
          <Redo2 size={18} />
        </button>
      </div>

      <div className="topbar-section">
        <button
          className="topbar-btn"
          onClick={() => zoomTo(viewport.zoom * 1.2)}
          title="Ingrandisci"
        >
          <ZoomIn size={18} />
        </button>
        <span className="zoom-label">{Math.round(viewport.zoom * 100)}%</span>
        <button
          className="topbar-btn"
          onClick={() => zoomTo(viewport.zoom / 1.2)}
          title="Riduci"
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="topbar-btn"
          onClick={() => zoomTo(1)}
          title="100%"
        >
          <Minimize2 size={18} />
        </button>
        <button
          className="topbar-btn"
          onClick={() => {
            const canvas = document.querySelector('canvas')
            if (canvas) {
              const rect = canvas.getBoundingClientRect()
              fitToCanvas(rect.width, rect.height)
            }
          }}
          title="Adatta allo schermo"
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  )
}
