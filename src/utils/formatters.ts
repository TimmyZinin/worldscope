export function formatAltitude(meters: number | null): string {
  if (meters === null) return '—'
  const fl = Math.round(meters / 30.48 / 100)
  return `${meters.toLocaleString()} m (FL${fl})`
}

export function formatSpeed(mps: number | null, unit: 'kmh' | 'knots' = 'kmh'): string {
  if (mps === null) return '—'
  if (unit === 'knots') return `${(mps * 1.94384).toFixed(1)} kn`
  return `${Math.round(mps * 3.6)} km/h`
}

export function formatSpeedKnots(knots: number | null): string {
  if (knots === null) return '—'
  return `${knots.toFixed(1)} kn`
}

export function formatHeading(deg: number | null): string {
  if (deg === null) return '—'
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const i = Math.round(deg / 45) % 8
  return `${Math.round(deg)}° (${dirs[i]})`
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() / 1000) - timestamp)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function formatMagnitude(mag: number): string {
  return `M ${mag.toFixed(1)}`
}
