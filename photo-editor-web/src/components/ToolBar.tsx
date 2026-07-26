import { MousePointer2, PenLine, Hand } from 'lucide-react'
import { useStore } from '../state/store'
import { Tool } from '../types'

const tools: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
  { id: 'move', icon: MousePointer2, label: 'Sposta' },
  { id: 'line', icon: PenLine, label: 'Linea' },
  { id: 'pan', icon: Hand, label: 'Mano' },
]

export function ToolBar() {
  const activeTool = useStore(s => s.activeTool)
  const setTool = useStore(s => s.setTool)

  return (
    <div className="toolbar">
      {tools.map(t => (
        <button
          key={t.id}
          className={`toolbar-btn ${activeTool === t.id ? 'active' : ''}`}
          onClick={() => setTool(t.id)}
          title={t.label}
        >
          <t.icon size={20} />
        </button>
      ))}
    </div>
  )
}
