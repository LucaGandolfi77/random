import { useCallback } from 'react'
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal'
import { useLayerStore } from '../store/layerStore'

export function useBackgroundRemoval() {
  const { setProcessing } = useLayerStore()

  const removeBackground = useCallback(
    async (sourceCanvas: HTMLCanvasElement, layerName: string) => {
      setProcessing(true, 'Scontorno in corso... scaricamento modello (prima volta ~40MB)')

      try {
        const blob = await new Promise<Blob>((resolve, reject) => {
          sourceCanvas.toBlob(
            b => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
            'image/png'
          )
        })

        setProcessing(true, 'Analisi immagine con modello AI...')

        const result = await imglyRemoveBackground(blob, {
          model: 'isnet',
          progress: (key: string, current: number, total: number) => {
            const pct = total > 0 ? Math.round((current / total) * 100) : 0
            setProcessing(true, `Scaricamento ${key}: ${pct}%`)
          },
        })

        setProcessing(true, 'Creazione layer scontornato...')

        const img = await createImageBitmap(result)
        const out = document.createElement('canvas')
        out.width = img.width
        out.height = img.height
        const ctx = out.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        setProcessing(false)
        return { canvas: out, name: `${layerName} (scontornato)` }
      } catch (err) {
        setProcessing(false)
        throw err
      }
    },
    [setProcessing]
  )

  return { removeBackground }
}
