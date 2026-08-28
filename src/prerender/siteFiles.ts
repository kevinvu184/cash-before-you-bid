import { DEFAULT_LANG } from '../logic/lang'
import { LOCALE_URLS, SITE_URL, localeUrl } from '../logic/site'

/**
 * The two crawler files, written into `dist/` by scripts/prerender.mjs.
 *
 * Generated rather than checked into public/ because both are made of absolute
 * URLs, and those URLs come from src/logic/site.ts and the locale list — the
 * same two facts the head metadata is built from. A second hand-maintained
 * copy of them is exactly the thing that goes stale without anything failing.
 */

/** Where the sitemap is served from, absolute. */
export const SITEMAP_URL = `${SITE_URL}sitemap.xml`

export function robotsTxt(): string {
  return `# robots.txt for ${SITE_URL}
#
# A crawler only reads robots.txt at the origin root, and this app is served
# from a GitHub Pages project sub-path — so nothing will fetch this file at
# https://kevinvu184.github.io/robots.txt, which belongs to the user page, not
# to this repository. It ships regardless: it becomes the real robots.txt the
# day this moves to a domain of its own, and it is where the sitemap is
# announced for anything that is pointed at it directly.
#
# There is nothing to disallow. The app is one page, it calls no API, and every
# state it can be in is a query string on that page.

User-agent: *
Allow: /

Sitemap: ${SITEMAP_URL}
`
}

/**
 * One <url> per locale, each listing every locale as an alternate — including
 * itself, which is what Google's documentation asks for and what makes the set
 * unambiguous rather than a chain of one-way hints.
 *
 * @param lastmod ISO date (YYYY-MM-DD) the build ran.
 */
export function sitemapXml(lastmod: string): string {
  const alternates = [
    ...LOCALE_URLS.map(
      ({ lang, url }) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${url}" />`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(DEFAULT_LANG)}" />`,
  ].join('\n')

  const entries = LOCALE_URLS.map(
    ({ url }) => `  <url>
    <loc>${url}</loc>
${alternates}
    <lastmod>${lastmod}</lastmod>
  </url>`,
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${entries}
</urlset>
`
}
