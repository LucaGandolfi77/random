import { useEffect, useRef } from 'react'
import { audio } from '../game/audio'
import { gameInput } from '../game/input'
import { useGame } from '../game/store'
import { getScene } from '../game/scenes'
import type { Ending, RunConfig } from '../game/types'
import type { SceneContext, SceneId, SceneState } from '../game/types'
import { clamp } from '../game/math'

/** Design width; height follows the viewport aspect so the layout never breaks. */
const DESIGN_W = 900
/** How often playtime is pushed to the store (and therefore to localStorage). */
const SAVE_INTERVAL = 5
/** Seconds of staying unobserved before the streak pays out. */
const STREAK_STEP = 4

interface Props {
  sceneId: SceneId
  /** Bumping this restarts the scene from scratch. */
  runId: number
  paused: boolean
  onResult: (result: { won: boolean; score: number; ending?: Ending }) => void
  onQuit: () => void
  /** Anomalies and Recursion level for this attempt. */
  run: RunConfig
  /** Live difficulty pressure, so scenes can scale their drains. */
  pressure: number
  /** Suppress full-screen flashes. */
  photosensitive: boolean
}

export function GameView({
  sceneId,
  runId,
  paused,
  onResult,
  onQuit,
  run,
  pressure,
  photosensitive,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const toastRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const muted = useGame((s) => s.muted)
  const volume = useGame((s) => s.volume)
  const showTouch = useGame((s) => s.showTouch)
  const reduceMotion = useGame((s) => s.reduceMotion)
  const addSeconds = useGame((s) => s.addSeconds)

  // The loop must not be torn down because its parent re-rendered, so the two
  // callbacks are held in refs and the effect depends only on real inputs.
  const resultRef = useRef(onResult)
  const quitRef = useRef(onQuit)
  useEffect(() => {
    resultRef.current = onResult
    quitRef.current = onQuit
  }, [onResult, onQuit])

  useEffect(() => {
    audio.setMuted(muted)
  }, [muted])
  useEffect(() => {
    audio.setVolume(volume)
  }, [volume])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const scene = getScene(sceneId)
    audio.setRegion(sceneId)
    const input = gameInput
    const reduce = reduceMotion
    const touchOn = showTouch ?? false
    const calm = reduce || photosensitive

    let vw = DESIGN_W
    let vh = 600
    let dpr = 1
    let raf = 0
    let last = performance.now()
    let elapsed = 0
    let score = 0
    let done = false
    let toastText = ''
    let toastUntil = 0
    // the streak: stay unobserved long enough and the region starts paying you
    // for it. This is the only place `observation` was ever going to be cashed.
    let streak = 0
    let streakLevel = 0
    let nextStreakAt = STREAK_STEP
    let streakFlash = 0
    // playtime is accumulated here and flushed on an interval: the store is
    // persisted, and writing it sixty times a second would thrash localStorage.
    let pendingSeconds = 0
    let saveTimer = window.setInterval(() => {
      if (pendingSeconds > 0) {
        addSeconds(pendingSeconds)
        pendingSeconds = 0
      }
    }, SAVE_INTERVAL * 1000)

    const makeContext = (): SceneContext => ({
      ctx,
      width: vw,
      height: vh,
      time: elapsed,
      dt: 0,
      input: input.state,
      audio,
      setProgress: () => {
        /* progress is read from the scene's own render */
      },
      addScore: (v) => {
        // anomalies and the Recursion layer pay out here, once, centrally
        score += v * run.scoreMul
      },
      onWin: (ending) => finish(true, ending),
      onLose: () => finish(false),
      toast: (text, seconds = 2.4) => {
        toastText = text
        toastUntil = performance.now() + seconds * 1000
      },
      observation: 0,
      touch: touchOn,
      // scenes read this to stay out of the way of an on-screen message
      toastActive: false,
      run,
      pressure,
      calm,
    })

    let state: SceneState = scene.create(makeContext())

    const finish = (won: boolean, ending?: Ending) => {
      if (done) return
      done = true
      if (won) audio.win()
      else audio.lose()
      resultRef.current({ won, score: Math.round(score), ending })
    }

    const measure = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width < 1) return null
      return clamp(Math.round((rect.height / rect.width) * DESIGN_W), 460, 1200)
    }

    const attach = (nextVh: number) => {
      vh = nextVh
      dpr = Math.min(window.devicePixelRatio || 1, reduce ? 1 : 2)
      canvas.width = Math.round(vw * dpr)
      canvas.height = Math.round(vh * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      input.attach(canvas, (clientX, clientY) => {
        const r = canvas.getBoundingClientRect()
        return {
          x: ((clientX - r.left) / r.width) * vw,
          y: ((clientY - r.top) / r.height) * vh,
        }
      })
    }

    const first = measure()
    if (first) attach(first)
    state = scene.create(makeContext())

    // Region geometry is laid out against the height the scene was born with.
    // A small window nudge just rescales the canvas; a big one (a phone being
    // turned over) needs a clean restart or the ground ends up off-screen.
    const onResize = () => {
      const next = measure()
      if (!next) return
      const moved = Math.abs(next - vh) / vh
      if (moved > 0.08 && !done) {
        attach(next)
        state = scene.create(makeContext())
        toastText = 'The Lattice refitted itself. Try that again.'
        toastUntil = performance.now() + 2400
        return
      }
      attach(next)
    }
    window.addEventListener('resize', onResize)
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') quitRef.current()
    }
    window.addEventListener('keydown', onKey)

    let started = false
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // The rAF timestamp is the time the frame began, which can predate the
      // performance.now() we recorded when setting up. Never let dt go negative.
      if (!started) {
        started = true
        last = now
      }
      const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 20)
      last = now
      input.beginFrame()
      if (paused) return

      elapsed += dt
      pendingSeconds += dt
      const s = makeContext()
      s.dt = dt
      s.toastActive = now < toastUntil
      // dt can legitimately be 0 on the first frame; scenes that divide by it
      // would rather not hear about it.
      if (dt > 0) state.update(s)

      // scenes report how observed you are; the loop turns that into a streak
      if (s.observation < 0.15) streak = Math.min(30, streak + dt)
      else if (s.observation > 0.6) streak = 0
      if (streak >= nextStreakAt) {
        streakLevel++
        nextStreakAt += STREAK_STEP
        score += 40 * streakLevel
        streakFlash = 1
      }
      streakFlash = Math.max(0, streakFlash - dt * 1.6)

      ctx.save()
      state.render(s)
      ctx.restore()

      const chip = chipRef.current
      if (chip) {
        const show = streakLevel > 0 && streakFlash > 0.02
        chip.style.opacity = show ? String(streakFlash) : '0'
        if (show) chip.textContent = `UNOBSERVED  ×${streakLevel}  +${40 * streakLevel * streakLevel}`
      }

      const toast = toastRef.current
      if (toast) {
        const msg = s.toastActive ? toastText : ''
        if (toast.textContent !== msg) toast.textContent = msg
        toast.style.opacity = msg ? '1' : '0'
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(saveTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      input.detach()
      state.dispose?.()
      if (pendingSeconds > 0) addSeconds(pendingSeconds)
    }
  }, [
    sceneId,
    runId,
    paused,
    addSeconds,
    muted,
    volume,
    reduceMotion,
    showTouch,
    run,
    pressure,
    photosensitive,
  ])

  return (
    <div className="gameview">
      <canvas
        ref={canvasRef}
        className="gameview__canvas"
        role="img"
        aria-label="Game view. Use the arrow keys to move, space to jump, hold shift to phase."
      />
      <div className="gameview__crt" aria-hidden="true" />
      <div ref={chipRef} className="gameview__chip" aria-hidden="true" />
      <div ref={toastRef} className="gameview__toast" aria-live="polite" />
    </div>
  )
}
