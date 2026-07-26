import { Point, Layer, LineLayer, ImageLayer } from '../types'
import { distance, distanceSq } from './coordinates'

const HANDLE_RADIUS_SCREEN = 8

export function hitTestLayers(
  point: Point,
  layers: Layer[],
  zoom: number,
): Layer | null {
  const handleThreshold = HANDLE_RADIUS_SCREEN / zoom

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    if (!layer.visible) continue

    if (layer.type === 'image') {
      if (hitTestImageLayer(point, layer)) return layer
    } else if (layer.type === 'line') {
      if (hitTestLineBody(point, layer, handleThreshold)) return layer
    }
  }
  return null
}

function hitTestImageLayer(point: Point, layer: ImageLayer): boolean {
  const w = layer.bitmap.width * layer.scaleX
  const h = layer.bitmap.height * layer.scaleY
  return (
    point.x >= layer.x &&
    point.x <= layer.x + w &&
    point.y >= layer.y &&
    point.y <= layer.y + h
  )
}

function hitTestLineBody(point: Point, layer: LineLayer, threshold: number): boolean {
  return pointToLineDist(point, layer.start, layer.end) <= threshold
}

function pointToLineDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return distance(p, a)

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  const projX = a.x + t * dx
  const projY = a.y + t * dy
  return distance(p, { x: projX, y: projY })
}

export function hitTestLineHandle(
  point: Point,
  layer: LineLayer,
  zoom: number,
): 'start' | 'end' | 'warp' | null {
  const threshold = HANDLE_RADIUS_SCREEN / zoom

  if (distanceSq(point, layer.start) < threshold * threshold) return 'start'
  if (distanceSq(point, layer.end) < threshold * threshold) return 'end'
  if (layer.warp.enabled && distanceSq(point, layer.warp.control) < threshold * threshold) return 'warp'

  return null
}
