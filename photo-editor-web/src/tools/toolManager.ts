export type DragMode =
  | 'none'
  | 'pan'
  | 'drawLine'
  | 'moveLayer'
  | 'dragLine'
  | 'dragLineStart'
  | 'dragLineEnd'
  | 'dragWarpControl'
  | 'moveLineEndpoints'

export interface DragState {
  mode: DragMode
  layerId: string | null
  startScreen: { x: number; y: number }
  startDoc: { x: number; y: number }
  initialValues: Record<string, any>
}

let dragState: DragState | null = null

export function getDragState(): DragState | null {
  return dragState
}

export function setDragState(state: DragState | null) {
  dragState = state
}
