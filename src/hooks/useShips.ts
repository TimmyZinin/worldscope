import { useQuery } from '@tanstack/react-query'
import { useViewport } from './useViewport'
import { getShipType, NAV_STATUS } from '../types/ship'
import type { MapEntity } from '../types/common'

// Ships API — will use RUVDS backend when deployed
const SHIPS_API = import.meta.env.VITE_SHIPS_API_URL || ''

export function useShips(enabled: boolean) {
  const { viewport } = useViewport()
  const padding = Math.max(1, 5 / viewport.zoom)

  return useQuery({
    queryKey: ['ships', Math.round(viewport.latitude), Math.round(viewport.longitude)],
    queryFn: async (): Promise<MapEntity[]> => {
      if (!SHIPS_API) return [] // No ship API configured yet
      const params = new URLSearchParams({
        lamin: String(viewport.latitude - padding),
        lomin: String(viewport.longitude - padding),
        lamax: String(viewport.latitude + padding),
        lomax: String(viewport.longitude + padding),
      })
      const res = await fetch(`${SHIPS_API}/api/ships?${params}`)
      if (!res.ok) return []
      const data = await res.json()
      return data.ships.map((s: {
        mmsi: string; name: string; latitude: number; longitude: number;
        heading: number; sog: number; shipType: number; navStatus: number;
        destination: string; eta: string; dimensions: { a: number; b: number; c: number; d: number } | null;
        lastUpdated: number
      }) => {
        const st = getShipType(s.shipType)
        return {
          id: s.mmsi,
          type: 'ship' as const,
          latitude: s.latitude,
          longitude: s.longitude,
          heading: s.heading,
          name: s.name || s.mmsi,
          speed: s.sog * 0.514444,
          altitude: null,
          lastUpdated: Math.floor(s.lastUpdated / 1000),
          icon: 'ship',
          color: st.color,
          meta: {
            shipType: st.name,
            navStatus: NAV_STATUS[s.navStatus] || 'Unknown',
            destination: s.destination,
            eta: s.eta,
            dimensions: s.dimensions,
            sog: s.sog,
            mmsi: s.mmsi,
          },
        }
      })
    },
    enabled: enabled && !!SHIPS_API,
    refetchInterval: 10000,
    staleTime: 5000,
  })
}
