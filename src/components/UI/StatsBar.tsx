import { useLayerVisibility } from '../../hooks/useLayerVisibility'
import { useI18n } from '../../i18n'
import { Plane, Ship, Camera, Activity } from 'lucide-react'

export default function StatsBar() {
  const { counts, layers } = useLayerVisibility()
  const { t } = useI18n()

  const stats = [
    { id: 'aircraft', icon: <Plane size={14} />, template: t.statsAircraft, color: '#FF9800' },
    { id: 'ships', icon: <Ship size={14} />, template: t.statsShips, color: '#2196F3' },
    { id: 'cameras', icon: <Camera size={14} />, template: t.statsCams, color: '#4CAF50' },
    { id: 'earthquakes', icon: <Activity size={14} />, template: t.statsEvents, color: '#F44336' },
  ].filter((s) => layers[s.id])

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-t border-white/30">
      <div className="flex items-center justify-center gap-4 px-4 py-2 text-xs font-medium text-gray-700 flex-wrap">
        {stats.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5" style={{ color: s.color }}>
            {s.icon}
            <span className="text-gray-700">{s.template.replace('{count}', String(counts[s.id] || 0))}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
