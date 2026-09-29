import { useEffect, useState } from 'react'
import { gameInput } from '../game/input'
import { useGame } from '../game/store'

/**
 * On-screen controls. They appear automatically on touch devices and can be
 * forced on or off in settings.
 */
export function TouchControls() {
  const showTouch = useGame((s) => s.showTouch)
  const [touchDetected, setTouchDetected] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  useEffect(() => {
    const on = () => setTouchDetected(true)
    window.addEventListener('touchstart', on, { once: true, passive: true })
    return () => window.removeEventListener('touchstart', on)
  }, [])

  const visible = showTouch ?? touchDetected

  useEffect(() => {
    if (!visible) return
    const offs: (() => void)[] = []
    const bind = (id: string, name: 'left' | 'right' | 'up' | 'down' | 'jump' | 'alt', toggle = false) => {
      const el = document.getElementById(id)
      if (el) offs.push(gameInput.bindVirtual(name, el, { toggle }))
    }
    bind('tc-up', 'up')
    bind('tc-left', 'left')
    bind('tc-down', 'down')
    bind('tc-right', 'right')
    bind('tc-jump', 'jump')
    bind('tc-alt', 'alt', true)
    return () => {
      for (const off of offs) off()
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className="touch" aria-hidden="true">
      <div className="touch__pad">
        <button id="tc-up" className="touch__btn" type="button" tabIndex={-1}>
          ▲
        </button>
        <button id="tc-left" className="touch__btn" type="button" tabIndex={-1}>
          ◀
        </button>
        <button id="tc-down" className="touch__btn" type="button" tabIndex={-1}>
          ▼
        </button>
        <button id="tc-right" className="touch__btn" type="button" tabIndex={-1}>
          ▶
        </button>
      </div>
      <div className="touch__actions">
        <button id="tc-alt" className="touch__btn touch__btn--alt" type="button" tabIndex={-1}>
          PHASE
        </button>
        <button id="tc-jump" className="touch__btn touch__btn--jump" type="button" tabIndex={-1}>
          JUMP
        </button>
      </div>
    </div>
  )
}
