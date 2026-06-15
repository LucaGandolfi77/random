import { useEffect } from 'react'
import { useStreamerStore } from './store/streamerStore'
import { ControlPanel } from './components/ControlPanel'
import { MultiGrid } from './components/MultiGrid'
import { ConnectionStatus } from './components/ConnectionStatus'

function App() {
  const { mode, initialize } = useStreamerStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900">
      <ConnectionStatus />
      {mode === 'control' ? <ControlPanel /> : <MultiGrid />}
    </div>
  )
}

export default App