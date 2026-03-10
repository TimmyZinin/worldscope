import { useQuery } from '@tanstack/react-query'
import { parseAircraftState, type AircraftState } from '../types/aircraft'
import type { MapEntity } from '../types/common'

const API_BASE = import.meta.env.VITE_API_URL || ''

function toMapEntity(a: AircraftState): MapEntity | null {
  if (a.latitude === null || a.longitude === null) return null
  return {
    id: a.icao24,
    type: 'aircraft',
    latitude: a.latitude,
    longitude: a.longitude,
    heading: a.trueHeading,
    name: a.callsign || a.icao24.toUpperCase(),
    speed: a.velocity,
    altitude: a.baroAltitude,
    lastUpdated: a.lastContact,
    icon: 'aircraft',
    color: a.onGround ? '#9E9E9E' : '#FF9800',
    meta: {
      originCountry: a.originCountry,
      squawk: a.squawk,
      verticalRate: a.verticalRate,
      geoAltitude: a.geoAltitude,
      onGround: a.onGround,
      positionSource: a.positionSource,
    },
  }
}

export function useAircraft(enabled: boolean) {
  return useQuery({
    queryKey: ['aircraft'],
    queryFn: async (): Promise<MapEntity[]> => {
      const res = await fetch(`${API_BASE}/api/aircraft`)
      if (!res.ok) return []
      const data = await res.json()
      if (!data.states) return []
      return data.states
        .map((s: unknown[]) => toMapEntity(parseAircraftState(s)))
        .filter(Boolean) as MapEntity[]
    },
    enabled,
    refetchInterval: 60000,
    staleTime: 45000,
    retry: 1,
  })
}
