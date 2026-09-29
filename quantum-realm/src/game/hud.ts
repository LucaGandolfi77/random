import { clamp01 } from './math'
import { withAlpha } from './draw'
import type { SceneContext } from './types'

export const hudText = (
  s: SceneContext,
  text: string,
  x: number,
  y: number,
  color = '#e9d5ff',
  align: CanvasTextAlign = 'left',
  size = 13,
) => {
  s.ctx.save()
  s.ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`
  s.ctx.textAlign = align
  s.ctx.fillStyle = color
  s.ctx.shadowColor = 'rgba(0,0,0,0.85)'
  s.ctx.shadowBlur = 6
  s.ctx.fillText(text, x, y)
  s.ctx.restore()
}

export const hudBar = (
  s: SceneContext,
  v: number,
  color: string,
  label: string,
  max = 100,
) => {
  const w = Math.min(240, s.width * 0.34)
  const x = s.width - w - 18
  const y = 44
  s.ctx.save()
  s.ctx.fillStyle = 'rgba(255,255,255,0.12)'
  s.ctx.beginPath()
  s.ctx.roundRect(x, y, w, 10, 5)
  s.ctx.fill()
  s.ctx.fillStyle = withAlpha(v / max > 0.3 ? color : '#ef4444', 0.95)
  s.ctx.beginPath()
  s.ctx.roundRect(x, y, w * clamp01(v / max), 10, 5)
  s.ctx.fill()
  s.ctx.restore()
  hudText(s, label, x - 10, y - 4, 'rgba(199,210,254,0.75)', 'right', 11)
}

/** Counters live top-left so they never fight the on-screen controls. */
export const hudCounters = (s: SceneContext, lines: string[]) => {
  lines.forEach((line, i) => hudText(s, line, 18, 44 + i * 17, '#c7d2fe'))
}

/** Centre readouts sit just under the top bar. */
export const hudCentre = (s: SceneContext, text: string, color: string, size = 16) =>
  hudText(s, text, s.width / 2, 66, color, 'center', size)

/** On-canvas tutorial prompt that fades with the clock. `y` overrides the slot. */
export const hint = (s: SceneContext, text: string, alpha: number, y?: number) => {
  if (alpha <= 0.01 || s.toastActive) return
  const ctx = s.ctx
  ctx.save()
  ctx.globalAlpha = clamp01(alpha)
  ctx.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textAlign = 'center'
  const w = ctx.measureText(text).width + 28
  const x = s.width / 2 - w / 2
  const py = y ?? s.height - (s.touch ? 178 : 64)
  ctx.fillStyle = 'rgba(10,6,22,0.72)'
  ctx.beginPath()
  ctx.roundRect(x, py, w, 30, 15)
  ctx.fill()
  ctx.strokeStyle = withAlpha('#a78bfa', 0.5)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = '#e9d5ff'
  ctx.fillText(text, s.width / 2, py + 20)
  ctx.restore()
}

/** Big centered banner used for countdown, results and warnings. */
export const banner = (s: SceneContext, text: string, sub?: string, scale = 1) => {
  const ctx = s.ctx
  ctx.save()
  ctx.textAlign = 'center'
  ctx.translate(s.width / 2, s.height * 0.34)
  ctx.scale(scale, scale)
  ctx.font = '800 40px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillStyle = '#f5f3ff'
  ctx.shadowColor = withAlpha('#a78bfa', 0.9)
  ctx.shadowBlur = 26
  ctx.fillText(text, 0, 0)
  ctx.shadowBlur = 0
  if (sub) {
    ctx.font = '500 15px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillStyle = withAlpha('#c4b5fd', 0.9)
    ctx.fillText(sub, 0, 26)
  }
  ctx.restore()
}
