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

// --- API Proxy: Aircraft (OpenSky) ---
let cachedToken: { token: string; expiresAt: number } | null = null

async function getOpenSkyToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token

  try {
    const res = await fetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    )
    const data = await res.json()
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
    return data.access_token
  } catch (e) {
    console.error('[OpenSky] Token error:', e)
    return null
  }
}

app.get('/api/aircraft', async (req, res) => {
  const { lamin, lomin, lamax, lomax } = req.query
  if (!lamin || !lomin || !lamax || !lomax) {
    return res.status(400).json({ error: 'Missing bbox params' })
  }

  const cacheKey = `aircraft:${Math.round(Number(lamin))}:${Math.round(Number(lomin))}:${Math.round(Number(lamax))}:${Math.round(Number(lomax))}`

  // Return cached if fresh (15s TTL)
  const cached = getCached(cacheKey, 15000)
  if (cached) {
    res.set('Cache-Control', 'public, max-age=10')
    return res.json(cached)
  }

  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`
    const headers: Record<string, string> = {}
    const token = await getOpenSkyToken()
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })

    if (response.status === 429) {
      // Rate limited — serve stale cache if available
      console.warn('[Aircraft] Rate limited (429), serving stale cache')
      const stale = getStale(cacheKey)
      if (stale) {
        res.set('Cache-Control', 'public, max-age=10')
        return res.json(stale)
      }
      // No stale cache, try global cache
      const globalStale = getStale('aircraft:global')
      if (globalStale) {
        res.set('Cache-Control', 'public, max-age=10')
        return res.json(globalStale)
      }
      return res.status(429).json({ error: 'Rate limited', states: [] })
    }

    if (!response.ok) {
      const stale = getStale(cacheKey)
      if (stale) return res.json(stale)
      return res.status(response.status).json({ error: 'OpenSky API error', status: response.status })
    }

    const data = await response.json()
    setCache(cacheKey, data)
    setCache('aircraft:global', data)
    res.set('Cache-Control', 'public, max-age=10')
    res.json(data)
  } catch (e) {
    console.error('[Aircraft] Error:', e)
    const stale = getStale(cacheKey) || getStale('aircraft:global')
    if (stale) return res.json(stale)
    res.status(500).json({ error: 'Internal error', states: [] })
  }
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
app.use(express.static(distPath))
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[WorldScope] Server running on port ${PORT}`)
})
