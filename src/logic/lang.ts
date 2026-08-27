// The two UI locales. Pure data, importable from logic and UI alike; the
// i18next wiring lives in src/i18n.ts.
export type Lang = 'en' | 'vi'

export const LANGS: readonly Lang[] = ['en', 'vi']

// Vietnamese users are the primary audience.
export const DEFAULT_LANG: Lang = 'vi'

export function isLang(value: string | null): value is Lang {
  return LANGS.includes(value as Lang)
}
