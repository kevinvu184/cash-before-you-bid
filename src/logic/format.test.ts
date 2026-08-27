import { describe, expect, it } from 'vitest'
import {
  formatAud,
  formatNumber,
  formatNumberInput,
  formatPercent,
  formatRowAmount,
  parseLocaleNumber,
} from './format'

describe('formatAud', () => {
  it('rounds to whole dollars and marks the currency as Australian in en', () => {
    expect(formatAud(102621.16439248709, 'en')).toBe('A$102,621')
    expect(formatAud(40070, 'en')).toBe('A$40,070')
    expect(formatAud(4363.841464162364, 'en')).toBe('A$4,364')
    expect(formatAud(0, 'en')).toBe('A$0')
  })

  it('uses Vietnamese digit grouping with the AUD code in vi', () => {
    // Intl's vi symbol is "AU$", which reads ambiguously next to đồng
    // amounts, so the ISO code is used instead.
    expect(formatAud(1234.5, 'vi')).toBe('1.235\u00a0AUD')
    expect(formatAud(750000, 'vi')).toBe('750.000\u00a0AUD')
    expect(formatAud(0, 'vi')).toBe('0\u00a0AUD')
  })

  it('never shows đồng in either locale', () => {
    for (const locale of ['en', 'vi']) {
      const formatted = formatAud(1234.5, locale)
      expect(formatted.includes('AUD') || formatted.includes('A$')).toBe(true)
      expect(formatted).not.toContain('₫')
      expect(formatted).not.toContain('VND')
    }
  })
})

describe('formatRowAmount', () => {
  it('renders negatives as a typographic minus before the absolute value', () => {
    expect(formatRowAmount(-10000, 'en')).toBe('−A$10,000')
    expect(formatRowAmount(37500, 'en')).toBe('A$37,500')
    expect(formatRowAmount(-10000, 'vi')).toBe('−10.000\u00a0AUD')
  })
})

describe('formatPercent', () => {
  it('rounds to two decimals like the original pct()', () => {
    expect(formatPercent(95, 'en')).toBe('95%')
    expect(formatPercent(6.270618666666667, 'en')).toBe('6.27%')
    expect(formatPercent(9.200000000000001, 'en')).toBe('9.2%')
    expect(formatPercent(6.2, 'en')).toBe('6.2%')
  })

  it('uses the locale decimal separator', () => {
    expect(formatPercent(94.99, 'vi')).toBe('94,99%')
    expect(formatPercent(95, 'vi')).toBe('95%')
  })
})

describe('formatNumber', () => {
  it('groups per locale', () => {
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5')
    expect(formatNumber(1234.5, 'vi')).toBe('1.234,5')
  })
})

describe('parseLocaleNumber', () => {
  it('parses vi-style input', () => {
    expect(parseLocaleNumber('1.234,5', 'vi')).toBe(1234.5)
    expect(parseLocaleNumber('1.234', 'vi')).toBe(1234)
    expect(parseLocaleNumber('1,5', 'vi')).toBe(1.5)
    expect(parseLocaleNumber('750000', 'vi')).toBe(750000)
    // A lone dot that is not marking a group of three reads as a decimal
    // point, so a value shown as 6.2 before a locale switch survives.
    expect(parseLocaleNumber('6.2', 'vi')).toBe(6.2)
  })

  it('parses en-style input', () => {
    expect(parseLocaleNumber('1,234.5', 'en')).toBe(1234.5)
    expect(parseLocaleNumber('1,234', 'en')).toBe(1234)
    expect(parseLocaleNumber('1.5', 'en')).toBe(1.5)
    expect(parseLocaleNumber('0.05', 'en')).toBe(0.05)
  })

  it('accepts the other locale`s decimal separator when unambiguous', () => {
    expect(parseLocaleNumber('1.234,5', 'en')).toBe(1234.5)
    expect(parseLocaleNumber('1,234.5', 'vi')).toBe(1234.5)
    expect(parseLocaleNumber('6,2', 'en')).toBe(6.2)
  })

  it('handles signs and repeated group separators', () => {
    expect(parseLocaleNumber('-1.234,5', 'vi')).toBe(-1234.5)
    expect(parseLocaleNumber('1.234.567', 'vi')).toBe(1234567)
    expect(parseLocaleNumber('1,234,567', 'en')).toBe(1234567)
  })

  it('rejects invalid input', () => {
    expect(parseLocaleNumber('', 'vi')).toBeNull()
    expect(parseLocaleNumber('   ', 'en')).toBeNull()
    expect(parseLocaleNumber('abc', 'vi')).toBeNull()
    expect(parseLocaleNumber('1,2,3', 'vi')).toBeNull()
    expect(parseLocaleNumber('12.34.5', 'vi')).toBeNull()
    expect(parseLocaleNumber('1.234,5.6', 'vi')).toBeNull()
    expect(parseLocaleNumber('1a2', 'en')).toBeNull()
    expect(parseLocaleNumber('.', 'en')).toBeNull()
  })
})

describe('formatNumberInput', () => {
  it('serialises for editing with the locale decimal separator, no grouping', () => {
    expect(formatNumberInput(750000, 'en')).toBe('750000')
    expect(formatNumberInput(6.2, 'vi')).toBe('6,2')
    expect(formatNumberInput(6.2, 'en')).toBe('6.2')
    expect(formatNumberInput(Number.NaN, 'vi')).toBe('')
  })

  it('round-trips through parseLocaleNumber', () => {
    for (const locale of ['en', 'vi']) {
      for (const value of [0, 5, 6.2, 0.05, 750000, 12345.678]) {
        expect(parseLocaleNumber(formatNumberInput(value, locale), locale)).toBe(value)
      }
    }
  })
})
