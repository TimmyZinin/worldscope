import type { MapEntity } from '../../types/common'
import { useI18n } from '../../i18n'
import { formatAltitude, formatSpeed, formatHeading, formatTimeAgo, formatSpeedKnots } from '../../utils/formatters'
import { X, Plane, Ship, Camera, Activity, Satellite, ExternalLink, MapPin, Clock, Anchor } from 'lucide-react'

import type { ReactNode } from 'react'

const TYPE_ICONS: Record<string, ReactNode> = {
  aircraft: <Plane size={20} />,
  ship: <Ship size={20} />,
  webcam: <Camera size={20} />,
  earthquake: <Activity size={20} />,
  iss: <Satellite size={20} />,
}

const TYPE_COLORS: Record<string, string> = {
  aircraft: '#FF9800',
  ship: '#2196F3',
  webcam: '#4CAF50',
  earthquake: '#F44336',
  iss: '#7C4DFF',
}

const TYPE_BG: Record<string, string> = {
  aircraft: 'from-orange-50 to-orange-100/50',
  ship: 'from-blue-50 to-blue-100/50',
  webcam: 'from-green-50 to-green-100/50',
  earthquake: 'from-red-50 to-red-100/50',
  iss: 'from-purple-50 to-purple-100/50',
}

interface Props {
  entity: MapEntity
  onClose: () => void
}

export default function ObjectDetail({ entity, onClose }: Props) {
  const { t } = useI18n()

  return (
    <div
      className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 w-[340px] max-w-[92vw] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 overflow-hidden animate-[slideUp_0.25s_ease-out] max-md:bottom-16 max-md:left-2 max-md:right-2 max-md:translate-x-0 max-md:w-auto"
      style={{ boxShadow: `0 8px 32px ${TYPE_COLORS[entity.type]}30, 0 2px 8px rgba(0,0,0,0.1)` }}
    >
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${TYPE_BG[entity.type]}`}>
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shadow-sm"
          style={{ backgroundColor: TYPE_COLORS[entity.type], color: 'white' }}
        >
          {TYPE_ICONS[entity.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate text-gray-900">{entity.name}</div>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            {entity.type === 'aircraft' && entity.meta.originCountry && (
              <><MapPin size={10} /> {entity.meta.originCountry as string}</>
            )}
            {entity.type === 'ship' && entity.meta.shipType && (
              <><Anchor size={10} /> {entity.meta.shipType as string}</>
            )}
            {entity.type === 'webcam' && entity.meta.city && (
              <><MapPin size={10} /> {entity.meta.city as string}, {entity.meta.country as string}</>
            )}
            {entity.type === 'earthquake' && (
              <><MapPin size={10} /> {entity.meta.place as string}</>
            )}
            {entity.type === 'iss' && (
              <><MapPin size={10} /> {entity.latitude.toFixed(2)}°, {entity.longitude.toFixed(2)}°</>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg transition-colors">
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Webcam preview */}
      {entity.type === 'webcam' && entity.meta.preview && (
        <div className="px-4 pt-3">
          <img
            src={entity.meta.preview as string}
            alt={entity.name}
            className="w-full h-36 object-cover rounded-xl shadow-sm"
          />
        </div>
      )}

      {/* Earthquake magnitude badge */}
      {entity.type === 'earthquake' && (
        <div className="px-4 pt-3 flex items-center gap-3">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-xl text-white font-bold text-xl"
            style={{ backgroundColor: entity.color }}
          >
            M{(entity.meta.magnitude as number).toFixed(1)}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {(entity.meta.magnitude as number) >= 6 ? 'Strong' :
               (entity.meta.magnitude as number) >= 4 ? 'Moderate' :
               (entity.meta.magnitude as number) >= 2 ? 'Light' : 'Minor'} Earthquake
            </div>
            <div className="text-xs text-gray-500">
              Depth: {(entity.meta.depth as number).toFixed(1)} km
            </div>
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="px-4 py-3 space-y-1.5 text-xs">
        {entity.type === 'aircraft' && (
          <>
            <Row label={t.altitude} value={formatAltitude(entity.altitude)} icon={<Activity size={12} />} />
            <Row label={t.speed} value={formatSpeed(entity.speed)} />
            <Row label={t.heading} value={formatHeading(entity.heading)} />
            {entity.meta.squawk && <Row label={t.squawk} value={entity.meta.squawk as string} highlight={entity.meta.squawk === '7700' || entity.meta.squawk === '7600' || entity.meta.squawk === '7500'} />}
            <Row label="ICAO24" value={entity.id} mono />
            {entity.meta.verticalRate !== null && entity.meta.verticalRate !== 0 && (
              <Row label="Vertical" value={`${(entity.meta.verticalRate as number) > 0 ? '↑' : '↓'} ${Math.abs(entity.meta.verticalRate as number).toFixed(1)} m/s`} />
            )}
          </>
        )}

        {entity.type === 'ship' && (
          <>
            <Row label={t.speed} value={formatSpeedKnots(entity.meta.sog as number)} />
            <Row label={t.heading} value={formatHeading(entity.heading)} />
            {entity.meta.destination && <Row label={t.destination} value={entity.meta.destination as string} />}
            {entity.meta.eta && <Row label={t.eta} value={entity.meta.eta as string} />}
            <Row label={t.navStatus} value={entity.meta.navStatus as string} />
            <Row label="MMSI" value={entity.meta.mmsi as string || entity.id} mono />
          </>
        )}

        {entity.type === 'earthquake' && (
          <>
            <Row label={t.magnitude} value={`M ${(entity.meta.magnitude as number).toFixed(1)}`} />
            <Row label={t.depth} value={`${(entity.meta.depth as number).toFixed(1)} km`} />
            <Row label="Coordinates" value={`${entity.latitude.toFixed(3)}°, ${entity.longitude.toFixed(3)}°`} mono />
          </>
        )}

        {entity.type === 'iss' && (
          <>
            <Row label={t.issAltitude} value={`${(entity.meta.altitude as number).toFixed(1)} km`} />
            <Row label={t.issVelocity} value={`${Math.round(entity.meta.velocity as number)} km/h`} />
            <Row label={t.issVisibility} value={entity.meta.visibility as string} />
          </>
        )}

        {entity.type === 'webcam' && (
          <>
            <Row label={t.webcamStatus} value={entity.meta.status === 'active' ? 'Active' : 'Inactive'} />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex gap-2">
        {entity.type === 'webcam' && entity.meta.playerUrl && (
          <a
            href={entity.meta.playerUrl as string}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-xl text-xs font-medium hover:bg-green-600 transition-colors"
          >
            <ExternalLink size={12} /> {t.webcamWatch}
          </a>
        )}
        {entity.type === 'ship' && (
          <a
            href={`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${entity.meta.mmsi || entity.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-500 text-white rounded-xl text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            <ExternalLink size={12} /> MarineTraffic
          </a>
        )}
        {entity.type === 'aircraft' && (
          <a
            href={`https://www.flightradar24.com/${entity.name.trim()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-500 text-white rounded-xl text-xs font-medium hover:bg-orange-600 transition-colors"
          >
            <ExternalLink size={12} /> FlightRadar24
          </a>
        )}
        {entity.type === 'earthquake' && (
          <a
            href={`https://earthquake.usgs.gov/earthquakes/eventpage/${entity.id.replace('eq-', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500 text-white rounded-xl text-xs font-medium hover:bg-red-600 transition-colors"
          >
            <ExternalLink size={12} /> USGS Details
          </a>
        )}
      </div>

      {/* Timestamp */}
      <div className="px-4 pb-3 flex items-center gap-1 text-[10px] text-gray-400">
        <Clock size={10} />
        {t.updated}: {formatTimeAgo(entity.lastUpdated)}
      </div>
    </div>
  )
}

function Row({ label, value, icon, mono, highlight }: { label: string; value: string; icon?: ReactNode; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-gray-500 flex items-center gap-1">{icon}{label}</span>
      <span className={`font-medium ${highlight ? 'text-red-600 font-bold' : 'text-gray-800'} ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
    </div>
  )
}
