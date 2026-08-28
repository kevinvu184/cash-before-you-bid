import { describe, expect, it } from 'vitest'
import type { RowCode, TableRow } from '../types/calculator'
import { PRE_AUCTION_ROWS, PROPERTIES_MAX, clampProperties, sunkCost } from './sunkCost'

const row = (code: RowCode, amount: number): TableRow => ({ code, amount, how: null, emphasis: false })

// Every row the calculator can emit, each with a distinct amount, so a stray
// inclusion shows up as a wrong total rather than an ambiguous one.
const ALL_ROWS: TableRow[] = [
  row('deposit', 37_500),
  row('stampDuty', 40_070),
  row('foreignDuty', 60_000),
  row('transferFee', 1859),
  row('mortgageFee', 129.2),
  row('pexaFees', 220.44),
  row('lmi', 12_000),
  row('conveyancing', 1600),
  row('buildingAndPest', 550),
  row('lenderFees', 300),
  row('settlementAdjustments', 800),
  row('buildingInsurance', 1500),
  row('grant', -10_000),
  row('costsSubtotal', 47_029.64),
  row('moving', 4000),
  row('buffer', 14_091.52),
  row('total', 102_621.16),
]

describe('sunkCost — which rows are pre-auction', () => {
  it('sums only the inspection and conveyancing rows', () => {
    expect(sunkCost(ALL_ROWS, 1).perProperty).toBe(2150)
  })

  it('leaves the deposit, duty, government fees, LMI and settlement costs alone', () => {
    // The proof that the multiplier cannot reach them: multiplying the search
    // out to the maximum moves the total by the pre-auction rows only.
    const one = sunkCost(ALL_ROWS, 1)
    const many = sunkCost(ALL_ROWS, PROPERTIES_MAX)
    expect(many.expectedTotal - one.expectedTotal).toBe(2150 * (PROPERTIES_MAX - 1))

    const untouched: RowCode[] = [
      'deposit',
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
      'moving',
      'buffer',
      'costsSubtotal',
      'total',
    ]
    for (const code of untouched) {
      expect(PRE_AUCTION_ROWS.has(code)).toBe(false)
      // Dropping the row entirely changes nothing the multiplier reports.
      const without = ALL_ROWS.filter((r) => r.code !== code)
      expect(sunkCost(without, 6)).toEqual(sunkCost(ALL_ROWS, 6))
    }
  })

  it('ignores rows the calculator did not emit', () => {
    expect(sunkCost([row('buildingAndPest', 550)], 1).perProperty).toBe(550)
    expect(sunkCost([], 4)).toEqual({
      perProperty: 0,
      properties: 4,
      expectedTotal: 0,
      onPropertiesNotWon: 0,
    })
  })
})

describe('sunkCost — the multiplier', () => {
  it('reports the per-property figure and the whole-search figure', () => {
    expect(sunkCost(ALL_ROWS, 5)).toEqual({
      perProperty: 2150,
      properties: 5,
      expectedTotal: 10_750,
      onPropertiesNotWon: 8600,
    })
  })

  it('costs nothing extra at the default of one property', () => {
    const one = sunkCost(ALL_ROWS, 1)
    expect(one.expectedTotal).toBe(one.perProperty)
    expect(one.onPropertiesNotWon).toBe(0)
  })

  it('honours a fractional expected count', () => {
    expect(sunkCost(ALL_ROWS, 2.5).expectedTotal).toBe(5375)
  })
})

describe('clampProperties', () => {
  it('holds the count between one and the maximum', () => {
    expect(clampProperties(0)).toBe(1)
    expect(clampProperties(-4)).toBe(1)
    expect(clampProperties(1)).toBe(1)
    expect(clampProperties(7)).toBe(7)
    expect(clampProperties(PROPERTIES_MAX)).toBe(PROPERTIES_MAX)
    expect(clampProperties(1000)).toBe(PROPERTIES_MAX)
  })

  it('falls back to one for a cleared or invalid field', () => {
    expect(clampProperties(Number.NaN)).toBe(1)
    expect(clampProperties(Number.POSITIVE_INFINITY)).toBe(1)
  })

  it('is applied by sunkCost before multiplying', () => {
    expect(sunkCost(ALL_ROWS, 0).expectedTotal).toBe(2150)
    expect(sunkCost(ALL_ROWS, Number.NaN).properties).toBe(1)
  })
})
