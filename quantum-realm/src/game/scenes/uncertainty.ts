import { has } from '../anomalies'
import { clamp, clamp01, TAU } from '../math'
import {
  Particles,
  Starfield,
  drawBackdrop,
  drawGroundGlow,
  drawParallax,
  withAlpha,
} from '../draw'
import { hint, hudBar, hudCentre, hudCounters } from '../hud'
import type { Scene, SceneContext, SceneState } from '../types'

/**
 * Uncertainty Bazaar.
 * Charge = speed. Speed = momentum. Momentum known precisely means position
 * smeared into a cloud you cannot steer. Stalls and crates are only solid if
 * you refuse to look at them; the ones you look at too hard will not hold you.
 */

interface Stall {
  x: number
  y: number
  w: number
  h: number
  /** 0..1: how much this thing insists on being definite. */
  stubborn: number
  hit: number
}

interface Crate {
  x: number
  y: number
  w: number
  h: number
  stubborn: number
  hit: number
}

interface Target {
  x: number
  y: number
  taken: boolean
  phase: number
  /** Requires speed above this to knock it over — a momentum problem. */
  needSpeed: number
}

const GRAV = 1600
const FLOOR_FRICTION = 0.0016

function create(s: SceneContext): SceneState {
  const groundY = s.height * 0.74
  const levelW = Math.max(s.width * 1.6, 2600)
  // stall heights stay inside a charged dash, so nothing is ever out of reach
  const stalls: Stall[] = [
    { x: 430, y: groundY - 70, w: 170, h: 16, stubborn: 0.9, hit: 0 },
    { x: 700, y: groundY - 150, w: 150, h: 16, stubborn: 0.15, hit: 0 },
    { x: 1000, y: groundY - 70, w: 180, h: 16, stubborn: 0.85, hit: 0 },
    { x: 1300, y: groundY - 160, w: 160, h: 16, stubborn: 0.1, hit: 0 },
    { x: 1640, y: groundY - 70, w: 170, h: 16, stubborn: 0.8, hit: 0 },
    { x: 1930, y: groundY - 155, w: 160, h: 16, stubborn: 0.2, hit: 0 },
    { x: 2200, y: groundY - 70, w: 180, h: 16, stubborn: 0.95, hit: 0 },
  ]
  const crates: Crate[] = [
    { x: 560, y: groundY - 48, w: 42, h: 48, stubborn: 0.55, hit: 0 },
    { x: 1140, y: groundY - 48, w: 42, h: 48, stubborn: 0.65, hit: 0 },
    { x: 1790, y: groundY - 48, w: 42, h: 48, stubborn: 0.5, hit: 0 },
  ]
  const targets: Target[] = [
    { x: 300, y: groundY - 60, taken: false, phase: 0, needSpeed: 0 },
    { x: 620, y: groundY - 190, taken: false, phase: 0.8, needSpeed: 260 },
    { x: 860, y: groundY - 130, taken: false, phase: 1.5, needSpeed: 0 },
    { x: 1180, y: groundY - 200, taken: false, phase: 2.2, needSpeed: 320 },
    { x: 1450, y: groundY - 130, taken: false, phase: 2.9, needSpeed: 0 },
    { x: 1750, y: groundY - 200, taken: false, phase: 3.6, needSpeed: 340 },
    { x: 2050, y: groundY - 130, taken: false, phase: 4.2, needSpeed: 0 },
    { x: 2400, y: groundY - 190, taken: false, phase: 5, needSpeed: 300 },
  ]
  const p = { x: 110, y: groundY - 14, vx: 0, vy: 0, r: 14, onGround: true }
  const particles = new Particles()
  const stars = new Starfield(60, ['#fbbf24', '#f97316', '#fde68a'])
  const st = {
    time: 0,
    cam: 0,
    levelW,
    groundY,
    charge: 0,
    taken: 0,
    // Δx and Δp share a fixed product; Δp grows as Δx shrinks.
    dx: 14,
    dp: 0,
    hintT: 10,
    dust: 0,
  }

  const ground = { x: -200, y: groundY, w: levelW + 400, h: 2000 }

  const overlaps = (x: number, y: number, w: number, h: number, o: { x: number; y: number; w: number; h: number }) =>
    x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y

  return {
    update(t) {
      st.time += t.dt
      st.hintT = Math.max(0, st.hintT - t.dt)

      // holding jump charges momentum; releasing converts it into a dash
      if (t.input.alt || t.input.jump) st.charge = clamp01(st.charge + t.dt * 1.5)
      else st.charge = clamp01(st.charge - t.dt * 1.9)

      if (t.input.altPressed || (t.input.jumpPressed && p.onGround && st.charge > 0.25)) {
        const boost = (120 + st.charge * 520) * (has(t.run, 'heavy_pockets') ? 0.66 : 1)
        p.vx += Math.sign(t.input.right ? 1 : t.input.left ? -1 : 1) * boost
        p.vy -= 180 + st.charge * 240
        p.onGround = false
        t.audio.jump()
        particles.burst(p.x, p.y, 18, '#fbbf24', { life: 0.4, speed: 220 })
        t.addScore(20)
      }

      const dir = (t.input.right ? 1 : 0) - (t.input.left ? 1 : 0)
      if (p.onGround) {
        p.vx += dir * 2200 * t.dt
        p.vx *= Math.pow(FLOOR_FRICTION, t.dt)
      } else {
        p.vx += dir * 700 * t.dt
        p.vx *= Math.pow(0.5, t.dt)
      }
      p.vy += GRAV * t.dt
      if (t.input.jumpPressed && p.onGround && st.charge < 0.1) {
        p.vy = -480
        p.onGround = false
        t.audio.jump()
      }
      p.vx = clamp(p.vx, -700, 700)
      p.vy = clamp(p.vy, -900, 1000)

      // Heisenberg bookkeeping: Δx·Δp ≥ ħ/2, so momentum smears position
      const speed = Math.abs(p.vx) + Math.abs(p.vy) * 0.35
      // sharp_practice keeps you crisp far longer
      const fixed = has(t.run, 'sharp_practice') ? 2.2 : 1.0
      st.dx = (fixed * fixed) / Math.max(fixed * 0.35, speed * 0.012 + fixed * 0.35)
      st.dp = speed * 0.012 + fixed * 0.35

      p.x += p.vx * t.dt
      p.y += p.vy * t.dt

      // the bazaar floor, always certain
      p.onGround = false
      if (overlaps(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2, ground)) {
        p.y = ground.y - p.r
        p.vy = 0
        p.onGround = true
      }
      // a ceiling of a different kind: you cannot blur upward forever
      if (p.y < -p.r) {
        p.y = -p.r
        p.vy = Math.max(0, p.vy)
      }
      if (p.x < 30) {
        p.x = 30
        p.vx = Math.max(0, p.vx)
      }

      for (const s2 of stalls) {
        s2.hit = Math.max(0, s2.hit - t.dt * 3)
        if (!overlaps(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2, s2)) continue
        if (st.dx <= s2.stubborn) {
          // too crisp: the stall is a hard fact and it will hold you up
          p.y = s2.y - p.r
          p.vy = 0
          p.onGround = true
        } else {
          // too smeared: it simply is not there
          s2.hit = 1
          t.toast('The stall declined to exist for someone this vague.', 1.3)
        }
      }
      for (const c of crates) {
        c.hit = Math.max(0, c.hit - t.dt * 3)
        if (!overlaps(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2, c)) continue
        if (has(t.run, 'hard_mercury') || st.dx <= c.stubborn) {
          if (p.vy > 0) {
            p.y = c.y - p.r
            p.vy = 0
            p.onGround = true
          } else {
            p.y = c.y + c.h + p.r
            p.vy = 0
          }
        } else {
          c.hit = 1
          p.vy = -Math.abs(p.vy) * 0.2 - 60
        }
      }

      for (const tg of targets) {
        if (tg.taken) continue
        const bob = Math.sin(st.time * 1.7 + tg.phase) * 10
        const d = Math.hypot(tg.x - p.x, tg.y + bob - p.y)
        const fastEnough = speed >= tg.needSpeed
        if (d < 40 && (fastEnough || tg.needSpeed === 0)) {
          tg.taken = true
          st.taken++
          t.addScore(160 + Math.round(speed))
          t.audio.collect()
          particles.burst(tg.x, tg.y + bob, 22, '#fde68a', { life: 0.6, speed: 220 })
          t.toast(
            tg.needSpeed > 0 ? 'Knocked it over. Momentum is a blunt instrument.' : 'Picked it up. Gentle.',
            1.3,
          )
        }
      }

      t.setProgress((st.taken / targets.length) * 0.7 + (p.x / (st.levelW - 200)) * 0.3)
      if (p.x > st.levelW - 190) {
        t.onWin()
        return
      }
      if (p.y > t.height + 80) {
        t.onLose()
        return
      }

      if (st.dx > 12 && Math.random() < t.dt * 24) {
        particles.spawn({
          x: p.x + (Math.random() - 0.5) * st.dx * 3,
          y: p.y + (Math.random() - 0.5) * st.dx * 3,
          vx: 0,
          vy: 0,
          color: '#fde68a',
          size: 2,
          life: 0.35,
        })
      }
      particles.update(t.dt)
      st.cam = clamp(p.x - t.width * 0.42, 0, Math.max(0, st.levelW - t.width))
      t.audio.setIntensity(clamp01(speed / 500))
      t.observation = clamp01(1 - st.dx / 20)
    },

    peek() {
      const speed = Math.abs(p.vx) + Math.abs(p.vy) * 0.35
      return {
        x: p.x,
        y: p.y,
        charge: st.charge,
        speed,
        dx: st.dx,
        taken: st.taken,
        total: targets.length,
        xGoal: levelW - 190,
      }
    },

    render(t) {
      const ctx = t.ctx
      drawBackdrop(ctx, t.width, t.height, st.time, '#3a1c05', '#0d0602')
      stars.render(ctx, t.width, t.height, st.time)

      drawParallax(ctx, t.width, st.cam, st.time, '#7c4a10', st.groundY)

      // bazaar awnings
      ctx.save()
      ctx.globalAlpha = 0.5
      for (let i = 0; i < 10; i++) {
        const x = ((i * 260 - st.cam) % (t.width + 260) + t.width + 260) % (t.width + 260) - 130
        ctx.fillStyle = i % 2 ? 'rgba(251,191,36,0.16)' : 'rgba(249,115,22,0.16)'
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + 110, 0)
        ctx.lineTo(x + 92, 54)
        ctx.lineTo(x + 18, 54)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()

      const gy = st.groundY
      const g = ctx.createLinearGradient(0, gy, 0, t.height)
      g.addColorStop(0, withAlpha('#fbbf24', 0.32))
      g.addColorStop(0.4, withAlpha('#fbbf24', 0.08))
      g.addColorStop(1, 'rgba(13,6,2,0.98)')
      ctx.fillStyle = g
      ctx.fillRect(0, gy, t.width, t.height - gy)
      ctx.fillStyle = withAlpha('#fbbf24', 0.8)
      ctx.fillRect(0, gy - 2, t.width, 2)

      for (const s2 of stalls) {
        const x = s2.x - st.cam
        if (x > t.width + 80 || x + s2.w < -80) continue
        const solid = has(t.run, 'hard_mercury') || st.dx <= s2.stubborn
        ctx.save()
        if (!solid) ctx.setLineDash([6, 6])
        ctx.strokeStyle = withAlpha(s2.hit > 0.2 ? '#ffffff' : '#fde68a', solid ? 0.95 : 0.4)
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x, s2.y)
        ctx.lineTo(x + s2.w, s2.y)
        ctx.stroke()
        ctx.restore()
        ctx.font = '600 10px ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = solid ? 'rgba(253,230,138,0.8)' : 'rgba(253,230,138,0.3)'
        ctx.fillText(
          has(t.run, 'hard_mercury') ? 'INEVITABLE' : solid ? 'SOLID' : 'a rumour',
          x + s2.w / 2,
          s2.y - 10,
        )
        // canopy pole
        ctx.fillStyle = 'rgba(120,80,20,0.6)'
        ctx.fillRect(x, s2.y, 5, gy - s2.y)
      }

      for (const c of crates) {
        const x = c.x - st.cam
        if (x > t.width + 80 || x + c.w < -80) continue
        const solid = has(t.run, 'hard_mercury') || st.dx <= c.stubborn
        ctx.save()
        if (!solid) {
          ctx.globalAlpha = 0.25
          ctx.setLineDash([4, 5])
        }
        ctx.fillStyle = c.hit > 0.2 ? '#fffbeb' : 'rgba(180,83,9,0.9)'
        ctx.fillRect(x, c.y, c.w, c.h)
        ctx.strokeStyle = withAlpha('#fde68a', 0.8)
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, c.y + 1, c.w - 2, c.h - 2)
        ctx.restore()
      }

      for (const tg of targets) {
        if (tg.taken) continue
        const x = tg.x - st.cam
        if (x > t.width + 60 || x < -60) continue
        const bob = Math.sin(st.time * 1.7 + tg.phase) * 10
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = withAlpha('#fde68a', 0.6)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, tg.y + bob, 16, 0, TAU)
        ctx.stroke()
        if (tg.needSpeed > 0) {
          ctx.strokeStyle = withAlpha('#f97316', 0.8)
          ctx.beginPath()
          ctx.arc(x, tg.y + bob, 16, -Math.PI / 2, -Math.PI / 2 + TAU * 0.35)
          ctx.stroke()
        }
        ctx.fillStyle = '#fffbeb'
        ctx.beginPath()
        ctx.arc(x, tg.y + bob, 8, 0, TAU)
        ctx.fill()
        ctx.restore()
      }

      const gateX = st.levelW - 150 - st.cam
      if (gateX < t.width + 120) {
        ctx.strokeStyle = withAlpha('#fde68a', 0.8)
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(gateX, gy - 220)
        ctx.lineTo(gateX, gy)
        ctx.stroke()
      }

      // the uncertainty cloud: your position, smeared
      const spread = st.dx
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const cx = p.x - st.cam
      const cy = p.y
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread * 3.4)
      rg.addColorStop(0, withAlpha('#fde68a', 0.9))
      rg.addColorStop(1, withAlpha('#f97316', 0))
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(16, spread * 3.4), 0, TAU)
      ctx.fill()
      ctx.strokeStyle = withAlpha('#fffbeb', 0.85)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(11, spread), 0, TAU)
      ctx.stroke()
      ctx.restore()
      // a dark backing disc keeps the core legible over a bright stall
      ctx.fillStyle = 'rgba(8,3,0,0.6)'
      ctx.beginPath()
      ctx.arc(cx, cy, 10, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(cx, cy, 6.5, 0, TAU)
      ctx.fill()

      // the smudge of light you leave on the tiles
      drawGroundGlow(ctx, cx, gy, 60, '#fbbf24', 0.3)

      particles.render(ctx)

      hudBar(t, st.charge * 100, '#f97316', 'MOMENTUM', 100)
      hudCounters(t, [`STANDS  ${st.taken}/${targets.length}`])
      // the Heisenberg readout, the actual star of the level
      hudCentre(
        t,
        `Δx ${st.dx.toFixed(1)}  ×  Δp ${st.dp.toFixed(2)}  =  ${(st.dx * st.dp).toFixed(2)}  ≥  0.50`,
        '#fde68a',
        14,
      )
      hint(
        t,
        'Fast = blurry. Blurry stalls vanish. Slow stalls are hard facts.',
        clamp01(st.hintT / 3.5),
      )
    },
  }
}

export const uncertaintyScene: Scene = {
  id: 'uncertainty',
  intro: {
    title: 'The Uncertainty Bazaar',
    body: 'Stalls here are only solid if you are definite, and you can only be definite if you are standing still. Charge a dash to blur yourself into a cloud — the foggy stalls stop being real, the solid ones stay put. Knock over the heavy stands on the way.',
    controls: ['← →  move', 'HOLD  charge momentum', 'Release / TAP  dash', 'Blur enough to phase through foggy stalls'],
  },
  create,
}
