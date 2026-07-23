import { radialStretch, radialStretchFull, rowStretch, columnStretch, selectionWarp, mirrorStretch, twirlEffect } from './pixelStretch'
import { applyGridWarp } from './gridWarp'

type FnMap = Record<string, (canvas: HTMLCanvasElement, ...args: any[]) => HTMLCanvasElement>

const fns: FnMap = {
  radialStretch,
  radialStretchFull,
  rowStretch,
  columnStretch,
  selectionWarp,
  mirrorStretch,
  twirlEffect,
  applyGridWarp,
}

self.onmessage = (e: MessageEvent) => {
  const { id, fn, sourceData, width, height, args } = e.data as {
    id: number
    fn: string
    sourceData: ImageData
    width: number
    height: number
    args: any[]
  }

  try {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(sourceData, 0, 0)

    const effectFn = fns[fn]
    if (!effectFn) {
      self.postMessage({ id, error: `Unknown function: ${fn}` })
      return
    }

    const result = effectFn(canvas as any, ...args)
    const rCtx = result.getContext('2d')!
    const imageData = rCtx.getImageData(0, 0, result.width, result.height)
    ;(self as any).postMessage({ id, imageData, width: result.width, height: result.height }, [imageData.data.buffer])
  } catch (err) {
    self.postMessage({ id, error: String(err) })
  }
}
