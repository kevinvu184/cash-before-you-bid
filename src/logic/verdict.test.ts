import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../data/defaults'
import type { CalculatorInputs, Verdict } from '../types/calculator'
import { calculate } from './calculate'
import { assessReadiness } from './verdict'
import { buildVerdictFields } from './verdictFields'

const inputs = (over: Partial<CalculatorInputs> = {}): CalculatorInputs => ({
  ...DEFAULT_INPUTS,
  ...over,
})

const verdictFor = (result: ReturnType<typeof calculate>, code: Verdict['code']): Verdict => {
  const found = result.readiness.verdicts.find((verdict) => verdict.code === code)
  if (!found) throw new Error(`no ${code} verdict`)
  return found
}

/** The auction-day and settlement band subtotals, straight off the rows. */
const bandTotal = (result: ReturnType<typeof calculate>, band: string) =>
  result.rows.filter((row) => row.band === band).reduce((sum, row) => sum + row.amount, 0)

describe('assessReadiness — two checks, never merged', () => {
  it('reports one verdict per moment, in the order the purchase runs', () => {
    const r = calculate(inputs())
    expect(r.readiness.verdicts.map((verdict) => verdict.code)).toEqual([
      'auctionDay',
      'atSettlement',
    ])
  })

  it('covers the day when savings reach the deposit', () => {
    const r = calculate(inputs({ price: 750_000, depositPct: 5, savings: 40_000 }))
    const day = verdictFor(r, 'auctionDay')
    expect(day.covered).toBe(true)
    expect(day.shortfall).toBe(0)
    expect(day.checks[0].required).toBeCloseTo(37_500, 6)
  })

  it('names the cash shortfall on the day, to the dollar', () => {
    const r = calculate(inputs({ price: 750_000, depositPct: 5, savings: 30_000 }))
    const day = verdictFor(r, 'auctionDay')
    expect(day.covered).toBe(false)
    expect(day.checks[0].pocket).toBe('cash')
    expect(day.shortfall).toBeCloseTo(7500, 6)
  })

  it('spends the deposit before settlement, and never counts the same gap twice', () => {
    // Savings well below the deposit: the day is short, and settlement is
    // short by its whole requirement rather than by the requirement plus the
    // deposit gap already reported above it.
    const r = calculate(inputs({ price: 750_000, depositPct: 5, savings: 10_000 }))
    const day = verdictFor(r, 'auctionDay')
    const settlement = verdictFor(r, 'atSettlement')
    const settlementCash = settlement.checks.find((check) => check.pocket === 'cash')
    expect(settlementCash?.available).toBe(0)
    expect(settlementCash?.shortfall).toBeCloseTo(bandTotal(r, 'atSettlement'), 6)
    // The two shortfalls add up to the real gap, so neither hides the other.
    const need = bandTotal(r, 'auctionDay') + bandTotal(r, 'atSettlement')
    expect(day.shortfall + settlement.shortfall).toBeCloseTo(need - 10_000, 6)
  })

  it('does not let a large pre-approval paper over an empty bank account', () => {
    // The whole reason the checks are kept apart: a loan funds the balance of
    // the price, never the deposit or the duty.
    const r = calculate(inputs({ price: 750_000, savings: 0, preApprovedLoan: 5_000_000 }))
    expect(verdictFor(r, 'auctionDay').covered).toBe(false)
    const settlement = verdictFor(r, 'atSettlement')
    expect(settlement.covered).toBe(false)
    expect(settlement.checks.find((check) => check.pocket === 'cash')?.shortfall).toBeGreaterThan(0)
    expect(settlement.checks.find((check) => check.pocket === 'loan')?.shortfall).toBe(0)
  })

  it('names the loan pocket when the pre-approval falls short of the balance', () => {
    const r = calculate(inputs({ price: 750_000, depositPct: 5, preApprovedLoan: 600_000 }))
    const loan = verdictFor(r, 'atSettlement').checks.find((check) => check.pocket === 'loan')
    expect(loan?.required).toBeCloseTo(r.totals.loan, 6)
    expect(loan?.shortfall).toBeCloseTo(r.totals.loan - 600_000, 6)
  })
})

describe('assessReadiness — an absent pre-approval', () => {
  it('suppresses the finance check rather than failing it on a zero', () => {
    const r = calculate(inputs({ preApprovedLoan: null }))
    expect(r.readiness.financeChecked).toBe(false)
    const settlement = verdictFor(r, 'atSettlement')
    expect(settlement.checks.map((check) => check.pocket)).toEqual(['cash'])
    expect(r.flags.map((flag) => flag.code)).toContain('noPreApproval')
  })

  it('runs the check on an entered zero, which is a different answer', () => {
    const r = calculate(inputs({ preApprovedLoan: 0 }))
    expect(r.readiness.financeChecked).toBe(true)
    const loan = verdictFor(r, 'atSettlement').checks.find((check) => check.pocket === 'loan')
    expect(loan?.shortfall).toBeCloseTo(r.totals.loan, 6)
  })

  it('carries the reason the finance check matters once it has been run', () => {
    const covered = calculate(inputs({ price: 750_000, preApprovedLoan: 5_000_000 }))
    expect(covered.flags.find((flag) => flag.code === 'financeUnconditional')?.kind).toBe('note')
    const short = calculate(inputs({ price: 750_000, preApprovedLoan: 1 }))
    expect(short.flags.find((flag) => flag.code === 'financeUnconditional')?.kind).toBe('warn')
  })

  it('says nothing about finance when there is no loan to fund', () => {
    const r = calculate(inputs({ route: 'nolmi', depositPct: 100 }))
    expect(r.totals.loan).toBe(0)
    expect(r.readiness.loanRequired).toBe(false)
    expect(r.flags.map((flag) => flag.code)).not.toContain('noPreApproval')
    expect(r.flags.map((flag) => flag.code)).not.toContain('financeUnconditional')
  })
})

describe('assessReadiness — capitalised LMI is counted once', () => {
  const base = { route: 'lmi', depositPct: 8, price: 750_000, savings: 1_000_000 } as const

  it('moves the premium from settlement cash into the loan, not into both', () => {
    const upfront = calculate(inputs({ ...base, capitaliseLmi: false }))
    const capitalised = calculate(inputs({ ...base, capitaliseLmi: true }))

    const cashOf = (result: ReturnType<typeof calculate>) =>
      verdictFor(result, 'atSettlement').checks.find((check) => check.pocket === 'cash')
    const premium = upfront.totals.lmiPremium
    expect(premium).toBeGreaterThan(0)

    // Settlement cash drops by exactly the premium…
    expect(cashOf(capitalised)?.required).toBeCloseTo(
      (cashOf(upfront)?.required ?? 0) - premium,
      6,
    )
    // …and the loan the finance check tests rises by exactly the premium.
    expect(capitalised.totals.loan).toBeCloseTo(upfront.totals.loan + premium, 6)
  })

  it('holds the same when a pre-approval is in play, in both pockets at once', () => {
    const capitalised = calculate(
      inputs({ ...base, capitaliseLmi: true, preApprovedLoan: 1_000_000 }),
    )
    const settlement = verdictFor(capitalised, 'atSettlement')
    const loan = settlement.checks.find((check) => check.pocket === 'loan')
    const cash = settlement.checks.find((check) => check.pocket === 'cash')
    expect(loan?.required).toBeCloseTo(capitalised.totals.loan, 6)
    // The LMI row is zero, so the premium is nowhere in the cash requirement.
    expect(capitalised.rows.find((row) => row.code === 'lmi')?.amount).toBe(0)
    expect(cash?.required).toBeCloseTo(bandTotal(capitalised, 'atSettlement'), 6)
    expect(settlement.covered).toBe(true)
  })
})

describe('assessReadiness — edges', () => {
  it('treats negative and non-finite savings as nothing, not as a windfall', () => {
    const r = calculate(inputs({ price: 750_000, savings: Number.NaN }))
    expect(verdictFor(r, 'auctionDay').checks[0].available).toBe(0)
  })

  it('never asks for negative cash when a grant outweighs the settlement costs', () => {
    const source = {
      rows: [
        { code: 'deposit' as const, amount: 1000, how: null, emphasis: false, band: 'auctionDay' as const },
        { code: 'grant' as const, amount: -5000, how: null, emphasis: false, band: 'atSettlement' as const },
      ],
      totals: { ...calculate(inputs()).totals, loan: 0 },
    }
    const readiness = assessReadiness(source, { savings: 1000, preApprovedLoan: null })
    const settlement = readiness.verdicts[1]
    expect(settlement.checks[0].required).toBe(0)
    expect(settlement.covered).toBe(true)
  })

  it('ignores float noise below half a cent rather than reporting a phantom gap', () => {
    const r = calculate(inputs({ price: 750_000, depositPct: 5, savings: 37_499.999 }))
    expect(verdictFor(r, 'auctionDay').covered).toBe(true)
  })
})

describe('the verdict fields a skin renders', () => {
  it('quotes the pocket gap when one pocket is short', () => {
    const r = calculate(inputs({ price: 750_000, savings: 40_000, preApprovedLoan: 5_000_000 }))
    const settlement = buildVerdictFields(r.readiness)[1]
    expect(settlement.status).toBe('short')
    expect(settlement.summary.key).toBe('verdicts.atSettlementShort')
    expect(settlement.details).toHaveLength(1)
  })

  it('quotes no total when both pockets are short, so the two are not added up', () => {
    const r = calculate(inputs({ price: 750_000, savings: 40_000, preApprovedLoan: 100_000 }))
    const settlement = buildVerdictFields(r.readiness)[1]
    expect(settlement.summary.key).toBe('verdicts.atSettlementShortMultiple')
    // One line per pocket, each naming its own.
    expect(settlement.details.map((detail) => detail.key)).toEqual([
      'verdicts.shortSettlementCash',
      'verdicts.shortSettlementLoan',
    ])
  })

  it('says the finance check was not run rather than letting it read as passed', () => {
    const r = calculate(inputs({ savings: 10_000_000, preApprovedLoan: null }))
    const settlement = buildVerdictFields(r.readiness)[1]
    expect(settlement.status).toBe('covered')
    expect(settlement.details.map((detail) => detail.key)).toEqual(['verdicts.financeNotChecked'])
  })

  it('never headlines a pre-approval it did not test', () => {
    // "Covered" is a claim about the checks that ran. The ordinary covered
    // copy names the pre-approval covering the balance of the price, so a
    // verdict that never tested one must not reach for it.
    const unchecked = calculate(inputs({ savings: 10_000_000, preApprovedLoan: null }))
    expect(buildVerdictFields(unchecked.readiness)[1].summary.key).toBe(
      'verdicts.atSettlementCoveredCashOnly',
    )
    const checked = calculate(inputs({ savings: 10_000_000, preApprovedLoan: 10_000_000 }))
    expect(buildVerdictFields(checked.readiness)[1].summary.key).toBe(
      'verdicts.atSettlementCovered',
    )
  })

  it('asks no finance question at all when the purchase needs no loan', () => {
    // A 100% deposit has no balance to fund. An unrun check has to be said out
    // loud; an inapplicable one must not be, or the page invents a worry.
    const r = calculate(
      inputs({ route: 'nolmi', depositPct: 100, savings: 10_000_000, preApprovedLoan: null }),
    )
    expect(r.totals.loan).toBe(0)
    expect(r.readiness.loanRequired).toBe(false)
    expect(r.readiness.financeChecked).toBe(false)
    const settlement = buildVerdictFields(r.readiness)[1]
    expect(settlement.details).toEqual([])
    expect(settlement.summary.key).toBe('verdicts.atSettlementCoveredCashOnly')
    expect(r.flags.map((flag) => flag.code)).not.toContain('noPreApproval')
  })

  it('runs no loan check even when a pre-approval is entered but none is needed', () => {
    const r = calculate(
      inputs({ route: 'nolmi', depositPct: 100, savings: 10_000_000, preApprovedLoan: 500_000 }),
    )
    expect(r.readiness.financeChecked).toBe(false)
    const settlement = r.readiness.verdicts[1]
    expect(settlement.checks.map((check) => check.pocket)).toEqual(['cash'])
    expect(r.flags.map((flag) => flag.code)).not.toContain('financeUnconditional')
  })

  it('has nothing left to say once every check has run and passed', () => {
    const r = calculate(inputs({ savings: 10_000_000, preApprovedLoan: 10_000_000 }))
    const fields = buildVerdictFields(r.readiness)
    expect(fields.map((field) => field.status)).toEqual(['covered', 'covered'])
    expect(fields.flatMap((field) => field.details)).toEqual([])
  })
})
