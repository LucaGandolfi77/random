import { has } from '../anomalies'
import { clamp, clamp01, TAU } from '../math'
import {
  Particles,
  Shaker,
  Starfield,
  drawBackdrop,
  drawGroundGlow,
  drawParallax,
  withAlpha,
} from '../draw'
import { hint, hudBar, hudCounters, hudText } from '../hud'
import type { Scene, SceneContext, SceneState } from '../types'

/**
 * Barrier Reef: momentum plus thinness.
 * Standing still and holding PHASE thins you out; the thickness you can beat
 * falls off with exp(-2kL), which the HUD shows honestly, including when you fail.
 */

interface Wall {
  x: number
  y: number
  w: number
  h: number
  /** Required thinness to pass, 0..1 (derived from thickness). */
  need: number
  beaten: boolean
  flex: number
}

interface Node {
  x: number
  y: number
  taken: boolean
  phase: number
}

/** Barrier thickness -> minimum thinness needed, via the textbook exp(-2kL). */
const requiredThinness = (thickness: number) =>
  clamp01(1 - Math.log(1 + thickness / 26) / Math.log(1 + 150 / 26))

/** Honest tunneling probability for the current charge, shown before you commit. */
const tunnelingChance = (need: number, charge: number) =>
  Math.exp(-26 * Math.max(0, need - charge) ** 1.4)

function create(s: SceneContext): SceneState {
  const groundY = s.height * 0.76
  const levelW = Math.max(s.width * 1.7, 2700)
  const wall = (x: number, thickness: number) => ({
    x,
    y: groundY - 200,
    w: thickness,
    h: 200,
    need: requiredThinness(thickness),
    beaten: false,
    flex: 0,
  })
  // thick_reef widens everything; the required thinness is derived from width
  const reefMul = s.run?.anomalies.includes('thick_reef') ? 1.4 : 1
  const walls: Wall[] = [
    wall(430, 12),
    wall(880, 34),
    wall(1320, 56),
    wall(1760, 30),
    wall(2200, 74),
  ].map((w) => ({ ...w, w: w.w * reefMul, need: requiredThinness(w.w * reefMul) }))
  const nodes: Node[] = [
    { x: 250, y: groundY - 58, taken: false, phase: 0 },
    { x: 660, y: groundY - 108, taken: false, phase: 0.8 },
    { x: 1180, y: groundY - 130, taken: false, phase: 1.6 },
    { x: 1620, y: groundY - 150, taken: false, phase: 2.4 },
    { x: 2050, y: groundY - 122, taken: false, phase: 3.1 },
    { x: 2440, y: groundY - 96, taken: false, phase: 4 },
  ]
  // low ledges only: charging makes you slow, so the level stays close to the floor
  const platforms = [
    { x: 1130, y: groundY - 78, w: 120 },
    { x: 1580, y: groundY - 96, w: 110 },
    { x: 2000, y: groundY - 70, w: 130 },
  ]

  const p = {
    x: 90,
    y: groundY - 20,
    vx: 0,
    vy: 0,
    r: 20,
    onGround: true,
  }
  const particles = new Particles()
  const stars = new Starfield(70, ['#22d3ee', '#a3e635', '#67e8f9'])
  const shake = new Shaker()
  const st = {
    time: 0,
    cam: 0,
    levelW,
    groundY,
    color: '#22d3ee',
    charge: 0,
    energy: 100,
    taken: 0,
    passed: 0,
    lastNeed: 0,
    lastChance: 1,
    hintT: 10,
  }

  const ground = { x: -200, y: groundY, w: levelW + 400, h: 2000 }

  const collideGround = () => {
    if (p.y + p.r > ground.y && p.y - p.r < ground.y + ground.h) {
      p.y = ground.y - p.r
      if (p.vy > 0) p.onGround = true
      p.vy = 0
    } else {
      p.onGround = false
    }
    for (const pl of platforms) {
      const top = { x: pl.x, y: pl.y, w: pl.w, h: 14 }
      if (p.y + p.r > top.y && p.y - p.r < top.y + top.h && p.x + p.r > top.x && p.x - p.r < top.x + top.w) {
        p.y = top.y - p.r
        p.vy = 0
        p.onGround = true
      }
    }
  }

  const state: SceneState = {
    update(t) {
      st.time += t.dt
      const still = !t.input.left && !t.input.right
      const thinning = t.input.alt && still
      st.hintT = Math.max(0, st.hintT - t.dt)

      if (thinning) {
        st.charge = clamp01(st.charge + (st.charge < 0.4 ? 0.85 : 0.4) * t.dt)
        if (Math.random() < t.dt * 16) {
          particles.spawn({
            x: p.x + (Math.random() - 0.5) * 46,
            y: p.y + (Math.random() - 0.5) * 46,
            vx: (Math.random() - 0.5) * 30,
            vy: -20 - Math.random() * 40,
            color: '#a3e635',
            size: 2.5,
            life: 0.5,
          })
        }
      } else {
        st.charge = clamp01(st.charge - t.dt * (has(t.run, 'brutal_breeze') ? 0.75 : 0.3))
      }
      p.r = 20 + (4.5 - 20) * st.charge

      const speed = 230 * (1 - st.charge * 0.45)
      const dir = (t.input.right ? 1 : 0) - (t.input.left ? 1 : 0)
      p.vx += (dir * speed - p.vx) * Math.min(1, t.dt * (p.onGround ? 14 : 6))
      const grav = 1700 * (has(t.run, 'extra_mass') ? 1.45 : 1)
      p.vy = Math.min(p.vy + grav * t.dt * (0.5 + st.charge * 0.5), 1000)

      if (t.input.jumpPressed && p.onGround) {
        p.vy = -430 - st.charge * 90
        p.onGround = false
        t.audio.jump()
      }

      p.x += p.vx * t.dt
      p.x = clamp(p.x, 30, st.levelW - 30)
      if (p.x <= 30 || p.x >= st.levelW - 30) p.vx = 0
      p.y += p.vy * t.dt
      collideGround()

      // barriers
      st.lastNeed = 0
      for (const w of walls) {
        w.flex = Math.max(0, w.flex - t.dt * 2.5)
        if (w.beaten) continue
        if (w.x + w.w < p.x - 90 || w.x > p.x + 90) continue
        st.lastNeed = w.need
        st.lastChance = tunnelingChance(w.need, st.charge)
        const hit =
          p.x + p.r > w.x && p.x - p.r < w.x + w.w && p.y + p.r > w.y && p.y - p.r < w.y + w.h
        if (!hit) continue
        if (st.charge >= w.need) {
          w.beaten = true
          st.passed++
          t.addScore(200 + Math.round(st.energy))
          t.audio.phase()
          particles.burst(w.x + w.w / 2, p.y, 26, '#a3e635', { life: 0.6, speed: 200 })
          if (!t.calm) shake.add(0.7)
          t.toast('Tunnelled. The wall was only a rumour about its own thickness.')
        } else {
          p.x = p.vx > 0 ? w.x - p.r : w.x + w.w + p.r
          p.vx *= -0.25
          w.flex = 1
          if (!t.calm) shake.add(0.35)
          t.audio.bad()
          t.addScore(10)
          st.energy = Math.max(0, st.energy - (has(t.run, 'resonance') ? 12 : 6))
          t.toast(
            `T ≈ ${(st.lastChance * 100).toFixed(0)}%. Too fat — hold PHASE longer.`,
            1.8,
          )
        }
      }

      for (const n of nodes) {
        if (n.taken) continue
        const bob = Math.sin(st.time * 1.6 + n.phase) * 10
        if (Math.hypot(n.x - p.x, n.y + bob - p.y) < 30 + p.r) {
          n.taken = true
          st.taken++
          t.addScore(120)
          t.audio.collect()
          particles.burst(n.x, n.y + bob, 20, '#67e8f9', { life: 0.6, speed: 190 })
        }
      }

      t.setProgress((st.taken / nodes.length) * 0.4 + (st.passed / walls.length) * 0.6)
      st.energy = Math.max(0, st.energy - t.dt * 0.7 * t.pressure)
      if (st.energy <= 0) {
        t.onLose()
        return
      }

      particles.update(t.dt)
      shake.update(t.dt)
      particles.trail(p.x, p.y, st.charge > 0.5 ? '#a3e635' : st.color, 3, 0.35)
      st.cam = clamp(p.x - t.width * 0.42, 0, Math.max(0, st.levelW - t.width))
      t.observation = st.charge

      if (st.passed === walls.length || p.x > st.levelW - 130) t.onWin()
    },

    peek() {
      const next = walls.find((w) => !w.beaten && w.x + w.w > p.x)
      return {
        x: p.x,
        y: p.y,
        charge: st.charge,
        need: next ? next.need : 0,
        wallDx: next ? next.x - p.x : 9999,
        passed: st.passed,
        totalWalls: walls.length,
        taken: st.taken,
        totalNodes: nodes.length,
        energy: st.energy,
      }
    },

    render(t) {
      const ctx = t.ctx
      if (shake.active) ctx.save()
      if (shake.active) ctx.translate(shake.x, shake.y)

      drawBackdrop(ctx, t.width, t.height, st.time, '#062b3a', '#03080f')
      stars.render(ctx, t.width, t.height, st.time)
      drawParallax(ctx, t.width, st.cam, st.time, '#0d4a63', st.groundY)

      const g = ctx.createLinearGradient(0, st.groundY, 0, t.height)
      g.addColorStop(0, withAlpha(st.color, 0.4))
      g.addColorStop(0.4, withAlpha(st.color, 0.1))
      g.addColorStop(1, 'rgba(2,10,16,0.98)')
      ctx.fillStyle = g
      ctx.fillRect(0, st.groundY, t.width, t.height - st.groundY)
      ctx.fillStyle = withAlpha(st.color, 0.9)
      ctx.fillRect(0, st.groundY - 2, t.width, 2)

      for (const pl of platforms) {
        const x = pl.x - st.cam
        if (x > t.width + 80 || x + pl.w < -80) continue
        ctx.fillStyle = 'rgba(10,40,52,0.95)'
        ctx.fillRect(x, pl.y, pl.w, 14)
        ctx.fillStyle = withAlpha('#a3e635', 0.6)
        ctx.fillRect(x, pl.y, pl.w, 2)
      }

      for (const w of walls) {
        const x = w.x - st.cam
        if (x > t.width + 80 || x + w.w < -80) continue
        if (w.beaten) {
          ctx.fillStyle = withAlpha('#a3e635', 0.13)
          ctx.fillRect(x, w.y, w.w, w.h)
          continue
        }
        const flex = w.flex
        ctx.fillStyle = `rgba(24,58,74,${Math.min(1, 0.92 + flex * 0.08)})`
        ctx.fillRect(x, w.y - flex * 3, w.w, w.h + flex * 6)
        ctx.fillStyle = withAlpha('#67e8f9', 0.55)
        ctx.fillRect(x, w.y - flex * 3, w.w, 3)
        ctx.strokeStyle = withAlpha('#7dd3fc', 0.16 + flex * 0.5)
        ctx.lineWidth = 1
        for (let y = w.y + 9; y < w.y + w.h; y += 10) {
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + w.w, y)
          ctx.stroke()
        }
        const ok = st.charge >= w.need
        ctx.font = '600 11px ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = ok ? '#a3e635' : 'rgba(186,230,253,0.85)'
        ctx.fillText(
          `T≈${(tunnelingChance(w.need, st.charge) * 100).toFixed(0)}%`,
          x + w.w / 2,
          w.y - 12,
        )
      }

      for (const n of nodes) {
        if (n.taken) continue
        const x = n.x - st.cam
        if (x > t.width + 60 || x < -60) continue
        const bob = Math.sin(st.time * 1.6 + n.phase) * 10
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = withAlpha('#67e8f9', 0.9)
        ctx.beginPath()
        ctx.arc(x, n.y + bob, 7, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = withAlpha('#a3e635', 0.5)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, n.y + bob, 14 + Math.sin(st.time * 3 + n.phase) * 4, 0, TAU)
        ctx.stroke()
        ctx.restore()
      }

      const gateX = st.levelW - 100 - st.cam
      if (gateX < t.width + 100) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const gg = ctx.createLinearGradient(gateX, 0, gateX + 70, 0)
        gg.addColorStop(0, withAlpha('#a3e635', 0))
        gg.addColorStop(1, withAlpha('#a3e635', 0.4))
        ctx.fillStyle = gg
        ctx.fillRect(gateX, st.groundY - 230, 70, 230)
        ctx.restore()
        ctx.strokeStyle = withAlpha('#a3e635', 0.8)
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(gateX + 25, st.groundY - 230)
        ctx.lineTo(gateX + 25, st.groundY)
        ctx.stroke()
      }

      const cx = p.x - st.cam
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const rg = ctx.createRadialGradient(cx, p.y, 0, cx, p.y, p.r * 3.4)
      rg.addColorStop(0, withAlpha(st.charge > 0.5 ? '#a3e635' : st.color, 0.9))
      rg.addColorStop(1, withAlpha(st.color, 0))
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.arc(cx, p.y, p.r * 3.4, 0, TAU)
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = '#f0fdfa'
      ctx.beginPath()
      ctx.arc(cx, p.y, Math.max(3, p.r), 0, TAU)
      ctx.fill()
      if (st.lastNeed > 0) {
        ctx.strokeStyle = withAlpha(st.charge >= st.lastNeed ? '#a3e635' : '#f87171', 0.8)
        ctx.lineWidth = 2
        ctx.setLineDash([3, 4])
        ctx.beginPath()
        ctx.arc(cx, p.y, 20 * (0.35 + st.lastNeed * 0.65), 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
      }

      if (p.onGround) drawGroundGlow(ctx, cx, st.groundY, 44, st.color, 0.35)

      particles.render(ctx)
      if (shake.active) ctx.restore()

      hudBar(t, st.charge * 100, '#a3e635', 'THINNESS', 100)
      hudCounters(t, [
        `MOTES  ${st.taken}/${nodes.length}`,
        `BARRIERS  ${st.passed}/${walls.length}`,
        `ENERGY  ${Math.round(st.energy)}`,
      ])
      if (st.lastNeed > 0) {
        hudText(
          t,
          `T ≈ ${(st.lastChance * 100).toFixed(1)}%`,
          t.width / 2,
          66,
          st.charge >= st.lastNeed ? '#a3e635' : '#fda4af',
          'center',
          18,
        )
      }
      hint(t, 'Stand still + hold PHASE until T ≈ 100%', clamp01(st.hintT / 3.5))
    },
  }
  return state
}

export const tunnelScene: Scene = {
  id: 'tunnel',
  intro: {
    title: 'The Barrier Reef',
    body: 'Five barriers stand between you and the far gate. You cannot jump them and you cannot break them. Hold PHASE while standing still to thin out — the thinner you are, the thicker a wall you can slip through.',
    controls: [
      '← →  move',
      'SPACE  hop',
      'HOLD PHASE while still  thin out',
      'Thinness leaks slowly once you move',
    ],
  },
  create,
}
