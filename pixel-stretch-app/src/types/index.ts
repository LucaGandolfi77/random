export interface Layer {
  id: string
  name: string
  canvas: HTMLCanvasElement
  visible: boolean
  opacity: number
  position: { x: number; y: number }
  locked: boolean
  width: number
  height: number
  compositeOperation?: GlobalCompositeOperation
}

export type Tool =
  | 'select'
  | 'stretch-radial'
  | 'stretch-radial-full'
  | 'stretch-row'
  | 'stretch-column'
  | 'stretch-warp'
  | 'stretch-mirror'
  | 'twirl'
  | 'warp-grid'
  | 'move'
  | 'zoom'

export type BlendMode = 'normal' | 'dissolve' | 'screen' | 'multiply' | 'overlay' | 'difference' | 'lighten' | 'darken'
export type EasingCurve = 'linear' | 'exponential' | 'sine' | 'bounce'

export interface CanvasSize {
  width: number
  height: number
}

export interface StretchParams {
  radialH: number
  radialV: number
  rowUp: number
  rowDown: number
}

export interface WarpGridPoint {
  x: number
  y: number
}

export interface SourceLine {
  type: 'row' | 'column'
  position: number
}

export interface StretchPreview {
  type: 'row' | 'column'
  sourcePos: number
  currentPos: number
}

export interface WarpGrid {
  controlPoints: WarpGridPoint[]
  active: boolean
}
