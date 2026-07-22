import { Scissors } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'

export function BackgroundRemovalButton() {
  const { activeLayerId, layers, addLayer, isProcessing } = useLayerStore()
  const { removeBackground } = useBackgroundRemoval()

  const activeLayer = layers.find(l => l.id === activeLayerId)

  const handleClick = async () => {
    if (!activeLayer || activeLayer.locked || isProcessing) return
    try {
      const result = await removeBackground(activeLayer.canvas, activeLayer.name)
      addLayer(result.canvas, result.name)
    } catch (err) {
      console.error('Background removal failed:', err)
      alert('Scontorno fallito. Riprova.')
    }
  }

  return (
    <button
      className="btn btn-scissors"
      onClick={handleClick}
      disabled={!activeLayer || activeLayer.locked || isProcessing}
      title="Scontorna il layer attivo (offline, ~40MB modello la prima volta)"
    >
      <Scissors size={16} />
      <span>Scontorna</span>
    </button>
  )
}
