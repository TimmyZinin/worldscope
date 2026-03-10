import { create } from 'zustand'
import { en } from './en'
import { ru } from './ru'
import { es } from './es'
import { zh } from './zh'
import { hi } from './hi'
import { ar } from './ar'
import { pt } from './pt'
import { fr } from './fr'
import { de } from './de'
import { ja } from './ja'
import type { Locale } from '../types/common'

export type Translations = typeof en

const locales: Record<Locale, Translations> = { en, ru, es, zh, hi, ar, pt, fr, de, ja }

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'ENGLISH', es: 'ESPAÑOL', zh: '中文', hi: 'हिन्दी', ar: 'العربية',
  pt: 'PORTUGUÊS', fr: 'FRANÇAIS', ru: 'РУССКИЙ', de: 'DEUTSCH', ja: '日本語',
}

const RTL_LOCALES: Locale[] = ['ar']

const FONT_MAP: Record<string, string> = {
  zh: 'Noto+Sans+SC:wght@400;700',
  ja: 'Noto+Sans+JP:wght@400;700',
  hi: 'Noto+Sans+Devanagari:wght@400;700',
  ar: 'Noto+Sans+Arabic:wght@400;700',
}

function detectLocale(): Locale {
  const saved = localStorage.getItem('worldscope_lang') as Locale | null
  if (saved && locales[saved]) return saved
  const nav = navigator.language.split('-')[0] as Locale
  if (locales[nav]) return nav
  return 'en'
}

function loadFontForLocale(locale: Locale) {
  const font = FONT_MAP[locale]
  if (!font) return
  if (document.querySelector(`link[data-locale="${locale}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font}&display=swap`
  link.dataset.locale = locale
  document.head.appendChild(link)
}

interface I18nStore {
  locale: Locale
  t: Translations
  isRTL: boolean
  setLocale: (locale: Locale) => void
}

export const useI18n = create<I18nStore>((set) => {
  const initial = detectLocale()
  loadFontForLocale(initial)
  return {
    locale: initial,
    t: locales[initial],
    isRTL: RTL_LOCALES.includes(initial),
    setLocale: (locale: Locale) => {
      localStorage.setItem('worldscope_lang', locale)
      loadFontForLocale(locale)
      set({ locale, t: locales[locale], isRTL: RTL_LOCALES.includes(locale) })
    },
  }
})
