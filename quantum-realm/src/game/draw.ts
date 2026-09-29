import { clamp01, TAU } from './math'
import type { Vec2 } from './types'

/** Offscreen particle used for trails, sparks and decoherence dust. */
export interface Mote {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  drag: number
  glow: boolean
}

export type MoteOpts = Partial<Mote> & { speed?: number }

export class Particles {
  private items: Mote[] = []
  private cap: number

  constructor(cap = 900) {
    this.cap = cap
  }

  spawn(p: MoteOpts & { x: number; y: number }) {
    if (this.items.length >= this.cap) this.items.shift()
    const life = p.life ?? 0.6
    const mote: Mote = {
      vx: 0,
      vy: 0,
      size: 3,
      color: '#ffffff',
      drag: 0.94,
      glow: true,
      ...p,
      life,
      maxLife: p.maxLife ?? life,
    }
    delete (mote as Mote & { speed?: number }).speed
    this.items.push(mote)
  }

  burst(x: number, y: number, n: number, color: string, opts: MoteOpts = {}) {
    const speed = opts.speed ?? 120
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU
      const s = speed * (0.35 + Math.random() * 0.65)
      this.spawn({
        ...opts,
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
      })
    }
  }

  trail(x: number, y: number, color: string, size = 4, life = 0.5) {
    this.spawn({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      color,
      size,
      life,
    })
  }

  update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const m = this.items[i]
      m.life -= dt
      if (m.life <= 0) {
        this.items.splice(i, 1)
        continue
      }
      m.x += m.vx * dt
      m.y += m.vy * dt
      const d = Math.pow(m.drag, dt * 60)
      m.vx *= d
      m.vy *= d
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const m of this.items) {
      const t = clamp01(m.life / m.maxLife)
      ctx.globalAlpha = t * t
      if (m.glow) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = m.color
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.size * (0.4 + t * 0.9), 0, TAU)
        ctx.fill()
      } else {
        ctx.fillStyle = m.color
        ctx.fillRect(m.x - m.size / 2, m.y - m.size / 2, m.size, m.size)
      }
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  clear() {
    this.items.length = 0
  }

  get count() {
    return this.items.length
  }
}

export const withAlpha = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export const glowDot = (ctx: CanvasRenderingContext2D, p: Vec2, r: number, color: string, alpha = 1) => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.2)
  g.addColorStop(0, withAlpha(color, 0.95 * alpha))
  g.addColorStop(0.35, withAlpha(color, 0.35 * alpha))
  g.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(p.x, p.y, r * 3.2, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/** Rounded rectangle path, using quadratic corners for a soft look. */
export const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

/** Vertical nebula background used by every scene. */
export const drawBackdrop = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  top: string,
  bottom: string,
) => {
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 3; i++) {
    const cx = w * (0.2 + 0.3 * i) + Math.sin(t * 0.11 + i * 2.1) * w * 0.16
    const cy = h * (0.25 + 0.22 * i) + Math.cos(t * 0.09 + i) * h * 0.12
    const r = Math.max(w, h) * (0.36 + i * 0.1)
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    rg.addColorStop(0, withAlpha(top, 0.16))
    rg.addColorStop(1, withAlpha(top, 0))
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

/**
 * Distant machinery: three scrolling bands of narrow towers that parallax past
 * the playfield, so the middle distance reads as depth rather than as a void.
 */
export const drawParallax = (
  ctx: CanvasRenderingContext2D,
  w: number,
  cam: number,
  t: number,
  color: string,
  groundY: number,
) => {
  const bands = [
    { depth: 0.16, base: groundY * 0.66, spread: groundY * 0.34, gap: 46, w: 16, a: 0.16 },
    { depth: 0.34, base: groundY * 0.82, spread: groundY * 0.26, gap: 62, w: 22, a: 0.2 },
    { depth: 0.58, base: groundY * 0.97, spread: groundY * 0.18, gap: 84, w: 30, a: 0.24 },
  ]
  for (const b of bands) {
    const span = b.gap + b.w
    const off = (((-cam * b.depth - t * 3) % span) + span) % span
    ctx.save()
    ctx.globalAlpha = b.a
    ctx.fillStyle = color
    for (let x = -off; x < w + span; x += span) {
      // a fixed pseudo-random height per slot, so the skyline never marches
      const seed = Math.abs(Math.round((x + off) / span + cam * b.depth / span))
      const h = b.spread * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(seed * 2.399 + b.depth * 11)))
      ctx.fillRect(x, b.base - h, b.w, h)
    }
    ctx.restore()
  }
  // one faint horizon, at a single height, to seat the bands in the world
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(0, groundY - 60, 0, groundY)
  g.addColorStop(0, withAlpha(color, 0))
  g.addColorStop(1, withAlpha(color, 0.12))
  ctx.fillStyle = g
  ctx.fillRect(0, groundY - 60, w, 60)
  ctx.restore()
}

/** Warm pool of light where a body meets the ground. */
export const drawGroundGlow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 0.4,
) => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, withAlpha(color, alpha))
  g.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.28, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/** Trailing afterimages of a fast body. */
export class Afterimage {
  private pts: { x: number; y: number; life: number; max: number }[] = []
  private max: number
  constructor(max = 10) {
    this.max = max
  }
  push(x: number, y: number, life = 0.28) {
    this.pts.push({ x, y, life, max: life })
    if (this.pts.length > this.max) this.pts.shift()
  }
  update(dt: number) {
    for (let i = this.pts.length - 1; i >= 0; i--) {
      this.pts[i].life -= dt
      if (this.pts[i].life <= 0) this.pts.splice(i, 1)
    }
  }
  render(ctx: CanvasRenderingContext2D, r: number, color: string) {
    if (!this.pts.length) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.pts) {
      const t = clamp01(p.life / p.max)
      ctx.globalAlpha = t * t * 0.45
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * (0.35 + 0.65 * t), 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }
  get length() {
    return this.pts.length
  }
}

/** Decaying camera shake, applied around the world but never around the HUD. */
export class Shaker {
  private amount = 0
  private t = 0
  add(v: number) {
    this.amount = Math.min(1, this.amount + v)
  }
  update(dt: number) {
    this.t += dt
    this.amount = Math.max(0, this.amount - dt * 2.4)
  }
  get x() {
    return Math.sin(this.t * 61) * this.amount * 9
  }
  get y() {
    return Math.cos(this.t * 47) * this.amount * 6
  }
  get active() {
    return this.amount > 0.001
  }
}

/** Drifting specks that suggest an uncollapsed vacuum. */
export class Starfield {
  private pts: { x: number; y: number; z: number; c: string }[] = []
  constructor(count = 90, colors = ['#8b5cf6', '#22d3ee', '#ff4ecd']) {
    for (let i = 0; i < count; i++) {
      this.pts.push({
        x: Math.random(),
        y: Math.random(),
        z: 0.25 + Math.random() * 0.75,
        c: colors[i % colors.length],
      })
    }
  }
  render(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.pts) {
      const x = ((p.x * w + t * 6 * p.z) % (w + 40)) - 20
      const y = p.y * h + Math.sin(t * 0.5 + p.x * 9) * 6
      const a = 0.15 + 0.4 * p.z * (0.6 + 0.4 * Math.sin(t * 1.7 + p.y * 12))
      ctx.globalAlpha = a
      ctx.fillStyle = p.c
      ctx.beginPath()
      ctx.arc(x, y, p.z * 1.9, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }
}
