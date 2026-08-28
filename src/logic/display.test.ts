import { describe, expect, it } from 'vitest'
import {
  displayMoney,
  displayRowAmount,
  displaySettings,
  displayUnit,
  type Display,
} from './display'

const aud: Display = { locale: 'vi', currency: 'AUD', rate: 1 }
const vnd: Display = { locale: 'vi', currency: 'VND', rate: 18_700 }

describe('displayMoney', () => {
  it('writes a base-currency amount unconverted', () => {
    expect(displayMoney(750_000, aud)).toBe('750.000\u00a0AUD')
  })

  it('converts and rounds to the display currency’s own unit', () => {
    // 1.000 AUD → 18.700.000 ₫, already a multiple of the 100.000 ₫ unit.
    expect(displayMoney(1000, vnd)).toBe('18.700.000\u00a0₫')
  })

  it('rounds the converted figure, not the amount it came from', () => {
    // 1.234,56 AUD × 18.700 = 23.086.272 ₫ → nearest 100.000 is 23.100.000.
    expect(displayMoney(1234.56, vnd)).toBe('23.100.000\u00a0₫')
  })

  it('uses the currency’s small-amount unit below its threshold', () => {
    // 30 AUD → 561.000 ₫, under the 1.000.000 ₫ threshold, so it snaps to the
    // 10.000 ₫ unit rather than losing more than half its value to 100.000.
    expect(displayMoney(30, vnd)).toBe('560.000\u00a0₫')
  })

  it('keeps an exact figure exact, in whatever currency it is shown', () => {
    expect(displayMoney(1234.56, aud, { round: false })).toBe('1.234,56\u00a0AUD')
    expect(displayMoney(1000, vnd, { round: false })).toBe('18.700.000\u00a0₫')
  })

  it('follows the locale for separators and symbol placement', () => {
    expect(displayMoney(1000, { ...vnd, locale: 'en' })).toBe('₫18,700,000')
    expect(displayMoney(750_000, { ...aud, locale: 'en' })).toBe('A$750,000')
  })
})

describe('displayRowAmount', () => {
  it('puts the typographic minus ahead of a converted negative', () => {
    expect(displayRowAmount(-10_000, vnd)).toBe('\u2212187.000.000\u00a0₫')
  })

  it('leaves a positive amount unsigned', () => {
    expect(displayRowAmount(10_000, vnd)).toBe('187.000.000\u00a0₫')
  })
})

describe('displayUnit', () => {
  it('writes a figure already in the display currency without converting it', () => {
    // The đồng rounding unit is 100.000 ₫; putting it through the rate as if
    // it were dollars would print it as nearly two billion.
    expect(displayUnit(100_000, vnd)).toBe('100.000\u00a0₫')
    expect(displayUnit(100, aud)).toBe('100\u00a0AUD')
  })

  it('keeps every digit, so a rate is quoted as typed', () => {
    expect(displayUnit(18_708, vnd)).toBe('18.708\u00a0₫')
  })
})

describe('displaySettings', () => {
  it('carries the rate through for a currency that needs converting', () => {
    expect(displaySettings('VND', 18_700)).toEqual({ currency: 'VND', rate: 18_700 })
  })

  it('holds the base currency at 1, whatever rate is in force', () => {
    // An override rides in the URL and survives a switch back to dollars, so
    // `?fx=20000` with dollars showing would otherwise hand every reader of
    // the display a rate of 20,000 dollars per dollar. Nothing converts a
    // base-currency amount, so it changes no figure — it is the contract that
    // would be wrong, for whoever reads `rate` next.
    expect(displaySettings('AUD', 20_000)).toEqual({ currency: 'AUD', rate: 1 })
    expect(displaySettings('AUD', 1)).toEqual({ currency: 'AUD', rate: 1 })
  })
})
