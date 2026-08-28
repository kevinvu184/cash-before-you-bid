// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../data/defaults'
import type { CalculatorInputs } from '../types/calculator'
import { safeMaxBidKey, useSafeMaxBid } from './useSafeMaxBid'

const inputs = (over: Partial<CalculatorInputs> = {}): CalculatorInputs => ({
  ...DEFAULT_INPUTS,
  savings: 200_000,
  preApprovedLoan: 700_000,
  ...over,
})

describe('safeMaxBidKey', () => {
  it('ignores the price, which the search replaces at every step', () => {
    expect(safeMaxBidKey(inputs({ price: 500_000 }))).toBe(
      safeMaxBidKey(inputs({ price: 900_000 })),
    )
  })

  it('covers every other input, including ones added later', () => {
    const base = inputs()
    for (const name of Object.keys(base)) {
      if (name === 'price') continue
      expect(safeMaxBidKey(base)).toContain(`${name}:`)
    }
  })

  it('changes when an input the answer depends on changes', () => {
    const base = inputs()
    expect(safeMaxBidKey({ ...base, savings: 300_000 })).not.toBe(safeMaxBidKey(base))
    expect(safeMaxBidKey({ ...base, capitaliseLmi: true })).not.toBe(safeMaxBidKey(base))
    // Null is "not yet pre-approved", and is not the same key as a zero.
    expect(safeMaxBidKey({ ...base, preApprovedLoan: null })).not.toBe(
      safeMaxBidKey({ ...base, preApprovedLoan: 0 }),
    )
  })
})

describe('useSafeMaxBid', () => {
  it('does not re-run the search while only the price is being typed', () => {
    // A fresh inputs object every render, as `setField` produces: identity
    // alone would miss every time, so the result must come back unchanged.
    const { result, rerender } = renderHook((props: CalculatorInputs) => useSafeMaxBid(props), {
      initialProps: inputs({ price: 500_000 }),
    })
    const first = result.current

    rerender(inputs({ price: 500_001 }))
    rerender(inputs({ price: 900_000 }))

    expect(result.current).toBe(first)
  })

  it('re-runs when an input the answer depends on changes', () => {
    // Cash-bound, so more savings has somewhere to go: with the pre-approval
    // of the other cases in place the ceiling is the loan's, and saving more
    // would rightly leave it where it is.
    const cashBound = (savings: number) => inputs({ savings, preApprovedLoan: null })
    const { result, rerender } = renderHook((props: CalculatorInputs) => useSafeMaxBid(props), {
      initialProps: cashBound(200_000),
    })
    const first = result.current

    rerender(cashBound(400_000))

    expect(result.current).not.toBe(first)
    expect(result.current.price).toBeGreaterThan(first.price)
  })
})
