import type { MapEntity } from '../../types/common'
import { useI18n } from '../../i18n'
import { formatAltitude, formatSpeed, formatHeading, formatTimeAgo, formatSpeedKnots } from '../../utils/formatters'
import { X, Plane, Ship, Camera, Activity, Satellite } from 'lucide-react'

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

interface Props {
  entity: MapEntity
  onClose: () => void
}

export default function ObjectDetail({ entity, onClose }: Props) {
  const { t } = useI18n()

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 w-80 max-w-[90vw] bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/50 overflow-hidden max-md:bottom-14 max-md:left-2 max-md:right-2 max-md:translate-x-0 max-md:w-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{ color: TYPE_COLORS[entity.type] }}>
        {TYPE_ICONS[entity.type]}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate text-gray-900">{entity.name}</div>
          {entity.type === 'aircraft' && entity.meta.originCountry && (
            <div className="text-xs text-gray-500">{entity.meta.originCountry as string}</div>
          )}
          {entity.type === 'ship' && entity.meta.shipType && (
            <div className="text-xs text-gray-500">{entity.meta.shipType as string}</div>
          )}
          {entity.type === 'webcam' && entity.meta.city && (
            <div className="text-xs text-gray-500">{entity.meta.city as string}, {entity.meta.country as string}</div>
          )}
          {entity.type === 'earthquake' && (
            <div className="text-xs text-gray-500">{entity.meta.place as string}</div>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Webcam preview */}
      {entity.type === 'webcam' && entity.meta.preview && (
        <div className="px-4 pt-3">
          <img
            src={entity.meta.preview as string}
            alt={entity.name}
            className="w-full h-32 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Details */}
      <div className="px-4 py-3 space-y-1.5 text-xs">
        {entity.type === 'aircraft' && (
          <>
            <Row label={t.altitude} value={formatAltitude(entity.altitude)} />
            <Row label={t.speed} value={formatSpeed(entity.speed)} />
            <Row label={t.heading} value={formatHeading(entity.heading)} />
            {entity.meta.squawk && <Row label={t.squawk} value={entity.meta.squawk as string} />}
            <Row label="ICAO24" value={entity.id} />
          </>
        )}

        {entity.type === 'ship' && (
          <>
            <Row label={t.speed} value={formatSpeedKnots(entity.meta.sog as number)} />
            <Row label={t.heading} value={formatHeading(entity.heading)} />
            {entity.meta.destination && <Row label={t.destination} value={entity.meta.destination as string} />}
            {entity.meta.eta && <Row label={t.eta} value={entity.meta.eta as string} />}
            <Row label={t.navStatus} value={entity.meta.navStatus as string} />
            <Row label="MMSI" value={entity.id} />
          </>
        )}

        {entity.type === 'earthquake' && (
          <>
            <Row label={t.magnitude} value={`M ${(entity.meta.magnitude as number).toFixed(1)}`} />
            <Row label={t.depth} value={`${(entity.meta.depth as number).toFixed(1)} km`} />
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
            <Row label={t.webcamStatus} value={entity.meta.status === 'active' ? '🟢 Active' : '🔴 Inactive'} />
            {entity.meta.playerUrl && (
              <a
                href={entity.meta.playerUrl as string}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 text-center py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                ▶ {t.webcamWatch}
              </a>
            )}
          </>
        )}

        <div className="pt-1 text-gray-400 text-[10px]">
          {t.updated}: {formatTimeAgo(entity.lastUpdated)}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
