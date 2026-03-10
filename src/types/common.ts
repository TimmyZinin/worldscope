export interface MapEntity {
  id: string
  type: 'aircraft' | 'ship' | 'webcam' | 'earthquake' | 'iss'
  latitude: number
  longitude: number
  heading: number | null
  name: string
  speed: number | null
  altitude: number | null
  lastUpdated: number
  icon: string
  color: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: Record<string, any>
}

export interface Viewport {
  latitude: number
  longitude: number
  zoom: number
  bearing: number
  pitch: number
}

export interface LayerConfig {
  id: string
  name: string
  icon: string
  visible: boolean
  count: number
  refreshInterval: number
}

export type Locale = 'en' | 'es' | 'zh' | 'hi' | 'ar' | 'pt' | 'fr' | 'ru' | 'de' | 'ja'
