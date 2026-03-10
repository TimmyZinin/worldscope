import { useI18n } from '../../i18n'

export default function CTABadge() {
  const { t } = useI18n()

  return (
    <a
      href="https://timzinin.com"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-12 left-3 z-[9998] flex items-center gap-2 px-3 py-1.5 bg-white/85 backdrop-blur-md rounded-2xl shadow-md border border-white/40 text-[11px] text-gray-600 hover:bg-white hover:shadow-lg hover:scale-105 transition-all duration-200 max-md:bottom-14 max-md:text-[10px]"
    >
      <img
        src="https://timzinin.com/tim-zinin.jpg"
        alt="Tim Zinin"
        className="w-5 h-5 rounded-full object-cover border border-gray-200"
        loading="lazy"
      />
      <span>{t.builtBy} · timzinin.com</span>
    </a>
  )
}
