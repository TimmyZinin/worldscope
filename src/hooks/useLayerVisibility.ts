import { create } from 'zustand'
import { decodeState } from '../utils/urlState'

interface LayerStore {
  layers: Record<string, boolean>
  counts: Record<string, number>
  toggleLayer: (id: string) => void
  setCount: (id: string, count: number) => void
  getVisibleLayerIds: () => string[]
}

function getInitialLayers(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {
    aircraft: true,
    ships: true,
    cameras: true,
    earthquakes: true,
    iss: true,
    weather: false,
  }
  const hash = window.location.hash
  const decoded = decodeState(hash)
  if (decoded?.layers?.length) {
    Object.keys(defaults).forEach((k) => (defaults[k] = false))
    decoded.layers.forEach((l) => (defaults[l] = true))
  }
  return defaults
}

export const useLayerVisibility = create<LayerStore>((set, get) => ({
  layers: getInitialLayers(),
  counts: { aircraft: 0, ships: 0, cameras: 0, earthquakes: 0, iss: 0 },
  toggleLayer: (id) =>
    set((state) => ({
      layers: { ...state.layers, [id]: !state.layers[id] },
    })),
  setCount: (id, count) =>
    set((state) => ({
      counts: { ...state.counts, [id]: count },
    })),
  getVisibleLayerIds: () =>
    Object.entries(get().layers)
      .filter(([, v]) => v)
      .map(([k]) => k),
}))
