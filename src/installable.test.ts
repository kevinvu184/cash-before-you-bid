import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LANG, LANGS } from './logic/lang'
import { LOCALE_PATH } from './logic/site'

// The installable shell. GitHub Pages serves this app from a sub-path
// (vite.config.ts sets base: '/cash-before-you-bid/'), and Vite does not
// rewrite URLs inside a webmanifest — so every path in the manifest is
// relative and resolves against the manifest's own URL. A leading slash here
// would install a shortcut to the wrong origin root and only fail in
// production. These assertions are that guarantee, written down.

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PUBLIC = join(ROOT, 'public')

const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
const manifestSource = readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8')
const manifest = JSON.parse(manifestSource) as {
  name: string
  short_name: string
  start_url: string
  scope: string
  id: string
  display: string
  theme_color: string
  background_color: string
  icons: Array<{ src: string; sizes: string; type: string; purpose: string }>
}

/** Where a browser would resolve a manifest path once deployed. */
const DEPLOYED = 'https://kevinvu184.github.io/cash-before-you-bid/manifest.webmanifest'
const resolve = (path: string) => new URL(path, DEPLOYED).href

/** Width and height out of a PNG's IHDR, which is always the first chunk. */
function pngSize(file: string): [number, number] {
  const bytes = readFileSync(file)
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]
}

describe('index.html', () => {
  it('links the manifest and an apple-touch-icon', () => {
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest" \/>/)
    expect(html).toMatch(/<link rel="apple-touch-icon" href="\/icons\/[\w.-]+\.png" \/>/)
  })

  it('keeps a theme-color for each scheme, and the manifest matches the light one', () => {
    const light = /content="(#[0-9a-f]{6})" media="\(prefers-color-scheme: light\)"/.exec(html)
    const dark = /content="(#[0-9a-f]{6})" media="\(prefers-color-scheme: dark\)"/.exec(html)
    expect(light?.[1]).toBeDefined()
    expect(dark?.[1]).toBeDefined()
    // A manifest carries one theme_color and cannot follow the scheme; the
    // light value is the one an install uses, and the metas still do the rest.
    expect(manifest.theme_color).toBe(light?.[1])
    expect(manifest.background_color).toBe(light?.[1])
  })
})

describe('the web app manifest', () => {
  it('is installable: a name, a display mode, and icons at 192 and 512', () => {
    expect(manifest.name).not.toBe('')
    expect(manifest.short_name.length).toBeLessThanOrEqual(12)
    expect(manifest.display).toBe('standalone')
    const sizes = manifest.icons.filter((icon) => icon.type === 'image/png').map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
  })

  it('states every path relatively, so the GitHub Pages base is respected', () => {
    const paths = [
      manifest.start_url,
      manifest.scope,
      manifest.id,
      ...manifest.icons.map((icon) => icon.src),
    ]
    for (const path of paths) {
      expect({ path, absolute: path.startsWith('/') || /^[a-z]+:/.test(path) }).toEqual({
        path,
        absolute: false,
      })
    }
  })

  it('resolves start_url, scope and every icon under the deployed base', () => {
    const base = 'https://kevinvu184.github.io/cash-before-you-bid/'
    expect(resolve(manifest.start_url)).toBe(base)
    expect(resolve(manifest.scope)).toBe(base)
    expect(resolve(manifest.id)).toBe(base)
    for (const icon of manifest.icons) expect(resolve(icon.src).startsWith(base)).toBe(true)
  })

  it('ships every icon it declares, at the size it declares', () => {
    for (const icon of manifest.icons) {
      const file = join(PUBLIC, icon.src)
      expect(existsSync(file)).toBe(true)
      if (icon.type !== 'image/png') continue
      const [width, height] = icon.sizes.split('x').map(Number)
      expect(pngSize(file)).toEqual([width, height])
    }
  })
})

describe('the service worker', () => {
  const sw = readFileSync(join(PUBLIC, 'sw.js'), 'utf8')
  // Comments name the base to explain why the code does not; only code counts.
  const code = sw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

  it('takes its scope from the registration rather than hardcoding the base', () => {
    // public/ is copied verbatim, so nothing rewrites a path in here.
    expect(code).not.toContain('/cash-before-you-bid/')
    expect(code).toContain('self.registration.scope')
  })

  it('serves navigations network-first, so a redeploy is picked up', () => {
    expect(code).toContain('networkFirst')
    expect(code).toMatch(/request\.mode === 'navigate' \? networkFirst/)
  })

  it('drops caches from an earlier version on activate', () => {
    expect(code).toMatch(/keys\.filter\(\(key\) => key !== CACHE\)/)
  })

  // A worker that answers every navigation with the root document undoes the
  // prerender: a reader on a non-default locale's URL is served the default
  // locale's HTML, from the cache, indefinitely. public/ is copied verbatim
  // and cannot import src/, so the list of locale directories is restated in
  // sw.js — and held here to the one in src/logic/site.ts.
  it('knows every locale directory the build writes a document into', () => {
    const listed = /const LOCALE_SHELLS = \[([^\]]*)\]/.exec(code)
    expect(listed).not.toBeNull()
    const paths = [...(listed?.[1] ?? '').matchAll(/'([^']+)'/g)].map(([, path]) => path)
    const expected = LANGS.filter((lang) => lang !== DEFAULT_LANG).map(
      (lang) => `./${LOCALE_PATH[lang]}`,
    )
    expect(paths.sort()).toEqual(expected.sort())
  })

  it('answers a navigation with the document its own directory holds', () => {
    expect(code).toMatch(/networkFirst\(shellFor\(url\)\)/)
    expect(code).toMatch(/SHELLS\.includes\(directory\) \? directory : SHELL/)
  })

  it('precaches every locale’s document, so either launches offline', () => {
    expect(code).toMatch(/const PRECACHE = \[\.\.\.SHELLS,/)
  })

  // Nothing in public/ is fingerprinted, so a changed byte there is only
  // picked up when the cache name changes. sw.js changing is the clearest
  // case of all: the old worker is what is running.
  it('carries a version to bump when a file under public/ changes', () => {
    expect(code).toMatch(/const VERSION = 'v\d+'/)
  })
})
