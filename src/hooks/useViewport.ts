import { create } from 'zustand'
import type { Viewport } from '../types/common'
import { decodeState, encodeState } from '../utils/urlState'

interface ViewportStore {
  viewport: Viewport
  setViewport: (v: Partial<Viewport>) => void
  syncToUrl: (layers: string[]) => void
}

function getInitialViewport(): Viewport {
  const hash = window.location.hash
  const decoded = decodeState(hash)
  if (decoded?.viewport) {
    return {
      latitude: decoded.viewport.latitude ?? 30,
      longitude: decoded.viewport.longitude ?? 0,
      zoom: decoded.viewport.zoom ?? 3,
      bearing: 0,
      pitch: 0,
    }
  }
  return { latitude: 30, longitude: 0, zoom: 3, bearing: 0, pitch: 0 }
}

export const useViewport = create<ViewportStore>((set, get) => ({
  viewport: getInitialViewport(),
  setViewport: (v) =>
    set((state) => ({ viewport: { ...state.viewport, ...v } })),
  syncToUrl: (layers) => {
    const { viewport } = get()
    const hash = encodeState(viewport, layers)
    window.history.replaceState(null, '', hash)
  },
}))
