import type { AudioEngine } from './audio'
import type { RunConfig } from './anomalies'

export interface Vec2 {
  x: number
  y: number
}

export interface Rect extends Vec2 {
  w: number
  h: number
}

export type SceneId =
  | 'flux'
  | 'tunnel'
  | 'interference'
  | 'entanglement'
  | 'uncertainty'
  | 'collapser'

export type Ending = 'good' | 'bad'

export type { RunConfig } from './anomalies'

export interface SceneContext {
  ctx: CanvasRenderingContext2D
  /** Logical design width. Height is derived from the viewport aspect. */
  width: number
  height: number
  /** Seconds since the scene started. */
  time: number
  /** Clamped delta in seconds. */
  dt: number
  input: InputState
  audio: AudioEngine
  /** 0..1 progress towards the current objective. */
  setProgress(v: number): void
  /** Score awarded on success. */
  addScore(v: number): void
  onWin(ending?: Ending): void
  onLose(): void
  /** Free-form toast message, e.g. hints or discoveries. */
  toast(text: string, seconds?: number): void
  /** Multiplier that grows as you avoid being observed. */
  observation: number
  /** True when on-screen controls are taking up the bottom of the screen. */
  touch: boolean
  /** True while a one-off message is on screen, so the HUD can get out of the way. */
  toastActive: boolean
  /** Anomalies in force, plus the Recursion layer. */
  run: RunConfig
  /** 1 + 0.22 per Recursion level: a global difficulty dial. */
  pressure: number
  /** True when flashes and shake should be suppressed. */
  calm: boolean
}

export interface InputState {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  jump: boolean
  /** Held "shift"/secondary action: phase, tunnel, observe. */
  alt: boolean
  jumpPressed: boolean
  altPressed: boolean
  /** Normalized pointer position in logical space, null when untouched. */
  pointer: Vec2 | null
  pointerDown: boolean
  pointerPressed: boolean
  /** True when the player is using touch controls. */
  touch: boolean
  anyPressed: boolean
}

export interface Scene {
  readonly id: SceneId
  /** Copy shown before the scene starts. */
  readonly intro: { title: string; body: string; controls: string[] }
  /** Fresh, mutable state for one playthrough. */
  create(s: SceneContext): SceneState
}

export interface SceneState {
  update(s: SceneContext): void
  render(s: SceneContext): void
  /** Flat telemetry for the automated playtest bot. Dev convenience only. */
  peek?(): Record<string, number | boolean>
  dispose?(): void
}

export interface SectorDef {
  id: SceneId
  index: number
  name: string
  law: string
  lawId: string
  blurb: string
  color: string
  accent: string
  /** Player must have finished the previous sector. */
  requires?: SceneId
  /** How the level is graded: 0..3 stars. */
  grade(score: number): number
  parScore: number
}

export interface CodexEntry {
  id: string
  law: string
  formula: string
  plain: string
  weird: string
  unlockedBy: SceneId
}
