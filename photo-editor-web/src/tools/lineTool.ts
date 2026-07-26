import { useStore } from '../state/store'
import { screenToDoc } from '../canvas/coordinates'

export function handleLinePointerDown(
  screenX: number,
  screenY: number,
) {
  const state = useStore.getState()
  if (!state.document) return

  const vp = state.viewport
  const docPoint = screenToDoc(screenX, screenY, vp)
  useStore.getState().startLine(docPoint)
}

export function handleLinePointerMove(
  screenX: number,
  screenY: number,
) {
  const state = useStore.getState()
  if (!state.isDrawingLine) return

  const vp = state.viewport
  const docPoint = screenToDoc(screenX, screenY, vp)
  useStore.getState().updateLinePreview(docPoint)
}

export function handleLinePointerUp(
  screenX: number,
  screenY: number,
) {
  const state = useStore.getState()
  if (!state.isDrawingLine) return

  const vp = state.viewport
  const docPoint = screenToDoc(screenX, screenY, vp)
  useStore.getState().finishLine(docPoint)
}
