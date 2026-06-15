import { useStreamerStore } from '../store/streamerStore'

export function ConnectionStatus() {
  const { connectionQuality, latency } = useStreamerStore()

  const qualityColors = {
    excellent: 'bg-green-500',
    good: 'bg-yellow-500',
    poor: 'bg-orange-500',
    disconnected: 'bg-red-500'
  }

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2">
      <div className={`h-3 w-3 rounded-full ${qualityColors[connectionQuality]}`} />
      <span className="text-sm font-medium capitalize">{connectionQuality}</span>
      {latency > 0 && <span className="text-xs text-slate-400">{latency}ms</span>}
    </div>
  )
}