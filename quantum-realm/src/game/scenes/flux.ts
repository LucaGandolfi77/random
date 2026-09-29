import { has } from '../anomalies'
import { aabb, clamp, clamp01, TAU } from '../math'
import {
  Afterimage,
  Particles,
  Shaker,
  Starfield,
  drawBackdrop,
  drawGroundGlow,
  drawParallax,
  glowDot,
  withAlpha,
} from '../draw'
import { hudBar, hudCounters } from '../hud'
import type { Scene, SceneContext, SceneState } from '../types'

/** Player footprint while waved vs. while collapsed to a particle. */
const PARTICLE = { w: 20, h: 26 }
const WAVE = { w: 54, h: 14 }
const GRAVITY = 1500
const MOVE_SPEED = 250
const JUMP_V = 780
const MAX_FALL = 900

interface Solid {
  x: number
  y: number
  w: number
  h: number
}

interface Shutter extends Solid {
  /** Shattered shutters stop blocking. */
  intact: boolean
  shake: number
}

interface Crate extends Solid {
  hp: number
  hit: number
}

interface Orb {
  x: number
  y: number
  taken: boolean
  phase: number
}

interface FluxState extends SceneState {
  move(size: { w: number; h: number }, s: SceneContext, waved: boolean): void
  p: { x: number; y: number; vx: number; vy: number; onGround: boolean }
  levelW: number
  groundY: number
  platforms: Solid[]
  shutters: Shutter[]
  crates: Crate[]
  orbs: Orb[]
  particles: Particles
  stars: Starfield
  ghost: Afterimage
  shake: Shaker
  time: number
  coherence: number
  collected: number
  waved: boolean
  /** False when a Certain Walls anomaly is in force. */
  smashable: boolean
  grounded: boolean
  cam: number
  color: string
}

const approachAxis = (current: number, target: number, maxDelta: number) =>
  current < target ? Math.min(current + maxDelta, target) : Math.max(current - maxDelta, target)

const overlaps = (px: number, py: number, w: number, h: number, o: Solid) =>
  aabb(px, py, w, h, o.x, o.y, o.w, o.h)

function create(s: SceneContext): FluxState {
  const groundY = s.height * 0.72
  const levelW = Math.max(s.width * 1.6, 2500)
  const pl = (x: number, dy: number, w: number) => ({ x, y: groundY - dy, w, h: 14 })
  return {
    p: { x: 80, y: groundY - PARTICLE.h, vx: 0, vy: 0, onGround: true },
    levelW,
    groundY,
    platforms: [
      pl(390, 100, 150),
      pl(650, 150, 130),
      pl(950, 100, 150),
      pl(1330, 170, 150),
      pl(1670, 110, 130),
      pl(1990, 190, 170),
    ],
    // full-height shutters must be phased or smashed; the raised ones have a
    // gap you can simply jump through. Walls are shapes, not just positions.
    shutters: [
      { x: 310, y: groundY - 200, w: 12, h: 200, intact: true, shake: 0 },
      { x: 830, y: groundY - 330, w: 12, h: 260, intact: true, shake: 0 },
      { x: 1190, y: groundY - 200, w: 12, h: 200, intact: true, shake: 0 },
      { x: 1570, y: groundY - 360, w: 12, h: 290, intact: true, shake: 0 },
      { x: 1890, y: groundY - 200, w: 12, h: 200, intact: true, shake: 0 },
    ],
    crates: [
      { x: 530, y: groundY - 44, w: 40, h: 44, hp: 1, hit: 0 },
      { x: 1100, y: groundY - 44, w: 40, h: 44, hp: 2, hit: 0 },
      { x: 1440, y: groundY - 44, w: 40, h: 44, hp: 1, hit: 0 },
      { x: 1770, y: groundY - 44, w: 40, h: 44, hp: 2, hit: 0 },
    ],
    orbs: [
      { x: 460, y: groundY - 125, taken: false, phase: 0 },
      { x: 715, y: groundY - 155, taken: false, phase: 1.2 },
      { x: 1020, y: groundY - 125, taken: false, phase: 2.4 },
      { x: 1400, y: groundY - 165, taken: false, phase: 0.6 },
      { x: 1730, y: groundY - 130, taken: false, phase: 1.8 },
      { x: 2075, y: groundY - 170, taken: false, phase: 3.1 },
      { x: 2270, y: groundY - 120, taken: false, phase: 2.2 },
    ],
    particles: new Particles(),
    stars: new Starfield(80, ['#8b5cf6', '#22d3ee', '#ff4ecd']),
    ghost: new Afterimage(),
    shake: new Shaker(),
    time: 0,
    coherence: 100,
    collected: 0,
    waved: false,
    smashable: true,
    grounded: true,
    cam: 0,
    color: '#8b5cf6',

    update(s2) {
      const t = s2
      const p = this.p
      const input = t.input
      const size = input.alt ? WAVE : PARTICLE

      this.time += t.dt
      // anomalies and the Recursion layer both squeeze the clock
      const drain = t.pressure * (input.alt ? 5.2 : 1.5)
      this.coherence -= t.dt * drain
      this.smashable = !has(t.run, 'certain_walls')
      if (this.coherence <= 0) {
        this.coherence = 0
        t.onLose()
        return
      }

      if (input.alt !== this.waved) {
        this.waved = input.alt
        t.audio.phase()
        this.particles.burst(
          p.x + size.w / 2,
          p.y + size.h / 2,
          input.alt ? 12 : 18,
          input.alt ? this.color : '#ffffff',
          { life: 0.45 },
        )
      }

      const targetSpeed = input.alt ? MOVE_SPEED * 0.55 : MOVE_SPEED
      const accel = input.alt ? 900 : 2400
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
      p.vx = approachAxis(p.vx, dir * targetSpeed, accel * t.dt)
      const grav = GRAVITY * (has(t.run, 'thin_air') ? 0.6 : has(t.run, 'heavy_water') ? 1.4 : 1)
      p.vy = Math.min(p.vy + grav * t.dt * (input.alt ? 0.45 : 1), MAX_FALL)

      if (input.jumpPressed && p.onGround) {
        p.vy = -JUMP_V * (input.alt ? 0.55 : 1)
        p.onGround = false
        t.audio.jump()
        this.particles.burst(p.x + size.w / 2, p.y + size.h, 8, this.color)
      }

      const impact = Math.abs(p.vx)
      this.move(size, t, input.alt)

      // edge-triggered, or the landing puff would fire on every grounded frame
      if (p.onGround && !this.grounded) {
        t.audio.blip(320, 0.06)
        this.particles.burst(p.x + size.w / 2, p.y + size.h, 6, this.color, {
          life: 0.26,
          speed: 60,
          vy: -18,
          drag: 0.86,
        })
      }
      this.grounded = p.onGround

      for (const sh of this.shutters) {
        sh.shake = Math.max(0, sh.shake - t.dt * 3)
        if (!sh.intact) continue
        // A particle resting exactly against the slats counts as touching them.
        const touching =
          p.x + size.w >= sh.x - 4 &&
          p.x <= sh.x + sh.w + 4 &&
          p.y + size.h > sh.y &&
          p.y < sh.y + sh.h
        if (!touching) continue
        if (input.alt) continue // waves slip between the slats
        // a particle with momentum shatters the shutter, unless the region
        // insists that shutters are certain
        if (impact > 120 && this.smashable) {
          sh.intact = false
          sh.shake = 1
          p.x = p.vx >= 0 ? sh.x + sh.w : sh.x - size.w
          p.vx = p.vx >= 0 ? 260 : -260
          this.particles.burst(sh.x + sh.w / 2, p.y + size.h / 2, 24, '#fda4af', { life: 0.6 })
          if (!t.calm) this.shake.add(0.55)
          t.audio.bad()
          t.addScore(40)
          t.toast('Momentum plus a hard edge. Shutters were only ever suggestions.')
        } else {
          p.x = p.vx > 0 ? sh.x - size.w : sh.x + sh.w
          p.vx = 0
        }
      }

      for (const c of this.crates) {
        c.hit = Math.max(0, c.hit - t.dt * 4)
        if (c.hp <= 0 || !overlaps(p.x, p.y, size.w, size.h, c)) continue
        if (input.alt) continue
        const fromLeft = p.x + size.w / 2 < c.x + c.w / 2
        c.hp -= 1
        c.hit = 1
        p.vx = (fromLeft ? -1 : 1) * Math.max(140, Math.abs(p.vx) * 0.4)
        t.audio.bad()
        t.addScore(30)
        this.particles.burst(p.x + size.w / 2, p.y + size.h / 2, 16, this.color, { life: 0.4 })
        if (!t.calm) this.shake.add(0.3)
        if (c.hp <= 0) {
          this.particles.burst(c.x + c.w / 2, c.y + c.h / 2, 30, '#fbbf24', {
            life: 0.7,
            speed: 240,
          })
          if (!t.calm) this.shake.add(0.45)
          t.toast('Solid things are only solid while you insist.')
        }
      }

      for (const o of this.orbs) {
        if (o.taken) continue
        const bob = Math.sin(this.time * 2 + o.phase) * 8
        if (Math.hypot(o.x - (p.x + size.w / 2), o.y + bob - (p.y + size.h / 2)) < 46) {
          o.taken = true
          this.collected++
          t.addScore(100 + Math.round(this.coherence))
          t.audio.collect()
          this.particles.burst(o.x, o.y + bob, 22, '#22d3ee', { life: 0.6, speed: 200 })
          this.ghost.push(o.x, o.y + bob, 0.3)
          t.setProgress(this.collected / this.orbs.length)
          if (this.collected === this.orbs.length) {
            t.onWin()
            return
          }
        }
      }

      this.particles.update(t.dt)
      this.ghost.update(t.dt)
      this.shake.update(t.dt)
      if (Math.abs(p.vx) > 120 && p.onGround) {
        this.ghost.push(p.x + size.w / 2, p.y + size.h / 2, 0.22)
      }
      this.particles.trail(
        p.x + size.w / 2,
        input.alt ? p.y + size.h / 2 : p.y + size.h,
        this.color,
        input.alt ? 5 : 3,
        0.4,
      )
      this.cam = clamp(p.x - t.width * 0.4, 0, Math.max(0, this.levelW - t.width))
      t.observation = clamp01(1 - this.coherence / 100)
    },

    peek() {
      const p = this.p
      return {
        x: p.x,
        y: p.y,
        onGround: p.onGround ? 1 : 0,
        collected: this.collected,
        total: this.orbs.length,
        takenCount: this.orbs.filter((o) => o.taken).length,
        // nearest mote, whichever side it is on, so the bot can backtrack
        nextOrbX: (() => {
          let best = { x: -1, y: this.p.y, d: Infinity }
          for (const o of this.orbs) {
            if (o.taken) continue
            const d = Math.abs(o.x - this.p.x)
            if (d < best.d) best = { x: o.x, y: o.y, d }
          }
          return best.x
        })(),
        nextOrbY: (() => {
          let best = { x: -1, y: this.p.y, d: Infinity }
          for (const o of this.orbs) {
            if (o.taken) continue
            const d = Math.abs(o.x - this.p.x)
            if (d < best.d) best = { x: o.x, y: o.y, d }
          }
          return best.y
        })(),
        nextCrateX: (() => {
          let best = { x: -1, d: Infinity }
          for (const c of this.crates) {
            if (c.hp <= 0) continue
            const d = Math.abs(c.x - this.p.x)
            if (d < best.d) best = { x: c.x, d }
          }
          return best.x
        })(),
        nextShutterX: (() => {
          let best = { x: -1, d: Infinity }
          for (const sh of this.shutters) {
            if (!sh.intact) continue
            const d = Math.abs(sh.x - this.p.x)
            if (d < best.d) best = { x: sh.x, d }
          }
          return best.x
        })(),
        coherence: this.coherence,
        waved: this.waved ? 1 : 0,
        canSmash: this.smashable ? 1 : 0,
      }
    },

    render(t) {
      const ctx = t.ctx
      const p = this.p
      const waved = this.waved
      const size = waved ? WAVE : PARTICLE
      const px = p.x - this.cam

      if (this.shake.active) ctx.save()
      if (this.shake.active) ctx.translate(this.shake.x, this.shake.y)

      drawBackdrop(ctx, t.width, t.height, t.time, '#1b0b45', '#05020e')
      this.stars.render(ctx, t.width, t.height, t.time)
      drawParallax(ctx, t.width, this.cam, t.time, '#3b1d7a', this.groundY)

      const groundY = this.groundY
      const g = ctx.createLinearGradient(0, groundY, 0, t.height)
      g.addColorStop(0, withAlpha(this.color, 0.42))
      g.addColorStop(0.35, withAlpha(this.color, 0.12))
      g.addColorStop(1, 'rgba(6,3,16,0.98)')
      ctx.fillStyle = g
      ctx.fillRect(0, groundY, t.width, t.height - groundY)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const lip = ctx.createLinearGradient(0, groundY - 26, 0, groundY)
      lip.addColorStop(0, withAlpha(this.color, 0))
      lip.addColorStop(1, withAlpha(this.color, 0.22))
      ctx.fillStyle = lip
      ctx.fillRect(0, groundY - 26, t.width, 26)
      ctx.restore()
      ctx.fillStyle = withAlpha(this.color, 0.95)
      ctx.fillRect(0, groundY - 2, t.width, 2)
      // tick marks along the ground give the eye a sense of speed
      ctx.fillStyle = withAlpha(this.color, 0.22)
      for (let i = 0; i * 60 < t.width + 60; i++) {
        const gx = i * 60 - ((this.cam * 0.35) % 60)
        ctx.fillRect(gx, groundY - 8, 2, 8)
      }

      for (const pl2 of this.platforms) {
        const x = pl2.x - this.cam
        if (x > t.width + 60 || x + pl2.w < -60) continue
        ctx.fillStyle = 'rgba(26,13,54,0.95)'
        ctx.fillRect(x, pl2.y, pl2.w, pl2.h)
        ctx.fillStyle = withAlpha(this.color, 0.8)
        ctx.fillRect(x, pl2.y, pl2.w, 3)
        ctx.fillStyle = withAlpha(this.color, 0.16)
        ctx.fillRect(x, pl2.y + 3, pl2.w, pl2.h - 3)
      }

      for (const sh of this.shutters) {
        const x = sh.x - this.cam
        if (x > t.width + 60 || x + sh.w < -60) continue
        if (!sh.intact) {
          ctx.strokeStyle = withAlpha('#f472b6', 0.25)
          ctx.lineWidth = 2
          ctx.setLineDash([4, 6])
          ctx.beginPath()
          ctx.moveTo(x, sh.y)
          ctx.lineTo(x + sh.w, sh.y + sh.h)
          ctx.moveTo(x + sh.w, sh.y)
          ctx.lineTo(x, sh.y + sh.h)
          ctx.stroke()
          ctx.setLineDash([])
          continue
        }
        const pulse = 0.5 + 0.22 * Math.sin(t.time * 3 + sh.x * 0.02) + sh.shake * 0.4
        ctx.fillStyle = withAlpha('#f472b6', pulse)
        for (let i = 0; i < 5; i++) {
          const yy = sh.y + (sh.h / 5) * i
          ctx.fillRect(x, yy + 2, sh.w, sh.h / 5 - 5)
        }
      }

      for (const c of this.crates) {
        if (c.hp <= 0) continue
        const x = c.x - this.cam
        if (x > t.width + 60 || x + c.w < -60) continue
        ctx.fillStyle = c.hit > 0 ? '#fde68a' : 'rgba(122,74,22,0.92)'
        ctx.fillRect(x, c.y, c.w, c.h)
        ctx.strokeStyle = withAlpha('#fbbf24', 0.9)
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, c.y + 1, c.w - 2, c.h - 2)
        ctx.fillStyle = withAlpha('#fbbf24', 0.3)
        ctx.fillRect(x + 5, c.y + 5, c.w - 10, c.h - 10)
        // fragility pips
        for (let i = 0; i < c.hp; i++) {
          ctx.fillStyle = withAlpha('#fff7ed', 0.7)
          ctx.fillRect(x + 5 + i * 8, c.y - 8, 5, 4)
        }
      }

      for (const o of this.orbs) {
        if (o.taken) continue
        const x = o.x - this.cam
        if (x > t.width + 60 || x < -60) continue
        const bob = Math.sin(t.time * 2 + o.phase) * 8
        glowDot(ctx, { x, y: o.y + bob }, 9, '#22d3ee', 0.9)
        ctx.fillStyle = '#e0f7ff'
        ctx.beginPath()
        ctx.arc(x, o.y + bob, 5.5, 0, TAU)
        ctx.fill()
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = withAlpha('#22d3ee', 0.45)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, o.y + bob, 12 + Math.sin(t.time * 4 + o.phase) * 3, 0, TAU)
        ctx.stroke()
        ctx.restore()
      }

      // afterimages of the mote you just swallowed
      this.ghost.render(ctx, 14, '#22d3ee')

      // the pool of light the body casts on the floor
      if (p.onGround) {
        drawGroundGlow(ctx, px + size.w / 2, groundY, 54, this.color, 0.3)
      }

      // player
      if (waved) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = withAlpha(i === 0 ? '#ffffff' : this.color, i === 0 ? 0.75 : 0.4)
          ctx.lineWidth = i === 0 ? 5 : 8 - i * 2
          ctx.beginPath()
          for (let k = 0; k <= 32; k++) {
            const u = k / 32
            const xx = px + u * size.w
            const amp = Math.sin(u * Math.PI)
            const yy = p.y + size.h / 2 + Math.sin(u * 10 - t.time * 12) * amp * size.h * 0.65
            if (k === 0) ctx.moveTo(xx, yy)
            else ctx.lineTo(xx, yy)
          }
          ctx.stroke()
        }
        ctx.restore()
      } else {
        const cx = px + size.w / 2
        const cy = p.y + size.h / 2
        glowDot(ctx, { x: cx, y: cy }, 11, this.color, 0.85)
        // squash on landing, stretch at the top of the arc
        const sq = clamp(p.vy / 1500, -0.34, 0.34)
        const sx = 1 - sq * 0.45
        const sy = 1 + sq * 0.45
        ctx.save()
        ctx.translate(px + size.w / 2, p.y + size.h)
        ctx.scale(sx, sy)
        const bh = size.h
        ctx.fillStyle = '#f5f3ff'
        ctx.beginPath()
        ctx.roundRect(-size.w / 2, -bh, size.w, bh, 7)
        ctx.fill()
        ctx.fillStyle = withAlpha(this.color, 0.95)
        ctx.beginPath()
        ctx.roundRect(-size.w / 2 + 4, -bh + 5, size.w - 8, bh * 0.4, 4)
        ctx.fill()
        ctx.restore()
        ctx.fillStyle = '#0a0616'
        const look = clamp(p.vx / MOVE_SPEED, -1, 1) * 2
        const eyeY = p.y + size.h - 10 - sq * 5
        ctx.beginPath()
        ctx.arc(px + 8 + look, eyeY, 2, 0, TAU)
        ctx.arc(px + 13 + look, eyeY, 2, 0, TAU)
        ctx.fill()
      }

      this.particles.render(ctx)
      if (this.shake.active) ctx.restore()

      hudBar(t, this.coherence, this.color, 'COHERENCE')
      hudCounters(t, [
        `MOTES  ${this.collected}/${this.orbs.length}`,
        waved ? 'SPREAD — slips between the slats' : 'PARTICLE — heavy, fast, shatters things',
      ])
    },

    move(size: { w: number; h: number }, t: SceneContext, waved: boolean) {
      const p = this.p
      const solids: Solid[] = [
        { x: 0, y: this.groundY, w: this.levelW, h: t.height * 4 },
        ...this.platforms,
      ]
      if (!waved) {
        for (const c of this.crates) if (c.hp > 0) solids.push(c)
        for (const sh of this.shutters) if (sh.intact) solids.push(sh)
      }

      p.x += p.vx * t.dt
      for (const o of solids) {
        if (!overlaps(p.x, p.y, size.w, size.h, o)) continue
        p.x = p.vx > 0 ? o.x - size.w : o.x + o.w
        p.vx = 0
      }
      // the region has edges: you may not wander out of your own problem
      p.x = clamp(p.x, 0, this.levelW - size.w)
      if (p.x === 0 || p.x === this.levelW - size.w) p.vx = 0

      p.y += p.vy * t.dt
      p.onGround = false
      for (const o of solids) {
        if (!overlaps(p.x, p.y, size.w, size.h, o)) continue
        if (p.vy > 0) {
          p.y = o.y - size.h
          p.onGround = true
        } else if (p.vy < 0) {
          p.y = o.y + o.h
        }
        p.vy = 0
      }
    },
  }
}

export const fluxScene: Scene = {
  id: 'flux',
  intro: {
    title: 'The Flux Fields',
    body: 'Seven motes are drifting in the static. Gather them all before your coherence runs out. Spread wide to slip between shutter slats; snap tight to shatter stone.',
    controls: ['← →  move', 'SPACE  jump', 'HOLD PHASE  be a wave', 'Release  be a particle'],
  },
  create,
}
