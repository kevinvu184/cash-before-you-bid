import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LANG, LANGS } from '../logic/lang'
import { COLOR_MODES, SKIN_IDS } from '../logic/skins'
import { SKINS } from './registry'

// index.html settles two things before React mounts, from a small script
// inlined in <head>: the ground colours, and the document language. Between
// them they are the only place a token value or a locale is written twice.
// This test parses them out of the real file and holds them to the modules
// they duplicate, so neither can drift.

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const html = readFileSync(join(ROOT, 'index.html'), 'utf8')

function inlinedGround(): Record<string, Record<string, [string, string]>> {
  const match = html.match(/var GROUND = (\{[\s\S]*?\n\s*\})\n/)
  if (!match) throw new Error('index.html no longer inlines a GROUND table')
  const json = match[1]
    .replace(/([a-z]+):/g, '"$1":')
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(json)
}

describe('pre-paint ground colours', () => {
  const ground = inlinedGround()

  it('covers every registered skin', () => {
    expect(Object.keys(ground).sort()).toEqual([...SKIN_IDS].sort())
  })

  it.each(SKIN_IDS)('matches %s tokens in both modes', (skinId) => {
    for (const mode of COLOR_MODES) {
      const tokens = SKINS[skinId].tokens[mode]
      expect(ground[skinId][mode]).toEqual([tokens.colorBg, tokens.colorText])
    }
  })

  it('falls back to the plain light ground when scripting is off', () => {
    const fallback = html.match(
      /:root \{\s*--color-bg: (#[0-9a-f]{6});\s*--color-text: (#[0-9a-f]{6});/,
    )
    expect(fallback).not.toBeNull()
    expect(fallback?.[1]).toBe(SKINS.plain.tokens.light.colorBg)
    expect(fallback?.[2]).toBe(SKINS.plain.tokens.light.colorText)
  })
})

describe('pre-paint document language', () => {
  it('inlines the same locale list as src/logic/lang.ts', () => {
    const match = html.match(/var LANGS = \[([^\]]*)\]/)
    expect(match).not.toBeNull()
    const inlined = (match?.[1] ?? '')
      .split(',')
      .map((entry) => entry.trim().replace(/'/g, ''))
      .filter((entry) => entry !== '')
    expect(inlined).toEqual([...LANGS])
  })

  it('inlines the same default as src/logic/lang.ts', () => {
    expect(html.match(/var DEFAULT_LANG = '([a-z-]+)'/)?.[1]).toBe(DEFAULT_LANG)
  })

  // The no-JS ground: with the script blocked the attribute in the markup is
  // the whole answer, so it has to be the default the app would have chosen.
  it('declares the default language on <html> for the no-script case', () => {
    expect(html.match(/<html lang="([a-z-]+)"/)?.[1]).toBe(DEFAULT_LANG)
  })

  // …but only in this file. The build writes one document per locale and
  // stamps each with its own data-doc-lang (scripts/prerender.mjs), and on a
  // document that is not the default locale's, reaching for DEFAULT_LANG here
  // would overwrite a lang the served HTML already had right — undoing, before
  // the first paint, the thing the prerender exists to do.
  it('falls back to the document’s own locale before the app’s default', () => {
    expect(html).toContain(`document.documentElement.getAttribute('data-doc-lang')`)
    expect(html).toContain(
      `var fallbackLang = LANGS.indexOf(docLang) === -1 ? DEFAULT_LANG : docLang`,
    )
    expect(html).toContain(`var lang = LANGS.indexOf(rawLang) === -1 ? fallbackLang : rawLang`)
  })

  it('sets the resolved language on the root element', () => {
    expect(html).toMatch(/root\.lang = lang/)
  })
})
