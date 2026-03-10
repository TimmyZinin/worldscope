import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { NavigationControl, GeolocateControl, type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { useControl } from 'react-map-gl/maplibre'
import { ScatterplotLayer, IconLayer } from '@deck.gl/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useViewport } from '../../hooks/useViewport'
import { useLayerVisibility } from '../../hooks/useLayerVisibility'
import { useAircraft } from '../../hooks/useAircraft'
import { useEarthquakes } from '../../hooks/useEarthquakes'
import { useISS } from '../../hooks/useISS'
import { useShips } from '../../hooks/useShips'
import { useWebcams } from '../../hooks/useWebcams'
import type { MapEntity } from '../../types/common'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// --- SVG icon factories ---

function makeAircraftSvg(fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
    <path d="M24 4 L28 20 L44 26 L28 30 L26 44 L24 38 L22 44 L20 30 L4 26 L20 20 Z"
      fill="${fill}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function makeShipSvg(fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
    <path d="M24 4 L28 16 L28 28 L38 34 L36 40 L24 36 L12 40 L10 34 L20 28 L20 16 Z"
      fill="${fill}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    <rect x="22" y="10" width="4" height="10" fill="white" opacity="0.6"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const WEBCAM_SVG_URL = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
    <rect x="6" y="12" width="28" height="22" rx="4"
      fill="#4CAF50" stroke="white" stroke-width="2"/>
    <polygon points="34,16 44,10 44,38 34,32"
      fill="#4CAF50" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="20" cy="23" r="6" fill="white" opacity="0.85"/>
    <circle cx="20" cy="23" r="3" fill="#4CAF50"/>
    <rect x="14" y="34" width="12" height="3" rx="1.5"
      fill="white" opacity="0.6"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
})()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeckGLOverlay(props: { layers: any[] }) {
  const overlay = useControl(() => new MapboxOverlay({ interleaved: true }))
  overlay.setProps({ layers: props.layers })
  return null
}

interface WorldMapProps {
  onEntityClick: (entity: MapEntity | null) => void
}

function findNearestEntity(
  lngLat: { lng: number; lat: number },
  entities: MapEntity[],
  zoom: number
): MapEntity | null {
  const threshold = 8 / Math.pow(2, zoom - 2)
  let nearest: MapEntity | null = null
  let minDist = threshold

  for (const e of entities) {
    const dlat = e.latitude - lngLat.lat
    const dlng = e.longitude - lngLat.lng
    const dist = Math.sqrt(dlat * dlat + dlng * dlng)
    if (dist < minDist) {
      minDist = dist
      nearest = e
    }
  }
  return nearest
}

export default function WorldMap({ onEntityClick }: WorldMapProps) {
  const mapRef = useRef<MapRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { viewport, setViewport } = useViewport()
  const { layers, setCount } = useLayerVisibility()
  const [currentTime, setCurrentTime] = useState(Date.now())
  const isDragging = useRef(false)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const { data: aircraft = [] } = useAircraft(layers.aircraft)
  const { data: earthquakes = [] } = useEarthquakes(layers.earthquakes)
  const { data: iss = [] } = useISS(layers.iss)
  const { data: ships = [] } = useShips(layers.ships)
  const { data: webcams = [] } = useWebcams(layers.cameras)

  useEffect(() => {
    setCount('aircraft', aircraft.length)
    setCount('earthquakes', earthquakes.length)
    setCount('iss', iss.length)
    setCount('ships', ships.length)
    setCount('cameras', webcams.length)
  }, [aircraft.length, earthquakes.length, iss.length, ships.length, webcams.length, setCount])

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 200)
    return () => clearInterval(interval)
  }, [])

  const onMove = useCallback(
    (e: ViewStateChangeEvent) => {
      setViewport({
        latitude: e.viewState.latitude,
        longitude: e.viewState.longitude,
        zoom: e.viewState.zoom,
        bearing: e.viewState.bearing,
        pitch: e.viewState.pitch,
      })
    },
    [setViewport]
  )

  const allEntities = useMemo(() => {
    const all: MapEntity[] = []
    if (layers.aircraft) all.push(...aircraft)
    if (layers.ships) all.push(...ships)
    if (layers.cameras) all.push(...webcams)
    if (layers.earthquakes) all.push(...earthquakes)
    if (layers.iss) all.push(...iss)
    return all
  }, [layers, aircraft, ships, webcams, earthquakes, iss])

  const entitiesRef = useRef(allEntities)
  const zoomRef = useRef(viewport.zoom)
  const onEntityClickRef = useRef(onEntityClick)
  entitiesRef.current = allEntities
  zoomRef.current = viewport.zoom
  onEntityClickRef.current = onEntityClick

  // Track mouse drag to distinguish click from pan (with threshold for mobile)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const DRAG_THRESHOLD = 8 // px — ignore small finger movements on mobile
    const onDown = (e: PointerEvent) => {
      isDragging.current = false
      pointerStart.current = { x: e.clientX, y: e.clientY }
    }
    const onMoveEvt = (e: PointerEvent) => {
      if (!pointerStart.current) return
      const dx = e.clientX - pointerStart.current.x
      const dy = e.clientY - pointerStart.current.y
      if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
        isDragging.current = true
      }
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMoveEvt)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMoveEvt)
    }
  }, [])

  // Dynamic cursor: pointer only when hovering near an entity (desktop only)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let rafId = 0
    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const map = mapRef.current?.getMap()
        if (!map) return
        const canvas = map.getCanvas()
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
        const lngLat = map.unproject([x, y])
        const nearest = findNearestEntity(
          { lng: lngLat.lng, lat: lngLat.lat },
          entitiesRef.current,
          zoomRef.current
        )
        const canvasContainer = canvas.parentElement
        if (canvasContainer) {
          canvasContainer.classList.toggle('entity-hover', nearest !== null)
        }
      })
    }
    el.addEventListener('mousemove', onMouseMove)
    return () => {
      el.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Click on container — bubbles up from MapLibre canvas, doesn't block map interaction
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) return // ignore drag-end clicks
    const map = mapRef.current?.getMap()
    if (!map) return

    const mapCanvas = map.getCanvas()
    const rect = mapCanvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

    const lngLat = map.unproject([x, y])
    const nearest = findNearestEntity(
      { lng: lngLat.lng, lat: lngLat.lat },
      entitiesRef.current,
      zoomRef.current
    )
    if (nearest) {
      onEntityClickRef.current(nearest)
    }
  }, [])

  const deckLayers = []

  if (layers.aircraft && aircraft.length > 0) {
    deckLayers.push(
      new IconLayer({
        id: 'aircraft-icons',
        data: aircraft,
        getPosition: (d: MapEntity) => [d.longitude, d.latitude],
        getIcon: (d: MapEntity) => ({
          url: d.meta.onGround ? makeAircraftSvg('#9E9E9E') : makeAircraftSvg('#FF9800'),
          width: 48,
          height: 48,
          anchorX: 24,
          anchorY: 24,
        }),
        getSize: 28,
        sizeScale: 1,
        sizeMinPixels: 16,
        sizeMaxPixels: 36,
        billboard: true,
        updateTriggers: {
          getPosition: aircraft.map((a) => `${a.id}:${a.latitude}:${a.longitude}`).join(','),
          getIcon: aircraft.map((a) => `${a.id}:${a.meta.onGround}`).join(','),
        },
      })
    )
  }

  if (layers.ships && ships.length > 0) {
    deckLayers.push(
      new IconLayer({
        id: 'ships-icons',
        data: ships,
        getPosition: (d: MapEntity) => [d.longitude, d.latitude],
        getIcon: (d: MapEntity) => ({
          url: makeShipSvg(d.color),
          width: 48,
          height: 48,
          anchorX: 24,
          anchorY: 24,
        }),
        getSize: 28,
        sizeScale: 1,
        sizeMinPixels: 14,
        sizeMaxPixels: 34,
        billboard: true,
        updateTriggers: {
          getIcon: ships.map((s) => `${s.id}:${s.color}`).join(','),
        },
      })
    )
  }

  if (layers.cameras && webcams.length > 0) {
    deckLayers.push(
      new IconLayer({
        id: 'webcams-icons',
        data: webcams,
        getPosition: (d: MapEntity) => [d.longitude, d.latitude],
        getIcon: () => ({
          url: WEBCAM_SVG_URL,
          width: 48,
          height: 48,
          anchorX: 24,
          anchorY: 24,
        }),
        getSize: 26,
        sizeScale: 1,
        sizeMinPixels: 14,
        sizeMaxPixels: 32,
        billboard: true,
      })
    )
  }

  if (layers.earthquakes && earthquakes.length > 0) {
    const pulse = 1 + 0.3 * Math.sin(currentTime / 500)
    deckLayers.push(
      new ScatterplotLayer({
        id: 'earthquake-layer',
        data: earthquakes,
        getPosition: (d: MapEntity) => [d.longitude, d.latitude],
        getRadius: (d: MapEntity) => {
          const mag = (d.meta.magnitude as number) || 1
          return mag * 5 * pulse
        },
        getFillColor: (d: MapEntity) => {
          const hex = d.color
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          return [r, g, b, 160]
        },
        getLineColor: (d: MapEntity) => {
          const hex = d.color
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          return [r, g, b, 255]
        },
        lineWidthMinPixels: 2,
        radiusMinPixels: 5,
        radiusMaxPixels: 35,
        updateTriggers: { getRadius: currentTime },
      })
    )
  }

  if (layers.iss && iss.length > 0) {
    const issPulse = 1 + 0.4 * Math.sin(currentTime / 300)
    deckLayers.push(
      new ScatterplotLayer({
        id: 'iss-glow',
        data: iss,
        getPosition: (d: MapEntity) => [d.longitude, d.latitude],
        getRadius: 15 * issPulse,
        getFillColor: [124, 77, 255, 60],
        radiusMinPixels: 15,
        radiusMaxPixels: 30,
        updateTriggers: { getRadius: currentTime },
      }),
      new ScatterplotLayer({
        id: 'iss-layer',
        data: iss,
        getPosition: (d: MapEntity) => [d.longitude, d.latitude],
        getRadius: 8,
        getFillColor: [124, 77, 255, 255],
        getLineColor: [255, 255, 255, 255],
        lineWidthMinPixels: 2,
        radiusMinPixels: 6,
        radiusMaxPixels: 12,
        updateTriggers: {
          getPosition: iss.map((i) => `${i.latitude}:${i.longitude}`).join(','),
        },
      })
    )
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    >
      <Map
        ref={mapRef}
        {...viewport}
        onMove={onMove}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        maxZoom={18}
        minZoom={2}
      >
        <DeckGLOverlay layers={deckLayers} />
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
      </Map>
    </div>
  )
}
