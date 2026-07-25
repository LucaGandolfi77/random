import { describe, it, expect } from 'vitest'
import { radialStretch, rowStretch, columnStretch, selectionWarp, twirlEffect, easedFactor } from '../pixelStretch'

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

describe('radialStretch', () => {
  let src: HTMLCanvasElement

  beforeEach(() => {
    src = createCanvas(100, 100, '#ff0000')
  })

  it('creates transparent canvas (no source copy)', () => {
    const result = radialStretch(src, 50, 50, 0, 0)
    const center = getPixel(result, 0, 0)
    expect(center[3]).toBe(0)
  })

  it('returns transparent when stretch is zero', () => {
    const result = radialStretch(src, 50, 50, 0, 0)
    const center = getPixel(result, 50, 50)
    expect(center[3]).toBe(0)
  })

  it('creates horizontal stretch lines from center', () => {
    const result = radialStretch(src, 50, 50, 30, 0)
    const pixel = getPixel(result, 60, 50)
    expect(pixel[3]).toBeGreaterThan(0)
    expect(pixel[0]).toBe(255)
  })

  it('creates vertical stretch lines from center', () => {
    const result = radialStretch(src, 50, 50, 0, 30)
    const pixel = getPixel(result, 50, 60)
    expect(pixel[3]).toBeGreaterThan(0)
    expect(pixel[0]).toBe(255)
  })

  it('creates both horizontal and vertical stretch', () => {
    const result = radialStretch(src, 50, 50, 20, 20)
    const h = getPixel(result, 60, 50)
    const v = getPixel(result, 50, 60)
    expect(h[3]).toBeGreaterThan(0)
    expect(v[3]).toBeGreaterThan(0)
  })

  it('returns transparent when center is out of bounds', () => {
    const result = radialStretch(src, -10, -10, 50, 50)
    const pixel = getPixel(result, 0, 0)
    expect(pixel[3]).toBe(0)
  })

  it('alpha decreases with distance from center', () => {
    const result = radialStretch(src, 50, 50, 40, 0)
    const near = getPixel(result, 55, 50)
    const far = getPixel(result, 85, 50)
    expect(near[3]).toBeGreaterThan(far[3])
  })

  it('uses source pixel color for stretch', () => {
    const red = createCanvas(100, 100, '#ff0000')
    const result = radialStretch(red, 50, 50, 30, 0)
    const pixel = getPixel(result, 60, 50)
    expect(pixel[0]).toBe(255)
    expect(pixel[1]).toBe(0)
    expect(pixel[2]).toBe(0)
  })

  it('dissolve mode produces binary alpha', () => {
    const result = radialStretch(src, 50, 50, 30, 0, 'dissolve')
    const pixel = getPixel(result, 60, 50)
    expect(pixel[3] === 0 || pixel[3] === 255).toBe(true)
  })
})

describe('rowStretch', () => {
  let src: HTMLCanvasElement

  beforeEach(() => {
    src = createCanvas(100, 100)
    const ctx = src.getContext('2d')!
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(0, 50, 100, 1)
  })

  it('creates transparent canvas', () => {
    const result = rowStretch(src, 50, 0, 0)
    const pixel = getPixel(result, 0, 0)
    expect(pixel[3]).toBe(0)
  })

  it('returns transparent when stretch is zero', () => {
    const result = rowStretch(src, 50, 0, 0)
    const pixel = getPixel(result, 50, 40)
    expect(pixel[3]).toBe(0)
  })

  it('stretches upward', () => {
    const result = rowStretch(src, 50, 20, 0)
    const pixel = getPixel(result, 50, 40)
    expect(pixel[3]).toBeGreaterThan(0)
    expect(pixel[1]).toBe(255)
  })

  it('stretches downward', () => {
    const result = rowStretch(src, 50, 0, 20)
    const pixel = getPixel(result, 50, 60)
    expect(pixel[3]).toBeGreaterThan(0)
    expect(pixel[1]).toBe(255)
  })

  it('stretches both directions', () => {
    const result = rowStretch(src, 50, 15, 15)
    const up = getPixel(result, 50, 40)
    const down = getPixel(result, 50, 60)
    expect(up[3]).toBeGreaterThan(0)
    expect(down[3]).toBeGreaterThan(0)
  })

  it('alpha decreases with distance from row', () => {
    const result = rowStretch(src, 50, 30, 0)
    const near = getPixel(result, 50, 45)
    const far = getPixel(result, 50, 25)
    expect(near[3]).toBeGreaterThan(far[3])
  })

  it('uses source pixel color per column', () => {
    const c = createCanvas(100, 100)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#0000ff'
    ctx.fillRect(0, 50, 100, 1)
    const result = rowStretch(c, 50, 10, 0)
    const pixel = getPixel(result, 50, 45)
    expect(pixel[2]).toBe(255)
  })

  it('dissolve mode produces binary alpha', () => {
    const result = rowStretch(src, 50, 20, 0, 'dissolve')
    const pixel = getPixel(result, 50, 40)
    expect(pixel[3] === 0 || pixel[3] === 255).toBe(true)
  })
})

describe('columnStretch', () => {
  let src: HTMLCanvasElement

  beforeEach(() => {
    src = createCanvas(100, 100)
    const ctx = src.getContext('2d')!
    ctx.fillStyle = '#ff00ff'
    ctx.fillRect(50, 0, 1, 100)
  })

  it('creates transparent canvas', () => {
    const result = columnStretch(src, 50, 0, 0)
    const pixel = getPixel(result, 0, 0)
    expect(pixel[3]).toBe(0)
  })

  it('returns transparent when stretch is zero', () => {
    const result = columnStretch(src, 50, 0, 0)
    const pixel = getPixel(result, 40, 50)
    expect(pixel[3]).toBe(0)
  })

  it('stretches left', () => {
    const result = columnStretch(src, 50, 20, 0)
    const pixel = getPixel(result, 40, 50)
    expect(pixel[3]).toBeGreaterThan(0)
    expect(pixel[0]).toBe(255)
  })

  it('stretches right', () => {
    const result = columnStretch(src, 50, 0, 20)
    const pixel = getPixel(result, 60, 50)
    expect(pixel[3]).toBeGreaterThan(0)
    expect(pixel[0]).toBe(255)
  })

  it('stretches both directions', () => {
    const result = columnStretch(src, 50, 15, 15)
    const left = getPixel(result, 40, 50)
    const right = getPixel(result, 60, 50)
    expect(left[3]).toBeGreaterThan(0)
    expect(right[3]).toBeGreaterThan(0)
  })

  it('alpha decreases with distance from column', () => {
    const result = columnStretch(src, 50, 30, 0)
    const near = getPixel(result, 45, 50)
    const far = getPixel(result, 25, 50)
    expect(near[3]).toBeGreaterThan(far[3])
  })

  it('uses source pixel color per row', () => {
    const c = createCanvas(100, 100)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#ffff00'
    ctx.fillRect(50, 0, 1, 100)
    const result = columnStretch(c, 50, 10, 0)
    const pixel = getPixel(result, 45, 50)
    expect(pixel[0]).toBe(255)
    expect(pixel[1]).toBe(255)
  })

  it('dissolve mode produces binary alpha', () => {
    const result = columnStretch(src, 50, 20, 0, 'dissolve')
    const pixel = getPixel(result, 40, 50)
    expect(pixel[3] === 0 || pixel[3] === 255).toBe(true)
  })
})

describe('selectionWarp', () => {
  let src: HTMLCanvasElement

  beforeEach(() => {
    src = createCanvas(100, 100, '#ff0000')
  })

  it('creates transparent canvas', () => {
    const result = selectionWarp(src, 20, 20, 60, 60, 0, 0)
    const pixel = getPixel(result, 0, 0)
    expect(pixel[3]).toBe(0)
  })

  it('returns transparent when selection invalid', () => {
    const result = selectionWarp(src, 20, 20, 0, 0, 10, 10)
    const pixel = getPixel(result, 30, 30)
    expect(pixel[3]).toBe(0)
  })

  it('returns transparent when drag too small', () => {
    const result = selectionWarp(src, 20, 20, 60, 60, 1, 1)
    const pixel = getPixel(result, 30, 30)
    expect(pixel[3]).toBe(0)
  })

  it('warps pixels within selection', () => {
    const result = selectionWarp(src, 20, 20, 60, 60, 20, 0)
    const pixel = getPixel(result, 40, 40)
    expect(pixel[3]).toBeGreaterThan(0)
    expect(pixel[0]).toBe(255)
  })

  it('pixels outside selection are transparent', () => {
    const result = selectionWarp(src, 20, 20, 60, 60, 20, 0)
    const outside = getPixel(result, 5, 5)
    expect(outside[3]).toBe(0)
  })

  it('dissolve mode produces binary alpha', () => {
    const result = selectionWarp(src, 20, 20, 60, 60, 20, 0, 'dissolve')
    const pixel = getPixel(result, 40, 40)
    expect(pixel[3] === 0 || pixel[3] === 255).toBe(true)
  })

  it('far edge of selection receives the full drag offset', () => {
    // Regression: (px - sx) / sw never reached 1, so the far edge moved ~20% less
    const c = createCanvas(100, 100)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(44, 52, 1, 1)
    const result = selectionWarp(c, 50, 50, 5, 5, 10, 0)
    // Far edge pixel (54) must sample from 54 - 10 = 44
    const pixel = getPixel(result, 54, 52)
    expect(pixel[0]).toBe(255)
    expect(pixel[3]).toBe(255)
  })
})

describe('edge regression tests', () => {
  it('rowStretch beyond top edge keeps edge pixel strong (no clamp overwrite)', () => {
    // Regression: clamp-to-edge writes overwrote the edge pixel with the
    // lowest alpha, making the stretch line vanish at the canvas border
    const src = createCanvas(100, 100)
    const ctx = src.getContext('2d')!
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(0, 5, 100, 1)
    const result = rowStretch(src, 5, 50, 0)
    const edge = getPixel(result, 50, 0)
    expect(edge[3]).toBeGreaterThan(200)
    expect(edge[1]).toBe(255)
  })

  it('columnStretch beyond left edge keeps edge pixel strong', () => {
    const src = createCanvas(100, 100)
    const ctx = src.getContext('2d')!
    ctx.fillStyle = '#ff00ff'
    ctx.fillRect(5, 0, 1, 100)
    const result = columnStretch(src, 5, 50, 0)
    const edge = getPixel(result, 0, 50)
    expect(edge[3]).toBeGreaterThan(200)
  })

  it('dissolve mode beyond top edge does not crash (negative modulo)', () => {
    // Regression: BAYER_4X4[y % 4] with negative y threw TypeError
    const src = createCanvas(100, 100, '#ff0000')
    expect(() => rowStretch(src, 2, 50, 0, 'dissolve')).not.toThrow()
    expect(() => columnStretch(src, 2, 50, 0, 'dissolve')).not.toThrow()
    expect(() => radialStretch(src, 2, 2, 50, 50, 'dissolve')).not.toThrow()
  })

  it('rowStretch with out-of-bounds row returns transparent', () => {
    const src = createCanvas(100, 100, '#ff0000')
    const result = rowStretch(src, -5, 20, 20)
    expect(getPixel(result, 50, 50)[3]).toBe(0)
    const result2 = rowStretch(src, 150, 20, 20)
    expect(getPixel(result2, 50, 50)[3]).toBe(0)
  })

  it('columnStretch with out-of-bounds column returns transparent', () => {
    const src = createCanvas(100, 100, '#ff0000')
    const result = columnStretch(src, -5, 20, 20)
    expect(getPixel(result, 50, 50)[3]).toBe(0)
  })
})

describe('easedFactor', () => {
  it('returns full intensity for a single-step stretch', () => {
    // Regression: total === 1 produced alpha 0 (invisible effect)
    expect(easedFactor(1, 1, 'linear')).toBe(1)
    expect(easedFactor(1, 1, 'exponential')).toBe(1)
    expect(easedFactor(1, 1, 'sine')).toBeCloseTo(1)
  })

  it('decreases monotonically for linear easing', () => {
    const a = easedFactor(1, 10, 'linear')
    const b = easedFactor(5, 10, 'linear')
    const c = easedFactor(10, 10, 'linear')
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c)
  })
})

describe('twirlEffect', () => {
  it('with intensity 0 acts as identity within radius', () => {
    const src = createCanvas(60, 60, '#ff0000')
    const result = twirlEffect(src, 30, 30, 0, 'normal', 20)
    const pixel = getPixel(result, 30, 35)
    expect(pixel[0]).toBe(255)
    expect(pixel[3]).toBe(255)
  })

  it('leaves pixels outside the radius transparent', () => {
    const src = createCanvas(60, 60, '#ff0000')
    const result = twirlEffect(src, 30, 30, Math.PI, 'normal', 15)
    expect(getPixel(result, 2, 2)[3]).toBe(0)
  })

  it('rotates content near the center (classic falloff)', () => {
    // Regression: rotation used to increase with distance (inverted falloff)
    const src = createCanvas(60, 60)
    const ctx = src.getContext('2d')!
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(20, 30, 10, 1) // horizontal line left of center
    const result = twirlEffect(src, 30, 30, Math.PI, 'normal', 20)
    // Near the center the rotation is strongest: the red line must move away
    expect(getPixel(result, 28, 30)[3]).toBe(0)
  })

  it('does not crash on 1x1 canvas', () => {
    const src = createCanvas(1, 1, '#ff0000')
    expect(() => twirlEffect(src, 0, 0, 5)).not.toThrow()
    expect(() => twirlEffect(src, 0, 0, 5, 'normal', 10)).not.toThrow()
  })

  it('clamps extreme intensity', () => {
    const src = createCanvas(30, 30, '#ff0000')
    expect(() => twirlEffect(src, 15, 15, 1000, 'normal', 20)).not.toThrow()
  })
})
