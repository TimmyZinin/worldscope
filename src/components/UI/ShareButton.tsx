import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { useViewport } from '../../hooks/useViewport'
import { useLayerVisibility } from '../../hooks/useLayerVisibility'
import { useI18n } from '../../i18n'
import { encodeState } from '../../utils/urlState'

export default function ShareButton() {
  const [copied, setCopied] = useState(false)
  const { viewport } = useViewport()
  const { getVisibleLayerIds } = useLayerVisibility()
  const { t, locale } = useI18n()

  const handleShare = async () => {
    const hash = encodeState(viewport, getVisibleLayerIds(), locale)
    const url = `${window.location.origin}${window.location.pathname}${hash}`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'WorldScope', url })
        return
      } catch { /* fallback to clipboard */ }
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      title={t.shareTooltip}
      className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/80 backdrop-blur-md border border-white/40 shadow-md hover:bg-white transition-all"
    >
      {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} className="text-gray-600" />}
    </button>
  )
}
