import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../data/defaults'
import type { CalculatorInputs } from '../types/calculator'
import { calculate } from './calculate'

// Expected values below were produced by running the original page's <script>
// verbatim against the same inputs.

const inputs = (overrides: Partial<CalculatorInputs> = {}): CalculatorInputs => ({
  ...DEFAULT_INPUTS,
  ...overrides,
})

describe('calculate — default scenario ($750k, scheme, 5%, metro, FHB, PPR)', () => {
  const r = calculate(inputs())

  it('reproduces the headline numbers', () => {
    expect(r.totals.deposit).toBe(37_500)
    expect(r.totals.loan).toBe(712_500)
    expect(r.totals.lvrPct).toBe(95)
    expect(r.totals.stampDuty).toBeCloseTo(40_070, 6)
    expect(r.totals.lmiPremium).toBe(0)
    expect(r.totals.purchaseCosts).toBeCloseTo(47_029.64, 6)
    expect(r.totals.monthlyRepayment).toBeCloseTo(4363.841464162364, 6)
    expect(r.totals.assessedRepayment).toBeCloseTo(5835.764302891407, 6)
    expect(r.totals.buffer).toBeCloseTo(14_091.524392487092, 6)
    expect(r.totals.totalCash).toBeCloseTo(102_621.16439248709, 6)
  })

  it('reproduces the tile strings', () => {
    expect(r.tiles.total).toEqual({
      value: '$102,621',
      sub: 'Deposit $37,500 + costs $47,030 + moving $4,000 + buffer $14,092',
    })
    expect(r.tiles.deposit).toEqual({ value: '$37,500', sub: '5% of $750,000' })
    expect(r.tiles.costs).toEqual({ value: '$47,030', sub: '6.27% of price' })
    expect(r.tiles.loan).toEqual({ value: '$712,500', sub: 'LVR 95%' })
    expect(r.tiles.repayment).toEqual({
      value: '$4,364',
      sub: 'at 6.2% · assessed at 9.2%: $5,836/mo',
    })
  })

  it('produces the table rows in the original order', () => {
    expect(r.rows.map((row) => row.label)).toEqual([
      'Deposit',
      'Stamp duty (land transfer duty)',
      'Transfer registration fee',
      'Mortgage registration fee',
      'PEXA fees',
      'Lenders Mortgage Insurance (incl. 10% duty)',
      'Conveyancing incl. disbursements',
      'Building and pest inspection',
      'Lender fees',
      'Settlement adjustments',
      'Building insurance (first year)',
      'Purchase costs subtotal',
      'Moving and set-up',
      'Buffer',
      'Total cash before you bid',
    ])
    expect(r.rows[1].how).toBe('General duty $40,070 × ($750,000 − $600,000) ÷ $150,000')
    expect(r.rows[2].how).toBe('$104.30 + $2.34 × 750 (per $1,000), capped $3,614, rounded up')
    expect(r.rows[5].how).toBe('5% Deposit Scheme: government guarantees 15%, no LMI')
    expect(r.rows[13].how).toBe('3 × $4,364 + $1,000')
    expect(r.rows.filter((row) => row.emphasis).map((row) => row.label)).toEqual([
      'Purchase costs subtotal',
      'Total cash before you bid',
    ])
  })

  it('shows only the serviceability flag', () => {
    expect(r.flags).toEqual([
      {
        kind: 'ok',
        message:
          'Serviceability check: the lender will test $5,836/month at 9.2%. If that is more than about 35–40% of your after-tax income, expect the loan to be cut.',
      },
    ])
  })

  it('reports the deposit hint for the scheme', () => {
    expect(r.depositHint).toBe('Minimum 5% under the scheme')
  })

  it('does not mutate its input', () => {
    const original = inputs()
    const copy = { ...original }
    calculate(original)
    expect(original).toEqual(copy)
  })
})

describe('calculate — LMI route', () => {
  it('charges an interpolated premium at 8% deposit (LVR 92)', () => {
    const r = calculate(inputs({ route: 'lmi', depositPct: 8 }))
    expect(r.totals.lmiPremium).toBeCloseTo(22_390.5, 6)
    expect(r.totals.lmiCash).toBeCloseTo(22_390.5, 6)
    expect(r.totals.purchaseCosts).toBeCloseTo(69_420.14, 6)
    expect(r.totals.totalCash).toBeCloseTo(147_098.24783272436, 6)
    expect(r.rows[5].how).toBe(
      'Loan $690,000 × 2.95% (LVR 92%) × 1.10 Victorian insurance duty — indicative',
    )
    expect(r.flags[0]).toEqual({
      kind: 'note',
      message:
        'LVR above 90%: most lenders want 5% of the price as genuine savings held for 3+ months.',
    })
  })

  it('charges the table rate at 10% deposit (LVR 90) with no LVR flag', () => {
    const r = calculate(inputs({ route: 'lmi', depositPct: 10 }))
    expect(r.totals.lmiPremium).toBeCloseTo(16_706.25, 6)
    expect(r.totals.totalCash).toBeCloseTo(156_138.38679288252, 6)
    expect(r.flags.map((f) => f.kind)).toEqual(['ok'])
    expect(r.depositHint).toBe('Under 20%; LMI charged')
  })

  it('capitalises LMI into the loan when asked', () => {
    const r = calculate(inputs({ route: 'lmi', depositPct: 8, capitaliseLmi: true }))
    expect(r.totals.lmiCash).toBe(0)
    expect(r.totals.loan).toBeCloseTo(712_390.5, 6)
    expect(r.rows[5].amount).toBe(0)
    expect(r.rows[5].how).toBe(
      'Loan $690,000 × 2.95% (LVR 92%) × 1.10 Victorian insurance duty — indicative — capitalised into the loan',
    )
    expect(r.totals.totalCash).toBeCloseTo(125_119.15243189625, 6)
    expect(r.tiles.loan).toEqual({ value: '$712,391', sub: 'LVR 94.99%' })
  })

  it('applies LMI when the scheme price cap is exceeded', () => {
    const r = calculate(inputs({ price: 1_000_000 }))
    expect(r.flags[0]).toEqual({
      kind: 'warn',
      message:
        'Price is above the 5% Deposit Scheme cap of $950,000 for this region — the scheme is not available; LMI has been applied instead.',
    })
    expect(r.totals.lmiPremium).toBeCloseTo(41_800, 4)
  })
})

describe('calculate — Help to Buy', () => {
  it('takes 40% government equity on a new home', () => {
    const r = calculate(inputs({ route: 'htb', depositPct: 2, newHome: true, price: 700_000 }))
    expect(r.totals.deposit).toBe(14_000)
    expect(r.totals.governmentEquity).toBe(280_000)
    expect(r.totals.loan).toBe(406_000)
    expect(r.totals.totalCash).toBeCloseTo(48_015.84547838562, 6)
    expect(r.tiles.loan).toEqual({
      value: '$406,000',
      sub: 'LVR 58% · government equity $280,000',
    })
    expect(r.rows[5].how).toBe('Help to Buy: no LMI')
    expect(r.flags[0].message).toContain('Government share is 40%')
  })

  it('takes 30% government equity on an existing home', () => {
    const r = calculate(inputs({ route: 'htb', depositPct: 2 }))
    expect(r.totals.loan).toBe(510_000)
    expect(r.totals.totalCash).toBeCloseTo(76_400.41535462234, 6)
    expect(r.flags[0].message).toContain('Government share is 30%')
    expect(r.depositHint).toBe('Minimum 2% under Help to Buy')
  })
})

describe('calculate — foreign purchaser on the LMI route', () => {
  it('adds the 8% additional duty line', () => {
    const r = calculate(
      inputs({ route: 'lmi', depositPct: 10, foreignPurchaser: true, firstHomeBuyer: false }),
    )
    const fpad = r.rows[2]
    expect(fpad.label).toBe('Foreign purchaser additional duty')
    expect(fpad.amount).toBe(60_000)
    expect(fpad.how).toBe('8% × $750,000')
    expect(r.totals.purchaseCosts).toBeCloseTo(123_735.89, 6)
    expect(r.totals.totalCash).toBeCloseTo(216_138.38679288252, 6)
  })
})

describe('calculate — off-the-plan concession', () => {
  it('reduces dutiable value below the FHB exemption threshold', () => {
    const r = calculate(inputs({ offThePlanConstruction: 200_000 }))
    expect(r.totals.dutiableValue).toBe(550_000)
    expect(r.totals.stampDuty).toBe(0)
    expect(r.rows[1].how).toBe(
      'Off-the-plan: $750,000 − $200,000 construction = dutiable $550,000. First home buyer exemption: dutiable value $550,000 ≤ $600,000 → $0',
    )
    expect(r.totals.totalCash).toBeCloseTo(62_551.16439248709, 6)
  })
})

describe('calculate — First Home Owner Grant', () => {
  it('subtracts $10,000 for an eligible new home at $700k', () => {
    const r = calculate(inputs({ price: 700_000, newHome: true }))
    const grantRow = r.rows.find((row) => row.label === 'First Home Owner Grant')
    expect(grantRow).toBeDefined()
    expect(grantRow?.amount).toBe(-10_000)
    expect(grantRow?.formatted).toBe('−$10,000')
    expect(grantRow?.how).toBe(
      'New home ≤ $750,000, eligible first home buyer; usually applied at settlement',
    )
    expect(r.totals.grant).toBe(10_000)
    expect(r.totals.totalCash).toBeCloseTo(73_774.72943298795, 6)
  })

  it('flags a new home priced above $750k instead of granting', () => {
    const r = calculate(inputs({ price: 800_000, newHome: true }))
    expect(r.rows.some((row) => row.label === 'First Home Owner Grant')).toBe(false)
    expect(r.flags.some((f) => f.message === 'First Home Owner Grant not available: price above $750,000.')).toBe(true)
  })
})

describe('calculate — edge behaviours preserved from the original', () => {
  it('clamps a sub-minimum scheme deposit up to 5%', () => {
    const r = calculate(inputs({ depositPct: 3 }))
    expect(r.appliedDepositPct).toBe(5)
    expect(r.totals.deposit).toBe(37_500)
    expect(r.totals.totalCash).toBeCloseTo(102_621.16439248709, 6)
  })

  it('caps the transfer registration fee on expensive homes', () => {
    const r = calculate(
      inputs({ price: 1_600_000, route: 'lmi', depositPct: 20, firstHomeBuyer: false }),
    )
    expect(r.rows[2].amount).toBe(3614)
    expect(r.totals.totalCash).toBeCloseTo(445_232.4487331698, 6)
  })

  it('shows "No buffer" when buffer months is zero', () => {
    const r = calculate(inputs({ bufferMonths: 0 }))
    expect(r.totals.buffer).toBe(0)
    expect(r.rows[13].how).toBe('No buffer')
    expect(r.totals.totalCash).toBeCloseTo(88_529.64, 6)
  })

  it('handles a zero interest rate without dividing by zero', () => {
    const r = calculate(inputs({ interestRatePct: 0 }))
    expect(r.totals.monthlyRepayment).toBeCloseTo(1979.1666666666667, 6)
    expect(r.tiles.repayment).toEqual({
      value: '$1,979',
      sub: 'at 0% · assessed at 3%: $3,004/mo',
    })
  })
})
