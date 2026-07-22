import {
  MousePointer2,
  StretchHorizontal,
  AlignVerticalSpaceAround,
  Move,
  Grid3x3,
  Waypoints,
  Search,
} from 'lucide-react'
import { useLayerStore } from '../store/layerStore'
import type { Tool } from '../types'

const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: 'select', label: 'Seleziona', icon: <MousePointer2 size={18} /> },
  { id: 'move', label: 'Muovi', icon: <Move size={18} /> },
  { id: 'zoom', label: 'Zoom', icon: <Search size={18} /> },
  { id: 'stretch-radial', label: 'Stretch Radiale', icon: <StretchHorizontal size={18} /> },
  { id: 'stretch-row', label: 'Stretch Riga', icon: <AlignVerticalSpaceAround size={18} /> },
  { id: 'stretch-warp', label: 'Stretch Warp', icon: <Waypoints size={18} /> },
  { id: 'warp-grid', label: 'Warp Griglia', icon: <Grid3x3 size={18} /> },
]

export function ToolBar() {
  const { tool, setTool } = useLayerStore()

  return (
    <div className="toolbar">
      <div className="tool-group">
        {tools.map(t => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => setTool(t.id)}
            title={t.label}
          >
            {t.icon}
            <span className="tool-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}