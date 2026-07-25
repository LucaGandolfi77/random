const TIMEOUT_MS = 30000

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (v: ImageData) => void; reject: (e: Error) => void }>()
const timeouts = new Map<number, ReturnType<typeof setTimeout>>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent) => {
      const { id, imageData, error } = e.data
      clearTimeout(timeouts.get(id))
      timeouts.delete(id)

      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      if (error) p.reject(new Error(error))
      else p.resolve(imageData)
    }
    worker.onerror = (e) => {
      // Worker-level error: reject all pending and create a new worker
      for (const [id, p] of pending) {
        clearTimeout(timeouts.get(id))
        p.reject(new Error(`Worker error: ${e.message}`))
      }
      pending.clear()
      timeouts.clear()
      worker!.terminate()
      worker = null
    }
  }
  return worker
}

export async function runEffect(
  fn: string,
  sourceCanvas: HTMLCanvasElement,
  ...args: any[]
): Promise<ImageData> {
  const ctx = sourceCanvas.getContext('2d')!
  const sourceData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)

  const id = nextId++
  const w = getWorker()

  return new Promise<ImageData>((resolve, reject) => {
    pending.set(id, { resolve, reject })

    const tid = setTimeout(() => {
      pending.delete(id)
      timeouts.delete(id)
      reject(new Error(`Worker timeout (${TIMEOUT_MS}ms) for ${fn}`))
    }, TIMEOUT_MS)
    timeouts.set(id, tid)

    try {
      w.postMessage(
        {
          id,
          fn,
          sourceData,
          width: sourceCanvas.width,
          height: sourceCanvas.height,
          args,
        },
        [sourceData.data.buffer]
      )
    } catch (err) {
      clearTimeout(tid)
      pending.delete(id)
      timeouts.delete(id)
      reject(new Error(`postMessage failed: ${err}`))
    }
  })
}

export function createResultCanvas(imageData: ImageData, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return canvas
}
