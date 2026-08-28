import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../data/defaults'
import type { CalculatorInputs } from '../types/calculator'
import { calculate } from './calculate'

// Expected values below were produced by running the original page's <script>
// verbatim against the same inputs. The result carries codes and numbers only;
// the UI owns the words.

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

  it('reproduces the tile data', () => {
    expect(r.tiles.total.value).toBeCloseTo(102_621.16439248709, 6)
    expect(r.tiles.total.deposit).toBe(37_500)
    expect(r.tiles.total.costs).toBeCloseTo(47_029.64, 6)
    expect(r.tiles.total.moving).toBe(4000)
    expect(r.tiles.total.buffer).toBeCloseTo(14_091.524392487092, 6)
    expect(r.tiles.deposit).toEqual({ value: 37_500, pct: 5, price: 750_000 })
    expect(r.tiles.costs.value).toBeCloseTo(47_029.64, 6)
    expect(r.tiles.costs.pctOfPrice).toBeCloseTo(6.270618666666667, 6)
    expect(r.tiles.loan.value).toBe(712_500)
    expect(r.tiles.loan.lvrPct).toBe(95)
    expect(r.tiles.loan.governmentEquity).toBe(0)
    expect(r.tiles.repayment.value).toBeCloseTo(4363.841464162364, 6)
    expect(r.tiles.repayment.ratePct).toBeCloseTo(6.2, 10)
    expect(r.tiles.repayment.assessedRatePct).toBeCloseTo(9.2, 10)
    expect(r.tiles.repayment.assessedValue).toBeCloseTo(5835.764302891407, 6)
  })

  it('produces the table rows in the original order', () => {
    expect(r.rows.map((row) => row.code)).toEqual([
      'deposit',
      'stampDuty',
      'transferFee',
      'mortgageFee',
      'pexaFees',
      'lmi',
      'conveyancing',
      'buildingAndPest',
      'lenderFees',
      'settlementAdjustments',
      'buildingInsurance',
      'costsSubtotal',
      'moving',
      'buffer',
      'total',
    ])
    expect(r.rows[1].how).toEqual({
      code: 'dutyFhbConcession',
      params: { base: 40_070, dutiableValue: 750_000 },
      offThePlan: null,
    })
    expect(r.rows[2].how).toEqual({ code: 'transferFee', params: { thousands: 750 } })
    expect(r.rows[5].how).toEqual({ code: 'lmiScheme' })
    expect(r.rows[13].how?.code).toBe('buffer')
    expect(r.rows[13].how?.params?.months).toBe(3)
    expect(r.rows[13].how?.params?.repayment).toBeCloseTo(4363.841464162364, 6)
    expect(r.rows.filter((row) => row.emphasis).map((row) => row.code)).toEqual([
      'costsSubtotal',
      'total',
    ])
  })

  it('shows only the serviceability flag', () => {
    expect(r.flags).toHaveLength(1)
    expect(r.flags[0].kind).toBe('ok')
    expect(r.flags[0].code).toBe('serviceability')
    expect(r.flags[0].params?.assessed).toBeCloseTo(5835.764302891407, 6)
    expect(r.flags[0].params?.ratePct).toBeCloseTo(9.2, 10)
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
    expect(r.rows[5].how).toEqual({
      code: 'lmiCharged',
      params: { loan: 690_000, ratePct: 2.95, lvrPct: 92 },
    })
    expect(r.flags[0]).toEqual({ kind: 'note', code: 'genuineSavings' })
  })

  it('charges the table rate at 10% deposit (LVR 90) with no LVR flag', () => {
    const r = calculate(inputs({ route: 'lmi', depositPct: 10 }))
    expect(r.totals.lmiPremium).toBeCloseTo(16_706.25, 6)
    expect(r.totals.totalCash).toBeCloseTo(156_138.38679288252, 6)
    expect(r.flags.map((f) => f.kind)).toEqual(['ok'])
  })

  it('capitalises LMI into the loan when asked', () => {
    const r = calculate(inputs({ route: 'lmi', depositPct: 8, capitaliseLmi: true }))
    expect(r.totals.lmiCash).toBe(0)
    expect(r.totals.loan).toBeCloseTo(712_390.5, 6)
    expect(r.rows[5].amount).toBe(0)
    expect(r.rows[5].how).toEqual({
      code: 'lmiChargedCapitalised',
      params: { loan: 690_000, ratePct: 2.95, lvrPct: 92 },
    })
    expect(r.totals.totalCash).toBeCloseTo(125_119.15243189625, 6)
    expect(r.tiles.loan.value).toBeCloseTo(712_390.5, 6)
    expect(r.tiles.loan.lvrPct).toBeCloseTo(94.9854, 4)
    expect(r.totals.lvrPct).toBeCloseTo(94.9854, 4)
  })

  it('applies LMI when the scheme price cap is exceeded', () => {
    const r = calculate(inputs({ price: 1_000_000 }))
    expect(r.flags[0]).toEqual({
      kind: 'warn',
      code: 'schemeCapExceeded',
      params: { cap: 950_000 },
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
    expect(r.tiles.loan.value).toBe(406_000)
    expect(r.tiles.loan.lvrPct).toBeCloseTo(58, 10)
    expect(r.tiles.loan.governmentEquity).toBe(280_000)
    expect(r.rows[5].how).toEqual({ code: 'lmiHtb' })
    const details = r.flags.find((f) => f.code === 'htbDetails')
    expect(details?.params?.sharePct).toBeCloseTo(40, 10)
  })

  it('takes 30% government equity on an existing home', () => {
    const r = calculate(inputs({ route: 'htb', depositPct: 2 }))
    expect(r.totals.loan).toBe(510_000)
    expect(r.totals.totalCash).toBeCloseTo(76_400.41535462234, 6)
    const details = r.flags.find((f) => f.code === 'htbDetails')
    expect(details?.params?.sharePct).toBeCloseTo(30, 10)
  })
})

describe('calculate — foreign purchaser on the LMI route', () => {
  it('adds the 8% additional duty line', () => {
    const r = calculate(
      inputs({ route: 'lmi', depositPct: 10, foreignPurchaser: true, firstHomeBuyer: false }),
    )
    const fpad = r.rows[2]
    expect(fpad.code).toBe('foreignDuty')
    expect(fpad.amount).toBe(60_000)
    expect(fpad.how).toEqual({ code: 'foreignDuty', params: { dutiableValue: 750_000 } })
    expect(r.totals.purchaseCosts).toBeCloseTo(123_735.89, 6)
    expect(r.totals.totalCash).toBeCloseTo(216_138.38679288252, 6)
  })

  // The FHB exemption needs an Australian citizen or permanent resident, so
  // the same $600k purchase is exempt for a citizen and charged in full here.
  it('withholds the first home buyer exemption and flags why', () => {
    const withForeign = inputs({ price: 600_000, route: 'lmi', depositPct: 10 })
    const r = calculate({ ...withForeign, foreignPurchaser: true })
    expect(r.totals.stampDuty).toBeCloseTo(31_070, 6)
    expect(r.rows[1].how?.code).toBe('dutyGeneral')
    expect(r.rows[2].code).toBe('foreignDuty')
    expect(r.rows[2].amount).toBeCloseTo(48_000, 6)
    expect(r.flags.some((f) => f.kind === 'warn' && f.code === 'fhbResidency')).toBe(true)
    expect(calculate(withForeign).totals.stampDuty).toBe(0)
  })
})

describe('calculate — off-the-plan concession', () => {
  it('reduces dutiable value below the FHB exemption threshold', () => {
    const r = calculate(inputs({ offThePlanConstruction: 200_000 }))
    expect(r.totals.dutiableValue).toBe(550_000)
    expect(r.totals.stampDuty).toBe(0)
    expect(r.rows[1].how).toEqual({
      code: 'dutyFhbExempt',
      params: { dutiableValue: 550_000 },
      offThePlan: { price: 750_000, construction: 200_000, dutiableValue: 550_000 },
    })
    expect(r.totals.totalCash).toBeCloseTo(62_551.16439248709, 6)
  })
})

describe('calculate — First Home Owner Grant', () => {
  it('subtracts $10,000 for an eligible new home at $700k', () => {
    const r = calculate(inputs({ price: 700_000, newHome: true }))
    const grantRow = r.rows.find((row) => row.code === 'grant')
    expect(grantRow).toBeDefined()
    expect(grantRow?.amount).toBe(-10_000)
    expect(grantRow?.how).toEqual({ code: 'grant' })
    expect(r.totals.grant).toBe(10_000)
    expect(r.totals.totalCash).toBeCloseTo(73_774.72943298795, 6)
  })

  it('flags a new home priced above $750k instead of granting', () => {
    const r = calculate(inputs({ price: 800_000, newHome: true }))
    expect(r.rows.some((row) => row.code === 'grant')).toBe(false)
    expect(r.flags.some((f) => f.code === 'fhogPriceCap')).toBe(true)
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

  it('emits the no-buffer code when buffer months is zero', () => {
    const r = calculate(inputs({ bufferMonths: 0 }))
    expect(r.totals.buffer).toBe(0)
    expect(r.rows[13].how).toEqual({ code: 'noBuffer' })
    expect(r.totals.totalCash).toBeCloseTo(88_529.64, 6)
  })

  it('handles a cleared (zero) price like the original', () => {
    const r = calculate(inputs({ price: 0 }))
    expect(r.totals.deposit).toBe(0)
    expect(r.totals.loan).toBe(0)
    expect(r.totals.lvrPct).toBe(0)
    expect(r.totals.purchaseCosts).toBeCloseTo(5001.3, 6)
    expect(r.totals.buffer).toBe(1000)
    expect(r.totals.totalCash).toBeCloseTo(10_001.3, 6)
    // No price to take a share of; the tile sub goes blank.
    expect(r.tiles.costs.pctOfPrice).toBeNull()
    // The original renders exactly NaN% LVR for a zero price; preserved on
    // purpose as data.
    expect(r.tiles.loan.value).toBe(0)
    expect(Number.isNaN(r.tiles.loan.lvrPct)).toBe(true)
  })

  it('handles a zero interest rate without dividing by zero', () => {
    const r = calculate(inputs({ interestRatePct: 0 }))
    expect(r.totals.monthlyRepayment).toBeCloseTo(1979.1666666666667, 6)
    expect(r.tiles.repayment.value).toBeCloseTo(1979.1666666666667, 6)
    expect(r.tiles.repayment.ratePct).toBe(0)
    expect(r.tiles.repayment.assessedRatePct).toBeCloseTo(3, 10)
    expect(r.tiles.repayment.assessedValue).toBeCloseTo(3003.928740322374, 6)
  })
})
