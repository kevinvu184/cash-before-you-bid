import { describe, expect, it } from 'vitest'
import { AA_BODY_TEXT, AA_UI_COMPONENT, contrastRatio } from '../logic/contrast'
import { COLOR_MODES } from '../logic/skins'
import { COLOR_TOKEN_NAMES, LINE_HEIGHT_TOKEN_NAMES, TOKEN_NAMES } from '../logic/theme'
import type { ThemeTokens } from '../types/skin'
import { SKINS } from './registry'

// Accessibility, per skin and per mode. Iterates Object.values(SKINS), so a
// new skin is held to the same thresholds without touching this file.

const SKIN_LIST = Object.values(SKINS)

// Every text-on-surface pair the skins can actually put on screen.
const TEXT_PAIRS: ReadonlyArray<[keyof ThemeTokens, keyof ThemeTokens]> = [
  ['colorText', 'colorBg'],
  ['colorText', 'colorSurface'],
  ['colorTextMuted', 'colorBg'],
  ['colorTextMuted', 'colorSurface'],
  ['colorAccent', 'colorBg'],
  ['colorAccent', 'colorSurface'],
  ['colorAccentStrong', 'colorBg'],
  ['colorSuccess', 'colorBg'],
  ['colorSuccess', 'colorSurface'],
  ['colorWarning', 'colorBg'],
  ['colorWarning', 'colorSurface'],
  ['colorError', 'colorBg'],
  ['colorError', 'colorSurface'],
  ['colorOnInk', 'colorInk'],
  ['colorOnInkMuted', 'colorInk'],
]

// The focus indicator is a UI component, so 3:1 rather than 4.5:1.
const UI_PAIRS: ReadonlyArray<[keyof ThemeTokens, keyof ThemeTokens]> = [
  ['focusRingColor', 'colorBg'],
  ['focusRingColor', 'colorSurface'],
]

describe.each(SKIN_LIST.map((entry) => entry.id))('skin %s', (skinId) => {
  const entry = SKIN_LIST.find((candidate) => candidate.id === skinId)

  it('ships a complete token set for both modes', () => {
    for (const mode of COLOR_MODES) {
      const tokens = entry?.tokens[mode]
      expect(tokens).toBeDefined()
      for (const name of TOKEN_NAMES) {
        expect(`${name}=${tokens?.[name] ?? ''}`).not.toBe(`${name}=`)
      }
    }
  })

  it('states every colour token as a hex value', () => {
    for (const mode of COLOR_MODES) {
      for (const name of COLOR_TOKEN_NAMES) {
        expect(`${name}: ${entry?.tokens[mode][name]}`).toMatch(/: #[0-9a-f]{6}$/)
      }
    }
  })

  describe.each(COLOR_MODES)('in %s mode', (mode) => {
    const tokens = entry?.tokens[mode] as ThemeTokens

    it.each(TEXT_PAIRS)('%s on %s meets AA for body text', (foreground, background) => {
      expect(contrastRatio(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(
        AA_BODY_TEXT,
      )
    })

    it.each(UI_PAIRS)('%s on %s meets AA for a UI component', (foreground, background) => {
      expect(contrastRatio(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(
        AA_UI_COMPONENT,
      )
    })

    // Vietnamese stacks tone marks above and below the letter; below about 1.4
    // the marks of one line touch the line above.
    it.each(LINE_HEIGHT_TOKEN_NAMES)('sets %s to at least 1.4 for Vietnamese', (name) => {
      expect(Number(tokens[name])).toBeGreaterThanOrEqual(1.4)
    })

    it('sets a visible focus ring', () => {
      expect(Number.parseFloat(tokens.focusRingWidth)).toBeGreaterThan(0)
    })
  })
})
