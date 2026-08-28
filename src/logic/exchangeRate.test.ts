import { describe, expect, it } from 'vitest'
import {
  convert,
  FALLBACK_RATES,
  isValidRate,
  parseQuote,
  rateAsShown,
  RATE_MAX,
  RATE_MIN,
} from './exchangeRate'
import { BASE_CURRENCY, DISPLAY_CURRENCIES } from './currencyConfig'

// A well-formed reply from open.er-api.com, trimmed to the fields that matter.
const payload = {
  result: 'success',
  base_code: 'AUD',
  time_last_update_unix: 1_787_788_951,
  rates: { AUD: 1, VND: 18_707.672741, USD: 0.717872 },
}

describe('isValidRate', () => {
  it('accepts a rate inside the band', () => {
    expect(isValidRate(18_700)).toBe(true)
    expect(isValidRate(RATE_MIN)).toBe(true)
    expect(isValidRate(RATE_MAX)).toBe(true)
  })

  it('rejects anything that could not price a conversion', () => {
    expect(isValidRate(0)).toBe(false)
    expect(isValidRate(-5)).toBe(false)
    expect(isValidRate(RATE_MAX * 10)).toBe(false)
    expect(isValidRate(Number.NaN)).toBe(false)
    expect(isValidRate(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isValidRate('18700')).toBe(false)
    expect(isValidRate(null)).toBe(false)
    expect(isValidRate(undefined)).toBe(false)
  })
})

describe('parseQuote', () => {
  it('reads the rate and the provider timestamp', () => {
    expect(parseQuote(payload, 'VND')).toEqual({
      rate: 18_707.672741,
      updatedAt: 1_787_788_951_000,
    })
  })

  it('rejects a payload the provider did not call a success', () => {
    expect(parseQuote({ ...payload, result: 'error' }, 'VND')).toBeNull()
  })

  it('rejects a payload quoted against a different base currency', () => {
    // Rates against USD would silently price every figure wrong.
    expect(parseQuote({ ...payload, base_code: 'USD' }, 'VND')).toBeNull()
  })

  it('rejects a missing or unusable rate', () => {
    expect(parseQuote({ ...payload, rates: { AUD: 1 } }, 'VND')).toBeNull()
    expect(parseQuote({ ...payload, rates: { VND: 0 } }, 'VND')).toBeNull()
    expect(parseQuote({ ...payload, rates: { VND: '18700' } }, 'VND')).toBeNull()
    expect(parseQuote({ ...payload, rates: null }, 'VND')).toBeNull()
  })

  it('rejects anything that is not an object', () => {
    expect(parseQuote(null, 'VND')).toBeNull()
    expect(parseQuote('not json', 'VND')).toBeNull()
    expect(parseQuote(undefined, 'VND')).toBeNull()
  })

  it('stands in the current time for an unusable timestamp, keeping the rate', () => {
    const before = Date.now()
    const quote = parseQuote({ ...payload, time_last_update_unix: 0 }, 'VND')
    expect(quote?.rate).toBe(18_707.672741)
    expect(quote?.updatedAt).toBeGreaterThanOrEqual(before)
  })
})

describe('convert', () => {
  it('leaves a base-currency amount alone, whatever the rate says', () => {
    expect(convert(750_000, 'AUD', 18_700)).toBe(750_000)
  })

  it('multiplies into the display currency', () => {
    expect(convert(1000, 'VND', 18_700)).toBe(18_700_000)
  })

  it('converts negative amounts symmetrically, so a grant stays a credit', () => {
    expect(convert(-10_000, 'VND', 18_700)).toBe(-187_000_000)
  })
})

describe('rateAsShown', () => {
  it('gives the whole units the rate line and the override box both use', () => {
    expect(rateAsShown(18_707.672741)).toBe(18_708)
    expect(rateAsShown(20_000)).toBe(20_000)
  })

  it('holds a rate whole units can express', () => {
    // Whole units are honest for the đồng, at ~18,700 to the dollar. They
    // would flatten a currency near parity with the base to a single digit —
    // so a display currency whose rate is small needs rateAsShown to become
    // currency-aware before it can be offered, and this is where that is
    // caught rather than in a reader's converted figures.
    for (const currency of DISPLAY_CURRENCIES) {
      if (currency === BASE_CURRENCY) continue
      expect({ currency, usable: FALLBACK_RATES[currency] >= 1000 }).toEqual({
        currency,
        usable: true,
      })
    }
  })
})
