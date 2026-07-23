import { Scissors, Sparkles } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import { useBackgroundRemovalTransformers } from '../hooks/useBackgroundRemovalTransformers'

export function BackgroundRemovalSection() {
  const { activeLayerId, layers, addLayer, isProcessing } = useLayerStore()
  const { removeBackground: removeFast } = useBackgroundRemoval()
  const { removeBackground: removePrecise } = useBackgroundRemovalTransformers()

  const activeLayer = layers.find(l => l.id === activeLayerId)

  const handleFast = async () => {
    if (!activeLayer || activeLayer.locked || isProcessing) return
    try {
      const result = await removeFast(activeLayer.canvas, activeLayer.name)
      if (result) addLayer(result.canvas, result.name)
    } catch (err) {
      console.error('Background removal (imgly) failed:', err)
      alert('Scontorno rapido fallito. Riprova con "Preciso".')
    }
  }

  const handlePrecise = async () => {
    if (!activeLayer || activeLayer.locked || isProcessing) return
    try {
      const result = await removePrecise(activeLayer.canvas, activeLayer.name)
      if (result) addLayer(result.canvas, result.name)
    } catch (err) {
      console.error('Background removal (transformers) failed:', err)
      alert('Scontorno preciso fallito. Verifica la connessione o riprova con "Rapido".')
    }
  }

  return (
    <div className="bg-removal-section">
      <div className="section-header">
        <h3>Scontorno</h3>
      </div>
      <div className="bg-removal-buttons">
        <button
          className="btn btn-removal"
          onClick={handleFast}
          disabled={!activeLayer || activeLayer.locked || isProcessing}
          title="@imgly IS-Net (~40MB, offline, AGPL)"
        >
          <Scissors size={16} />
          <span>Rapido</span>
          <small>imgly</small>
        </button>
        <button
          className="btn btn-removal btn-removal-ai"
          onClick={handlePrecise}
          disabled={!activeLayer || activeLayer.locked || isProcessing}
          title="Transformers.js ormbg (~44MB, Apache 2.0)"
        >
          <Sparkles size={16} />
          <span>Preciso</span>
          <small>AI</small>
        </button>
      </div>
    </div>
  )
}
