import { useState, useRef, useEffect } from 'react'
import { useI18n, LOCALE_NAMES } from '../../i18n'
import type { Locale } from '../../types/common'

const ALL_LOCALES: Locale[] = ['en', 'es', 'zh', 'hi', 'ar', 'pt', 'fr', 'ru', 'de', 'ja']

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/80 backdrop-blur-md border border-white/40 shadow-md text-xs font-bold text-gray-700 hover:bg-white transition-all"
      >
        {locale.toUpperCase()} <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[10001] min-w-[140px]">
          {ALL_LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2
                ${l === locale ? 'bg-gray-50 font-bold text-gray-900' : 'text-gray-600'}`}
            >
              {l === locale && <span className="text-green-500">●</span>}
              {LOCALE_NAMES[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
