import { describe, it, expect } from 'vitest'
import { compositeLayers, compositeToCanvas, drawCheckerboard } from '../canvas'

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function getPixel(c: HTMLCanvasElement, x: number, y: number): [number, number, number, number] {
  const ctx = c.getContext('2d')!
  const data = ctx.getImageData(x, y, 1, 1).data
  return [data[0], data[1], data[2], data[3]]
}

describe('drawCheckerboard', () => {
  it('draws checkerboard pattern', () => {
    const c = createCanvas(20, 20)
    const ctx = c.getContext('2d')!
    drawCheckerboard(ctx, 20, 20)
    const p1 = getPixel(c, 0, 0)
    const p2 = getPixel(c, 10, 0)
    expect(p1[0]).not.toBe(p2[0])
  })
})

describe('compositeLayers', () => {
  it('composites visible layers', () => {
    const c1 = createCanvas(50, 50)
    const ctx1 = c1.getContext('2d')!
    ctx1.fillStyle = '#ff0000'
    ctx1.fillRect(0, 0, 50, 50)

    const c2 = createCanvas(50, 50)
    const ctx2 = c2.getContext('2d')!
    ctx2.fillStyle = '#0000ff'
    ctx2.fillRect(0, 0, 50, 50)

    const result = compositeLayers([
      { id: '1', name: 'L1', canvas: c1, visible: true, opacity: 1, position: { x: 0, y: 0 }, locked: false, width: 50, height: 50 },
      { id: '2', name: 'L2', canvas: c2, visible: true, opacity: 1, position: { x: 0, y: 0 }, locked: false, width: 50, height: 50 },
    ], 50, 50)

    const pixel = getPixel(result, 25, 25)
    expect(pixel[2]).toBe(255)
  })

  it('skips invisible layers', () => {
    const c1 = createCanvas(50, 50)
    const ctx1 = c1.getContext('2d')!
    ctx1.fillStyle = '#ff0000'
    ctx1.fillRect(0, 0, 50, 50)

    const result = compositeLayers([
      { id: '1', name: 'L1', canvas: c1, visible: false, opacity: 1, position: { x: 0, y: 0 }, locked: false, width: 50, height: 50 },
    ], 50, 50)

    const pixel = getPixel(result, 25, 25)
    expect(pixel[3]).toBe(0)
  })

  it('handles empty layers', () => {
    const result = compositeLayers([], 50, 50)
    expect(result).toBeDefined()
  })
})

describe('compositeToCanvas', () => {
  it('draws layers onto target canvas', () => {
    const target = createCanvas(50, 50)
    const c1 = createCanvas(50, 50)
    const ctx1 = c1.getContext('2d')!
    ctx1.fillStyle = '#00ff00'
    ctx1.fillRect(0, 0, 50, 50)

    compositeToCanvas([
      { id: '1', name: 'L1', canvas: c1, visible: true, opacity: 1, position: { x: 0, y: 0 }, locked: false, width: 50, height: 50 },
    ], target)

    const pixel = getPixel(target, 25, 25)
    expect(pixel[1]).toBe(255)
  })

  it('respects layer order (last on top)', () => {
    const target = createCanvas(50, 50)
    const c1 = createCanvas(50, 50)
    const ctx1 = c1.getContext('2d')!
    ctx1.fillStyle = '#ff0000'
    ctx1.fillRect(0, 0, 50, 50)

    const c2 = createCanvas(50, 50)
    const ctx2 = c2.getContext('2d')!
    ctx2.fillStyle = '#0000ff'
    ctx2.fillRect(0, 0, 50, 50)

    compositeToCanvas([
      { id: '1', name: 'L1', canvas: c1, visible: true, opacity: 1, position: { x: 0, y: 0 }, locked: false, width: 50, height: 50 },
      { id: '2', name: 'L2', canvas: c2, visible: true, opacity: 1, position: { x: 0, y: 0 }, locked: false, width: 50, height: 50 },
    ], target)

    const pixel = getPixel(target, 25, 25)
    expect(pixel[2]).toBe(255)
  })
})
