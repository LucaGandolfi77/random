import { useState, useEffect } from 'react'
import { AppHeader } from './components/AppHeader'
import { Canvas } from './components/Canvas'
import { LayerPanel } from './components/LayerPanel'
import { ToolBar } from './components/ToolBar'
import { StretchControls } from './components/StretchControls'
import { ZoomControls } from './components/ZoomControls'
import { ImageUploader } from './components/ImageUploader'
import { ExportDialog } from './components/ExportDialog'
import { BackgroundRemovalSection } from './components/BackgroundRemovalSection'
import { useLayerStore } from './store/layerStore'

function useViewportHeight() {
  useEffect(() => {
    const sync = () => {
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${h}px`)
    }
    sync()
    window.visualViewport?.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    return () => {
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])
}

export default function App() {
  useViewportHeight()
  const { layers } = useLayerStore()
  const [exportOpen, setExportOpen] = useState(false)

  return (
    <div className="app">
      <AppHeader />
      <div className="app-body">
        <div className="sidebar sidebar-left">
          <ToolBar />
          <StretchControls />
          <BackgroundRemovalSection />
        </div>

        <div className="main-area">
          {layers.length === 0 ? <ImageUploader /> : <Canvas />}
          {layers.length > 0 && <ZoomControls />}
        </div>

        <div className="sidebar sidebar-right">
          <LayerPanel />
        </div>
      </div>
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  )
}
