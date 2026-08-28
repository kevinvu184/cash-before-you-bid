import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LANGS } from './lang'
import { LOCALE_PATH, LOCALE_URLS, OG_IMAGE, SITE_BASE, SITE_URL, localeUrl } from './site'

// site.ts states the deployed location so the prerender can write absolute
// URLs into the served HTML. Two of those facts are written down twice — the
// base path, which vite.config.ts also carries, and the preview image, which
// has to exist in public/. These hold both together.

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

describe('the deployed location', () => {
  it('uses the base path vite.config.ts builds against', () => {
    const config = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8')
    const base = /base:\s*'([^']+)'/.exec(config)
    expect(base?.[1]).toBe(SITE_BASE)
  })

  it('gives every locale a distinct absolute URL under the base', () => {
    const urls = LANGS.map(localeUrl)
    expect(new Set(urls).size).toBe(LANGS.length)
    for (const url of urls) expect(url.startsWith(SITE_URL)).toBe(true)
    expect(LOCALE_URLS.map((entry) => entry.lang)).toEqual([...LANGS])
  })

  it('serves the default locale from the root, so the base URL is never a duplicate', () => {
    expect(LOCALE_PATH.vi).toBe('')
    expect(localeUrl('vi')).toBe(SITE_URL)
  })

  it('points the preview image at a file that ships', () => {
    const path = OG_IMAGE.url.slice(SITE_URL.length)
    expect(readFileSync(join(ROOT, 'public', path)).byteLength).toBeGreaterThan(0)
  })
})
