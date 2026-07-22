import { useCallback, useRef } from 'react'
import { Upload } from 'lucide-react'
import { useLayerStore } from '../store/layerStore'

async function convertHeicToFile(file: File): Promise<File> {
  const { heicTo, isHeic } = await import('heic-to')
  if (!(await isHeic(file))) return file

  const jpegBlob = await heicTo({
    blob: file,
    type: 'image/jpeg',
    quality: 0.85,
  })

  const name = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
  return new File([jpegBlob], name, { type: 'image/jpeg' })
}

export function ImageUploader() {
  const { addLayer, setCanvasSize, setProcessing } = useLayerStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const rawFile = files[0]
      if (!rawFile.type.startsWith('image/') && !/\.(heic|heif)$/i.test(rawFile.name)) return

      const isHeicFile = /\.(heic|heif)$/i.test(rawFile.name) || rawFile.type === 'image/heic' || rawFile.type === 'image/heif'

      let file = rawFile
      if (isHeicFile) {
        setProcessing(true, 'Conversione HEIC → JPEG...')
        try {
          file = await convertHeicToFile(rawFile)
        } catch (err) {
          console.error('HEIC conversion failed:', err)
          setProcessing(false)
          alert('Conversione HEIC fallita. Riprova con un altro file.')
          return
        }
        setProcessing(false)
      }

      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        let w = img.width
        let h = img.height
        if (w > 2000 || h > 2000) {
          const scale = 2000 / Math.max(w, h)
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }
        setCanvasSize({ width: w, height: h })
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        addLayer(canvas, file.name.replace(/\.[^.]+$/, ''))
        URL.revokeObjectURL(url)
      }
      img.src = url
    },
    [addLayer, setCanvasSize, setProcessing]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      className="image-uploader"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={() => inputRef.current?.click()}
    >
      <Upload size={48} strokeWidth={1} />
      <p>Trascina un'immagine qui</p>
      <p className="uploader-hint">JPG, PNG, HEIC, HEIF — oppure clicca per sfogliare</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
