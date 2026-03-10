import { useQuery } from '@tanstack/react-query'
import { useViewport } from './useViewport'
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
  const { viewport } = useViewport()
  const padding = Math.max(1, 10 / viewport.zoom)

  return useQuery({
    queryKey: ['aircraft', Math.round(viewport.latitude), Math.round(viewport.longitude), Math.round(viewport.zoom)],
    queryFn: async (): Promise<MapEntity[]> => {
      const params = new URLSearchParams({
        lamin: String(viewport.latitude - padding),
        lomin: String(viewport.longitude - padding),
        lamax: String(viewport.latitude + padding),
        lomax: String(viewport.longitude + padding),
      })
      const res = await fetch(`${API_BASE}/api/aircraft?${params}`)
      if (!res.ok) throw new Error(`OpenSky error: ${res.status}`)
      const data = await res.json()
      if (!data.states) return []
      return data.states
        .map((s: unknown[]) => toMapEntity(parseAircraftState(s)))
        .filter(Boolean) as MapEntity[]
    },
    enabled,
    refetchInterval: 10000,
    staleTime: 5000,
    retry: 2,
  })
}
