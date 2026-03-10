import { useLayerVisibility } from '../../hooks/useLayerVisibility'
import { useI18n } from '../../i18n'
import { Plane, Ship, Camera, Activity, Satellite, CloudSun } from 'lucide-react'
import type { ReactNode } from 'react'

const LAYER_ICONS: Record<string, ReactNode> = {
  aircraft: <Plane size={18} />,
  ships: <Ship size={18} />,
  cameras: <Camera size={18} />,
  earthquakes: <Activity size={18} />,
  iss: <Satellite size={18} />,
  weather: <CloudSun size={18} />,
}

const LAYER_KEYS: Record<string, string> = {
  aircraft: 'layerAircraft',
  ships: 'layerShips',
  cameras: 'layerWebcams',
  earthquakes: 'layerEarthquakes',
  iss: 'layerISS',
  weather: 'layerWeather',
}

const LAYER_COLORS: Record<string, string> = {
  aircraft: '#FF9800',
  ships: '#2196F3',
  cameras: '#4CAF50',
  earthquakes: '#F44336',
  iss: '#7C4DFF',
  weather: '#00BCD4',
}

export default function LayerPanel() {
  const { layers, counts, toggleLayer } = useLayerVisibility()
  const { t } = useI18n()

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5 max-md:right-2 max-md:top-auto max-md:bottom-20 max-md:translate-y-0">
      {Object.entries(layers).map(([id, visible]) => (
        <button
          key={id}
          onClick={() => toggleLayer(id)}
          title={t[LAYER_KEYS[id] as keyof typeof t] as string}
          className={`
            relative flex items-center justify-center w-10 h-10 rounded-xl
            backdrop-blur-md border transition-all duration-200
            ${visible
              ? 'bg-white/90 border-white/50 shadow-lg shadow-black/10'
              : 'bg-white/40 border-white/20 opacity-60 hover:opacity-80'
            }
          `}
          style={visible ? { color: LAYER_COLORS[id] } : { color: '#666' }}
        >
          {LAYER_ICONS[id]}
          {visible && counts[id] > 0 && (
            <span className="absolute -top-1 -right-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded-full min-w-[16px] text-center">
              {counts[id] > 999 ? `${Math.floor(counts[id] / 1000)}k` : counts[id]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
