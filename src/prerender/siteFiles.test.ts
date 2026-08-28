import { describe, expect, it } from 'vitest'
import { DEFAULT_LANG, LANGS } from '../logic/lang'
import { SITE_URL, localeUrl } from '../logic/site'
import { SITEMAP_URL, robotsTxt, sitemapXml } from './siteFiles'

// robots.txt and the sitemap are the only two files a crawler reads that are
// not the app. Both are generated from the locale list, so the thing that can
// break is a locale silently missing from one of them.

describe('robots.txt', () => {
  it('announces the sitemap at its deployed URL', () => {
    expect(robotsTxt()).toContain(`Sitemap: ${SITEMAP_URL}`)
    expect(SITEMAP_URL.startsWith(SITE_URL)).toBe(true)
  })

  it('disallows nothing — there is one page and no API behind it', () => {
    expect(robotsTxt()).not.toMatch(/^Disallow: \S/m)
    expect(robotsTxt()).toMatch(/^User-agent: \*$/m)
  })

  it('says out loud that a project sub-path is not where robots.txt is read', () => {
    // The one thing about this file that will otherwise be misread as working.
    expect(robotsTxt()).toMatch(/origin root/)
  })
})

describe('sitemap.xml', () => {
  const xml = sitemapXml('2026-08-28')

  it('lists every locale exactly once', () => {
    for (const lang of LANGS) {
      const loc = `<loc>${localeUrl(lang)}</loc>`
      expect(xml.split(loc).length - 1).toBe(1)
    }
    expect(xml.split('<url>').length - 1).toBe(LANGS.length)
  })

  it('cross-links the locales, and names the default as x-default', () => {
    for (const lang of LANGS) {
      expect(xml).toContain(`hreflang="${lang}" href="${localeUrl(lang)}"`)
    }
    expect(xml).toContain(`hreflang="x-default" href="${localeUrl(DEFAULT_LANG)}"`)
    // Declared, or every xhtml:link is an unknown element and is dropped.
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
  })

  it('dates every entry with the build', () => {
    expect(xml.split('<lastmod>2026-08-28</lastmod>').length - 1).toBe(LANGS.length)
  })
})
