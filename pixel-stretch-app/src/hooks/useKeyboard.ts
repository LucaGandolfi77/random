import { useEffect } from 'react'
import { useLayerStore } from '../store/layerStore'

export function useModifierKeys() {
  useEffect(() => {
    const { setShiftHeld } = useLayerStore.getState()

    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftHeld(true)
      }
    }

    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftHeld(false)
      }
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
}
