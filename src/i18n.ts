import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import vi from './locales/vi.json'
import { DEFAULT_LANG, isLang, LANGS, type Lang } from './logic/lang'

// vi.json opens with an AI-translation disclosure block; it is metadata, not
// copy, so it is stripped before the strings reach i18next's lookup.
const { _meta: _viMeta, ...viStrings } = vi

// The URL is the source of truth for the language (?lang=). Reading it here
// means the very first render is already in the right language; the App
// effect keeps i18next in sync with later URL changes.
function initialLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG
  const raw = new URLSearchParams(window.location.search).get('lang')
  return isLang(raw) ? raw : DEFAULT_LANG
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: viStrings },
  },
  lng: initialLang(),
  fallbackLng: 'en',
  supportedLngs: [...LANGS],
  interpolation: {
    // React already escapes interpolated values.
    escapeValue: false,
  },
})

export default i18n
