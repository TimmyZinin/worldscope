import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import WebSocket from 'ws'

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

// --- Ships: AISStream.io WebSocket (global AIS) ---
interface ShipPosition {
  mmsi: string
  name: string
  latitude: number
  longitude: number
  heading: number
  sog: number
  cog: number
  shipType: number
  navStatus: number
  destination: string
  eta: string
  dimensions: null
  lastUpdated: number
}

const shipCache = new Map<string, ShipPosition>()
let aisWs: WebSocket | null = null
let aisReconnectTimer: ReturnType<typeof setTimeout> | null = null

// Bounding boxes: Mediterranean Turkey + Eastern Med
const AIS_BOUNDING_BOXES = [
  [[34.0, 26.0], [38.0, 33.0]], // Turkey Med coast + Cyprus
  [[33.0, 24.0], [37.0, 27.0]], // Rhodes, Crete, Greek islands
]

function connectAISStream(): void {
  const apiKey = process.env.AISSTREAM_API_KEY
  if (!apiKey) {
    console.log('[Ships] No AISSTREAM_API_KEY, ship tracking disabled')
    return
  }

  if (aisWs) {
    try { aisWs.close() } catch { /* ignore */ }
    aisWs = null
  }

  console.log('[Ships] Connecting to AISStream.io...')
  const ws = new WebSocket('wss://stream.aisstream.io/v0/stream', {
    handshakeTimeout: 30000,
    headers: { 'User-Agent': 'WorldScope/1.0' },
  })

  ws.on('open', () => {
    console.log('[Ships] AISStream connected, subscribing...')
    const subscription = {
      APIKey: apiKey,
      BoundingBoxes: AIS_BOUNDING_BOXES,
      FilterMessageTypes: ['PositionReport', 'ShipStaticData', 'StandardClassBPositionReport'],
    }
    ws.send(JSON.stringify(subscription))
  })

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const msg = JSON.parse(data.toString())
      if (msg.error) {
        console.error('[Ships] AISStream error:', msg.error)
        return
      }

      const meta = msg.MetaData || msg.Metadata
      if (!meta || !meta.MMSI) return

      const mmsi = String(meta.MMSI)
      const existing = shipCache.get(mmsi)

      // Update position from PositionReport
      if (msg.Message?.PositionReport || msg.Message?.StandardClassBPositionReport) {
        const pos = msg.Message.PositionReport || msg.Message.StandardClassBPositionReport
        if (!pos || pos.Latitude === 0 && pos.Longitude === 0) return

        shipCache.set(mmsi, {
          mmsi,
          name: meta.ShipName?.trim() || existing?.name || `MMSI ${mmsi}`,
          latitude: pos.Latitude ?? meta.latitude,
          longitude: pos.Longitude ?? meta.longitude,
          heading: pos.TrueHeading ?? pos.Cog ?? existing?.heading ?? 0,
          sog: pos.Sog ?? 0,
          cog: pos.Cog ?? 0,
          shipType: existing?.shipType ?? 0,
          navStatus: pos.NavigationalStatus ?? existing?.navStatus ?? 0,
          destination: existing?.destination ?? '',
          eta: existing?.eta ?? '',
          dimensions: null,
          lastUpdated: Date.now(),
        })
      }

      // Update static data
      if (msg.Message?.ShipStaticData) {
        const sd = msg.Message.ShipStaticData
        if (existing) {
          existing.name = sd.Name?.trim() || existing.name
          existing.shipType = sd.Type ?? existing.shipType
          existing.destination = sd.Destination?.trim() || existing.destination
          existing.eta = sd.Eta ? `${sd.Eta.Month}/${sd.Eta.Day} ${sd.Eta.Hour}:${sd.Eta.Minute}` : existing.eta
          shipCache.set(mmsi, existing)
        }
      }
    } catch { /* ignore parse errors */ }
  })

  ws.on('close', (code) => {
    console.log(`[Ships] AISStream disconnected (code ${code}), reconnecting in 5s...`)
    aisWs = null
    if (aisReconnectTimer) clearTimeout(aisReconnectTimer)
    aisReconnectTimer = setTimeout(connectAISStream, 5000)
  })

  ws.on('error', (err) => {
    console.error('[Ships] AISStream error:', err.message)
    // Force reconnect on error
    try { ws.close() } catch { /* ignore */ }
  })

  aisWs = ws
}

// Clean stale ships (not updated in 30 min)
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000
  let removed = 0
  for (const [mmsi, ship] of shipCache) {
    if (ship.lastUpdated < cutoff) {
      shipCache.delete(mmsi)
      removed++
    }
  }
  if (removed > 0) console.log(`[Ships] Cleaned ${removed} stale entries, active: ${shipCache.size}`)
}, 60000)

// Start AIS connection
connectAISStream()

// Log ship count periodically
setInterval(() => {
  if (shipCache.size > 0) console.log(`[Ships] Active vessels: ${shipCache.size}`)
}, 30000)

app.get('/api/ships', async (_req, res) => {
  const ships = Array.from(shipCache.values())
  res.set('Cache-Control', 'public, max-age=10')
  res.json({ ships, source: 'aisstream.io', count: ships.length })
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

// --- API Proxy: Webcams (Windy + static fallback) ---
const STATIC_WEBCAMS = [
  { webcamId: 90001, title: 'Kalkan Beach & Kelemis Bay', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.2635, longitude: 29.4163, city: 'Kalkan', country: 'Turkey' }, player: { day: 'https://www.geocam.ru/en/online/kalkan/' }, images: { current: { preview: 'https://www.geocam.ru/images/photo/ka/lk/kalkan.webp', thumbnail: 'https://www.geocam.ru/images/photo/ka/lk/kalkan.webp' } } },
  { webcamId: 90002, title: 'Kalkan Center — Şehitler Street', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.2640, longitude: 29.4155, city: 'Kalkan', country: 'Turkey' }, player: { day: 'https://www.geocam.ru/en/online/kalkan-center/' } },
  { webcamId: 90003, title: 'Fethiye — Çalış Beach', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.6686, longitude: 29.1053, city: 'Fethiye', country: 'Turkey' }, player: { day: 'https://www.skylinewebcams.com/en/webcam/turkey/aegean-region/fethiye/fethiye.html' } },
  { webcamId: 90004, title: 'Fethiye — Ece Yachting Marina', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.6220, longitude: 29.1070, city: 'Fethiye', country: 'Turkey' }, player: { day: 'https://worldcam.eu/webcams/asia/turkey/29847-fethiye-ece-yachting' } },
  { webcamId: 90005, title: 'Marmaris — Kordon Promenade', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.8517, longitude: 28.2716, city: 'Marmaris', country: 'Turkey' }, player: { day: 'https://www.geocam.ru/en/online/marmarisbel/' }, images: { current: { preview: 'https://www.geocam.ru/images/photo/ma/rm/marmarisbel.webp', thumbnail: 'https://www.geocam.ru/images/photo/ma/rm/marmarisbel.webp' } } },
  { webcamId: 90006, title: 'Marmaris — Yacht Marina', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.8480, longitude: 28.2750, city: 'Marmaris', country: 'Turkey' }, player: { day: 'https://www.geocam.ru/en/online/yat-limani/' }, images: { current: { preview: 'https://www.geocam.ru/images/photo/ya/t-/yat-limani.webp', thumbnail: 'https://www.geocam.ru/images/photo/ya/t-/yat-limani.webp' } } },
  { webcamId: 90007, title: 'Kemer — Tahtalı Mountain Cable Car', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.5270, longitude: 30.4590, city: 'Kemer', country: 'Turkey' }, player: { day: 'https://worldcam.eu/webcams/asia/turkey/8710-kemer-tahtali' } },
  { webcamId: 90008, title: 'Alanya — Cleopatra Beach', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.5465, longitude: 31.9780, city: 'Alanya', country: 'Turkey' }, player: { day: 'https://www.geocam.ru/en/online/alanya-cleopatra-beach/' } },
  { webcamId: 90009, title: 'Alanya — Akhmet Tokush Boulevard', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.5430, longitude: 32.0010, city: 'Alanya', country: 'Turkey' }, player: { day: 'https://www.geocam.ru/en/online/alanya-akhmet-tokush-boulevard/' } },
  { webcamId: 90010, title: 'Side — Oleander Hotel Beach', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.7676, longitude: 31.3930, city: 'Side', country: 'Turkey' }, player: { day: 'https://worldcam.eu/webcams/asia/turkey/37723-side-oleander-hotel' } },
  { webcamId: 90011, title: 'Kalkan — Multiple Views (Kaş District)', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.2635, longitude: 29.4163, city: 'Kalkan', country: 'Turkey' }, player: { day: 'https://worldcam.eu/webcams/asia/turkey/12823-kalkan-several-views' } },
  { webcamId: 90012, title: 'Ölüdeniz — Blue Lagoon', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.5500, longitude: 29.1155, city: 'Ölüdeniz', country: 'Turkey' }, player: { day: 'https://www.geocam.ru/en/online/blue-lagoon/' }, images: { current: { preview: 'https://www.geocam.ru/images/photo/bl/ue/blue-lagoon.webp', thumbnail: 'https://www.geocam.ru/images/photo/bl/ue/blue-lagoon.webp' } } },
  { webcamId: 90013, title: 'Ölüdeniz Beach — Buzz Beach Bar', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.5510, longitude: 29.1170, city: 'Ölüdeniz', country: 'Turkey' }, player: { day: 'https://www.geocam.ru/en/online/oludeniz-beach/' }, images: { current: { preview: 'https://www.geocam.ru/images/photo/ol/ud/oludeniz-beach.webp', thumbnail: 'https://www.geocam.ru/images/photo/ol/ud/oludeniz-beach.webp' } } },
  { webcamId: 90014, title: 'Bodrum — Bay Panorama', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 37.0347, longitude: 27.4295, city: 'Bodrum', country: 'Turkey' }, player: { day: 'https://www.skylinewebcams.com/webcam/turkey/aegean-region/bodrum/bodrum.html' }, images: { current: { preview: 'https://cdn.skylinewebcams.com/social5665.jpg', thumbnail: 'https://cdn.skylinewebcams.com/social5665.jpg' } } },
  { webcamId: 90015, title: 'Manavgat — Kamelya Collection Beach', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.7650, longitude: 31.4430, city: 'Manavgat', country: 'Turkey' }, player: { day: 'https://worldcam.eu/webcams/asia/turkey/31854-manavgat-kamelya-collection' } },
  { webcamId: 90016, title: 'Ölüdeniz — Belcekiz Beach Club', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.5490, longitude: 29.1130, city: 'Ölüdeniz', country: 'Turkey' }, player: { day: 'https://www.geocam.ru/en/online/belcekz-beach-club/' }, images: { current: { preview: 'https://www.geocam.ru/images/photo/be/lc/belcekz-beach-club.webp', thumbnail: 'https://www.geocam.ru/images/photo/be/lc/belcekz-beach-club.webp' } } },
  { webcamId: 90017, title: 'Marmaris Beach — Emre Hotel', status: 'active', lastUpdatedOn: new Date().toISOString(), location: { latitude: 36.8500, longitude: 28.2730, city: 'Marmaris', country: 'Turkey' }, player: { day: 'https://worldcam.eu/webcams/asia/turkey/34846-marmaris-beach' } },
]

app.get('/api/webcams', async (req, res) => {
  const windyKey = process.env.WINDY_API_KEY
  const { north, south, east, west } = req.query

  // Filter static webcams by bounding box
  const filterStatic = () => {
    if (north && south && east && west) {
      const n = +north, s = +south, e = +east, w = +west
      return STATIC_WEBCAMS.filter(wc =>
        wc.location.latitude >= s && wc.location.latitude <= n &&
        wc.location.longitude >= w && wc.location.longitude <= e
      )
    }
    return STATIC_WEBCAMS
  }

  if (!windyKey) {
    const filtered = filterStatic()
    // Only log when webcams are found to reduce noise
    if (filtered.length > 0) console.log(`[Webcams] Static: ${filtered.length} in bounds`)
    res.set('Cache-Control', 'public, max-age=300')
    return res.json({ webcams: filtered })
  }

  const { lat, lon, radius } = req.query
  let windyUrl = 'https://api.windy.com/webcams/api/v3/webcams?lang=en&limit=50&offset=0&include=location,images,player'

  if (lat && lon) {
    windyUrl += `&nearby=${lat},${lon},${radius || 50}`
  } else if (north && south && east && west) {
    windyUrl += `&northLat=${north}&southLat=${south}&eastLon=${east}&westLon=${west}`
  }

  try {
    const response = await fetch(windyUrl, { headers: { 'X-WINDY-API-KEY': windyKey } })
    const data = await response.json()
    // Merge Windy data with static fallback for extra coverage
    const windyWebcams = data.webcams || []
    const staticInBounds = filterStatic()
    const merged = [...windyWebcams, ...staticInBounds]
    res.set('Cache-Control', 'public, max-age=300')
    res.json({ ...data, webcams: merged })
  } catch (e) {
    console.error('[Webcams] Windy error, using static fallback:', e)
    res.set('Cache-Control', 'public, max-age=300')
    res.json({ webcams: filterStatic() })
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
