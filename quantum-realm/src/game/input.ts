import { clamp } from './math'
import type { InputState, Vec2 } from './types'

const KEY_MAP: Record<string, keyof InputState | undefined> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'jump',
  KeyZ: 'jump',
  ShiftLeft: 'alt',
  ShiftRight: 'alt',
  KeyX: 'alt',
  KeyJ: 'alt',
  KeyK: 'alt',
  Enter: 'jump',
}

/**
 * Merges keyboard, pointer and on-screen touch controls into one state object.
 * Edge-triggered flags are cleared at the end of each frame by `endFrame`.
 */
export class InputManager {
  readonly state: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    alt: false,
    jumpPressed: false,
    altPressed: false,
    pointer: null,
    pointerDown: false,
    pointerPressed: false,
    touch: false,
    anyPressed: false,
  }

  private keyDown = new Set<string>()
  private virtual = { left: false, right: false, up: false, down: false, jump: false, alt: false }
  private jumpQueued = false
  private altQueued = false
  private pointerQueued = false
  private anyQueued = false
  private listeners: (() => void)[] = []
  private toLogical: (clientX: number, clientY: number) => Vec2 = (x, y) => ({ x, y })

  attach(canvas: HTMLCanvasElement, toLogical: (cx: number, cy: number) => Vec2) {
    this.toLogical = toLogical
    const on = <K extends keyof WindowEventMap>(
      target: EventTarget,
      type: K | string,
      fn: (ev: never) => void,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, fn as EventListener, opts)
      this.listeners.push(() => target.removeEventListener(type, fn as EventListener, opts))
    }

    on(window, 'keydown', (ev: KeyboardEvent) => {
      if (ev.repeat) return
      const tag = (ev.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const mapped = KEY_MAP[ev.code]
      if (mapped) {
        this.keyDown.add(mapped as string)
        this.anyQueued = true
        if (mapped === 'jump') this.jumpQueued = true
        if (mapped === 'alt') this.altQueued = true
        ev.preventDefault()
      }
    })
    on(window, 'keyup', (ev: KeyboardEvent) => {
      const mapped = KEY_MAP[ev.code]
      if (mapped) this.keyDown.delete(mapped as string)
    })
    on(window, 'blur', () => this.keyDown.clear())

    on(canvas, 'pointerdown', (ev: PointerEvent) => {
      this.state.pointer = this.toLogical(ev.clientX, ev.clientY)
      this.state.pointerDown = true
      this.pointerQueued = true
      this.anyQueued = true
      if (ev.pointerType === 'touch') this.state.touch = true
      canvas.setPointerCapture?.(ev.pointerId)
    })
    on(canvas, 'pointermove', (ev: PointerEvent) => {
      if (ev.pointerType === 'touch') this.state.touch = true
      this.state.pointer = this.toLogical(ev.clientX, ev.clientY)
    })
    const up = (ev: PointerEvent) => {
      this.state.pointerDown = false
      void ev
    }
    on(canvas, 'pointerup', up)
    on(canvas, 'pointercancel', up)
    on(canvas, 'contextmenu', (ev: Event) => ev.preventDefault())
  }

  /** Wire an on-screen button; returns a cleanup fn. */
  bindVirtual(
    name: keyof typeof this.virtual,
    el: HTMLElement,
    opts: { toggle?: boolean } = {},
  ) {
    const set = (v: boolean) => {
      this.virtual[name] = v
      if (v) {
        this.state.touch = true
        this.anyQueued = true
        if (name === 'jump') this.jumpQueued = true
        if (name === 'alt') this.altQueued = true
      }
      el.classList.toggle('is-active', v)
    }
    const down = (ev: Event) => {
      ev.preventDefault()
      if (opts.toggle && this.virtual[name]) {
        set(false)
        return
      }
      set(true)
    }
    const up = () => {
      if (!opts.toggle) set(false)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointerleave', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointerleave', up)
      el.removeEventListener('pointercancel', up)
    }
  }

  /** Recompute derived flags. Call at the top of the frame. */
  beginFrame() {
    const s = this.state
    for (const k of ['left', 'right', 'up', 'down', 'jump', 'alt'] as const) {
      s[k] = this.keyDown.has(k) || this.virtual[k]
    }
    s.jumpPressed = this.jumpQueued
    s.altPressed = this.altQueued
    s.pointerPressed = this.pointerQueued
    s.anyPressed = this.anyQueued
    // keyboard edge triggers should not fire for held keys
    this.jumpQueued = false
    this.altQueued = false
    this.pointerQueued = false
    this.anyQueued = false
  }

  detach() {
    for (const off of this.listeners) off()
    this.listeners = []
    this.keyDown.clear()
    for (const k of Object.keys(this.virtual) as (keyof typeof this.virtual)[]) {
      this.virtual[k] = false
    }
    this.jumpQueued = false
    this.altQueued = false
    this.pointerQueued = false
    this.state.pointerDown = false
  }

  /** D-pad direction from the virtual stick, if present. */
  get axis(): Vec2 {
    const s = this.state
    let x = (s.right ? 1 : 0) - (s.left ? 1 : 0)
    let y = (s.down ? 1 : 0) - (s.up ? 1 : 0)
    const m = Math.hypot(x, y)
    if (m > 1) {
      x /= m
      y /= m
    }
    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) }
  }
}

/** Shared instance so on-screen controls can drive the same input state. */
export const gameInput = new InputManager()
