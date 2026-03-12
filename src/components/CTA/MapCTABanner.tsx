import { useI18n } from '../../i18n'

export default function MapCTABanner() {
  const { t } = useI18n()

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 animate-fade-in max-md:top-14 max-md:left-3 max-md:right-3 max-md:translate-x-0">
      <a
        href="https://t.me/timzinin"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/40 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200"
      >
        <span className="text-sm font-medium text-gray-800 whitespace-nowrap">
          {t.ctaMapBanner || 'Хотите такую систему для бизнеса?'}
        </span>
        <span className="text-sm font-semibold text-[#0088cc] whitespace-nowrap">
          {t.ctaOrderConsultation || 'Заказать консультацию →'}
        </span>
      </a>
    </div>
  )
}
