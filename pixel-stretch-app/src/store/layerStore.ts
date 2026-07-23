import { create } from 'zustand'
import type { Layer, Tool, CanvasSize, BlendMode, WarpGrid, WarpGridPoint, SourceLine, StretchPreview } from '../types'
import { getDefaultGridPoints } from '../effects/gridWarp'

let _id = 0
const uid = () => `layer-${++_id}-${Date.now()}`

interface LayerStore {
  layers: Layer[]
  activeLayerId: string | null
  tool: Tool
  canvasSize: CanvasSize
  isProcessing: boolean
  processingMessage: string
  blendMode: BlendMode
  warpGrid: WarpGrid
  sourceLine: SourceLine | null
  stretchPreview: StretchPreview | null
  shiftHeld: boolean
  zoom: number
  panOffset: { x: number; y: number }

  addLayer: (canvas: HTMLCanvasElement, name?: string) => string
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  toggleVisibility: (id: string) => void
  setOpacity: (id: string, opacity: number) => void
  setLocked: (id: string, locked: boolean) => void
  renameLayer: (id: string, name: string) => void
  reorderLayer: (fromIndex: number, toIndex: number) => void
  moveLayerPosition: (id: string, x: number, y: number) => void
  setTool: (tool: Tool) => void
  setCanvasSize: (size: CanvasSize) => void
  setProcessing: (isProcessing: boolean, message?: string) => void
  setBlendMode: (mode: BlendMode) => void
  setWarpGrid: (grid: Partial<WarpGrid>) => void
  setWarpGridPoint: (index: number, point: WarpGridPoint) => void
  resetWarpGrid: () => void
  setSourceLine: (line: SourceLine | null) => void
  clearSourceLine: () => void
  setStretchPreview: (preview: StretchPreview | null) => void
  setShiftHeld: (held: boolean) => void
  setZoom: (zoom: number) => void
  setPanOffset: (offset: { x: number; y: number }) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  getActiveLayer: () => Layer | undefined
}

const ZOOM_MIN = 0.1
const ZOOM_MAX = 8
const ZOOM_STEP = 0.25

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: [],
  activeLayerId: null,
  tool: 'select',
  canvasSize: { width: 800, height: 600 },
  isProcessing: false,
  processingMessage: '',
  blendMode: 'normal',
  warpGrid: {
    controlPoints: [],
    active: false,
  },
  sourceLine: null,
  stretchPreview: null,
  shiftHeld: false,
  zoom: 1,
  panOffset: { x: 0, y: 0 },

  addLayer: (canvas, name) => {
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
    }
    set(state => ({
      layers: [...state.layers, layer],
      activeLayerId: id,
    }))
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

  toggleVisibility: (id) =>
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    })),

  setOpacity: (id, opacity) =>
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, opacity } : l
      ),
    })),

  setLocked: (id, locked) =>
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, locked } : l
      ),
    })),

  renameLayer: (id, name) =>
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, name } : l
      ),
    })),

  reorderLayer: (fromIndex, toIndex) =>
    set(state => {
      const arr = [...state.layers]
      const [moved] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, moved)
      return { layers: arr }
    }),

  moveLayerPosition: (id, x, y) =>
    set(state => ({
      layers: state.layers.map(l =>
        l.id === id ? { ...l, position: { x, y } } : l
      ),
    })),

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

  setCanvasSize: (size) => set({ canvasSize: size }),
  setProcessing: (isProcessing, message = '') =>
    set({ isProcessing, processingMessage: message }),
  setBlendMode: (mode) => set({ blendMode: mode }),
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
  setShiftHeld: (held) => set({ shiftHeld: held }),
  setZoom: (zoom) => set({ zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  zoomIn: () => set(s => ({ zoom: Math.min(ZOOM_MAX, s.zoom + ZOOM_STEP) })),
  zoomOut: () => set(s => ({ zoom: Math.max(ZOOM_MIN, s.zoom - ZOOM_STEP) })),
  resetView: () => set({ zoom: 1, panOffset: { x: 0, y: 0 } }),

  getActiveLayer: () => get().layers.find(l => l.id === get().activeLayerId),
}))