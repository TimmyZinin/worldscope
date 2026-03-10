import { useQuery } from '@tanstack/react-query'
import type { MapEntity } from '../types/common'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function useISS(enabled: boolean) {
  return useQuery({
    queryKey: ['iss'],
    queryFn: async (): Promise<MapEntity[]> => {
      const res = await fetch(`${API_BASE}/api/iss`)
      if (!res.ok) throw new Error(`ISS API error: ${res.status}`)
      const d = await res.json()
      return [{
        id: 'iss-25544',
        type: 'iss' as const,
        latitude: d.latitude,
        longitude: d.longitude,
        heading: null,
        name: 'International Space Station',
        speed: d.velocity / 3.6,
        altitude: d.altitude * 1000,
        lastUpdated: d.timestamp,
        icon: 'iss',
        color: '#7C4DFF',
        meta: {
          velocity: d.velocity,
          altitude: d.altitude,
          visibility: d.visibility,
        },
      }]
    },
    enabled,
    refetchInterval: 5000,
    staleTime: 3000,
  })
}
