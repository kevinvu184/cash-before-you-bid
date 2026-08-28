import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SKINS } from './skins/registry'

// The web fonts are first-party now: src/fonts.css declares the faces and
// public/fonts holds the files. That is a performance decision (a third-party
// stylesheet blocked the first paint behind two extra origins) and a privacy
// one (it sent every reader's IP to Google), and both are easy to undo by
// accident — a paste of a Google Fonts snippet back into index.html reads like
// an improvement. These assertions are the guarantee, written down.

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
const css = readFileSync(join(ROOT, 'src', 'fonts.css'), 'utf8')

interface Face {
  family: string
  file: string
  block: string
}

function declaredFaces(): Face[] {
  const faces = [...css.matchAll(/@font-face \{([\s\S]*?)\}/g)].map((match) => {
    const block = match[1]
    return {
      family: /font-family: '([^']+)'/.exec(block)?.[1] ?? '',
      file: /url\('\/fonts\/([^']+)'\)/.exec(block)?.[1] ?? '',
      block,
    }
  })
  expect(faces.length).toBeGreaterThan(0)
  return faces
}

/** The files index.html asks the browser to fetch ahead of the bundle. */
function preloadedFonts(): string[] {
  return [...html.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g)]
    .map(([link]) => link)
    .filter((link) => /\bas="font"/.test(link))
    .map((link) => /\bhref="\/fonts\/([^"]+)"/.exec(link)?.[1] ?? link)
}

describe('the self-hosted web fonts', () => {
  const faces = declaredFaces()

  it('ship the file every face points at', () => {
    for (const face of faces) {
      expect(face.file).not.toBe('')
      expect(existsSync(join(ROOT, 'public', 'fonts', face.file))).toBe(true)
    }
  })

  it('swap rather than block: text is readable in the fallback face', () => {
    for (const face of faces) {
      expect(face.block).toMatch(/font-display: swap;/)
    }
  })

  it('carry a unicode-range, so only the subsets on screen are fetched', () => {
    for (const face of faces) {
      expect(face.block).toMatch(/unicode-range: U\+/)
    }
  })

  it('are all asked for by a skin — nothing ships a family nobody sets', () => {
    const stacks = Object.values(SKINS)
      .flatMap((skin) => Object.values(skin.tokens))
      .flatMap((tokens) => [tokens.fontBody, tokens.fontHeading, tokens.fontMono])
      .join(' | ')
    for (const family of new Set(faces.map((face) => face.family))) {
      expect(stacks).toContain(`"${family}"`)
    }
  })
})

describe('index.html', () => {
  it('preloads only faces the stylesheet declares', () => {
    const declared = new Set(declaredFaces().map((face) => face.file))
    const preloaded = preloadedFonts()
    expect(preloaded.length).toBeGreaterThan(0)
    for (const file of preloaded) expect(declared).toContain(file)
  })

  it('preloads fonts anonymously, as woff2 — a preload the fetch cannot reuse is pure waste', () => {
    for (const link of [...html.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g)].map(([l]) => l)) {
      if (!/\bas="font"/.test(link)) continue
      expect(link).toMatch(/type="font\/woff2"/)
      // A font is always fetched in CORS mode; without this the preloaded
      // response is discarded and the file is downloaded a second time.
      expect(link).toMatch(/crossorigin/)
    }
  })

  it('fetches nothing from a third party', () => {
    // Both halves of the reason this app self-hosts: an external stylesheet is
    // a render-blocking round trip on mobile data, and a request to another
    // origin is the reader's IP address leaving the page.
    const external = [...html.matchAll(/\b(?:href|src)="(https?:)?\/\/[^"]+"/g)].map(([m]) => m)
    expect(external).toEqual([])
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/)
    expect(html).not.toMatch(/rel="(?:preconnect|dns-prefetch)"/)
  })
})
