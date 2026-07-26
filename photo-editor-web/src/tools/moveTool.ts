import { useStore } from '../state/store'
import { screenToDoc, docToScreen } from '../canvas/coordinates'
import { hitTestLayers, hitTestLineHandle } from '../canvas/hitTest'
import { getDragState, setDragState, DragState, DragMode } from './toolManager'
import { Point, LineLayer, ImageLayer } from '../types'

export function handleMovePointerDown(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const state = useStore.getState()
  if (!state.document) return

  const vp = state.viewport
  const docPoint = screenToDoc(screenX, screenY, vp)

  const selectedLayer = state.selectedLayerId
    ? state.document.layers.find(l => l.id === state.selectedLayerId)
    : null

  if (selectedLayer?.type === 'line') {
    const handle = hitTestLineHandle(docPoint, selectedLayer, vp.zoom)
    if (handle) {
      let mode: DragMode
      if (handle === 'start') mode = 'dragLineStart'
      else if (handle === 'end') mode = 'dragLineEnd'
      else mode = 'dragWarpControl'

      const line = selectedLayer as LineLayer
      setDragState({
        mode,
        layerId: selectedLayer.id,
        startScreen: { x: screenX, y: screenY },
        startDoc: docPoint,
        initialValues: {
          start: { ...line.start },
          end: { ...line.end },
          control: { ...line.warp.control },
        },
      })
      return
    }
  }

  const hit = hitTestLayers(docPoint, state.document.layers, vp.zoom)
  if (hit) {
    useStore.getState().selectLayer(hit.id)
    const layer = hit
    setDragState({
      mode: layer.type === 'line' ? 'moveLineEndpoints' : 'moveLayer',
      layerId: layer.id,
      startScreen: { x: screenX, y: screenY },
      startDoc: docPoint,
      initialValues: {
        startX: (layer as any).x ?? 0,
        startY: (layer as any).y ?? 0,
        start: (layer as LineLayer).start ? { ...(layer as LineLayer).start } : null,
        end: (layer as LineLayer).end ? { ...(layer as LineLayer).end } : null,
        control: (layer as LineLayer).warp?.control ? { ...(layer as LineLayer).warp.control } : null,
      },
    })
  } else {
    useStore.getState().selectLayer(null)
    setDragState(null)
  }
}

export function handleMovePointerMove(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const ds = getDragState()
  if (!ds || !ds.layerId) return

  const state = useStore.getState()
  const vp = state.viewport
  const docPoint = screenToDoc(screenX, screenY, vp)
  const startDoc = ds.startDoc

  const dx = docPoint.x - startDoc.x
  const dy = docPoint.y - startDoc.y

  const update: Record<string, any> = {}

  if (ds.mode === 'moveLayer' || ds.mode === 'moveLineEndpoints') {
    update.x = ds.initialValues.startX + dx
    update.y = ds.initialValues.startY + dy
  }

  if (ds.mode === 'dragLineStart' || ds.mode === 'moveLineEndpoints') {
    update.start = {
      x: (ds.initialValues.start?.x ?? 0) + dx,
      y: (ds.initialValues.start?.y ?? 0) + dy,
    }
  }

  if (ds.mode === 'dragLineEnd' || ds.mode === 'moveLineEndpoints') {
    update.end = {
      x: (ds.initialValues.end?.x ?? 0) + dx,
      y: (ds.initialValues.end?.y ?? 0) + dy,
    }
  }

  if (ds.mode === 'dragWarpControl') {
    update.warp = {
      enabled: true,
      control: {
        x: (ds.initialValues.control?.x ?? 0) + dx,
        y: (ds.initialValues.control?.y ?? 0) + dy,
      },
    }
  }

  if (ds.mode === 'moveLineEndpoints') {
    update.start = {
      x: ds.initialValues.start ? ds.initialValues.start.x + dx : 0,
      y: ds.initialValues.start ? ds.initialValues.start.y + dy : 0,
    }
    update.end = {
      x: ds.initialValues.end ? ds.initialValues.end.x + dx : 0,
      y: ds.initialValues.end ? ds.initialValues.end.y + dy : 0,
    }
    if (ds.initialValues.control) {
      update.warp = {
        enabled: true,
        control: {
          x: ds.initialValues.control.x + dx,
          y: ds.initialValues.control.y + dy,
        },
      }
    }
  }

  useStore.getState().updateLayer(ds.layerId, update as any)
}

export function handleMovePointerUp() {
  const ds = getDragState()
  if (ds && ds.mode !== 'none') {
    setDragState(null)
  }
}
