import { DocumentState, Layer, ImageLayer, LineLayer } from '../types'

export interface HistoryEntry {
  document: DocumentState | null
  selectedLayerId: string | null
}

export function cloneDocument(doc: DocumentState | null): DocumentState | null {
  if (!doc) return null
  return {
    ...doc,
    layers: doc.layers.map(cloneLayer),
  }
}

function cloneLayer(layer: Layer): Layer {
  if (layer.type === 'image') {
    return {
      ...layer,
      filters: { ...layer.filters },
    }
  }
  return {
    ...layer,
    start: { ...layer.start },
    end: { ...layer.end },
    border: { ...layer.border },
    warp: { ...layer.warp },
    dashArray: [...layer.dashArray],
  }
}
