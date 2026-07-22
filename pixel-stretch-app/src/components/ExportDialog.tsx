import { useState } from 'react'
import { X, Download } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'
import { compositeLayers } from '../utils/canvas'

interface Props {
  open: boolean
  onClose: () => void
}

export function ExportDialog({ open, onClose }: Props) {
  const { layers, canvasSize, setProcessing } = useLayerStore()
  const [scale, setScale] = useState(1)

  if (!open) return null

  const handleExport = async () => {
    setProcessing(true, 'Esportazione...')
    try {
      const comp = compositeLayers(layers, canvasSize.width, canvasSize.height)
      if (scale !== 1) {
        const scaled = document.createElement('canvas')
        scaled.width = canvasSize.width * scale
        scaled.height = canvasSize.height * scale
        const ctx = scaled.getContext('2d')!
        ctx.drawImage(comp, 0, 0, scaled.width, scaled.height)
        const blob = await new Promise<Blob>((resolve, reject) => {
          scaled.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png')
        })
        downloadBlob(blob)
      } else {
        const blob = await new Promise<Blob>((resolve, reject) => {
          comp.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png')
        })
        downloadBlob(blob)
      }
    } finally {
      setProcessing(false)
      onClose()
    }
  }

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pixel-stretch-${scale}x-${Date.now()}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Esporta PNG</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label>
            Scala di esportazione:
            <select value={scale} onChange={e => setScale(Number(e.target.value))}>
              <option value={0.5}>0.5x ({canvasSize.width * 0.5} x {canvasSize.height * 0.5})</option>
              <option value={1}>1x ({canvasSize.width} x {canvasSize.height})</option>
              <option value={2}>2x ({canvasSize.width * 2} x {canvasSize.height * 2})</option>
              <option value={3}>3x ({canvasSize.width * 3} x {canvasSize.height * 3})</option>
            </select>
          </label>
          <button className="btn btn-primary btn-export" onClick={handleExport}>
            <Download size={16} /> Esporta
          </button>
        </div>
      </div>
    </div>
  )
}
