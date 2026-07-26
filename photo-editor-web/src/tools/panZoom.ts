import { useStore } from '../state/store'

export function handlePanPointerDown(
  screenX: number,
  screenY: number,
) {
  const state = useStore.getState()
  const vp = state.viewport
  const startOffsetX = vp.offsetX
  const startOffsetY = vp.offsetY
  ;(window as any).__panState = { startScreenX: screenX, startScreenY: screenY, startOffsetX, startOffsetY }
}

export function handlePanPointerMove(
  screenX: number,
  screenY: number,
) {
  const panState = (window as any).__panState
  if (!panState) return

  const dx = screenX - panState.startScreenX
  const dy = screenY - panState.startScreenY

  useStore.getState().setViewport({
    offsetX: panState.startOffsetX + dx,
    offsetY: panState.startOffsetY + dy,
  })
}

export function handlePanPointerUp() {
  delete (window as any).__panState
}

export function handleZoomWheel(
  delta: number,
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  useStore.getState().zoomToCursor(delta, screenX, screenY, canvasWidth, canvasHeight)
}
