import { DEFAULT_LANG, LANGS, type Lang } from '../logic/lang'
import { LOCALE_URLS, OG_IMAGE, localeUrl } from '../logic/site'

/**
 * The head metadata that has to differ per locale, generated from one place.
 *
 * index.html carries this block between the markers below, filled in for the
 * default locale — that is what `npm run dev` serves and what Vite builds.
 * scripts/prerender.mjs then replaces the block wholesale, once per locale, in
 * the document it writes. src/prerender/head.test.ts renders the default
 * locale's block and compares it to the one in index.html, so the checked-in
 * copy cannot rot.
 */

export const HEAD_START = '<!-- prerender:head:start -->'
export const HEAD_END = '<!-- prerender:head:end -->'

/**
 * Open Graph wants a language *and* a territory. This app is Victoria-only, so
 * the territory is not a guess in either case: Australian English, and
 * Vietnamese as spoken by the readers this was translated for.
 */
const OG_LOCALE: Readonly<Record<Lang, string>> = {
  en: 'en_AU',
  vi: 'vi_VN',
}

/** The site name is the brand, not a translated string; it is the same in both. */
const SITE_NAME = 'Cash Before You Bid'

/**
 * Exported because scripts/prerender.mjs checks its own output against these
 * strings: a title written here escaped and looked for there raw is a check
 * that silently matches nothing.
 */
export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export interface HeadFacts {
  lang: Lang
  title: string
  description: string
}

/** The indent the block sits at inside index.html's `<head>`. */
const INDENT = '    '

export function headMarkup({ lang, title, description }: HeadFacts): string {
  const canonical = localeUrl(lang)
  const meta = (attr: 'name' | 'property', key: string, content: string) =>
    `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`

  const lines = [
    `<title>${escapeHtml(title)}</title>`,
    meta('name', 'description', description),

    // One canonical per locale, each pointing at its own path, so the two
    // documents are two pages rather than one page indexed twice. A visit that
    // arrived on ?lang= is the same page as its path form; App.tsx keeps this
    // href following the active locale for exactly that case.
    `<link rel="canonical" href="${canonical}" />`,

    // Every locale lists every locale, itself included — that is what makes a
    // set of alternates a set — plus the default as x-default.
    ...LOCALE_URLS.map(
      ({ lang: other, url }) => `<link rel="alternate" hreflang="${other}" href="${url}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${localeUrl(DEFAULT_LANG)}" />`,

    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:url', canonical),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:image', OG_IMAGE.url),
    meta('property', 'og:image:type', OG_IMAGE.type),
    meta('property', 'og:image:width', String(OG_IMAGE.width)),
    meta('property', 'og:image:height', String(OG_IMAGE.height)),
    meta('property', 'og:locale', OG_LOCALE[lang]),
    ...LANGS.filter((other) => other !== lang).map((other) =>
      meta('property', 'og:locale:alternate', OG_LOCALE[other]),
    ),

    // `summary`, not `summary_large_image`: the preview image is the install
    // icon, which is square. Claiming the wide card would letterbox it.
    meta('name', 'twitter:card', 'summary'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', OG_IMAGE.url),
  ]

  return [HEAD_START, ...lines, HEAD_END].join(`\n${INDENT}`)
}

/** Replaces the marked block in a built document with this locale's. */
export function replaceHead(html: string, facts: HeadFacts): string {
  const start = html.indexOf(HEAD_START)
  const end = html.indexOf(HEAD_END)
  if (start === -1 || end === -1) {
    throw new Error(`index.html is missing the ${HEAD_START} … ${HEAD_END} markers`)
  }
  return html.slice(0, start) + headMarkup(facts) + html.slice(end + HEAD_END.length)
}
