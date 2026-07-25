import { describe, it, expect } from 'vitest'
import { gaussianBlur, brightnessContrast, saturation } from '../imageFilters'

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

describe('gaussianBlur', () => {
  it('radius < 1 returns a copy of the source', () => {
    const src = createCanvas(10, 10, '#ff0000')
    const result = gaussianBlur(src, 0)
    expect(getPixel(result, 5, 5)[0]).toBe(255)
  })

  it('blurs uniform image to itself', () => {
    const src = createCanvas(20, 20, '#00ff00')
    const result = gaussianBlur(src, 2)
    const pixel = getPixel(result, 10, 10)
    expect(pixel[1]).toBe(255)
    expect(pixel[3]).toBe(255)
  })

  it('does not bleed dark halos into semi-transparent edges (premultiplied)', () => {
    // Regression: blurring non-premultiplied data mixed the RGB of fully
    // transparent pixels (black) into the edges of opaque content
    const src = createCanvas(10, 1)
    const ctx = src.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 5, 1) // 5 opaque white, 5 fully transparent
    const result = gaussianBlur(src, 1)
    const edge = getPixel(result, 4, 0)
    // Semi-transparent edge pixel: color must stay white-ish, alpha reduced
    expect(edge[3]).toBeGreaterThan(0)
    expect(edge[3]).toBeLessThan(255)
    expect(edge[0]).toBeGreaterThan(200)
  })
})

describe('brightnessContrast', () => {
  it('neutral params keep the image unchanged', () => {
    const src = createCanvas(10, 10, '#808080')
    const result = brightnessContrast(src, 0, 0)
    const pixel = getPixel(result, 5, 5)
    expect(pixel[0]).toBe(128)
    expect(pixel[1]).toBe(128)
    expect(pixel[2]).toBe(128)
  })

  it('positive brightness lightens', () => {
    const src = createCanvas(10, 10, '#808080')
    const result = brightnessContrast(src, 50, 0)
    expect(getPixel(result, 5, 5)[0]).toBeGreaterThan(128)
  })
})

describe('saturation', () => {
  it('zero saturation keeps colors', () => {
    const src = createCanvas(10, 10, '#ff0000')
    const result = saturation(src, 0)
    expect(getPixel(result, 5, 5)[0]).toBe(255)
  })

  it('-100 desaturates to gray', () => {
    const src = createCanvas(10, 10, '#ff0000')
    const result = saturation(src, -100)
    const pixel = getPixel(result, 5, 5)
    expect(pixel[0]).toBe(pixel[1])
    expect(pixel[1]).toBe(pixel[2])
  })
})
