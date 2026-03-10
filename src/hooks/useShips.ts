import { useQuery } from '@tanstack/react-query'
import { getShipType, NAV_STATUS } from '../types/ship'
import type { MapEntity } from '../types/common'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function useShips(enabled: boolean) {
  return useQuery({
    queryKey: ['ships'],
    queryFn: async (): Promise<MapEntity[]> => {
      const res = await fetch(`${API_BASE}/api/ships`)
      if (!res.ok) return []
      const data = await res.json()
      if (!data.ships || !data.ships.length) return []
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
          name: s.name || `MMSI ${s.mmsi}`,
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
    enabled,
    refetchInterval: 30000,
    staleTime: 15000,
  })
}
