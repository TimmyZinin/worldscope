import { useQuery } from '@tanstack/react-query'
import type { MapEntity } from '../types/common'

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'

function magnitudeToColor(mag: number): string {
  if (mag >= 6) return '#F44336'
  if (mag >= 4) return '#FF9800'
  if (mag >= 2) return '#FFC107'
  return '#4CAF50'
}

export function useEarthquakes(enabled: boolean) {
  return useQuery({
    queryKey: ['earthquakes'],
    queryFn: async (): Promise<MapEntity[]> => {
      const res = await fetch(USGS_URL)
      if (!res.ok) throw new Error(`USGS error: ${res.status}`)
      const data = await res.json()
      return data.features.map((f: {
        id: string
        properties: { mag: number; place: string; time: number; title: string; type: string }
        geometry: { coordinates: number[] }
      }) => ({
        id: `eq-${f.id}`,
        type: 'earthquake' as const,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        heading: null,
        name: f.properties.title,
        speed: null,
        altitude: null,
        lastUpdated: Math.floor(f.properties.time / 1000),
        icon: 'earthquake',
        color: magnitudeToColor(f.properties.mag),
        meta: {
          magnitude: f.properties.mag,
          depth: f.geometry.coordinates[2],
          place: f.properties.place,
          type: f.properties.type,
        },
      }))
    },
    enabled,
    refetchInterval: 60000,
    staleTime: 30000,
  })
}
