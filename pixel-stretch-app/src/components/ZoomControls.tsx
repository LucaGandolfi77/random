import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'

export function ZoomControls() {
  const { zoom, zoomIn, zoomOut, resetView } = useLayerStore()

  return (
    <div className="zoom-controls">
      <button className="zoom-btn" onClick={zoomOut} title="Zoom out (-)">
        <ZoomOut size={16} />
      </button>
      <span className="zoom-level">{Math.round(zoom * 100)}%</span>
      <button className="zoom-btn" onClick={zoomIn} title="Zoom in (+)">
        <ZoomIn size={16} />
      </button>
      <div className="zoom-separator" />
      <button className="zoom-btn" onClick={resetView} title="Adatta alla vista (Ctrl+0)">
        <Maximize size={16} />
      </button>
    </div>
  )
}