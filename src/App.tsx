import { useState, Suspense, lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useI18n } from './i18n'
import LayerPanel from './components/UI/LayerPanel'
import StatsBar from './components/UI/StatsBar'
import ObjectDetail from './components/UI/ObjectDetail'
import ShareButton from './components/UI/ShareButton'
import Footer from './components/UI/Footer'
import LanguageSwitcher from './components/I18n/LanguageSwitcher'
import CTABadge from './components/CTA/CTABadge'
import CTAPopup from './components/CTA/CTAPopup'
import type { MapEntity } from './types/common'
import { Globe } from 'lucide-react'

const WorldMap = lazy(() => import('./components/Map/WorldMap'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
})

function AppContent() {
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null)
  const { isRTL } = useI18n()

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="h-screen w-screen overflow-hidden relative bg-gray-100">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-50 px-3 py-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 backdrop-blur-md border border-white/40 shadow-md">
            <Globe size={16} className="text-blue-500" />
            <span className="text-sm font-bold text-gray-800 tracking-tight">WorldScope</span>
          </div>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <LanguageSwitcher />
          <ShareButton />
        </div>
      </div>

      {/* Map */}
      <Suspense
        fallback={
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="text-center">
              <Globe size={48} className="text-blue-400 mx-auto mb-3 animate-spin" style={{ animationDuration: '3s' }} />
              <p className="text-sm text-gray-500">Loading WorldScope...</p>
            </div>
          </div>
        }
      >
        <WorldMap onEntityClick={setSelectedEntity} />
      </Suspense>

      {/* Layer Panel */}
      <LayerPanel />

      {/* Stats Bar */}
      <StatsBar />

      {/* Object Detail Popup */}
      {selectedEntity && (
        <ObjectDetail
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
        />
      )}

      {/* CTA */}
      <CTABadge />
      <CTAPopup />

      {/* Attribution */}
      <div className="absolute bottom-8 right-2 z-30 text-[9px] text-gray-400 max-w-[200px] text-right leading-tight">
        Data: OpenSky · AISStream · Windy · USGS · © OpenStreetMap
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
