import { applyGridWarpPixels } from './gridWarp'
import { twirlEffectPixels } from './pixelStretch'
import { gaussianBlurPixels } from './imageFilters'

type FnMap = Record<string, (...args: any[]) => Uint8ClampedArray>

const fns: FnMap = {
  applyGridWarp: (srcPixels, w, h, gridPoints, blendMode) =>
    applyGridWarpPixels(srcPixels, w, h, gridPoints, blendMode),
  twirlEffect: (srcPixels, w, h, cx, cy, intensity, blendMode, radius) =>
    twirlEffectPixels(srcPixels, w, h, cx, cy, intensity, blendMode, radius),
  gaussianBlur: (srcPixels, w, h, radius) =>
    gaussianBlurPixels(srcPixels, w, h, radius),
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
    const effectFn = fns[fn]
    if (!effectFn) {
      self.postMessage({ id, error: `Unknown function: ${fn}` })
      return
    }

    const resultPixels = effectFn(sourceData.data, width, height, ...args)
    const imageData = new ImageData(resultPixels.slice(), width, height)
    ;(self as any).postMessage({ id, imageData, width, height }, [imageData.data.buffer])
  } catch (err) {
    self.postMessage({ id, error: String(err) })
  }
}
