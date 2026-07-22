import { Download, Zap } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'
import { compositeLayers } from '../utils/canvas'

export function AppHeader() {
  const { layers, canvasSize, setProcessing } = useLayerStore()

  const handleExport = async () => {
    if (layers.length === 0) return
    setProcessing(true, 'Esportazione PNG...')
    try {
      const comp = compositeLayers(layers, canvasSize.width, canvasSize.height)
      const blob = await new Promise<Blob>((resolve, reject) => {
        comp.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png')
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pixel-stretch-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <header className="app-header">
      <div className="header-brand">
        <Zap size={24} />
        <h1>Pixel Stretch</h1>
      </div>
      <div className="header-actions">
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={layers.length === 0}
        >
          <Download size={16} />
          <span>Esporta PNG</span>
        </button>
      </div>
    </header>
  )
}
