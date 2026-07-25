import { create } from 'zustand'
import type { Layer, Tool, CanvasSize, BlendMode, EasingCurve, WarpGrid, WarpGridPoint, SourceLine, StretchPreview } from '../types'
import { getDefaultGridPoints } from '../effects/gridWarp'

let _id = 0
const uid = () => `layer-${++_id}-${Date.now()}`

interface HistoryEntry {
  layers: Layer[]
  activeLayerId: string | null
  canvasSize: CanvasSize
  label: string
}

const MAX_HISTORY = 50
// Cap on estimated memory retained by history entries (unique canvases)
const HISTORY_MEM_CAP = 512 * 1024 * 1024

function estimateHistoryBytes(entries: HistoryEntry[]): number {
  const seen = new Set<HTMLCanvasElement>()
  let bytes = 0
  for (const e of entries) {
    for (const l of e.layers) {
      if (!seen.has(l.canvas)) {
        seen.add(l.canvas)
        bytes += l.canvas.width * l.canvas.height * 4
      }
    }
  }
  return bytes
}

const INITIAL_HISTORY_ENTRY: HistoryEntry = {
  layers: [],
  activeLayerId: null,
  canvasSize: { width: 800, height: 600 },
  label: 'Nuovo documento',
}

interface LayerStore {
  layers: Layer[]
  activeLayerId: string | null
  tool: Tool
  canvasSize: CanvasSize
  isProcessing: boolean
  processingMessage: string
  blendMode: BlendMode
  easing: EasingCurve
  symmetricStretch: boolean
  warpGrid: WarpGrid
  sourceLine: SourceLine | null
  stretchPreview: StretchPreview | null
  zoom: number
  panOffset: { x: number; y: number }
  history: HistoryEntry[]
  historyIndex: number

  addLayer: (canvas: HTMLCanvasElement, name?: string, compositeOperation?: GlobalCompositeOperation) => string
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  toggleVisibility: (id: string) => void
  setOpacity: (id: string, opacity: number) => void
  setLocked: (id: string, locked: boolean) => void
  renameLayer: (id: string, name: string) => void
  setLayerCompositeOperation: (id: string, op: GlobalCompositeOperation | undefined) => void
  reorderLayer: (fromIndex: number, toIndex: number) => void
  moveLayerPosition: (id: string, x: number, y: number) => void
  mergeDown: () => void
  flattenLayers: () => void
  setTool: (tool: Tool) => void
  setCanvasSize: (size: CanvasSize) => void
  setProcessing: (isProcessing: boolean, message?: string) => void
  setBlendMode: (mode: BlendMode) => void
  setEasing: (easing: EasingCurve) => void
  setSymmetricStretch: (symmetric: boolean) => void
  setWarpGrid: (grid: Partial<WarpGrid>) => void
  setWarpGridPoint: (index: number, point: WarpGridPoint) => void
  resetWarpGrid: () => void
  setSourceLine: (line: SourceLine | null) => void
  clearSourceLine: () => void
  setStretchPreview: (preview: StretchPreview | null) => void
  setZoom: (zoom: number) => void
  setPanOffset: (offset: { x: number; y: number }) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  resetAll: () => void
  saveProject: () => void
  loadProject: (file: File) => Promise<void>
  getActiveLayer: () => Layer | undefined
  pushHistory: (label?: string) => void
  undo: () => void
  redo: () => void
  jumpToHistory: (index: number) => void
}

const ZOOM_MIN = 0.1
const ZOOM_MAX = 8
const ZOOM_STEP = 0.25

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: [],
  activeLayerId: null,
  history: [INITIAL_HISTORY_ENTRY],
  historyIndex: 0,
  tool: 'select',
  canvasSize: { width: 800, height: 600 },
  isProcessing: false,
  processingMessage: '',
  blendMode: 'normal',
  easing: 'linear',
  symmetricStretch: false,
  warpGrid: {
    controlPoints: [],
    active: false,
  },
  sourceLine: null,
  stretchPreview: null,
  zoom: 1,
  panOffset: { x: 0, y: 0 },

  addLayer: (canvas, name, compositeOperation) => {
    const id = uid()
    const layer: Layer = {
      id,
      name: name || `Layer ${get().layers.length + 1}`,
      canvas,
      visible: true,
      opacity: 1,
      position: { x: 0, y: 0 },
      locked: false,
      width: canvas.width,
      height: canvas.height,
      compositeOperation,
    }
    set(state => ({
      layers: [...state.layers, layer],
      activeLayerId: id,
    }))
    get().pushHistory(layer.name)
    return id
  },

  removeLayer: (id) => {
    set(state => {
      const filtered = state.layers.filter(l => l.id !== id)
      return {
        layers: filtered,
        activeLayerId:
          state.activeLayerId === id
            ? filtered[filtered.length - 1]?.id || null
            : state.activeLayerId,
      }
    })
    get().pushHistory('Elimina layer')
  },

  duplicateLayer: (id) => {
    const layer = get().layers.find(l => l.id === id)
    if (!layer) return
    const copy = document.createElement('canvas')
    copy.width = layer.canvas.width
    copy.height = layer.canvas.height
    copy.getContext('2d')!.drawImage(layer.canvas, 0, 0)
    get().addLayer(copy, `${layer.name} copy`)
  },

  setActiveLayer: (id) => set({ activeLayerId: id }),

  toggleVisibility: (id) => {
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    }))
    get().pushHistory('Visibilità layer')
  },

  // NOTE: no history push here — the opacity slider fires continuously;
  // the UI calls pushHistory('Opacità layer') once when the drag ends.
  setOpacity: (id, opacity) =>
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, opacity } : l
      ),
    })),

  setLocked: (id, locked) => {
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, locked } : l
      ),
    }))
    get().pushHistory(locked ? 'Blocca layer' : 'Sblocca layer')
  },

  renameLayer: (id, name) => {
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, name } : l
      ),
    }))
    get().pushHistory('Rinomina layer')
  },

  setLayerCompositeOperation: (id, op) => {
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, compositeOperation: op } : l
      ),
    }))
    get().pushHistory('Blend mode layer')
  },

  // NOTE: no history push here — drag&drop reorders fire continuously;
  // the UI calls pushHistory('Riordina layer') once when the drag ends.
  reorderLayer: (fromIndex, toIndex) => {
    set(state => {
      const arr = [...state.layers]
      const [moved] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, moved)
      return { layers: arr }
    })
  },

  moveLayerPosition: (id, x, y) =>
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, position: { x, y } } : l
      ),
    })),

  mergeDown: () => {
    const { layers, activeLayerId } = get()
    const idx = layers.findIndex(l => l.id === activeLayerId)
    if (idx <= 0) return
    const top = layers[idx]
    const bottom = layers[idx - 1]
    const out = document.createElement('canvas')
    out.width = bottom.width
    out.height = bottom.height
    const ctx = out.getContext('2d')!
    const compositeOp = top.compositeOperation || 'source-over'
    ctx.drawImage(bottom.canvas, 0, 0)
    ctx.globalCompositeOperation = compositeOp
    ctx.drawImage(top.canvas, top.position.x - bottom.position.x, top.position.y - bottom.position.y)
    bottom.canvas.width = out.width
    bottom.canvas.height = out.height
    bottom.canvas.getContext('2d')!.drawImage(out, 0, 0)
    set(state => ({
      layers: state.layers.filter(l => l.id !== top.id),
      activeLayerId: bottom.id,
    }))
    get().pushHistory('Unisci sotto')
  },

  flattenLayers: () => {
    const { layers, canvasSize } = get()
    const visible = layers.filter(l => l.visible)
    if (visible.length === 0) return
    if (visible.length === 1) {
      set({ activeLayerId: visible[0].id })
      return
    }
    const out = document.createElement('canvas')
    out.width = canvasSize.width
    out.height = canvasSize.height
    const ctx = out.getContext('2d')!
    for (const layer of visible) {
      ctx.globalAlpha = layer.opacity
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(layer.canvas, layer.position.x, layer.position.y)
    }
    ctx.globalAlpha = 1
    const id = `flattened-${Date.now()}`
    set({
      layers: [{
        id,
        name: 'Appiattito',
        canvas: out,
        visible: true,
        opacity: 1,
        position: { x: 0, y: 0 },
        locked: false,
        width: out.width,
        height: out.height,
      }],
      activeLayerId: id,
    })
    get().pushHistory('Appiattisci')
  },

  setTool: (tool) => {
    const state = get()
    const isStretchTool = tool === 'stretch-row' || tool === 'stretch-column'
    if (tool === 'warp-grid') {
      const { canvasSize } = state
      const points = getDefaultGridPoints(canvasSize.width, canvasSize.height)
      set({ tool, warpGrid: { controlPoints: points, active: true }, sourceLine: null, stretchPreview: null })
    } else if (!isStretchTool) {
      set({ tool, warpGrid: { ...state.warpGrid, active: false }, sourceLine: null, stretchPreview: null })
    } else {
      set({ tool, warpGrid: { ...state.warpGrid, active: false }, stretchPreview: null })
    }
  },

  setCanvasSize: (size) => {
    set({ canvasSize: size })
    get().pushHistory('Ridimensiona canvas')
  },
  setProcessing: (isProcessing, message = '') =>
    set({ isProcessing, processingMessage: message }),
  setBlendMode: (mode) => set({ blendMode: mode }),
  setEasing: (easing) => set({ easing }),
  setSymmetricStretch: (symmetric) => set({ symmetricStretch: symmetric }),
  setWarpGrid: (grid) =>
    set(state => ({ warpGrid: { ...state.warpGrid, ...grid } })),
  setWarpGridPoint: (index, point) =>
    set(state => {
      const points = [...state.warpGrid.controlPoints]
      points[index] = point
      return { warpGrid: { ...state.warpGrid, controlPoints: points } }
    }),
  resetWarpGrid: () => {
    const { canvasSize } = get()
    const points = getDefaultGridPoints(canvasSize.width, canvasSize.height)
    set({ warpGrid: { controlPoints: points, active: true } })
  },

  setSourceLine: (line) => set({ sourceLine: line }),
  clearSourceLine: () => set({ sourceLine: null, stretchPreview: null }),
  setStretchPreview: (preview) => set({ stretchPreview: preview }),
  setZoom: (zoom) => set({ zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  zoomIn: () => set(s => ({ zoom: Math.min(ZOOM_MAX, s.zoom + ZOOM_STEP) })),
  zoomOut: () => set(s => ({ zoom: Math.max(ZOOM_MIN, s.zoom - ZOOM_STEP) })),
  resetView: () => set({ zoom: 1, panOffset: { x: 0, y: 0 } }),

  resetAll: () => {
    set({
      layers: [],
      activeLayerId: null,
      tool: 'select',
      canvasSize: { width: 800, height: 600 },
      blendMode: 'normal',
      warpGrid: { controlPoints: [], active: false },
      sourceLine: null,
      stretchPreview: null,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
    })
    get().pushHistory('Reset documento')
  },

  saveProject: () => {
    const { layers, activeLayerId, canvasSize } = get()
    const data = {
      version: 1,
      canvasSize,
      activeLayerId,
      layers: layers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        position: l.position,
        locked: l.locked,
        width: l.width,
        height: l.height,
        compositeOperation: l.compositeOperation,
        dataURL: l.canvas.toDataURL(),
      })),
    }
    const json = JSON.stringify(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pixel-stretch-project-${Date.now()}.json`
    a.click()
    // Delay revocation: immediate revoke can cancel the download in some browsers
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },

  loadProject: async (file: File) => {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!data.layers || !data.canvasSize) throw new Error('Progetto non valido')

    const layers: Layer[] = await Promise.all(
      data.layers.map(async (ld: any) => {
        const canvas = document.createElement('canvas')
        canvas.width = ld.width
        canvas.height = ld.height
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image()
          i.onload = () => resolve(i)
          i.onerror = reject
          i.src = ld.dataURL
        })
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        return {
          id: ld.id,
          name: ld.name,
          canvas,
          visible: ld.visible,
          opacity: ld.opacity,
          position: ld.position,
          locked: ld.locked,
          width: ld.width,
          height: ld.height,
          compositeOperation: ld.compositeOperation,
        } as Layer
      })
    )

    set({
      layers,
      activeLayerId: data.activeLayerId || layers[layers.length - 1]?.id || null,
      canvasSize: data.canvasSize,
      tool: 'select',
      warpGrid: { controlPoints: [], active: false },
      sourceLine: null,
      stretchPreview: null,
    })
    get().pushHistory('Carica progetto')
  },

  getActiveLayer: () => get().layers.find(l => l.id === get().activeLayerId),

  pushHistory: (label = 'Modifica') => {
    const { layers, activeLayerId, canvasSize, history, historyIndex } = get()
    const truncated = history.slice(0, historyIndex + 1)
    truncated.push({
      layers: [...layers],
      activeLayerId,
      canvasSize,
      label,
    })
    while (truncated.length > MAX_HISTORY) truncated.shift()
    // Evict oldest entries when estimated retained memory exceeds the cap
    while (truncated.length > 1 && estimateHistoryBytes(truncated) > HISTORY_MEM_CAP) {
      truncated.shift()
    }
    set({ history: truncated, historyIndex: truncated.length - 1 })
  },

  undo: () => {
    const { history, historyIndex, isProcessing } = get()
    if (isProcessing || historyIndex <= 0) return
    const entry = history[historyIndex - 1]
    set({
      layers: [...entry.layers],
      activeLayerId: entry.activeLayerId,
      canvasSize: entry.canvasSize,
      historyIndex: historyIndex - 1,
      sourceLine: null,
      stretchPreview: null,
    })
  },

  redo: () => {
    const { history, historyIndex, isProcessing } = get()
    if (isProcessing || historyIndex < 0 || historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]
    set({
      layers: [...entry.layers],
      activeLayerId: entry.activeLayerId,
      canvasSize: entry.canvasSize,
      historyIndex: historyIndex + 1,
      sourceLine: null,
      stretchPreview: null,
    })
  },

  jumpToHistory: (index: number) => {
    const { history, historyIndex, isProcessing } = get()
    if (isProcessing || index < 0 || index >= history.length || index === historyIndex) return
    const entry = history[index]
    set({
      layers: [...entry.layers],
      activeLayerId: entry.activeLayerId,
      canvasSize: entry.canvasSize,
      historyIndex: index,
      sourceLine: null,
      stretchPreview: null,
    })
  },
}))