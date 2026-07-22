import { describe, it, expect } from 'vitest'
import { getDefaultGridPoints, applyGridWarp } from '../gridWarp'

function createCanvas(w: number, h: number, fill?: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  if (fill) {
    const ctx = c.getContext('2d')!
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, w, h)
  }
  return c
}

function getPixel(c: HTMLCanvasElement, x: number, y: number): [number, number, number, number] {
  const ctx = c.getContext('2d')!
  const data = ctx.getImageData(x, y, 1, 1).data
  return [data[0], data[1], data[2], data[3]]
}

describe('getDefaultGridPoints', () => {
  it('returns 16 points (4x4 grid)', () => {
    const points = getDefaultGridPoints(800, 600)
    expect(points).toHaveLength(16)
  })

  it('first point is (0, 0)', () => {
    const points = getDefaultGridPoints(800, 600)
    expect(points[0]).toEqual({ x: 0, y: 0 })
  })

  it('last point is (width, height)', () => {
    const points = getDefaultGridPoints(800, 600)
    expect(points[15]).toEqual({ x: 800, y: 600 })
  })

  it('points are evenly spaced', () => {
    const points = getDefaultGridPoints(800, 600)
    expect(points[1].x).toBeCloseTo(800 / 3)
    expect(points[1].y).toBeCloseTo(0)
    expect(points[4].x).toBeCloseTo(0)
    expect(points[4].y).toBeCloseTo(600 / 3)
  })

  it('corners match expected positions', () => {
    const points = getDefaultGridPoints(800, 600)
    expect(points[0]).toEqual({ x: 0, y: 0 })
    expect(points[15]).toEqual({ x: 800, y: 600 })
  })
})

describe('applyGridWarp', () => {
  it('default grid produces same result as source', () => {
    const src = createCanvas(100, 100, '#ff0000')
    const points = getDefaultGridPoints(100, 100)
    const result = applyGridWarp(src, points)
    const pixel = getPixel(result, 50, 50)
    expect(pixel[0]).toBe(255)
    expect(pixel[3]).toBe(255)
  })

  it('deformed grid moves pixels', () => {
    const src = createCanvas(100, 100, '#ff0000')
    const points = getDefaultGridPoints(100, 100)
    points[5] = { x: 80, y: 30 }
    const result = applyGridWarp(src, points)
    const pixel = getPixel(result, 50, 50)
    expect(pixel[3]).toBe(255)
  })

  it('transparent source produces transparent result', () => {
    const src = createCanvas(100, 100)
    const points = getDefaultGridPoints(100, 100)
    const result = applyGridWarp(src, points)
    const pixel = getPixel(result, 50, 50)
    expect(pixel[3]).toBe(0)
  })

  it('preserves colors through warp', () => {
    const src = createCanvas(100, 100)
    const ctx = src.getContext('2d')!
    ctx.fillStyle = '#0000ff'
    ctx.fillRect(0, 0, 100, 100)
    const points = getDefaultGridPoints(100, 100)
    const result = applyGridWarp(src, points)
    const pixel = getPixel(result, 50, 50)
    expect(pixel[2]).toBe(255)
  })

  it('dissolve mode produces binary alpha', () => {
    const src = createCanvas(100, 100, '#ff0000')
    const points = getDefaultGridPoints(100, 100)
    const result = applyGridWarp(src, points, 'dissolve')
    const pixel = getPixel(result, 50, 50)
    expect(pixel[3] === 0 || pixel[3] === 255).toBe(true)
  })
})
