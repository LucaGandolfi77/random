export type Point = { x: number; y: number }
export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay'
export type Tool = 'move' | 'line' | 'pan'
export type LinePattern = 'solid' | 'dashed' | 'dotted' | 'custom'
export type LineCap = 'butt' | 'round' | 'square'

export interface FilterSettings {
  brightness: number
  contrast: number
  saturate: number
  blur: number
  grayscale: number
  sepia: number
  invert: number
  hueRotate: number
  sharpen: boolean
}

export const defaultFilters: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  hueRotate: 0,
  sharpen: false,
}

export interface BaseLayer {
  id: string
  name: string
  visible: boolean
  opacity: number
  blendMode: BlendMode
}

export interface ImageLayer extends BaseLayer {
  type: 'image'
  bitmap: ImageBitmap
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  filters: FilterSettings
}

export interface LineLayer extends BaseLayer {
  type: 'line'
  start: Point
  end: Point
  color: string
  width: number
  pattern: LinePattern
  dashArray: number[]
  cap: LineCap
  border: { enabled: boolean; color: string; width: number }
  warp: { enabled: boolean; control: Point }
}

export type Layer = ImageLayer | LineLayer

export interface DocumentState {
  width: number
  height: number
  layers: Layer[]
}

export interface Viewport {
  zoom: number
  offsetX: number
  offsetY: number
}

export interface AppState {
  document: DocumentState | null
  viewport: Viewport
  activeTool: Tool
  selectedLayerId: string | null
  isDrawingLine: boolean
  linePreview: { start: Point; end: Point } | null
  isProcessing: boolean
  processingLabel: string
  processingProgress: number
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
}

export interface HistoryEntry {
  document: DocumentState | null
  selectedLayerId: string | null
}
