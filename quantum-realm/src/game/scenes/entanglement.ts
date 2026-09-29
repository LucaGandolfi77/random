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
 * Entanglement Vines.
 * You control one body. Qubit-two is fixed to your position at a constant
 * distance and has no opinions of its own: no gravity, no steering, no
 * message. Move and the two of you rotate through the hall together like a
 * dumbbell with opinions.
 *
 * The Astronomer sweeps a measurement lens up and down the vines. Be holding
 * both plates while she looks and she writes it down, and the gate forgets
 * you. Wait for the lull.
 */

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface Plate {
  x: number
  y: number
  r: number
  pressed: boolean
  color: string
}

interface Mote {
  x: number
  y: number
  taken: boolean
  phase: number
}

const TETHER_BASE = 200

function circleBox(
  c: { x: number; y: number; r: number },
  b: Box,
): { nx: number; ny: number; depth: number } | null {
  const cx = clamp(c.x, b.x, b.x + b.w)
  const cy = clamp(c.y, b.y, b.y + b.h)
  const dx = c.x - cx
  const dy = c.y - cy
  const d2 = dx * dx + dy * dy
  if (d2 > c.r * c.r) return null
  const d = Math.sqrt(d2)
  if (d < 0.0001) {
    const left = c.x - b.x
    const right = b.x + b.w - c.x
    const top = c.y - b.y
    const bottom = b.y + b.h - c.y
    const m = Math.min(left, right, top, bottom)
    if (m === left) return { nx: -1, ny: 0, depth: left + c.r }
    if (m === right) return { nx: 1, ny: 0, depth: right + c.r }
    if (m === top) return { nx: 0, ny: -1, depth: top + c.r }
    return { nx: 0, ny: 1, depth: bottom + c.r }
  }
  return { nx: dx / d, ny: dy / d, depth: c.r - d }
}

function create(s: SceneContext): SceneState {
  // long_memory lengthens the correlation, and the plates with it
  const TETHER = TETHER_BASE * (s.run?.anomalies.includes('long_memory') ? 1.3 : 1)
  const HOLD_NEEDED =
    1.6 * (s.run?.anomalies.includes('narrow_window') ? 1.8 : 1)
  const levelW = Math.max(s.width * 1.5, 2500)
  const floorY = s.height * 0.82
  // Pillars stand clear of the 200-unit tether, and never closer together than
  // it, so the pair can always be brought through in line.
  const boxes: Box[] = [
    { x: 1340, y: floorY - 190, w: 24, h: 190 },
    { x: 1960, y: floorY - 190, w: 24, h: 190 },
    { x: 2420, y: floorY - 190, w: 24, h: 190 },
  ]
  // The pair stands 200 apart, so B sits on the left plate when A takes the right.
  const plates: Plate[] = [
    { x: 940 - TETHER / 2, y: floorY - 40, r: 48, pressed: false, color: '#22d3ee' },
    { x: 940 + TETHER / 2, y: floorY - 40, r: 48, pressed: false, color: '#a3e635' },
  ]
  const motes: Mote[] = [
    { x: 420, y: floorY - 260, taken: false, phase: 0 },
    { x: 700, y: floorY - 330, taken: false, phase: 0.9 },
    { x: 1200, y: floorY - 210, taken: false, phase: 1.7 },
    { x: 1620, y: floorY - 300, taken: false, phase: 2.4 },
    { x: 1900, y: floorY - 200, taken: false, phase: 3.2 },
    { x: 2260, y: floorY - 320, taken: false, phase: 4.1 },
  ]

  const A = { x: 120, y: floorY - 16, vx: 0, vy: 0, r: 16 }
  const B = { x: A.x + TETHER, y: A.y, vx: 0, vy: 0, r: 16 }
  // echo_chamber starts the dumbbell cocked, and it settles twice as slowly
  const startSkew = (rad: number) => {
    B.x = A.x + Math.cos(rad) * TETHER
    B.y = A.y + Math.sin(rad) * TETHER
  }
  const particles = new Particles()
  const stars = new Starfield(70, ['#a3e635', '#34d399', '#22d3ee'])
  const st = {
    time: 0,
    cam: 0,
    floorY,
    levelW,
    taken: 0,
    hold: 0,
    alarm: 0,
    hintT: 10,
    lensY: floorY - 200,
    lensOn: false,
    angle: 0,
    cocked: false,
  }

  const resolve = (body: { x: number; y: number; r: number; vx: number; vy: number }) => {
    for (const b of boxes) {
      const hit = circleBox(body, b)
      if (!hit) continue
      body.x += hit.nx * hit.depth
      body.y += hit.ny * hit.depth
      const vn = body.vx * hit.nx + body.vy * hit.ny
      if (vn < 0) {
        body.vx -= hit.nx * vn * 1.3
        body.vy -= hit.ny * vn * 1.3
      }
    }
    if (body.y + body.r > st.floorY) {
      body.y = st.floorY - body.r
      if (body.vy > 0) body.vy = 0
    }
    if (body.y < 70) body.y = 70
    if (body.x < st.cam + body.r) {
      body.x = st.cam + body.r
      body.vx = Math.max(0, body.vx)
    }
  }

  return {
    update(t) {
      st.time += t.dt
      st.hintT = Math.max(0, st.hintT - t.dt)
      if (st.time <= t.dt * 1.5 && has(t.run, 'echo_chamber')) {
        // cocked once, then left alone
        if (!st.cocked) {
          startSkew(-Math.PI + 1.4)
          st.cocked = true
        }
      }

      // The lens sweeps; she spends most of her time looking somewhere else.
      const sweep = Math.sin(st.time * 0.42)
      st.lensY = floorY - 120 - sweep * 170
      const nearLens = Math.abs(sweep) < (has(t.run, 'static_lens') ? 0.94 : 0.72)
      st.lensOn = nearLens
      st.alarm = Math.max(0, st.alarm - t.dt * 1.6)

      const ax = (t.input.right ? 1 : 0) - (t.input.left ? 1 : 0)
      const ay = (t.input.down ? 1 : 0) - (t.input.up ? 1 : 0)
      A.vx += ax * 2500 * t.dt
      A.vy += ay * 2500 * t.dt
      A.vy += 900 * t.dt // you are the one with mass; your twin is not
      const drag = Math.pow(0.0012, t.dt)
      A.vx *= drag
      A.vy *= drag
      A.vx = clamp(A.vx, -420, 420)
      A.vy = clamp(A.vy, -420, 420)
      B.vx *= Math.pow(0.02, t.dt)
      B.vy *= Math.pow(0.02, t.dt)

      const sub = 4
      for (let i = 0; i < sub; i++) {
        const h = Math.max(t.dt / sub, 1e-5)
        const bx0 = B.x
        const by0 = B.y
        A.x += A.vx * h
        A.y += A.vy * h
        B.x += B.vx * h
        B.y += B.vy * h
        resolve(A)
        resolve(B)
        // the entanglement: a rigid link, satisfied instantly, no signal
        let dx = B.x - A.x
        let dy = B.y - A.y
        let d = Math.hypot(dx, dy)
        if (d < 0.0001) {
          dx = 1
          dy = 0
          d = 1
        }
        const nx = dx / d
        const ny = dy / d
        const corr = TETHER - d
        B.x += nx * corr
        B.y += ny * corr
        A.x -= nx * corr * 0.4
        A.y -= ny * corr * 0.4
        B.vx = (B.x - bx0) / h
        B.vy = (B.y - by0) / h
        st.angle = Math.atan2(ny, nx)

        // The vines do not care about up or down, but they do settle level.
        // Rotating B about A is a positional nudge, so it survives the velocity
        // the constraint just recomputed. Circling hard overrides it.
        const cur = Math.atan2(B.y - A.y, B.x - A.x)
        const target = Math.cos(cur) >= 0 ? 0 : Math.PI
        let err = target - cur
        while (err > Math.PI) err -= TAU
        while (err < -Math.PI) err += TAU
        const turn = clamp(err, -1, 1) * 2.4 * h * (has(t.run, 'echo_chamber') ? 0.35 : 1)
        const cs = Math.cos(turn)
        const sn = Math.sin(turn)
        const rx = (B.x - A.x) * cs - (B.y - A.y) * sn
        const ry = (B.x - A.x) * sn + (B.y - A.y) * cs
        B.x = A.x + rx
        B.y = A.y + ry
      }

      const plateDist = (body: { x: number; y: number; r: number }, p: Plate) =>
        Math.hypot(body.x - p.x, body.y - p.y) < p.r + body.r
      const left = plates[0]
      const right = plates[1]
      const aOnLeft = plateDist(A, left) || plateDist(B, left)
      const aOnRight = plateDist(A, right) || plateDist(B, right)
      left.pressed = aOnLeft
      right.pressed = aOnRight

      // one body on each plate, and which body is on which does not matter
      const both = aOnLeft && aOnRight
      if (both && !nearLens) {
        st.hold += t.dt
        t.addScore(t.dt * 300)
      } else if (both && nearLens) {
        st.hold = Math.max(0, st.hold - t.dt * 0.6)
        st.alarm = 1
        t.addScore(t.dt * 80)
        t.audio.bad()
        t.toast('She saw the correlation. Wait for the lens to pass.', 1.4)
      } else {
        st.hold = Math.max(0, st.hold - t.dt * 0.9)
      }

      // the tether itself is the thing she is looking for
      const tetherMidY = (A.y + B.y) / 2
      if (nearLens && Math.abs(tetherMidY - st.lensY) < 46) st.alarm = 1

      t.setProgress(clamp01(st.hold / HOLD_NEEDED) * 0.72 + (st.taken / motes.length) * 0.28)
      if (st.hold >= HOLD_NEEDED) {
        t.onWin()
        return
      }

      for (const m of motes) {
        if (m.taken) continue
        const bob = Math.sin(st.time * 2 + m.phase) * 9
        if (
          Math.hypot(m.x - A.x, m.y + bob - A.y) < 30 ||
          Math.hypot(m.x - B.x, m.y + bob - B.y) < 30
        ) {
          m.taken = true
          st.taken++
          t.addScore(140)
          t.audio.collect()
          particles.burst(m.x, m.y + bob, 18, '#bef264', { life: 0.6, speed: 180 })
        }
      }

      particles.update(t.dt)
      particles.trail(A.x, A.y, '#a3e635', 3, 0.3)
      particles.trail(B.x, B.y, '#34d399', 3, 0.3)
      st.cam = clamp((A.x + B.x) / 2 - t.width * 0.42, 0, Math.max(0, st.levelW - t.width))
      t.observation = clamp01(st.alarm)
      t.audio.setIntensity(0.3 + st.alarm * 0.5 + clamp01(st.hold / HOLD_NEEDED) * 0.4)
    },

    peek() {
      return {
        ax: A.x,
        ay: A.y,
        bx: B.x,
        by: B.y,
        holdPct: st.hold / HOLD_NEEDED,
        lensOn: st.lensOn ? 1 : 0,
        taken: st.taken,
        total: motes.length,
        leftPlate: plates[0].pressed ? 1 : 0,
        rightPlate: plates[1].pressed ? 1 : 0,
      }
    },

    render(t) {
      const ctx = t.ctx
      drawBackdrop(ctx, t.width, t.height, st.time, '#0f2e1a', '#04120a')
      stars.render(ctx, t.width, t.height, st.time)
      drawParallax(ctx, t.width, st.cam, st.time, '#134d2c', st.floorY)

      for (const b of boxes) {
        const x = b.x - st.cam
        if (x > t.width + 80 || x + b.w < -80) continue
        ctx.fillStyle = 'rgba(16,52,32,0.95)'
        ctx.fillRect(x, b.y, b.w, b.h)
        ctx.fillStyle = withAlpha('#86efac', 0.5)
        if (b.w > b.h) ctx.fillRect(x, b.y, b.w, 2)
        else ctx.fillRect(x, b.y, 2, b.h)
      }

      const fy = st.floorY
      const g = ctx.createLinearGradient(0, fy, 0, t.height)
      g.addColorStop(0, withAlpha('#a3e635', 0.32))
      g.addColorStop(0.4, withAlpha('#a3e635', 0.08))
      g.addColorStop(1, 'rgba(4,18,10,0.98)')
      ctx.fillStyle = g
      ctx.fillRect(0, fy, t.width, t.height - fy)
      ctx.fillStyle = withAlpha('#a3e635', 0.6)
      ctx.fillRect(0, fy - 2, t.width, 2)

      for (const p of plates) {
        const x = p.x - st.cam
        if (x > t.width + 80 || x < -80) continue
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = withAlpha(p.color, p.pressed ? 0.9 : 0.3)
        ctx.beginPath()
        ctx.ellipse(x, p.y + 8, p.r, 11, 0, 0, TAU)
        ctx.fill()
        ctx.restore()
        ctx.strokeStyle = withAlpha(p.color, 0.9)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(x, p.y + 8, p.r, 11, 0, 0, TAU)
        ctx.stroke()
        ctx.font = '600 10px ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = withAlpha(p.color, 0.7)
        ctx.fillText('PLATE', x, p.y - 16)
      }

      for (const m of motes) {
        if (m.taken) continue
        const x = m.x - st.cam
        if (x > t.width + 60 || x < -60) continue
        const bob = Math.sin(st.time * 2 + m.phase) * 9
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = withAlpha('#bef264', 0.9)
        ctx.beginPath()
        ctx.arc(x, m.y + bob, 6, 0, TAU)
        ctx.fill()
        ctx.restore()
      }

      // the Astronomer's lens: a sweeping measurement line
      const ly = st.lensY
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const lg = ctx.createLinearGradient(0, ly - 46, 0, ly + 46)
      lg.addColorStop(0, withAlpha('#f472b6', 0))
      lg.addColorStop(0.5, withAlpha('#f472b6', st.lensOn ? 0.42 : 0.16))
      lg.addColorStop(1, withAlpha('#f472b6', 0))
      ctx.fillStyle = lg
      ctx.fillRect(0, ly - 46, t.width, 92)
      ctx.restore()
      ctx.fillStyle = withAlpha('#fbcfe8', st.lensOn ? 0.9 : 0.35)
      ctx.fillRect(0, ly - 1, t.width, 2)

      // the tether: an instant line between two things that cannot talk
      const ax = A.x - st.cam
      const ay = A.y
      const bx = B.x - st.cam
      const by = B.y
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = withAlpha(st.alarm > 0.4 ? '#f472b6' : '#86efac', 0.8)
      ctx.lineWidth = 2.5
      ctx.setLineDash([9, 6])
      ctx.lineDashOffset = -st.time * 40
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      for (const [body, col] of [
        [A, '#a3e635'],
        [B, '#34d399'],
      ] as const) {
        const x = body.x - st.cam
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const rg = ctx.createRadialGradient(x, body.y, 0, x, body.y, body.r * 3)
        rg.addColorStop(0, withAlpha(col, 0.9))
        rg.addColorStop(1, withAlpha(col, 0))
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.arc(x, body.y, body.r * 3, 0, TAU)
        ctx.fill()
        ctx.restore()
        ctx.fillStyle = '#f7fee7'
        ctx.beginPath()
        ctx.arc(x, body.y, body.r, 0, TAU)
        ctx.fill()
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(x, body.y, body.r * 0.45, 0, TAU)
        ctx.fill()
      }

      // the light each body throws down onto the vines
      for (const [body, col] of [
        [A, '#a3e635'],
        [B, '#34d399'],
      ] as const) {
        const sx = body.x - st.cam
        const near = Math.abs(body.y - st.floorY) < 90
        if (near) drawGroundGlow(ctx, sx, st.floorY, 40, col, 0.32)
      }

      particles.render(ctx)

      const holdPct = clamp01(st.hold / HOLD_NEEDED)
      hudBar(t, holdPct * 100, '#a3e635', 'GATE', 100)
      hudCounters(t, [
        `MOTES  ${st.taken}/${motes.length}`,
        `TETHER  ${Math.round(TETHER)}px, fixed, no signal`,
      ])
      hudCentre(
        t,
        st.lensOn
          ? 'SHE IS LOOKING — hold still and hope'
          : holdPct > 0.05
            ? 'HOLD — the gate is listening'
            : 'One body on each plate',
        st.lensOn ? '#f9a8d4' : holdPct > 0.05 ? '#a3e635' : 'rgba(217,249,157,0.6)',
        15,
      )
      hint(
        t,
        `The tether is ${Math.round(TETHER)} long and settles level. Walk right; it trails.`,
        clamp01(st.hintT / 4),
      )
    },
  }
}

export const entanglementScene: Scene = {
  id: 'entanglement',
  intro: {
    title: 'The Entanglement Vines',
    body: 'You are tied to Qubit-two by something that is not a rope: two hundred units of pure correlation, with no gravity and no opinion of its own. Walk right and it comes with you. Seat one of you on each plate at once and hold it while the Astronomer looks somewhere else.',
    controls: [
      '← → ↑ ↓  move (both of you)',
      'The tether is rigid and settles level — walk right, it trails',
      'Press both plates during a lull in the sweep',
    ],
  },
  create,
}
