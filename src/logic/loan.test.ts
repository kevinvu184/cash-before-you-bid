import { describe, expect, it } from 'vitest'
import { monthlyRepayment } from './loan'

describe('monthlyRepayment', () => {
  it('computes 30-year P&I repayments like the original pmt()', () => {
    expect(monthlyRepayment(712_500, 0.062)).toBeCloseTo(4363.841464162364, 6)
    expect(monthlyRepayment(712_500, 0.092)).toBeCloseTo(5835.764302891407, 6)
    expect(monthlyRepayment(675_000, 0.062)).toBeCloseTo(4134.165597627503, 6)
  })

  it('divides principal by 360 at a zero rate', () => {
    expect(monthlyRepayment(712_500, 0)).toBeCloseTo(1979.1666666666667, 6)
  })
})
