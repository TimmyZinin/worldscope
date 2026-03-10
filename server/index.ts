import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3090

app.use(cors())
app.use(express.json())

// --- In-memory cache helper ---
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache: Record<string, CacheEntry<unknown>> = {}

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache[key]
  if (entry && Date.now() - entry.timestamp < ttlMs) return entry.data as T
  return null
}

function getStale<T>(key: string): T | null {
  const entry = cache[key]
  if (entry) return entry.data as T
  return null
}

function setCache(key: string, data: unknown): void {
  cache[key] = { data, timestamp: Date.now() }
}

// --- API Proxy: Aircraft (airplanes.live — free ADS-B) ---
// Background fetcher: multiple regions every 30s

interface AircraftEntry {
  hex: string; flight?: string; lat?: number; lon?: number
  alt_baro?: number | string; alt_geom?: number; gs?: number; track?: number
  squawk?: string; t?: string; r?: string; desc?: string
  baro_rate?: number; category?: string; nav_heading?: number
  true_heading?: number; mag_heading?: number
}

let aircraftCache: AircraftEntry[] = []
let aircraftFetching = false
let aircraftLastFetch = 0

const REGIONS = [
  { lat: 50, lon: 10, dist: 250, name: 'Europe-West' },
  { lat: 39, lon: 30, dist: 250, name: 'Turkey-EastMed' },
  { lat: 38, lon: -97, dist: 250, name: 'USA' },
  { lat: 35, lon: 135, dist: 250, name: 'East-Asia' },
  { lat: 25, lon: 55, dist: 250, name: 'Middle-East' },
]

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchAircraftBackground(): Promise<void> {
  if (aircraftFetching) return
  aircraftFetching = true

  try {
    const allAircraft = new Map<string, AircraftEntry>()
    let successCount = 0

    for (let i = 0; i < REGIONS.length; i++) {
      const region = REGIONS[i]
      // Delay between requests to avoid API rate-limiting (429 at <10s)
      if (i > 0) await delay(12000)

      try {
        const url = `https://api.airplanes.live/v2/point/${region.lat}/${region.lon}/${region.dist}`
        const response = await fetch(url, {
          headers: { 'Accept-Encoding': 'gzip' },
          signal: AbortSignal.timeout(10000),
        })
        if (response.ok) {
          const data = await response.json()
          const ac = data.ac || []
          let added = 0
          for (const a of ac) {
            if (a.lat != null && a.lon != null) {
              allAircraft.set(a.hex, a)
              added++
            }
          }
          if (added > 0) successCount++
          console.log(`[Aircraft] ${region.name}: ${added} aircraft (total: ${allAircraft.size})`)
        } else {
          console.warn(`[Aircraft] ${region.name}: HTTP ${response.status}`)
        }
      } catch (e) {
        console.warn(`[Aircraft] Failed ${region.name}:`, (e as Error).message)
      }
    }

    if (allAircraft.size > 0) {
      aircraftCache = Array.from(allAircraft.values())
      aircraftLastFetch = Date.now()
      console.log(`[Aircraft] Total: ${aircraftCache.length} aircraft from ${successCount}/${REGIONS.length} regions`)
    }
  } catch (e) {
    console.error('[Aircraft] Background fetch error:', e)
  } finally {
    aircraftFetching = false
  }
}

// Initial fetch + interval
fetchAircraftBackground()
setInterval(fetchAircraftBackground, 90000)

app.get('/api/aircraft', async (_req, res) => {
  // Convert airplanes.live format to OpenSky-compatible states array
  const states = aircraftCache.map((a) => {
    const altBaro = typeof a.alt_baro === 'number' ? a.alt_baro * 0.3048 : null // ft → m
    const altGeo = a.alt_geom != null ? a.alt_geom * 0.3048 : null
    const velocity = a.gs != null ? a.gs * 0.514444 : null // knots → m/s
    const heading = a.true_heading ?? a.mag_heading ?? a.track ?? null
    const vertRate = a.baro_rate != null ? a.baro_rate * 0.00508 : null // ft/min → m/s
    const onGround = a.alt_baro === 'ground'
    // OpenSky state vector format: [icao24, callsign, origin_country, time_position, last_contact, lon, lat, baro_alt, on_ground, velocity, heading, vert_rate, sensors, geo_alt, squawk, spi, pos_source]
    return [
      a.hex,
      a.flight?.trim() || '',
      '', // origin_country not available
      Math.floor(aircraftLastFetch / 1000),
      Math.floor(aircraftLastFetch / 1000),
      a.lon,
      a.lat,
      onGround ? null : altBaro,
      onGround,
      velocity,
      heading,
      vertRate,
      null,
      altGeo,
      a.squawk || null,
      false,
      0,
    ]
  })

  res.set('Cache-Control', 'public, max-age=10')
  res.json({ states, time: Math.floor(aircraftLastFetch / 1000) })
})

// --- API Proxy: Ships (Digitraffic.fi — free AIS data) ---
app.get('/api/ships', async (_req, res) => {
  const cacheKey = 'ships:global'
  const cached = getCached(cacheKey, 30000) // 30s TTL
  if (cached) {
    res.set('Cache-Control', 'public, max-age=15')
    return res.json(cached)
  }

  try {
    // Digitraffic.fi — free Finnish/Baltic AIS feed
    const response = await fetch('https://meri.digitraffic.fi/api/ais/v1/locations', {
      headers: { 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const stale = getStale(cacheKey)
      if (stale) return res.json(stale)
      return res.json({ ships: [] })
    }

    const data = await response.json()
    const features = data.features || []

    const ships = features
      .filter((f: any) => f.geometry?.coordinates && f.properties?.mmsi)
      .slice(0, 500) // Limit to 500 ships
      .map((f: any) => {
        const p = f.properties
        return {
          mmsi: String(p.mmsi),
          name: p.name || `MMSI ${p.mmsi}`,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          heading: p.heading ?? p.cog ?? 0,
          sog: p.sog ?? 0,
          shipType: p.shipType ?? 0,
          navStatus: p.navStat ?? 0,
          destination: '',
          eta: '',
          dimensions: null,
          lastUpdated: p.timestampExternal || Date.now(),
        }
      })

    const result = { ships, source: 'digitraffic.fi', count: ships.length }
    setCache(cacheKey, result)
    res.set('Cache-Control', 'public, max-age=15')
    res.json(result)
  } catch (e) {
    console.error('[Ships] Error:', e)
    const stale = getStale(cacheKey)
    if (stale) return res.json(stale)
    res.json({ ships: [], error: 'Failed to fetch ship data' })
  }
})

// --- API Proxy: Earthquakes (USGS) ---
app.get('/api/earthquakes', async (_req, res) => {
  const cacheKey = 'earthquakes'
  const cached = getCached(cacheKey, 60000)
  if (cached) {
    res.set('Cache-Control', 'public, max-age=60')
    return res.json(cached)
  }

  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')
    const data = await response.json()
    setCache(cacheKey, data)
    res.set('Cache-Control', 'public, max-age=60')
    res.json(data)
  } catch (e) {
    console.error('[Earthquakes] Error:', e)
    const stale = getStale(cacheKey)
    if (stale) return res.json(stale)
    res.status(500).json({ error: 'Internal error' })
  }
})

// --- API Proxy: ISS ---
app.get('/api/iss', async (_req, res) => {
  const cacheKey = 'iss'
  const cached = getCached(cacheKey, 3000)
  if (cached) {
    res.set('Cache-Control', 'public, max-age=3')
    return res.json(cached)
  }

  try {
    const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544')
    const data = await response.json()
    setCache(cacheKey, data)
    res.set('Cache-Control', 'public, max-age=3')
    res.json(data)
  } catch (e) {
    console.error('[ISS] Error:', e)
    const stale = getStale(cacheKey)
    if (stale) return res.json(stale)
    res.status(500).json({ error: 'Internal error' })
  }
})

// --- API Proxy: Webcams (Windy) ---
app.get('/api/webcams', async (req, res) => {
  const windyKey = process.env.WINDY_API_KEY
  if (!windyKey) return res.json({ webcams: [] })

  const { north, south, east, west, lat, lon, radius } = req.query
  let windyUrl = 'https://api.windy.com/webcams/api/v3/webcams?lang=en&limit=50&offset=0&include=location,images,player'

  if (lat && lon) {
    windyUrl += `&nearby=${lat},${lon},${radius || 50}`
  } else if (north && south && east && west) {
    windyUrl += `&northLat=${north}&southLat=${south}&eastLon=${east}&westLon=${west}`
  }

  try {
    const response = await fetch(windyUrl, { headers: { 'X-WINDY-API-KEY': windyKey } })
    const data = await response.json()
    res.set('Cache-Control', 'public, max-age=300')
    res.json(data)
  } catch (e) {
    console.error('[Webcams] Error:', e)
    res.status(500).json({ error: 'Internal error' })
  }
})

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

// --- Serve static frontend ---
const distPath = path.join(__dirname, '../dist')
// Assets have hashed filenames — cache aggressively
app.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '30d', immutable: true }))
// index.html — NEVER cache (so new JS bundles load immediately)
app.get(['/', '/index.html'], (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.sendFile(path.join(distPath, 'index.html'))
})
// Other static files
app.use(express.static(distPath, { maxAge: '1h' }))
// SPA fallback
app.use((_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[WorldScope] Server running on port ${PORT}`)
})
