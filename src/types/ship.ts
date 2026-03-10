export interface ShipState {
  mmsi: string
  name: string
  latitude: number
  longitude: number
  cog: number
  sog: number
  heading: number
  shipType: number
  navStatus: number
  destination: string
  eta: string
  dimensions: { a: number; b: number; c: number; d: number } | null
  lastUpdated: number
}

export const SHIP_TYPE_MAP: Record<number, { name: string; color: string }> = {
  30: { name: 'Fishing', color: '#00BCD4' },
  31: { name: 'Towing', color: '#795548' },
  32: { name: 'Towing', color: '#795548' },
  36: { name: 'Sailing', color: '#4CAF50' },
  37: { name: 'Pleasure craft', color: '#4CAF50' },
  60: { name: 'Passenger', color: '#2196F3' },
  70: { name: 'Cargo', color: '#607D8B' },
  80: { name: 'Tanker', color: '#F44336' },
}

export function getShipType(code: number): { name: string; color: string } {
  if (SHIP_TYPE_MAP[code]) return SHIP_TYPE_MAP[code]
  if (code >= 60 && code <= 69) return { name: 'Passenger', color: '#2196F3' }
  if (code >= 70 && code <= 79) return { name: 'Cargo', color: '#607D8B' }
  if (code >= 80 && code <= 89) return { name: 'Tanker', color: '#F44336' }
  if (code >= 40 && code <= 49) return { name: 'High-speed', color: '#FF5722' }
  return { name: 'Unknown', color: '#9E9E9E' }
}

export const NAV_STATUS: Record<number, string> = {
  0: 'Under way',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted',
  5: 'Moored',
  7: 'Fishing',
  8: 'Sailing',
  14: 'SAR',
}
