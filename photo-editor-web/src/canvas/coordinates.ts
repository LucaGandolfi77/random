import { Point, Viewport } from '../types'

export function docToScreen(docX: number, docY: number, vp: Viewport): Point {
  return {
    x: docX * vp.zoom + vp.offsetX,
    y: docY * vp.zoom + vp.offsetY,
  }
}

export function screenToDoc(screenX: number, screenY: number, vp: Viewport): Point {
  return {
    x: (screenX - vp.offsetX) / vp.zoom,
    y: (screenY - vp.offsetY) / vp.zoom,
  }
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function distanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}
