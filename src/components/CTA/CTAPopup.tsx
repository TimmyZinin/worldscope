import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../../i18n'

const DISMISS_KEY = 'worldscope_cta_dismissed'
const CONVERTED_KEY = 'worldscope_cta_converted'
const VARIANT_KEY = 'worldscope_cta_variant'
const SHOW_DELAY = 45000 // 45 seconds
const COOLDOWN = 24 * 60 * 60 * 1000 // 24 hours

export default function CTAPopup() {
  const [visible, setVisible] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    // Don't show if already converted
    if (localStorage.getItem(CONVERTED_KEY)) return

    // Check cooldown
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed && Date.now() - parseInt(dismissed) < COOLDOWN) return

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  // Rotate variants
  const variantNum = (parseInt(localStorage.getItem(VARIANT_KEY) || '0') % 3) + 1
  const title = variantNum === 1 ? t.ctaTitle : variantNum === 2 ? t.ctaTitle2 : t.ctaTitle3
  const subtitle = variantNum === 1 ? t.ctaSubtitle : variantNum === 2 ? t.ctaSubtitle2 : t.ctaSubtitle3

  const handleClose = () => {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    localStorage.setItem(VARIANT_KEY, String(variantNum))
  }

  const handleConvert = () => {
    localStorage.setItem(CONVERTED_KEY, 'true')
  }

  return (
    <>
      {/* Overlay — desktop only */}
      <div
        className="fixed inset-0 bg-black/40 z-[10000] max-md:hidden animate-fade-in"
        onClick={handleClose}
      />

      {/* Popup */}
      <div className="fixed z-[10001] max-w-[440px] w-[90vw] bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up
        top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:translate-x-0 max-md:translate-y-0 max-md:w-full max-md:rounded-b-none max-md:max-w-none">

        {/* Mobile drag handle */}
        <div className="hidden max-md:flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X size={18} className="text-gray-400" />
        </button>

        <div className="px-8 py-8 text-center max-md:px-6 max-md:py-6">
          {/* Photo */}
          <img
            src="https://timzinin.com/tim-zinin.jpg"
            alt="Tim Zinin"
            className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-[3px] border-red-500 shadow-lg"
          />

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
            {title}
          </h3>

          {/* Subtitle */}
          <p className="text-sm text-gray-500 mb-6">
            {subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <a
              href="https://t.me/timzinin"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleConvert}
              className="block w-full py-3 bg-[#0088cc] text-white font-semibold rounded-xl hover:bg-[#006da3] transition-colors text-sm"
            >
              💬 {t.ctaTelegram}
            </a>
            <a
              href="https://timzinin.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleConvert}
              className="block w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              🌐 {t.ctaWebsite}
            </a>
          </div>

          {/* Tagline */}
          <p className="mt-5 text-[11px] text-gray-400">
            {t.ctaTagline}
          </p>
        </div>
      </div>
    </>
  )
}
