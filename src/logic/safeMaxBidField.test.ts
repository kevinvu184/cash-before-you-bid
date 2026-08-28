import { describe, expect, it } from 'vitest'
import type { SafeMaxBidBinding, SafeMaxBidResult } from '../types/calculator'
import { SAFE_MAX_BID_CEILING, SAFE_MAX_BID_UNIT } from './safeMaxBid'
import { buildSafeMaxBidField } from './safeMaxBidField'

const result = (over: Partial<SafeMaxBidResult> = {}): SafeMaxBidResult => ({
  price: 690_000,
  exact: 690_412.37,
  binding: 'cash',
  status: 'bound',
  iterations: 35,
  ...over,
})

describe('buildSafeMaxBidField', () => {
  it('carries the price, the outcome and what binds it', () => {
    const field = buildSafeMaxBidField(result(), 60_000)

    expect(field.id).toBe('safeMaxBid')
    expect(field.value).toBe(690_000)
    expect(field.status).toBe('bound')
    expect(field.binding).toBe('cash')
    expect(field.importance).toBe('primary')
  })

  it('names the lever that moves the figure', () => {
    const key = (binding: SafeMaxBidBinding) =>
      buildSafeMaxBidField(result({ binding }), 60_000).summary.key

    // One sentence per pocket: a cash gap and a loan gap are closed differently.
    const keys = [key('cash'), key('loan'), key('both'), key('none')]
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('discloses the conservative rounding beside the figure', () => {
    const field = buildSafeMaxBidField(result(), 60_000)
    expect(field.detail?.params.unit).toEqual({ format: 'moneyExact', value: SAFE_MAX_BID_UNIT })
  })

  it('asks rather than tells when no savings have been entered', () => {
    const withSavings = buildSafeMaxBidField(result({ status: 'unaffordable', price: 0 }), 40_000)
    const without = buildSafeMaxBidField(result({ status: 'unaffordable', price: 0 }), 0)

    expect(without.summary.key).not.toBe(withSavings.summary.key)
    // Neither states a rounded figure: there is no ceiling to round.
    expect(without.detail).toBeNull()
    expect(withSavings.detail).toBeNull()
  })

  it('quotes the search ceiling when nothing caps the bid', () => {
    const field = buildSafeMaxBidField(
      result({ status: 'unbounded', binding: 'none', price: SAFE_MAX_BID_CEILING }),
      5_000_000,
    )

    expect(field.summary.params.price).toEqual({
      format: 'moneyExact',
      value: SAFE_MAX_BID_CEILING,
    })
  })
})
