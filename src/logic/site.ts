import { LANGS, type Lang } from './lang'

// Where this app lives once deployed, as data the build can read.
//
// The prerender (scripts/prerender.mjs) needs absolute URLs — a canonical
// link, hreflang alternates, Open Graph tags and a sitemap are all specified
// as absolute — and there is nothing at runtime that can supply them: the
// served HTML has to carry the right ones before any JavaScript runs. So the
// deployed location is stated once, here, and src/logic/site.test.ts holds
// SITE_BASE to the `base` in vite.config.ts so the two cannot drift.

/** Scheme and host of the deployment. No trailing slash. */
export const SITE_ORIGIN = 'https://kevinvu184.github.io'

/** The GitHub Pages sub-path. Leading and trailing slash, as Vite states it. */
export const SITE_BASE = '/cash-before-you-bid/'

/** The site root, absolute. Every other URL here is resolved against it. */
export const SITE_URL = `${SITE_ORIGIN}${SITE_BASE}`

/**
 * Where each locale is served from.
 *
 * A static host cannot pick a document by query string: `?lang=en` and
 * `?lang=vi` are the same file to GitHub Pages, so one of the two locales
 * would always be served the other one's HTML. A path can pick a document, so
 * each locale gets one — the default locale at the root, the other under a
 * directory of its own. `?lang=` keeps working exactly as it did; it is what
 * the app writes and what a shared link carries, and the canonical link on
 * each page points at the path form so a crawler consolidates the two.
 */
export const LOCALE_PATH: Readonly<Record<Lang, string>> = {
  vi: '',
  en: 'en/',
}

/** The absolute URL a locale is canonically served from. */
export function localeUrl(lang: Lang): string {
  return `${SITE_URL}${LOCALE_PATH[lang]}`
}

/** The path under the base, as the prerender writes it into `dist/`. */
export function localeDocument(lang: Lang): string {
  return `${LOCALE_PATH[lang]}index.html`
}

/** Every locale, in a fixed order, for the sitemap and the alternate links. */
export const LOCALE_URLS: ReadonlyArray<{ lang: Lang; url: string }> = LANGS.map((lang) => ({
  lang,
  url: localeUrl(lang),
}))

/**
 * The link preview image. The app has no photography and no wordmark render,
 * so this is the install icon: square, which is what `twitter:card=summary`
 * expects and what every platform crops safely.
 */
export const OG_IMAGE = {
  url: `${SITE_URL}icons/icon-512.png`,
  width: 512,
  height: 512,
  type: 'image/png',
} as const
