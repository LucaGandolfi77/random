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
import type { RunConfig, Scene, SceneContext, SceneState } from '../types'

/**
 * Interference Marsh.
 * Three drifting emitters superpose into a moving interference pattern.
 * Crests are air, troughs are ballast, and nodes are places where you stop
 * being a definite thing. Hold PHASE to invert your own phase and fly the dark.
 */

interface Source {
  x: number
  y: number
  k: number
  /** Phase drift speed, rad/s. */
  w: number
  color: string
}

interface Shard {
  x: number
  y: number
  taken: boolean
  phase: number
}

const GRAV = 900
const MAX_FALL = 700

/** Superposed amplitude in [-1,1] at a point, plus the dominant phase angle. */
function amplitude(
  out: { a: number; phase: number },
  x: number,
  y: number,
  sources: Source[],
  t: number,
  drift = 1,
) {
  let re = 0
  let im = 0
  for (const s of sources) {
    const d = Math.hypot(x - s.x, y - s.y)
    const decay = 1 / (1 + d * 0.0022)
    const ph = s.k * d + s.w * drift * t
    re += Math.cos(ph) * decay
    im += Math.sin(ph) * decay
  }
  const n = sources.length
  out.a = Math.hypot(re, im) / n
  out.phase = Math.atan2(im, re)
  return out
}

function create(s: SceneContext): SceneState {
  const groundY = s.height * (s.run?.anomalies.includes('short_marsh') ? 0.6 : 0.74)
  const levelW = Math.max(s.width * 1.5, 2500)
  const sources: Source[] = [
    { x: 300, y: groundY - 190, k: 0.026, w: 0.55, color: '#f472b6' },
    { x: 1250, y: groundY - 280, k: 0.031, w: -0.4, color: '#fbbf24' },
    { x: 2280, y: groundY - 200, k: 0.024, w: 0.33, color: '#22d3ee' },
  ]
  const shards: Shard[] = [
    { x: 520, y: groundY - 62, taken: false, phase: 0.4 },
    { x: 980, y: groundY - 135, taken: false, phase: 1.5 },
    { x: 1480, y: groundY - 62, taken: false, phase: 2.6 },
    { x: 1880, y: groundY - 155, taken: false, phase: 3.4 },
    { x: 2260, y: groundY - 62, taken: false, phase: 4.6 },
  ]
  const platforms = [
    { x: 620, y: groundY - 70, w: 110 },
    { x: 1080, y: groundY - 95, w: 110 },
    { x: 1560, y: groundY - 70, w: 120 },
    { x: 2040, y: groundY - 100, w: 110 },
  ]
  const p = { x: 100, y: groundY - 24, vx: 0, vy: 0, onGround: true }
  const particles = new Particles()
  const stars = new Starfield(60, ['#f472b6', '#fbbf24', '#22d3ee'])
  const st = {
    time: 0,
    cam: 0,
    levelW,
    groundY,
    coherence: 100,
    taken: 0,
    inverted: false,
    hintT: 10,
    sample: { a: 0, phase: 0 },
    trail: [] as { x: number; y: number; life: number }[],
    brightness: 0,
  }

  // offscreen buffer for the smoothed field
  const field = document.createElement('canvas')
  let fctx: CanvasRenderingContext2D | null = null
  let img: ImageData | null = null

  const fieldAt = (x: number, y: number, run?: RunConfig) => {
    amplitude(st.sample, x, y, sources, st.time, has(run, 'beating') ? 2 : 1)
    const loud = has(run, 'loud_field') ? 1.35 : 1
    const raw = clamp(st.sample.a * loud, -1, 1)
    // phase_echo flips what inverting actually does
    const flip = st.inverted !== has(run, 'phase_echo')
    return flip ? -raw : raw
  }

  return {
    update(t) {
      st.time += t.dt
      st.hintT = Math.max(0, st.hintT - t.dt)

      if (t.input.alt !== st.inverted) {
        st.inverted = t.input.alt
        t.audio.phase()
        particles.burst(p.x, p.y, 16, st.inverted ? '#a78bfa' : '#fda4af', { life: 0.5 })
        t.toast(
          st.inverted
            ? 'Phase inverted. Crests are ballast now, troughs are air.'
            : 'Phase normal. Ride the crests.',
          2,
        )
      }

      const a = fieldAt(p.x, p.y, t.run)
      // crests are buoyant, troughs are heavy, nodes are lethal to coherence
      if (a > 0.22) {
        p.vy -= 780 * (a - 0.22) * t.dt * 3
        st.brightness = clamp01(st.brightness + t.dt * 2)
      } else if (a < -0.22) {
        p.vy += 520 * (-a - 0.22) * t.dt * 3
      } else {
        st.coherence -= t.dt * 16 * t.pressure * (has(t.run, 'loud_field') ? 2 : 1)
        st.brightness = clamp01(st.brightness - t.dt * 2)
        if (Math.random() < t.dt * 20) {
          particles.spawn({
            x: p.x + (Math.random() - 0.5) * 26,
            y: p.y + (Math.random() - 0.5) * 26,
            vx: 0,
            vy: 0,
            color: '#fb7185',
            size: 2,
            life: 0.3,
          })
        }
      }
      st.coherence = Math.min(100, st.coherence + t.dt * (a > 0.22 ? 5 : 0))

      const speed = 250
      const dir = (t.input.right ? 1 : 0) - (t.input.left ? 1 : 0)
      p.vx += (dir * speed - p.vx) * Math.min(1, t.dt * 10)
      p.vy = Math.min(p.vy + GRAV * t.dt, MAX_FALL)

      if (t.input.jumpPressed && p.onGround) {
        p.vy = -360
        p.onGround = false
        t.audio.jump()
      }
      // rising through a crest: hold up to climb the wave
      if (t.input.up && a > 0.22) p.vy -= 420 * t.dt * 3

      p.x += p.vx * t.dt
      if (p.x < 26) {
        p.x = 26
        p.vx = 0
      }
      p.y += p.vy * t.dt

      // ground + platforms
      p.onGround = false
      const gy = st.groundY
      if (p.y + 14 > gy && p.x > st.cam - 40) {
        p.y = gy - 14
        if (p.vy > 0) p.onGround = true
        p.vy = 0
      }
      for (const pl of platforms) {
        if (p.y + 14 > pl.y && p.y - 14 < pl.y + 14 && p.x + 11 > pl.x && p.x - 11 < pl.x + pl.w) {
          p.y = pl.y - 14
          p.vy = 0
          p.onGround = true
        }
      }
      if (p.y < -400) p.y = -400

      for (const sh of shards) {
        if (sh.taken) continue
        const bob = Math.sin(st.time * 1.8 + sh.phase) * 12
        if (Math.hypot(sh.x - p.x, sh.y + bob - p.y) < 38) {
          sh.taken = true
          st.taken++
          t.addScore(150 + Math.round(st.coherence))
          t.audio.collect()
          particles.burst(sh.x, sh.y + bob, 22, '#fde68a', { life: 0.6, speed: 200 })
        }
      }

      t.setProgress((st.taken / shards.length) * 0.5 + (p.x / (st.levelW - 200)) * 0.5)

      if (st.coherence <= 0) {
        st.coherence = 0
        t.onLose()
        return
      }
      if (p.x > st.levelW - 160) {
        t.onWin()
        return
      }

      st.trail.push({ x: p.x, y: p.y, life: 0.45 })
      for (let i = st.trail.length - 1; i >= 0; i--) {
        st.trail[i].life -= t.dt
        if (st.trail[i].life <= 0) st.trail.splice(i, 1)
      }
      particles.update(t.dt)
      particles.trail(p.x, p.y, a > 0.22 ? '#fde68a' : a < -0.22 ? '#7c3aed' : '#fb7185', 4, 0.4)
      st.cam = clamp(p.x - t.width * 0.42, 0, Math.max(0, st.levelW - t.width))
      t.audio.setIntensity(0.3 + st.brightness * 0.6)
      t.observation = 1 - st.coherence / 100
    },

    peek() {
      return {
        x: p.x,
        y: p.y,
        amp: fieldAt(p.x, p.y),
        coherence: st.coherence,
        taken: st.taken,
        total: shards.length,
        inverted: st.inverted ? 1 : 0,
      }
    },

    render(t) {
      const ctx = t.ctx
      drawBackdrop(ctx, t.width, t.height, st.time, '#3b0a3f', '#08020f')
      stars.render(ctx, t.width, t.height, st.time)
      drawParallax(ctx, t.width, st.cam, st.time, '#4a1152', st.groundY)

      // The field is drawn into a small offscreen buffer and scaled up: one
      // pixel of resolution is plenty for a probability cloud, and it looks
      // like a field instead of a grid of squares.
      const fw = 96
      const fh = Math.max(24, Math.round((96 * t.height) / t.width))
      if (!field.width || field.width !== fw || field.height !== fh) {
        field.width = fw
        field.height = fh
        fctx = field.getContext('2d')
        img = fctx?.createImageData(fw, fh) ?? null
      }
      if (fctx && img) {
        const data = img.data
        const off = -st.cam
        for (let y = 0; y < fh; y++) {
          for (let x = 0; x < fw; x++) {
            amplitude(
              st.sample,
              (x / fw) * t.width - off,
              (y / fh) * t.height,
              sources,
              st.time,
              has(t.run, 'beating') ? 2 : 1,
            )
            const a = st.inverted ? -st.sample.a : st.sample.a
            const v = clamp01(Math.abs(a) * 1.35)
            const i4 = (y * fw + x) * 4
            if (a > 0) {
              // crests run from amber to white-hot, so "air" is unmistakable
              const hot = clamp01((v - 0.55) / 0.45)
              data[i4] = 255
              data[i4 + 1] = 214 + hot * 41
              data[i4 + 2] = 120 + hot * 135
            } else {
              data[i4] = 76
              data[i4 + 1] = 29
              data[i4 + 2] = 200
            }
            // nodes stay black so the dark lanes read as lanes
            data[i4 + 3] = Math.round(clamp01((v - 0.08) * 2.6) * 130)
          }
        }
        fctx.putImageData(img, 0, 0)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(field, 0, 0, t.width, t.height)
        ctx.restore()
      }

      // wavefront rings
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const s of sources) {
        const sx = s.x - st.cam
        if (sx < -300 || sx > t.width + 300) continue
        for (let r = 0; r < 3; r++) {
          const rr = ((st.time * 130 * s.k * 40 + r * 320) % 960)
          ctx.strokeStyle = withAlpha(s.color, 0.16 * (1 - rr / 960))
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(sx, s.y, rr, 0, TAU)
          ctx.stroke()
        }
        ctx.fillStyle = withAlpha(s.color, 0.85)
        ctx.beginPath()
        ctx.arc(sx, s.y, 9, 0, TAU)
        ctx.fill()
      }
      ctx.restore()

      const gy = st.groundY
      const g = ctx.createLinearGradient(0, gy, 0, t.height)
      g.addColorStop(0, withAlpha('#f472b6', 0.36))
      g.addColorStop(0.4, withAlpha('#f472b6', 0.1))
      g.addColorStop(1, 'rgba(10,2,20,0.98)')
      ctx.fillStyle = g
      ctx.fillRect(0, gy, t.width, t.height - gy)
      ctx.fillStyle = withAlpha('#f472b6', 0.85)
      ctx.fillRect(0, gy - 2, t.width, 2)

      for (const pl of platforms) {
        const x = pl.x - st.cam
        if (x > t.width + 80 || x + pl.w < -80) continue
        ctx.fillStyle = 'rgba(50,12,60,0.95)'
        ctx.fillRect(x, pl.y, pl.w, 14)
        ctx.fillStyle = withAlpha('#f9a8d4', 0.6)
        ctx.fillRect(x, pl.y, pl.w, 2)
      }

      for (const sh of shards) {
        if (sh.taken) continue
        const x = sh.x - st.cam
        if (x > t.width + 60 || x < -60) continue
        const bob = Math.sin(st.time * 1.8 + sh.phase) * 12
        ctx.save()
        ctx.translate(x, sh.y + bob)
        ctx.rotate(st.time * 1.4 + sh.phase)
        ctx.fillStyle = '#fde68a'
        ctx.beginPath()
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * TAU
          const r = i % 2 === 0 ? 12 : 5
          const px = Math.cos(ang) * r
          const py = Math.sin(ang) * r
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      // the exit gate: only open when the field in front of it is constructive
      const gateX = st.levelW - 130 - st.cam
      if (gateX < t.width + 120) {
        const ga = fieldAt(st.levelW - 60, st.groundY - 120, t.run)
        const open = ga > 0.15
        ctx.strokeStyle = open ? '#a3e635' : withAlpha('#a3e635', 0.35)
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(gateX, gy - 220)
        ctx.lineTo(gateX, gy)
        ctx.stroke()
        ctx.font = '600 11px ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = open ? '#a3e635' : 'rgba(199,210,254,0.6)'
        ctx.fillText(open ? 'OPEN' : 'DARK', gateX, gy - 232)
      }

      // player trail then body
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const tr of st.trail) {
        ctx.globalAlpha = clamp01(tr.life / 0.45) * 0.35
        ctx.fillStyle = '#fde68a'
        ctx.beginPath()
        ctx.arc(tr.x - st.cam, tr.y, 7, 0, TAU)
        ctx.fill()
      }
      ctx.restore()

      const a = fieldAt(p.x, p.y, t.run)
      const col = a > 0.22 ? '#fde68a' : a < -0.22 ? '#a78bfa' : '#fb7185'
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const rg = ctx.createRadialGradient(p.x - st.cam, p.y, 0, p.x - st.cam, p.y, 40)
      rg.addColorStop(0, withAlpha(col, 0.85))
      rg.addColorStop(1, withAlpha(col, 0))
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.arc(p.x - st.cam, p.y, 40, 0, TAU)
      ctx.fill()
      ctx.restore()
      // a dark backing disc keeps the player legible over a bright crest
      ctx.fillStyle = 'rgba(8,2,18,0.55)'
      ctx.beginPath()
      ctx.arc(p.x - st.cam, p.y, 15, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#fff7ed'
      ctx.beginPath()
      ctx.arc(p.x - st.cam, p.y, 12, 0, TAU)
      ctx.fill()
      if (st.inverted) {
        ctx.strokeStyle = withAlpha('#a78bfa', 0.9)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(p.x - st.cam, p.y, 18, 0, TAU)
        ctx.stroke()
      }

      drawGroundGlow(ctx, p.x - st.cam, gy, 56, a > 0.22 ? '#fde68a' : '#7c3aed', 0.32)

      // a node is the one place that hurts you, so it gets its own alarm
      if (Math.abs(a) <= 0.22 && !t.calm) {
        const pulse = 0.5 + 0.5 * Math.sin(t.time * 11)
        const g2 = ctx.createRadialGradient(
          p.x - st.cam,
          p.y,
          30,
          p.x - st.cam,
          p.y,
          190,
        )
        g2.addColorStop(0, withAlpha('#fb7185', 0.34 * pulse))
        g2.addColorStop(1, withAlpha('#fb7185', 0))
        ctx.fillStyle = g2
        ctx.fillRect(0, 0, t.width, t.height)
      }

      particles.render(ctx)

      hudBar(t, st.coherence, '#f472b6', 'DEFINITENESS', 100)
      hudCounters(t, [
        `SHARDS  ${st.taken}/${shards.length}`,
        st.inverted ? 'PHASE INVERTED' : 'PHASE NORMAL',
      ])
      hudCentre(
        t,
        `LOCAL |Ψ| ${Math.abs(a).toFixed(2)}   ${a > 0.22 ? 'CREST' : a < -0.22 ? 'TROUGH' : 'NODE'}`,
        a > 0.22 ? '#fde68a' : a < -0.22 ? '#c4b5fd' : '#fb7185',
        16,
      )
      hint(t, 'Crests lift you. Nodes dissolve you. Hold PHASE to invert.', clamp01(st.hintT / 3.5))
    },
  }
}

export const interferenceScene: Scene = {
  id: 'interference',
  intro: {
    title: 'The Interference Marsh',
    body: 'Three emitters are shouting at once and the marsh adds them together. Where they agree you are carried. Where they cancel, you stop being definite. Hold PHASE to invert your own phase and walk on the dark side.',
    controls: ['← →  move', '↑  climb a crest', 'SPACE  jump', 'HOLD PHASE  invert your phase'],
  },
  create,
}

