import { useQuery } from '@tanstack/react-query'
import { useViewport } from './useViewport'
import type { MapEntity } from '../types/common'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function useWebcams(enabled: boolean) {
  const { viewport } = useViewport()
  const padding = Math.max(0.5, 3 / viewport.zoom)

  return useQuery({
    queryKey: ['webcams', Math.round(viewport.latitude * 10), Math.round(viewport.longitude * 10)],
    queryFn: async (): Promise<MapEntity[]> => {
      const params = new URLSearchParams({
        north: String(viewport.latitude + padding),
        south: String(viewport.latitude - padding),
        east: String(viewport.longitude + padding),
        west: String(viewport.longitude - padding),
      })
      const res = await fetch(`${API_BASE}/api/webcams?${params}`)
      if (!res.ok) return []
      const data = await res.json()
      return (data.webcams || []).map((w: {
        webcamId: number; title: string; status: string; lastUpdatedOn: string;
        location: { latitude: number; longitude: number; city: string; country: string };
        images?: { current?: { preview: string; thumbnail: string } };
        player?: { day: string };
      }) => ({
        id: `cam-${w.webcamId}`,
        type: 'webcam' as const,
        latitude: w.location.latitude,
        longitude: w.location.longitude,
        heading: null,
        name: w.title,
        speed: null,
        altitude: null,
        lastUpdated: Math.floor(new Date(w.lastUpdatedOn).getTime() / 1000),
        icon: 'webcam',
        color: w.status === 'active' ? '#4CAF50' : '#9E9E9E',
        meta: {
          city: w.location.city,
          country: w.location.country,
          status: w.status,
          preview: w.images?.current?.preview,
          thumbnail: w.images?.current?.thumbnail,
          playerUrl: w.player?.day,
        },
      }))
    },
    enabled,
    refetchInterval: 300000,
    staleTime: 120000,
  })
}
