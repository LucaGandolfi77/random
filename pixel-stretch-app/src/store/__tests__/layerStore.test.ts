import { describe, it, expect, beforeEach } from 'vitest'
import { useLayerStore } from '../layerStore'

function createCanvas(w = 100, h = 100): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

describe('layerStore', () => {
  beforeEach(() => {
    useLayerStore.setState({
      layers: [],
      activeLayerId: null,
      tool: 'select',
      canvasSize: { width: 800, height: 600 },
      isProcessing: false,
      processingMessage: '',
      blendMode: 'normal',
      warpGrid: { controlPoints: [], active: false },
      zoom: 1,
      panOffset: { x: 0, y: 0 },
    })
  })

  describe('initial state', () => {
    it('has empty layers', () => {
      expect(useLayerStore.getState().layers).toHaveLength(0)
    })
    it('has null activeLayerId', () => {
      expect(useLayerStore.getState().activeLayerId).toBeNull()
    })
    it('has default tool select', () => {
      expect(useLayerStore.getState().tool).toBe('select')
    })
    it('has zoom 1', () => {
      expect(useLayerStore.getState().zoom).toBe(1)
    })
    it('has default panOffset', () => {
      expect(useLayerStore.getState().panOffset).toEqual({ x: 0, y: 0 })
    })
  })

  describe('addLayer', () => {
    it('adds a layer and sets it active', () => {
      const { addLayer } = useLayerStore.getState()
      const canvas = createCanvas()
      const id = addLayer(canvas, 'Test')
      const state = useLayerStore.getState()
      expect(state.layers).toHaveLength(1)
      expect(state.activeLayerId).toBe(id)
      expect(state.layers[0].name).toBe('Test')
    })

    it('auto-names layer if no name provided', () => {
      const { addLayer } = useLayerStore.getState()
      addLayer(createCanvas())
      expect(useLayerStore.getState().layers[0].name).toBe('Layer 1')
    })

    it('sets layer defaults', () => {
      const { addLayer } = useLayerStore.getState()
      addLayer(createCanvas(), 'My Layer')
      const layer = useLayerStore.getState().layers[0]
      expect(layer.visible).toBe(true)
      expect(layer.opacity).toBe(1)
      expect(layer.locked).toBe(false)
      expect(layer.position).toEqual({ x: 0, y: 0 })
    })
  })

  describe('removeLayer', () => {
    it('removes layer and selects previous', () => {
      const { addLayer, removeLayer } = useLayerStore.getState()
      const id1 = addLayer(createCanvas(), 'L1')
      const id2 = addLayer(createCanvas(), 'L2')
      removeLayer(id2)
      expect(useLayerStore.getState().layers).toHaveLength(1)
      expect(useLayerStore.getState().activeLayerId).toBe(id1)
    })

    it('sets activeLayerId to null when last removed', () => {
      const { addLayer, removeLayer } = useLayerStore.getState()
      const id = addLayer(createCanvas())
      removeLayer(id)
      expect(useLayerStore.getState().activeLayerId).toBeNull()
    })
  })

  describe('duplicateLayer', () => {
    it('creates a copy with " copy" suffix', () => {
      const { addLayer, duplicateLayer } = useLayerStore.getState()
      const id = addLayer(createCanvas(), 'Original')
      duplicateLayer(id)
      const state = useLayerStore.getState()
      expect(state.layers).toHaveLength(2)
      expect(state.layers[1].name).toBe('Original copy')
    })
  })

  describe('setActiveLayer', () => {
    it('changes active layer', () => {
      const { addLayer, setActiveLayer } = useLayerStore.getState()
      const id1 = addLayer(createCanvas(), 'L1')
      addLayer(createCanvas(), 'L2')
      setActiveLayer(id1)
      expect(useLayerStore.getState().activeLayerId).toBe(id1)
    })
  })

  describe('toggleVisibility', () => {
    it('toggles layer visibility', () => {
      const { addLayer, toggleVisibility } = useLayerStore.getState()
      const id = addLayer(createCanvas())
      expect(useLayerStore.getState().layers[0].visible).toBe(true)
      toggleVisibility(id)
      expect(useLayerStore.getState().layers[0].visible).toBe(false)
      toggleVisibility(id)
      expect(useLayerStore.getState().layers[0].visible).toBe(true)
    })
  })

  describe('setOpacity', () => {
    it('sets layer opacity', () => {
      const { addLayer, setOpacity } = useLayerStore.getState()
      const id = addLayer(createCanvas())
      setOpacity(id, 0.5)
      expect(useLayerStore.getState().layers[0].opacity).toBe(0.5)
    })
  })

  describe('setLocked', () => {
    it('locks and unlocks layer', () => {
      const { addLayer, setLocked } = useLayerStore.getState()
      const id = addLayer(createCanvas())
      setLocked(id, true)
      expect(useLayerStore.getState().layers[0].locked).toBe(true)
      setLocked(id, false)
      expect(useLayerStore.getState().layers[0].locked).toBe(false)
    })
  })

  describe('renameLayer', () => {
    it('renames layer', () => {
      const { addLayer, renameLayer } = useLayerStore.getState()
      const id = addLayer(createCanvas(), 'Old')
      renameLayer(id, 'New')
      expect(useLayerStore.getState().layers[0].name).toBe('New')
    })
  })

  describe('reorderLayer', () => {
    it('reorders layers', () => {
      const { addLayer, reorderLayer } = useLayerStore.getState()
      addLayer(createCanvas(), 'A')
      addLayer(createCanvas(), 'B')
      reorderLayer(0, 1)
      expect(useLayerStore.getState().layers[0].name).toBe('B')
      expect(useLayerStore.getState().layers[1].name).toBe('A')
    })
  })

  describe('moveLayerPosition', () => {
    it('moves layer position', () => {
      const { addLayer, moveLayerPosition } = useLayerStore.getState()
      const id = addLayer(createCanvas())
      moveLayerPosition(id, 50, 100)
      expect(useLayerStore.getState().layers[0].position).toEqual({ x: 50, y: 100 })
    })
  })

  describe('setTool', () => {
    it('sets tool', () => {
      const { setTool } = useLayerStore.getState()
      setTool('move')
      expect(useLayerStore.getState().tool).toBe('move')
    })

    it('activates warp grid when selecting warp-grid', () => {
      const { setTool } = useLayerStore.getState()
      setTool('warp-grid')
      expect(useLayerStore.getState().warpGrid.active).toBe(true)
      expect(useLayerStore.getState().warpGrid.controlPoints).toHaveLength(16)
    })

    it('deactivates warp grid when switching away', () => {
      const { setTool } = useLayerStore.getState()
      setTool('warp-grid')
      setTool('select')
      expect(useLayerStore.getState().warpGrid.active).toBe(false)
    })
  })

  describe('zoom', () => {
    it('setZoom clamps to min/max', () => {
      const { setZoom } = useLayerStore.getState()
      setZoom(0.05)
      expect(useLayerStore.getState().zoom).toBe(0.1)
      setZoom(10)
      expect(useLayerStore.getState().zoom).toBe(8)
    })

    it('zoomIn increases zoom', () => {
      const { zoomIn } = useLayerStore.getState()
      zoomIn()
      expect(useLayerStore.getState().zoom).toBe(1.25)
    })

    it('zoomOut decreases zoom', () => {
      const { zoomOut } = useLayerStore.getState()
      zoomOut()
      expect(useLayerStore.getState().zoom).toBe(0.75)
    })

    it('resetView resets zoom and pan', () => {
      const { zoomIn, setPanOffset, resetView } = useLayerStore.getState()
      zoomIn()
      setPanOffset({ x: 100, y: 200 })
      resetView()
      expect(useLayerStore.getState().zoom).toBe(1)
      expect(useLayerStore.getState().panOffset).toEqual({ x: 0, y: 0 })
    })
  })

  describe('panOffset', () => {
    it('setPanOffset updates offset', () => {
      const { setPanOffset } = useLayerStore.getState()
      setPanOffset({ x: 50, y: 75 })
      expect(useLayerStore.getState().panOffset).toEqual({ x: 50, y: 75 })
    })
  })

  describe('blendMode', () => {
    it('setBlendMode changes mode', () => {
      const { setBlendMode } = useLayerStore.getState()
      setBlendMode('dissolve')
      expect(useLayerStore.getState().blendMode).toBe('dissolve')
    })
  })

  describe('warpGrid', () => {
    it('setWarpGridPoint updates a point', () => {
      const { setTool, setWarpGridPoint } = useLayerStore.getState()
      setTool('warp-grid')
      setWarpGridPoint(0, { x: 99, y: 88 })
      expect(useLayerStore.getState().warpGrid.controlPoints[0]).toEqual({ x: 99, y: 88 })
    })

    it('resetWarpGrid restores default grid', () => {
      const { setTool, setWarpGridPoint, resetWarpGrid } = useLayerStore.getState()
      setTool('warp-grid')
      setWarpGridPoint(0, { x: 999, y: 999 })
      resetWarpGrid()
      expect(useLayerStore.getState().warpGrid.controlPoints[0]).toEqual({ x: 0, y: 0 })
    })
  })

  describe('getActiveLayer', () => {
    it('returns active layer', () => {
      const { addLayer } = useLayerStore.getState()
      addLayer(createCanvas(), 'Active')
      const active = useLayerStore.getState().getActiveLayer()
      expect(active?.name).toBe('Active')
    })

    it('returns undefined when no active layer', () => {
      expect(useLayerStore.getState().getActiveLayer()).toBeUndefined()
    })
  })

  describe('setProcessing', () => {
    it('sets processing state', () => {
      const { setProcessing } = useLayerStore.getState()
      setProcessing(true, 'Loading...')
      expect(useLayerStore.getState().isProcessing).toBe(true)
      expect(useLayerStore.getState().processingMessage).toBe('Loading...')
      setProcessing(false)
      expect(useLayerStore.getState().isProcessing).toBe(false)
    })
  })
})
