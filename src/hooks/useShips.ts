import { useQuery } from '@tanstack/react-query'
import { getShipType, getFlag, NAV_STATUS } from '../types/ship'
import type { MapEntity } from '../types/common'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface ShipAPI {
  mmsi: string; name: string; callsign: string
  latitude: number; longitude: number
  heading: number; sog: number; cog: number
  shipType: number; navStatus: number
  destination: string; eta: string
  length: number; beam: number; draught: number
  lastUpdated: number
}

export function useShips(enabled: boolean) {
  return useQuery({
    queryKey: ['ships'],
    queryFn: async (): Promise<MapEntity[]> => {
      const res = await fetch(`${API_BASE}/api/ships`)
      if (!res.ok) return []
      const data = await res.json()
      if (!data.ships || !data.ships.length) return []
      return data.ships.map((s: ShipAPI) => {
        const st = getShipType(s.shipType)
        const flag = getFlag(s.mmsi)
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
            shipTypeCode: s.shipType,
            navStatus: NAV_STATUS[s.navStatus] || 'Unknown',
            destination: s.destination,
            eta: s.eta,
            sog: s.sog,
            mmsi: s.mmsi,
            callsign: s.callsign || '',
            flag,
            length: s.length || 0,
            beam: s.beam || 0,
            draught: s.draught || 0,
          },
        }
      })
    },
    enabled,
    refetchInterval: 30000,
    staleTime: 15000,
  })
}
