import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { NavigationControl, GeolocateControl, type MapRef, type ViewStateChangeEvent, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { useControl } from 'react-map-gl/maplibre'
import { ScatterplotLayer } from '@deck.gl/layers'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeckGLOverlay(props: { layers: any[] }) {
  const overlay = useControl(() => new MapboxOverlay({ interleaved: true }))
  overlay.setProps({ layers: props.layers })
  return null
}

interface WorldMapProps {
  onEntityClick: (entity: MapEntity | null) => void
}

// Find nearest entity to clicked coordinates within a pixel threshold
function findNearestEntity(
  lngLat: { lng: number; lat: number },
  entities: MapEntity[],
  zoom: number
): MapEntity | null {
  // Threshold in degrees — shrinks as zoom increases
  const threshold = 2 / Math.pow(2, zoom - 2)
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
  const { viewport, setViewport } = useViewport()
  const { layers, setCount } = useLayerVisibility()
  const [currentTime, setCurrentTime] = useState(Date.now())

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

  // Pulse animation
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 100)
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

  // All visible entities combined for click detection
  const allEntities = useMemo(() => {
    const all: MapEntity[] = []
    if (layers.aircraft) all.push(...aircraft)
    if (layers.ships) all.push(...ships)
    if (layers.cameras) all.push(...webcams)
    if (layers.earthquakes) all.push(...earthquakes)
    if (layers.iss) all.push(...iss)
    return all
  }, [layers, aircraft, ships, webcams, earthquakes, iss])

  // Handle map click — find nearest entity
  const onMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const nearest = findNearestEntity(e.lngLat, allEntities, viewport.zoom)
      onEntityClick(nearest)
    },
    [allEntities, viewport.zoom, onEntityClick]
  )

  const deckLayers = []

  // Aircraft layer
  if (layers.aircraft && aircraft.length > 0) {
    deckLayers.push(
      new ScatterplotLayer({
        id: 'aircraft-layer',
        data: aircraft,
        getPosition: (d: MapEntity) => [d.longitude, d.latitude],
        getRadius: (d: MapEntity) => (d.meta.onGround ? 4 : 6),
        getFillColor: (d: MapEntity) => {
          if (d.meta.onGround) return [158, 158, 158, 200]
          const alt = d.altitude || 0
          if (alt > 10000) return [33, 150, 243, 230]
          if (alt > 5000) return [255, 152, 0, 230]
          return [76, 175, 80, 230]
        },
        getLineColor: [255, 255, 255, 200],
        lineWidthMinPixels: 1.5,
        radiusMinPixels: 4,
        radiusMaxPixels: 10,
        updateTriggers: {
          getPosition: aircraft.map((a) => `${a.id}:${a.latitude}:${a.longitude}`).join(','),
        },
      })
    )
  }

  // Ships layer
  if (layers.ships && ships.length > 0) {
    deckLayers.push(
      new ScatterplotLayer({
        id: 'ships-layer',
        data: ships,
        getPosition: (d: MapEntity) => [d.longitude, d.latitude],
        getRadius: 8,
        getFillColor: (d: MapEntity) => {
          const hex = d.color
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          return [r, g, b, 220]
        },
        getLineColor: [255, 255, 255, 180],
        lineWidthMinPixels: 1.5,
        radiusMinPixels: 5,
        radiusMaxPixels: 12,
      })
    )
  }

  // Webcams layer
  if (layers.cameras && webcams.length > 0) {
    deckLayers.push(
      new ScatterplotLayer({
        id: 'webcams-layer',
        data: webcams,
        getPosition: (d: MapEntity) => [d.longitude, d.latitude],
        getRadius: 5,
        getFillColor: [76, 175, 80, 200],
        getLineColor: [255, 255, 255, 200],
        lineWidthMinPixels: 2,
        radiusMinPixels: 5,
        radiusMaxPixels: 12,
      })
    )
  }

  // Earthquakes layer — pulsating circles
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
        updateTriggers: {
          getRadius: currentTime,
        },
      })
    )
  }

  // ISS layer — single glowing marker
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
    <Map
      ref={mapRef}
      {...viewport}
      onMove={onMove}
      onClick={onMapClick}
      mapStyle={MAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      maxZoom={18}
      minZoom={2}
      cursor="pointer"
    >
      <DeckGLOverlay layers={deckLayers} />
      <NavigationControl position="top-right" />
      <GeolocateControl position="top-right" />
    </Map>
  )
}
