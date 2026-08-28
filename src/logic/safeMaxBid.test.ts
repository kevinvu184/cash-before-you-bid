import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../data/defaults'
import type { CalculatorInputs, SafeMaxBidBinding } from '../types/calculator'
import { calculate } from './calculate'
import {
  SAFE_MAX_BID_CEILING,
  SAFE_MAX_BID_MAX_ITERATIONS,
  SAFE_MAX_BID_UNIT,
  safeMaxBid,
} from './safeMaxBid'

const inputs = (over: Partial<CalculatorInputs> = {}): CalculatorInputs => ({
  ...DEFAULT_INPUTS,
  ...over,
})

/** The verdict's own answer at a price — what the search is inverting. */
const coveredAt = (base: CalculatorInputs, price: number): boolean =>
  calculate({ ...base, price }).readiness.verdicts.every((verdict) => verdict.covered)

/**
 * The property that makes an answer a ceiling, asserted rather than a
 * hard-coded figure: the price it names is covered, and one bid increment
 * above it is not. It survives a rate change; a magic number would not.
 */
function expectCeiling(base: CalculatorInputs, price: number) {
  expect(price % SAFE_MAX_BID_UNIT).toBe(0)
  expect(coveredAt(base, price)).toBe(true)
  expect(coveredAt(base, price + SAFE_MAX_BID_UNIT)).toBe(false)
}

/**
 * The pockets short at a price, as the verdict reports them — the same
 * derivation `safeMaxBid` makes, written out independently so the test is not
 * asserting the implementation against itself.
 */
function bindingAt(base: CalculatorInputs, price: number): SafeMaxBidBinding {
  const pockets = new Set<string>()
  for (const verdict of calculate({ ...base, price }).readiness.verdicts) {
    for (const check of verdict.checks) {
      if (check.shortfall > 0) pockets.add(check.pocket)
    }
  }
  if (pockets.has('cash')) return pockets.has('loan') ? 'both' : 'cash'
  return pockets.has('loan') ? 'loan' : 'none'
}

// A buyer who is not a first home buyer, so the duty brackets are the general
// ones and nothing drops in or out at $600k.
const buyer = (over: Partial<CalculatorInputs> = {}): CalculatorInputs =>
  inputs({
    route: 'lmi',
    depositPct: 10,
    firstHomeBuyer: false,
    ownerOccupier: true,
    newHome: false,
    ...over,
  })

describe('safeMaxBid', () => {
  it('is cash-bound when the pre-approval is far larger than the savings', () => {
    const base = buyer({ savings: 200_000, preApprovedLoan: 5_000_000 })
    const result = safeMaxBid(base)

    expect(result.status).toBe('bound')
    expect(result.binding).toBe('cash')
    expectCeiling(base, result.price)
  })

  it('is loan-bound when the pre-approval runs out before the savings do', () => {
    const base = buyer({ savings: 5_000_000, preApprovedLoan: 400_000 })
    const result = safeMaxBid(base)

    expect(result.status).toBe('bound')
    expect(result.binding).toBe('loan')
    expectCeiling(base, result.price)
  })

  it('raises the ceiling as savings rise, and never above what the loan allows', () => {
    const base = buyer({ savings: 200_000, preApprovedLoan: 400_000 })
    const richer = safeMaxBid({ ...base, savings: 400_000 })
    const poorer = safeMaxBid(base)

    expect(richer.price).toBeGreaterThanOrEqual(poorer.price)
    expectCeiling({ ...base, savings: 400_000 }, richer.price)
  })

  it('reports a cash ceiling when no pre-approval has been entered', () => {
    // The finance check does not run, so nothing tests the balance of the
    // price: the answer is what the cash reaches, and only that.
    const base = buyer({ savings: 200_000, preApprovedLoan: null })
    const result = safeMaxBid(base)

    expect(result.binding).toBe('cash')
    expectCeiling(base, result.price)
    // Entering a pre-approval can only lower it: it adds a check, never removes one.
    expect(safeMaxBid({ ...base, preApprovedLoan: 400_000 }).price).toBeLessThanOrEqual(
      result.price,
    )
  })

  it('rounds down to a callable figure rather than to the nearest', () => {
    const base = buyer({ savings: 200_000, preApprovedLoan: 5_000_000 })
    const result = safeMaxBid(base)

    expect(result.price).toBeLessThanOrEqual(result.exact)
    expect(result.exact - result.price).toBeLessThan(SAFE_MAX_BID_UNIT)
  })

  it('terminates within its iteration bound', () => {
    const result = safeMaxBid(buyer({ savings: 200_000, preApprovedLoan: 5_000_000 }))
    expect(result.iterations).toBeGreaterThan(0)
    expect(result.iterations).toBeLessThanOrEqual(SAFE_MAX_BID_MAX_ITERATIONS)
  })

  describe('first home buyer thresholds', () => {
    const fhb = (savings: number): CalculatorInputs =>
      inputs({
        route: 'lmi',
        depositPct: 10,
        firstHomeBuyer: true,
        ownerOccupier: true,
        newHome: false,
        savings,
        preApprovedLoan: 5_000_000,
      })

    it('lands below the $600k exemption threshold on modest savings', () => {
      const base = fhb(65_000)
      const result = safeMaxBid(base)

      expect(result.price).toBeLessThanOrEqual(600_000)
      expect(calculate({ ...base, price: result.price }).totals.stampDuty).toBe(0)
      expectCeiling(base, result.price)
    })

    it('crosses the $600k threshold into the concession band', () => {
      const base = fhb(90_000)
      const result = safeMaxBid(base)

      expect(result.price).toBeGreaterThan(600_000)
      expect(result.price).toBeLessThanOrEqual(750_000)
      // Concessional, so duty is charged but less than the general rate.
      const at = calculate({ ...base, price: result.price })
      expect(at.totals.stampDuty).toBeGreaterThan(0)
      expectCeiling(base, result.price)
    })

    it('crosses the $750k threshold onto the full general rate', () => {
      const base = fhb(160_000)
      const result = safeMaxBid(base)

      expect(result.price).toBeGreaterThan(750_000)
      expectCeiling(base, result.price)
    })

    it('never returns a price inside a bracket the savings cannot pay for', () => {
      // Duty rises faster than savings do across the concession band, so the
      // ceiling must not step over a threshold it cannot afford. Sweeping
      // savings across the band proves the answer stays covered throughout.
      for (let savings = 60_000; savings <= 200_000; savings += 5_000) {
        const base = fhb(savings)
        expectCeiling(base, safeMaxBid(base).price)
      }
    })
  })

  it('reports no affordable price when the savings are zero', () => {
    // The default costs include lender fees, adjustments and insurance, all of
    // which fall due at settlement whatever the price is.
    const result = safeMaxBid(inputs({ savings: 0, preApprovedLoan: null }))

    expect(result.status).toBe('unaffordable')
    expect(result.binding).toBe('cash')
    expect(result.price).toBe(0)
  })

  it('answers zero rather than nothing when the savings cover only the fixed costs', () => {
    const base = inputs({
      route: 'lmi',
      depositPct: 10,
      firstHomeBuyer: false,
      savings: 3_000,
      preApprovedLoan: null,
      conveyancing: 0,
      buildingAndPest: 0,
      lenderFees: 0,
      settlementAdjustments: 0,
      buildingInsurance: 0,
    })
    const result = safeMaxBid(base)

    expect(result.status).toBe('bound')
    expectCeiling(base, result.price)
  })

  it('capitalising LMI moves the premium out of the cash and into the loan', () => {
    // Cash-bound: capitalising takes the premium off the settlement cash, so
    // the same savings reach further.
    const cashBound = buyer({ savings: 120_000, preApprovedLoan: 5_000_000 })
    expect(safeMaxBid({ ...cashBound, capitaliseLmi: true }).price).toBeGreaterThan(
      safeMaxBid({ ...cashBound, capitaliseLmi: false }).price,
    )

    // Loan-bound: the same premium is now inside the loan, so the same
    // pre-approval does not reach as far.
    const loanBound = buyer({ savings: 5_000_000, preApprovedLoan: 500_000 })
    expect(safeMaxBid({ ...loanBound, capitaliseLmi: true }).price).toBeLessThan(
      safeMaxBid({ ...loanBound, capitaliseLmi: false }).price,
    )

    const capitalised = { ...cashBound, capitaliseLmi: true }
    expectCeiling(capitalised, safeMaxBid(capitalised).price)
  })

  it('reports an unbounded ceiling rather than inventing one', () => {
    // Nothing caps the bid: no deposit percentage, no duty (the whole price is
    // off-the-plan construction) and no finance check to run.
    const result = safeMaxBid(
      inputs({
        route: 'lmi',
        depositPct: 0,
        offThePlanConstruction: SAFE_MAX_BID_CEILING,
        savings: SAFE_MAX_BID_CEILING,
        preApprovedLoan: null,
      }),
    )

    expect(result.status).toBe('unbounded')
    expect(result.binding).toBe('none')
    expect(result.price).toBe(SAFE_MAX_BID_CEILING)
  })

  describe('the lever it names', () => {
    // The figure is reported in $1,000 units, so the pocket that stops the
    // bidder is the one that fails at the next bid they could call — not the
    // one that fails a cent above the exact ceiling, where a second pocket
    // within the same increment has not started failing yet.
    it('is the pocket that fails one increment above the answer', () => {
      const cases = [
        buyer({ savings: 200_000, preApprovedLoan: 5_000_000 }),
        buyer({ savings: 5_000_000, preApprovedLoan: 400_000 }),
        buyer({ savings: 200_000, preApprovedLoan: null }),
        buyer({ savings: 120_000, preApprovedLoan: 700_000, capitaliseLmi: true }),
        inputs({ savings: 90_000, preApprovedLoan: 700_000 }),
      ]
      for (const base of cases) {
        const result = safeMaxBid(base)
        expect(result.binding).toBe(bindingAt(base, result.price + SAFE_MAX_BID_UNIT))
      }
    })

    it('names both pockets when neither has an increment of headroom', () => {
      // A cash ceiling with the pre-approval placed a few hundred dollars
      // above it: cash alone fails at the exact ceiling, but both fail at the
      // next callable bid, and saving more cannot reach it while the loan
      // fails there too.
      const cashBound = buyer({ savings: 200_000, preApprovedLoan: SAFE_MAX_BID_CEILING })
      const exact = safeMaxBid(cashBound).exact
      const preApprovedLoan = Math.ceil(
        calculate({ ...cashBound, price: exact + 300 }).totals.loan,
      )
      const base = { ...cashBound, preApprovedLoan }
      const result = safeMaxBid(base)

      expect(bindingAt(base, result.exact + 0.01)).toBe('cash')
      expect(result.binding).toBe('both')
      // Still a real ceiling: the answer is covered, one increment up is not.
      expectCeiling(base, result.price)
    })
  })

  it('never exceeds the ceiling the price field itself accepts', () => {
    const result = safeMaxBid(
      buyer({ savings: SAFE_MAX_BID_CEILING, preApprovedLoan: SAFE_MAX_BID_CEILING }),
    )
    expect(result.price).toBeLessThanOrEqual(SAFE_MAX_BID_CEILING)
  })
})
