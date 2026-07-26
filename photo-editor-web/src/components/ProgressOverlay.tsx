import { useStore } from '../state/store'

export function ProgressOverlay() {
  const { isProcessing, processingLabel, processingProgress } = useStore()

  if (!isProcessing) return null

  return (
    <div className="progress-overlay">
      <div className="progress-dialog">
        <div className="progress-label">{processingLabel}</div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.max(0, Math.min(100, processingProgress))}%` }}
          />
        </div>
        <div className="progress-percent">{Math.round(processingProgress)}%</div>
      </div>
    </div>
  )
}
