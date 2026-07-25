import { History } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'

export function HistoryPanel() {
  const history = useLayerStore(s => s.history)
  const historyIndex = useLayerStore(s => s.historyIndex)
  const jumpToHistory = useLayerStore(s => s.jumpToHistory)

  return (
    <div className="history-panel">
      <div className="panel-header">
        <h3>
          <History size={12} style={{ marginRight: 6, verticalAlign: -2 }} />
          Cronologia
        </h3>
      </div>
      <div className="history-list" role="listbox" aria-label="Cronologia modifiche">
        {history.map((entry, i) => (
          <button
            key={i}
            role="option"
            aria-selected={i === historyIndex}
            className={`history-item ${i === historyIndex ? 'active' : ''}`}
            onClick={() => jumpToHistory(i)}
            title={`Vai allo stato: ${entry.label}`}
          >
            <span className="history-index">{i}</span>
            <span className="history-label">{entry.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
