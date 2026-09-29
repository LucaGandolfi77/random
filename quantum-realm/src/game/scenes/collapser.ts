import { has } from '../anomalies'
import { clamp, clamp01, TAU } from '../math'
import {
  Particles,
  Shaker,
  Starfield,
  drawBackdrop,
  drawParallax,
  withAlpha,
} from '../draw'
import { banner, hint, hudBar, hudCounters, hudText } from '../hud'
import type { Scene, SceneContext, SceneState } from '../types'

/**
 * The Collapser — finale.
 * A machine that has been measuring the world into one dull answer for a
 * thousand years. Sweeping observation beams freeze you into a definite thing;
 * you have to cross the hall in the gaps, phase the shield, and decide what
 * to do with the loop inside its eye.
 */

interface Pillar {
  x: number
  y: number
  w: number
  h: number
}

interface Beam {
  /** Angle in radians, sweeping. */
  a: number
  speed: number
  len: number
  half: number
  originX: number
  originY: number
  phase: number
}

interface CoreShard {
  x: number
  y: number
  taken: boolean
  phase: number
}

const HALL_H = 520

function create(s: SceneContext): SceneState {
  const arenaW = 1180
  const arenaH = HALL_H
  const scale = Math.min(s.width / arenaW, (s.height * 0.52) / arenaH)
  const offX = (s.width - arenaW * scale) / 2
  const offY = s.height * 0.26

  const pillars: Pillar[] = [
    { x: 300, y: 150, w: 26, h: 220 },
    { x: 520, y: 150, w: 26, h: 150 },
    { x: 520, y: 380, w: 26, h: 140 },
    { x: 760, y: 210, w: 26, h: 310 },
    { x: 900, y: 120, w: 26, h: 190 },
    { x: 900, y: 400, w: 26, h: 120 },
  ]
  const beams: Beam[] = [
    { a: -0.4, speed: 0.55, len: 900, half: 0.075, originX: 180, originY: 260, phase: 0 },
    { a: 2.6, speed: -0.42, len: 900, half: 0.075, originX: 640, originY: 260, phase: 1.7 },
    { a: 0.9, speed: 0.7, len: 760, half: 0.06, originX: 1030, originY: 260, phase: 3.1 },
  ]
  const shards: CoreShard[] = [
    { x: 200, y: 120, taken: false, phase: 0.2 },
    { x: 400, y: 430, taken: false, phase: 1.1 },
    { x: 660, y: 100, taken: false, phase: 2.3 },
    { x: 860, y: 460, taken: false, phase: 3.4 },
  ]

  const p = { x: 90, y: 260, vx: 0, vy: 0, r: 15 }
  const particles = new Particles()
  const stars = new Starfield(50, ['#ef4444', '#facc15', '#fda4af'])
  const shake = new Shaker()
  const st = {
    time: 0,
    scale,
    offX,
    offY,
    arenaW,
    arenaH,
    seen: 0,
    taken: 0,
    phase: 0,
    charge: 0,
    r: 15,
    hintT: 12,
    flash: 0,
    choice: -1,
    endTimer: 0,
    shieldOpen: false,
    reachedCore: false,
    beamHit: false,
  }

  const toScreen = (x: number, y: number) => ({ x: offX + x * scale, y: offY + y * scale })

  const resolve = () => {
    for (const pl of pillars) {
      const cx = clamp(p.x, pl.x, pl.x + pl.w)
      const cy = clamp(p.y, pl.y, pl.y + pl.h)
      const dx = p.x - cx
      const dy = p.y - cy
      const d2 = dx * dx + dy * dy
      if (d2 > p.r * p.r) continue
      const d = Math.sqrt(d2) || 0.001
      p.x += (dx / d) * (p.r - d)
      p.y += (dy / d) * (p.r - d)
    }
    p.x = clamp(p.x, 40, arenaW - 40)
    p.y = clamp(p.y, 40, arenaH - 40)
  }

  const inBeam = () => {
    for (const b of beams) {
      const ang = Math.atan2(p.y - b.originY, p.x - b.originX)
      let diff = ang - b.a
      while (diff > Math.PI) diff -= TAU
      while (diff < -Math.PI) diff += TAU
      const dist = Math.hypot(p.x - b.originX, p.y - b.originY)
      if (Math.abs(diff) < b.half && dist < b.len) return b
    }
    return null
  }

  return {
    update(t) {
      st.time += t.dt
      st.flash = Math.max(0, st.flash - t.dt * 2.4)
      st.hintT = Math.max(0, st.hintT - t.dt)
      const sweepRate = has(t.run, 'eager_eye') ? 0.96 : 0.6
      for (const b of beams) b.a += b.speed * t.dt * sweepRate

      // the shield only yields to a thin, high-momentum particle
      const still = !t.input.left && !t.input.right && !t.input.up && !t.input.down
      if (t.input.alt && still) st.charge = clamp01(st.charge + t.dt * 0.85)
      else st.charge = clamp01(st.charge - t.dt * 0.6)
      st.r = 15 + (5 - 15) * st.charge
      p.r = st.r

      if (st.phase === 0) {
        const ax = (t.input.right ? 1 : 0) - (t.input.left ? 1 : 0)
        const ay = (t.input.down ? 1 : 0) - (t.input.up ? 1 : 0)
        const boost = 1 + st.charge * 0.9
        p.vx += ax * 2600 * t.dt
        p.vy += ay * 2600 * t.dt
        const drag = Math.pow(0.0009, t.dt)
        p.vx *= drag
        p.vy *= drag
        p.vx = clamp(p.vx, -330 * boost, 330 * boost)
        p.vy = clamp(p.vy, -330 * boost, 330 * boost)
        p.x += p.vx * t.dt
        p.y += p.vy * t.dt
        resolve()

        // the shield wall at x = 1080
        const shieldNeed = has(t.run, 'thick_shield') ? 0.94 : 0.75
        if (p.x + p.r > 1080 && p.x - p.r < 1108 && st.charge < shieldNeed) {
          p.x = 1080 - p.r
          p.vx = 0
          st.flash = 0.4
          if (Math.random() < 0.2) {
            t.toast('The shield is a very certain wall. Get thinner.', 1.2)
          }
        } else if (p.x + p.r > 1080) {
          st.shieldOpen = true
          st.flash = 0.7
          if (!t.calm) shake.add(0.9)
          t.audio.phase()
          t.addScore(500)
          t.toast('Through. It never said anything about thickness.')
        }

        // observation
        const hit = inBeam()
        st.beamHit = !!hit
        if (hit && st.charge < 0.4) {
          st.seen = clamp01(st.seen + t.dt * 0.55 * t.pressure * (has(t.run, 'eager_eye') ? 1.6 : 1))
          if (st.seen > 0.34 && Math.random() < t.dt * 6) {
            if (!t.calm) shake.add(0.5)
            t.audio.collapse()
            t.toast('MEASURED. Keep moving — being pinned is being broken.', 1.4)
            st.flash = 0.5
            // being measured also drags you toward definite positions
            p.vx *= 0.4
            p.vy *= 0.4
          }
        } else {
          st.seen = clamp01(st.seen - t.dt * 0.28)
        }
        t.observation = st.seen
        t.audio.setIntensity(0.3 + st.seen * 0.7)

        for (const sh of shards) {
          if (sh.taken) continue
          if (Math.hypot(sh.x - p.x, sh.y - p.y) < 30) {
            sh.taken = true
            st.taken++
            t.addScore(220)
            t.audio.collect()
            particles.burst(sh.x, sh.y, 22, '#facc15', { life: 0.7, speed: 200 })
          }
        }
        t.setProgress(clamp01(p.x / 1080) * 0.6 + (st.taken / shards.length) * 0.4)

        if (st.shieldOpen) {
          st.reachedCore = true
          st.phase = 1
        }
        if (st.seen >= 1) {
          t.onLose()
          return
        }
      } else if (st.phase === 1) {
        // the choice inside the loop
        p.vx *= Math.pow(0.02, t.dt)
        p.vy *= Math.pow(0.02, t.dt)
        p.x += p.vx * t.dt
        p.y += p.vy * t.dt
        if (t.input.up) st.choice = 0
        if (t.input.down) st.choice = 1
        if (t.input.jumpPressed && st.choice >= 0) {
          st.phase = 2
          t.audio.win()
          t.onWin(st.choice === 0 ? 'good' : 'bad')
        }
        particles.update(t.dt)
        return
      }

      particles.update(t.dt)
      shake.update(t.dt)
      particles.trail(p.x, p.y, st.charge > 0.5 ? '#facc15' : '#fca5a5', 3, 0.3)
    },

    peek() {
      return {
        x: p.x,
        y: p.y,
        charge: st.charge,
        seen: st.seen,
        phase: st.phase,
        taken: st.taken,
        shieldOpen: st.shieldOpen ? 1 : 0,
        inBeam: st.beamHit ? 1 : 0,
      }
    },

    render(t) {
      const ctx = t.ctx
      if (shake.active) ctx.save()
      if (shake.active) ctx.translate(shake.x, shake.y)

      drawBackdrop(ctx, t.width, t.height, st.time, '#2a0505', '#080101')
      stars.render(ctx, t.width, t.height, st.time)
      drawParallax(ctx, t.width, 0, st.time, '#4a0d0d', t.height * 0.9)

      const S = st.scale
      const O = st.offX
      const Oy = st.offY

      // hall floor
      ctx.save()
      ctx.fillStyle = 'rgba(60,10,10,0.5)'
      ctx.fillRect(O, Oy, st.arenaW * S, st.arenaH * S)
      ctx.strokeStyle = withAlpha('#f87171', 0.35)
      ctx.lineWidth = 2
      ctx.strokeRect(O, Oy, st.arenaW * S, st.arenaH * S)
      ctx.restore()

      // everything from here to the player lives inside the hall
      ctx.save()
      ctx.beginPath()
      ctx.rect(O, Oy, st.arenaW * S, st.arenaH * S)
      ctx.clip()

      // observation beams, occluded by pillars
      for (const b of beams) {
        const o = toScreen(b.originX, b.originY)
        const spread = b.half * 1.9
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, b.len * S)
        grad.addColorStop(0, withAlpha('#fca5a5', 0.42))
        grad.addColorStop(0.6, withAlpha('#ef4444', 0.18))
        grad.addColorStop(1, withAlpha('#ef4444', 0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(o.x, o.y)
        ctx.arc(o.x, o.y, b.len * S, b.a - spread, b.a + spread)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        ctx.fillStyle = '#fff1f2'
        ctx.beginPath()
        ctx.arc(o.x, o.y, 7, 0, TAU)
        ctx.fill()
      }

      // pillars are drawn over the beams: hiding behind them is the mechanic
      for (const pl of pillars) {
        ctx.fillStyle = 'rgba(38,9,9,0.97)'
        ctx.fillRect(O + pl.x * S, Oy + pl.y * S, pl.w * S, pl.h * S)
        ctx.strokeStyle = withAlpha('#fda4af', 0.5)
        ctx.lineWidth = 1.5
        ctx.strokeRect(O + pl.x * S, Oy + pl.y * S, pl.w * S, pl.h * S)
      }

      // pillars go over the beams: that is the whole point of them
      for (const pl of pillars) {
        ctx.fillStyle = 'rgba(38,9,9,0.97)'
        ctx.fillRect(O + pl.x * S, Oy + pl.y * S, pl.w * S, pl.h * S)
        ctx.strokeStyle = withAlpha('#fda4af', 0.5)
        ctx.lineWidth = 1.5
        ctx.strokeRect(O + pl.x * S, Oy + pl.y * S, pl.w * S, pl.h * S)
      }

      // the shield
      const shieldX = O + 1080 * S
      const open = st.shieldOpen
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const sg = ctx.createLinearGradient(shieldX - 26, 0, shieldX + 10, 0)
      sg.addColorStop(0, withAlpha('#facc15', open ? 0.05 : 0.4))
      sg.addColorStop(1, withAlpha('#facc15', open ? 0 : 0.1))
      ctx.fillStyle = sg
      ctx.fillRect(shieldX - 26, Oy, 36, st.arenaH * S)
      ctx.restore()
      ctx.font = '600 10px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = withAlpha('#fde68a', 0.8)
      ctx.fillText(open ? 'PHASED' : 'SHIELD', shieldX - 8, Oy - 8)

      // the eye / core
      const core = toScreen(1128, st.arenaH / 2)
      const pulse = 0.7 + 0.3 * Math.sin(st.time * 2)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const rg = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, 90 * S * pulse)
      rg.addColorStop(0, withAlpha('#facc15', 0.9))
      rg.addColorStop(0.4, withAlpha('#ef4444', 0.4))
      rg.addColorStop(1, withAlpha('#ef4444', 0))
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.arc(core.x, core.y, 90 * S * pulse, 0, TAU)
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = withAlpha('#fde68a', 0.9)
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(core.x, core.y, 34 * S, 0, TAU)
      ctx.stroke()
      ctx.fillStyle = st.phase > 0 ? '#fef08a' : '#450a0a'
      ctx.beginPath()
      ctx.arc(core.x, core.y, 22 * S, 0, TAU)
      ctx.fill()
      // the loop: a gap with no answer stored in it
      ctx.strokeStyle = '#fffbeb'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(core.x, core.y, 12 * S, st.time * 1.2, st.time * 1.2 + 2.2)
      ctx.stroke()

      for (const sh of shards) {
        if (sh.taken) continue
        const q = toScreen(sh.x, sh.y)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = withAlpha('#facc15', 0.9)
        ctx.beginPath()
        ctx.arc(q.x, q.y, 7, 0, TAU)
        ctx.fill()
        ctx.restore()
      }

      // player
      const q = toScreen(p.x, p.y)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const pg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, st.r * 3.4)
      pg.addColorStop(0, withAlpha(st.charge > 0.5 ? '#facc15' : '#fca5a5', 0.9))
      pg.addColorStop(1, withAlpha('#ef4444', 0))
      ctx.fillStyle = pg
      ctx.beginPath()
      ctx.arc(q.x, q.y, st.r * 3.4, 0, TAU)
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = '#fff7ed'
      ctx.beginPath()
      ctx.arc(q.x, q.y, st.r, 0, TAU)
      ctx.fill()
      if (st.charge > 0.05) {
        ctx.strokeStyle = withAlpha('#facc15', 0.9)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(q.x, q.y, st.r + 5 + st.charge * 8, 0, TAU)
        ctx.stroke()
      }

      if (st.flash > 0 && !t.calm) {
        ctx.fillStyle = withAlpha('#fff1f2', st.flash * 0.25)
        ctx.fillRect(0, 0, t.width, t.height)
      }

      ctx.restore() // end hall clip

      particles.render(ctx)
      if (shake.active) ctx.restore()

      if (st.phase === 0) {
        // redacted: the gauge is not connected to the machine any more
        const shown = has(t.run, 'redacted')
          ? clamp01(st.seen * 0.5 + 0.25 + 0.25 * Math.sin(st.time * 2.3))
          : st.seen
        hudBar(t, shown * 100, '#ef4444', has(t.run, 'redacted') ? 'GAUGE?' : 'BEING MEASURED', 100)
        hudCounters(t, [`LOOP FRAGMENTS  ${st.taken}/${shards.length}`])
        hudText(
          t,
          has(t.run, 'redacted')
            ? 'The gauge is disconnected. Watch the beams.'
            : st.beamHit
              ? 'IN THE BEAM — move, or phase thin'
              : 'You are currently undecided. Enjoy it.',
          t.width / 2,
          66,
          st.beamHit ? '#fca5a5' : 'rgba(254,202,202,0.6)',
          'center',
          15,
        )
        // the hall is centred, so the prompt goes in the clear band above it
        hint(
          t,
          'Pillars block beams. Hold PHASE while still to slip the shield.',
          clamp01(st.hintT / 4),
          t.height * 0.16,
        )
      } else {
        banner(
          t,
          'THE LOOP IS OPEN',
          'It has never held an answer. What do you put in it?',
          clamp(1 - (s.width / 900), 0.6, 1),
        )
        const opts = [
          { y: t.height * 0.5, label: '↑  LEAVE IT EMPTY', color: '#a3e635' },
          { y: t.height * 0.5 + 62, label: '↓  FILL IT IN', color: '#f87171' },
        ]
        ctx.save()
        ctx.font = '700 17px ui-monospace, monospace'
        ctx.textAlign = 'center'
        opts.forEach((o, i) => {
          const on = st.choice === i
          ctx.fillStyle = on ? o.color : 'rgba(254,202,202,0.45)'
          ctx.fillText(on ? `▸ ${o.label} ◂` : o.label, t.width / 2, o.y)
        })
        ctx.font = '600 13px ui-monospace, monospace'
        ctx.fillStyle = 'rgba(254,226,226,0.7)'
        ctx.fillText('SPACE to commit', t.width / 2, t.height * 0.5 + 100)
        ctx.restore()
      }
    },
  }
}

export const collapserScene: Scene = {
  id: 'collapser',
  intro: {
    title: 'The Collapser',
    body: 'The machine at the heart of the Lattice has been measuring everything into one dull answer for a thousand years. It wants, very much, to be surprised. Cross the hall between the beams, phase the shield, and reach the gap in its eye where no answer is stored.',
    controls: [
      '← → ↑ ↓  move',
      'HOLD PHASE while still  get thin and fast',
      'Pillars hide you from the beams',
      'At the core: ↑ or ↓ to choose',
    ],
  },
  create,
}

