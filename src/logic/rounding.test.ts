import { describe, expect, it } from 'vitest'
import { CURRENCY_CODES, CURRENCY_ROUNDING } from './currencyConfig'
import { roundForDisplay, roundToUnit } from './rounding'

describe('roundToUnit', () => {
  it('rounds half-up to the nearest multiple of the unit', () => {
    expect(roundToUnit(0, 100)).toBe(0)
    expect(roundToUnit(49, 100)).toBe(0)
    expect(roundToUnit(50, 100)).toBe(100)
    expect(roundToUnit(51, 100)).toBe(100)
    expect(roundToUnit(149, 100)).toBe(100)
    expect(roundToUnit(150, 100)).toBe(200)
    expect(roundToUnit(1234.56, 100)).toBe(1200)
  })

  it('rounds negative amounts symmetrically', () => {
    expect(roundToUnit(-150, 100)).toBe(-200)
    // toBe uses Object.is, so this also asserts the result is not -0, which
    // Intl would render as "-A$0".
    expect(roundToUnit(-49, 100)).toBe(0)
    expect(roundToUnit(-1234.56, 100)).toBe(-1200)
  })

  it('leaves a value already on the unit unchanged', () => {
    expect(roundToUnit(1200, 100)).toBe(1200)
    expect(roundToUnit(50, 10)).toBe(50)
  })

  it('returns the amount unrounded for an invalid unit', () => {
    expect(roundToUnit(1234.56, 0)).toBe(1234.56)
    expect(roundToUnit(1234.56, -100)).toBe(1234.56)
    expect(roundToUnit(1234.56, Number.NaN)).toBe(1234.56)
    expect(roundToUnit(1234.56, Number.POSITIVE_INFINITY)).toBe(1234.56)
  })
})

describe('roundForDisplay', () => {
  it('rounds AUD to $100, or $10 under $1,000', () => {
    expect(roundForDisplay(49, 'AUD')).toBe(50)
    expect(roundForDisplay(999, 'AUD')).toBe(1000)
    expect(roundForDisplay(1234.56, 'AUD')).toBe(1200)
    expect(roundForDisplay(12345, 'AUD')).toBe(12300)
  })

  it('rounds USD to $100, or $10 under $1,000', () => {
    expect(roundForDisplay(49, 'USD')).toBe(50)
    expect(roundForDisplay(999, 'USD')).toBe(1000)
    expect(roundForDisplay(1234.56, 'USD')).toBe(1200)
    expect(roundForDisplay(12345, 'USD')).toBe(12300)
  })

  it('rounds VND to 100,000₫, or 10,000₫ under 1,000,000₫', () => {
    expect(roundForDisplay(49_000, 'VND')).toBe(50_000)
    expect(roundForDisplay(999_999, 'VND')).toBe(1_000_000)
    expect(roundForDisplay(1_234_567, 'VND')).toBe(1_200_000)
    expect(roundForDisplay(12_345_678, 'VND')).toBe(12_300_000)
  })

  it('switches units at exactly smallThreshold', () => {
    // Just below the threshold the small unit applies: 994 would land on
    // 1,000 under the big unit, so 990 proves the $10 unit was used.
    expect(roundForDisplay(994, 'AUD')).toBe(990)
    // From exactly the threshold the big unit applies: 1,049 would land on
    // 1,050 under the small unit, so 1,000 proves the $100 unit was used —
    // and 1,000 itself sits at the boundary and uses the big unit.
    expect(roundForDisplay(1000, 'AUD')).toBe(1000)
    expect(roundForDisplay(1049, 'AUD')).toBe(1000)
    expect(roundForDisplay(994_000, 'VND')).toBe(990_000)
    expect(roundForDisplay(1_000_000, 'VND')).toBe(1_000_000)
    expect(roundForDisplay(1_049_000, 'VND')).toBe(1_000_000)
  })

  it('applies the threshold to the absolute value of negatives', () => {
    expect(roundForDisplay(-994, 'AUD')).toBe(-990)
    expect(roundForDisplay(-1234.56, 'AUD')).toBe(-1200)
  })
})

describe('currency config', () => {
  it('has a valid entry for every currency code', () => {
    // Record<CurrencyCode, …> already enforces this at compile time; this is
    // the runtime counterpart, checking the entries are usable data.
    expect(CURRENCY_CODES.length).toBeGreaterThan(0)
    for (const code of CURRENCY_CODES) {
      const config = CURRENCY_ROUNDING[code]
      expect(config).toBeDefined()
      expect(config.unit).toBeGreaterThan(0)
      expect(config.fractionDigits).toBe(0)
      // smallThreshold and smallUnit travel together and must make sense
      // against the main unit.
      expect(config.smallThreshold === undefined).toBe(config.smallUnit === undefined)
      if (config.smallThreshold !== undefined && config.smallUnit !== undefined) {
        expect(config.smallUnit).toBeGreaterThan(0)
        expect(config.smallUnit).toBeLessThan(config.unit)
        expect(config.smallThreshold).toBeGreaterThan(config.smallUnit)
      }
    }
  })
})
