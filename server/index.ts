import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3090

app.use(cors())
app.use(express.json())

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

  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`
    const headers: Record<string, string> = {}
    const token = await getOpenSkyToken()
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(url, { headers })
    if (!response.ok) {
      return res.status(response.status).json({ error: 'OpenSky API error', status: response.status })
    }
    const data = await response.json()
    res.set('Cache-Control', 'public, max-age=5')
    res.json(data)
  } catch (e) {
    console.error('[Aircraft] Error:', e)
    res.status(500).json({ error: 'Internal error' })
  }
})

// --- API Proxy: Earthquakes (USGS) ---
app.get('/api/earthquakes', async (_req, res) => {
  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')
    const data = await response.json()
    res.set('Cache-Control', 'public, max-age=60')
    res.json(data)
  } catch (e) {
    console.error('[Earthquakes] Error:', e)
    res.status(500).json({ error: 'Internal error' })
  }
})

// --- API Proxy: ISS ---
app.get('/api/iss', async (_req, res) => {
  try {
    const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544')
    const data = await response.json()
    res.set('Cache-Control', 'public, max-age=3')
    res.json(data)
  } catch (e) {
    console.error('[ISS] Error:', e)
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
