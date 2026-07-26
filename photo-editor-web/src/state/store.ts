import { create } from 'zustand'
import {
  AppState,
  Layer,
  ImageLayer,
  LineLayer,
  Viewport,
  Tool,
  BlendMode,
  Point,
  defaultFilters,
} from '../types'
import { cloneDocument } from './history'
import { screenToDoc } from '../canvas/coordinates'

const MAX_HISTORY = 30

let layerIdCounter = 0
function generateId(): string {
  return `layer_${++layerIdCounter}`
}

export interface StoreActions {
  setTool: (tool: Tool) => void

  openImage: (file: File) => Promise<void>
  addImageLayer: (bitmap: ImageBitmap) => void

  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  reorderLayer: (fromIndex: number, toIndex: number) => void
  duplicateLayer: (id: string) => void
  selectLayer: (id: string | null) => void
  renameLayer: (id: string, name: string) => void

  setLayerVisibility: (id: string, visible: boolean) => void
  setLayerOpacity: (id: string, opacity: number) => void
  setLayerBlendMode: (id: string, mode: BlendMode) => void
  updateLayer: (id: string, updates: Partial<Layer>) => void

  setViewport: (vp: Partial<Viewport>) => void
  zoomTo: (newZoom: number) => void
  zoomToCursor: (delta: number, screenX: number, screenY: number, canvasWidth: number, canvasHeight: number) => void
  fitToCanvas: (canvasWidth: number, canvasHeight: number) => void

  startLine: (point: Point) => void
  updateLinePreview: (point: Point) => void
  finishLine: (point: Point) => void
  cancelLine: () => void

  undo: () => void
  redo: () => void
  pushHistory: () => void

  setProcessing: (label: string, progress: number) => void
  clearProcessing: () => void
}

export type Store = AppState & StoreActions

const defaultViewport: Viewport = { zoom: 1, offsetX: 0, offsetY: 0 }

export const useStore = create<Store>((set, get) => ({
  document: null,
  viewport: defaultViewport,
  activeTool: 'move',
  selectedLayerId: null,
  isDrawingLine: false,
  linePreview: null,
  isProcessing: false,
  processingLabel: '',
  processingProgress: 0,
  undoStack: [],
  redoStack: [],

  setTool: (tool) => set({ activeTool: tool }),

  openImage: async (file) => {
    try {
      set({ isProcessing: true, processingLabel: 'Caricamento immagine...', processingProgress: 0 })
      const bitmap = await createImageBitmap(file)
      const MAX_DIM = 4096
      let finalBitmap = bitmap
      if (bitmap.width > MAX_DIM || bitmap.height > MAX_DIM) {
        const scale = Math.min(MAX_DIM / bitmap.width, MAX_DIM / bitmap.height)
        finalBitmap = await createImageBitmap(bitmap, {
          resizeWidth: Math.round(bitmap.width * scale),
          resizeHeight: Math.round(bitmap.height * scale),
        })
        bitmap.close()
      }
      const state = get()
      if (!state.document) {
        const layer: ImageLayer = {
          id: generateId(),
          name: file.name || 'Immagine',
          type: 'image',
          visible: true,
          opacity: 1,
          blendMode: 'source-over',
          bitmap: finalBitmap,
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          filters: { ...defaultFilters },
        }
        const doc = {
          width: finalBitmap.width,
          height: finalBitmap.height,
          layers: [layer],
        }
        set({
          document: doc,
          selectedLayerId: layer.id,
          isProcessing: false,
          undoStack: [],
          redoStack: [],
        })
      } else {
        get().addImageLayer(finalBitmap)
        set({ isProcessing: false })
      }
    } catch (err) {
      console.error('Error loading image:', err)
      set({ isProcessing: false, processingLabel: '' })
    }
  },

  addImageLayer: (bitmap) => {
    const state = get()
    if (!state.document) return
    get().pushHistory()
    const layer: ImageLayer = {
      id: generateId(),
      name: 'Livello',
      type: 'image',
      visible: true,
      opacity: 1,
      blendMode: 'source-over',
      bitmap,
      x: 50,
      y: 50,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      filters: { ...defaultFilters },
    }
    set({
      document: {
        ...state.document!,
        layers: [...state.document!.layers, layer],
      },
      selectedLayerId: layer.id,
    })
  },

  addLayer: (layer) => {
    get().pushHistory()
    const state = get()
    if (!state.document) {
      const doc = {
        width: layer.type === 'line' ? Math.max(layer.start.x, layer.end.x) + 100 : 800,
        height: layer.type === 'line' ? Math.max(layer.start.y, layer.end.y) + 100 : 600,
        layers: [layer],
      }
      set({ document: doc, selectedLayerId: layer.id })
      return
    }
    set({
      document: {
        ...state.document,
        layers: [...state.document.layers, layer],
      },
      selectedLayerId: layer.id,
    })
  },

  removeLayer: (id) => {
    const state = get()
    if (!state.document || state.document.layers.length <= 1) return
    get().pushHistory()
    const layers = state.document.layers.filter(l => l.id !== id)
    const selectedLayerId = state.selectedLayerId === id
      ? (layers.length > 0 ? layers[layers.length - 1].id : null)
      : state.selectedLayerId
    set({
      document: { ...state.document, layers },
      selectedLayerId,
    })
  },

  reorderLayer: (fromIndex, toIndex) => {
    get().pushHistory()
    const layers = [...get().document!.layers]
    const [moved] = layers.splice(fromIndex, 1)
    layers.splice(toIndex, 0, moved)
    set({ document: { ...get().document!, layers } })
  },

  duplicateLayer: (id) => {
    const state = get()
    if (!state.document) return
    const source = state.document.layers.find(l => l.id === id)
    if (!source) return
    get().pushHistory()
    const newLayer: Layer = JSON.parse(JSON.stringify(source, (key, val) =>
      key === 'bitmap' ? undefined : val
    ))
    newLayer.id = generateId()
    newLayer.name = source.name + ' (copia)'
    if (source.type === 'image') {
      ;(newLayer as ImageLayer).bitmap = (source as ImageLayer).bitmap
    }
    const layers = [...state.document.layers, newLayer]
    set({ document: { ...state.document, layers }, selectedLayerId: newLayer.id })
  },

  selectLayer: (id) => set({ selectedLayerId: id }),

  renameLayer: (id, name) => {
    const state = get()
    if (!state.document) return
    const layers = state.document.layers.map(l =>
      l.id === id ? { ...l, name } : l
    )
    set({ document: { ...state.document, layers } })
  },

  setLayerVisibility: (id, visible) => {
    const state = get()
    if (!state.document) return
    const layers = state.document.layers.map(l =>
      l.id === id ? { ...l, visible } : l
    )
    set({ document: { ...state.document, layers } })
  },

  setLayerOpacity: (id, opacity) => {
    const state = get()
    if (!state.document) return
    const layers = state.document.layers.map(l =>
      l.id === id ? { ...l, opacity } : l
    )
    set({ document: { ...state.document, layers } })
  },

  setLayerBlendMode: (id, blendMode) => {
    const state = get()
    if (!state.document) return
    const layers = state.document.layers.map(l =>
      l.id === id ? { ...l, blendMode } : l
    )
    set({ document: { ...state.document, layers } })
  },

  updateLayer: (id, updates) => {
    const state = get()
    if (!state.document) return
    const layers = state.document.layers.map(l =>
      l.id === id ? { ...l, ...updates } as Layer : l
    )
    set({ document: { ...state.document, layers } })
  },

  setViewport: (vp) => {
    const current = get().viewport
    set({ viewport: { ...current, ...vp } })
  },

  zoomTo: (newZoom) => {
    const vp = get().viewport
    set({ viewport: { ...vp, zoom: Math.max(0.05, Math.min(32, newZoom)) } })
  },

  zoomToCursor: (delta, screenX, screenY, canvasWidth, canvasHeight) => {
    const vp = get().viewport
    const oldZoom = vp.zoom
    const newZoom = Math.max(0.05, Math.min(32, oldZoom * (1 - delta * 0.1)))

    const docX = (screenX - vp.offsetX) / oldZoom
    const docY = (screenY - vp.offsetY) / oldZoom

    const newOffsetX = screenX - docX * newZoom
    const newOffsetY = screenY - docY * newZoom

    set({ viewport: { zoom: newZoom, offsetX: newOffsetX, offsetY: newOffsetY } })
  },

  fitToCanvas: (canvasWidth, canvasHeight) => {
    const doc = get().document
    if (!doc) return
    const margin = 0.9
    const zoom = Math.min(
      (canvasWidth * margin) / doc.width,
      (canvasHeight * margin) / doc.height,
      1,
    )
    const offsetX = (canvasWidth - doc.width * zoom) / 2
    const offsetY = (canvasHeight - doc.height * zoom) / 2
    set({ viewport: { zoom, offsetX, offsetY } })
  },

  startLine: (point) => set({
    isDrawingLine: true,
    linePreview: { start: point, end: point },
  }),

  updateLinePreview: (point) => {
    const state = get()
    if (!state.isDrawingLine || !state.linePreview) return
    set({ linePreview: { ...state.linePreview, end: point } })
  },

  finishLine: (point) => {
    const state = get()
    if (!state.isDrawingLine || !state.linePreview) return
    const { start } = state.linePreview
    const end = point

    const dx = end.x - start.x
    const dy = end.y - start.y
    if (dx * dx + dy * dy < 25) {
      set({ isDrawingLine: false, linePreview: null })
      return
    }

    const layer: LineLayer = {
      id: generateId(),
      name: 'Linea',
      type: 'line',
      visible: true,
      opacity: 1,
      blendMode: 'source-over',
      start,
      end,
      color: '#ffffff',
      width: 4,
      pattern: 'solid',
      dashArray: [],
      cap: 'round',
      border: { enabled: false, color: '#000000', width: 2 },
      warp: {
        enabled: false,
        control: {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2,
        },
      },
    }

    set({ isDrawingLine: false, linePreview: null })
    get().addLayer(layer)
    set({ activeTool: 'move' })
  },

  cancelLine: () => set({ isDrawingLine: false, linePreview: null }),

  pushHistory: () => {
    const state = get()
    const entry = {
      document: cloneDocument(state.document),
      selectedLayerId: state.selectedLayerId,
    }
    const undoStack = [...state.undoStack, entry].slice(-MAX_HISTORY)
    set({ undoStack, redoStack: [] })
  },

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return

    const current = {
      document: cloneDocument(state.document),
      selectedLayerId: state.selectedLayerId,
    }

    const undoStack = [...state.undoStack]
    const prev = undoStack.pop()!

    set({
      document: prev.document as any,
      selectedLayerId: prev.selectedLayerId,
      undoStack,
      redoStack: [...state.redoStack, current],
    })
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return

    const current = {
      document: cloneDocument(state.document),
      selectedLayerId: state.selectedLayerId,
    }

    const redoStack = [...state.redoStack]
    const next = redoStack.pop()!

    set({
      document: next.document as any,
      selectedLayerId: next.selectedLayerId,
      undoStack: [...state.undoStack, current],
      redoStack,
    })
  },

  setProcessing: (label, progress) => set({
    isProcessing: true,
    processingLabel: label,
    processingProgress: progress,
  }),

  clearProcessing: () => set({
    isProcessing: false,
    processingLabel: '',
    processingProgress: 0,
  }),
}))
