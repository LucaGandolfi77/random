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
}

export type Tool =
  | 'select'
  | 'stretch-radial'
  | 'stretch-row'
  | 'stretch-warp'
  | 'warp-grid'
  | 'move'
  | 'zoom'

export type BlendMode = 'normal' | 'dissolve'

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

export interface WarpGrid {
  controlPoints: WarpGridPoint[]
  active: boolean
}
