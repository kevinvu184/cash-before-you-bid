import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUTS } from '../data/defaults'
import type { CalculatorInputs, TableRow } from '../types/calculator'
import { BAND_ORDER, groupRowsByBand, rowBand } from './bands'
import { calculate } from './calculate'

const inputs = (overrides: Partial<CalculatorInputs> = {}): CalculatorInputs => ({
  ...DEFAULT_INPUTS,
  ...overrides,
})

const codesIn = (rows: readonly TableRow[]) => rows.map((row) => row.code)

describe('rowBand', () => {
  it('bands the lines a bidder pays before they know whether they own it', () => {
    expect(rowBand('buildingAndPest')).toBe('preAuction')
    expect(rowBand('conveyancing')).toBe('preAuction')
  })

  it('puts the deposit, and only the deposit, on auction day', () => {
    expect(rowBand('deposit')).toBe('auctionDay')
  })

  it('bands the statutory and lender lines at settlement, grant included', () => {
    for (const code of [
      'stampDuty',
      'foreignDuty',
      'transferFee',
      'mortgageFee',
      'pexaFees',
      'lmi',
      'lenderFees',
      'settlementAdjustments',
      'buildingInsurance',
      'grant',
    ] as const) {
      expect(rowBand(code)).toBe('atSettlement')
    }
  })

  it('keeps moving and the buffer as their own band rather than dropping them', () => {
    expect(rowBand('moving')).toBe('afterSettlement')
    expect(rowBand('buffer')).toBe('afterSettlement')
  })

  it('leaves the summary rows out of every band', () => {
    expect(rowBand('costsSubtotal')).toBeNull()
    expect(rowBand('total')).toBeNull()
  })
})

describe('groupRowsByBand', () => {
  const r = calculate(inputs())
  const groups = groupRowsByBand(r.rows)

  it('returns the bands in purchase order', () => {
    expect(groups.map((g) => g.band)).toEqual(BAND_ORDER)
  })

  it('places every row in exactly one band, and no summary row in any', () => {
    const placed = groups.flatMap((g) => codesIn(g.rows))
    expect(new Set(placed).size).toBe(placed.length)
    expect(placed).not.toContain('costsSubtotal')
    expect(placed).not.toContain('total')
    expect(placed.sort()).toEqual(
      r.rows
        .filter((row) => row.band !== null)
        .map((row) => row.code)
        .sort(),
    )
  })

  it('groups the default scenario as a bidder would meet it', () => {
    expect(groups.map((g) => codesIn(g.rows))).toEqual([
      ['conveyancing', 'buildingAndPest'],
      ['deposit'],
      ['stampDuty', 'transferFee', 'mortgageFee', 'pexaFees', 'lmi', 'lenderFees', 'settlementAdjustments', 'buildingInsurance'],
      ['moving', 'buffer'],
    ])
  })

  it('subtotals each band and, with them, reproduces the unchanged grand total', () => {
    const bySum = Object.fromEntries(groups.map((g) => [g.band, g.subtotal]))
    expect(bySum.preAuction).toBeCloseTo(2150, 6)
    expect(bySum.auctionDay).toBe(37_500)
    expect(bySum.atSettlement).toBeCloseTo(44_879.64, 6)
    expect(bySum.afterSettlement).toBeCloseTo(18_091.524392487092, 6)
    const sum = groups.reduce((acc, g) => acc + g.subtotal, 0)
    expect(sum).toBeCloseTo(r.totals.totalCash, 6)
  })

  it('reproduces the grand total across every route, deposit and eligibility mix', () => {
    const scenarios: Partial<CalculatorInputs>[] = [
      {},
      { route: 'lmi', depositPct: 8 },
      { route: 'lmi', depositPct: 8, capitaliseLmi: true },
      { route: 'nolmi', depositPct: 20 },
      { route: 'htb', depositPct: 2 },
      { newHome: true },
      { foreignPurchaser: true, firstHomeBuyer: false },
      { price: 0 },
      { bufferMonths: 0 },
    ]
    for (const scenario of scenarios) {
      const result = calculate(inputs(scenario))
      const sum = groupRowsByBand(result.rows).reduce((acc, g) => acc + g.subtotal, 0)
      expect(sum).toBeCloseTo(result.totals.totalCash, 6)
    }
  })

  it('keeps capitalised LMI out of the settlement cash, at zero rather than as a charge', () => {
    const plain = calculate(inputs({ route: 'lmi', depositPct: 8 }))
    const capitalised = calculate(inputs({ route: 'lmi', depositPct: 8, capitaliseLmi: true }))
    const settlement = (result: ReturnType<typeof calculate>) =>
      groupRowsByBand(result.rows).find((g) => g.band === 'atSettlement')
    const lmiRow = settlement(capitalised)?.rows.find((row) => row.code === 'lmi')

    expect(lmiRow?.amount).toBe(0)
    expect(capitalised.totals.lmiPremium).toBeGreaterThan(0)
    expect(settlement(capitalised)?.subtotal).toBeCloseTo(
      (settlement(plain)?.subtotal ?? 0) - plain.totals.lmiCash,
      6,
    )
  })

  it('drops a band with no rows rather than showing it empty', () => {
    const rows = calculate(inputs()).rows.filter((row) => row.band !== 'preAuction')
    expect(groupRowsByBand(rows).map((g) => g.band)).toEqual([
      'auctionDay',
      'atSettlement',
      'afterSettlement',
    ])
  })
})
