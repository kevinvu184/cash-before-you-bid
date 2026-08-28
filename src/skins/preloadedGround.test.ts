import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COLOR_MODES, SKIN_IDS } from '../logic/skins'
import { SKINS } from './registry'

// index.html paints the ground colours before React mounts, from a small table
// inlined in a <script> — the one place a token value is written twice. This
// test parses that table out of the real file and holds it to the token
// objects, so the duplication cannot drift.

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
