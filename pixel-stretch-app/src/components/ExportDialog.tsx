import { useState } from 'react'
import { X, Download } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'
import { compositeLayers } from '../utils/canvas'

type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp'

const FORMAT_EXT: Record<ExportFormat, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function ExportDialog({ open, onClose }: Props) {
  const { layers, canvasSize, setProcessing } = useLayerStore()
  const [scale, setScale] = useState(1)
  const [format, setFormat] = useState<ExportFormat>('image/png')
  const [quality, setQuality] = useState(92)
  const [fileName, setFileName] = useState('pixel-stretch')

  if (!open) return null

  const handleExport = async () => {
    setProcessing(true, 'Esportazione...')
    try {
      const comp = compositeLayers(layers, canvasSize.width, canvasSize.height)
      const source = scale !== 1 ? (() => {
        const scaled = document.createElement('canvas')
        scaled.width = canvasSize.width * scale
        scaled.height = canvasSize.height * scale
        const ctx = scaled.getContext('2d')!
        ctx.drawImage(comp, 0, 0, scaled.width, scaled.height)
        return scaled
      })() : comp

      const qualityParam = format === 'image/png' ? undefined : quality / 100
      const blob = await new Promise<Blob>((resolve, reject) => {
        source.toBlob(
          b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          format,
          qualityParam
        )
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName || 'pixel-stretch'}.${FORMAT_EXT[format]}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setProcessing(false)
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Esporta</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label>
            Nome file:
            <input
              type="text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              className="modal-input"
            />
          </label>
          <label>
            Formato:
            <select value={format} onChange={e => setFormat(e.target.value as ExportFormat)}>
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
            </select>
          </label>
          {format !== 'image/png' && (
            <label>
              Qualità: {quality}%
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={e => setQuality(Number(e.target.value))}
                className="modal-slider"
              />
            </label>
          )}
          <label>
            Scala:
            <select value={scale} onChange={e => setScale(Number(e.target.value))}>
              <option value={0.5}>0.5x ({Math.round(canvasSize.width * 0.5)} x {Math.round(canvasSize.height * 0.5)})</option>
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
