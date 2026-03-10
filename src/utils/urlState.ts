import type { Viewport, Locale } from '../types/common'

const LAYER_MAP: Record<string, string> = {
  a: 'aircraft',
  s: 'ships',
  c: 'cameras',
  e: 'earthquakes',
  i: 'iss',
  w: 'weather',
}

const REVERSE_LAYER_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LAYER_MAP).map(([k, v]) => [v, k])
)

export function encodeState(
  viewport: Viewport,
  layers: string[],
  locale?: Locale
): string {
  const { latitude, longitude, zoom } = viewport
  const layerStr = layers.map((l) => REVERSE_LAYER_MAP[l] || l[0]).join('')
  let hash = `#@${latitude.toFixed(4)},${longitude.toFixed(4)},${zoom.toFixed(1)}z/${layerStr}`
  if (locale && locale !== 'en') hash += `/${locale}`
  return hash
}

export function decodeState(
  hash: string
): { viewport: Partial<Viewport>; layers: string[]; locale?: Locale } | null {
  const match = hash.match(
    /#@([\d.-]+),([\d.-]+),([\d.]+)z(?:\/([\w]+))?(?:\/([\w]+))?/
  )
  if (!match) return null
  return {
    viewport: {
      latitude: +match[1],
      longitude: +match[2],
      zoom: +match[3],
    },
    layers: match[4]
      ? match[4].split('').map((c) => LAYER_MAP[c]).filter(Boolean)
      : [],
    locale: match[5] as Locale | undefined,
  }
}
