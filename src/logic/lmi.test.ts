import { describe, expect, it } from 'vitest'
import { lmiPremium, lmiRate } from './lmi'

describe('lmiRate', () => {
  it('is zero at 80% LVR or below', () => {
    expect(lmiRate(80)).toBe(0)
    expect(lmiRate(60)).toBe(0)
  })

  it('hits the table points exactly', () => {
    expect(lmiRate(81)).toBeCloseTo(0.004, 10)
    expect(lmiRate(85)).toBeCloseTo(0.012, 10)
    expect(lmiRate(90)).toBeCloseTo(0.0225, 10)
    expect(lmiRate(95)).toBeCloseTo(0.04, 10)
    expect(lmiRate(97)).toBeCloseTo(0.05, 10)
  })

  it('interpolates linearly between points', () => {
    expect(lmiRate(80.5)).toBeCloseTo(0.003, 10)
    expect(lmiRate(92)).toBeCloseTo(0.0295, 10)
  })

  it('plateaus at 5% above 97', () => {
    expect(lmiRate(98)).toBe(0.05)
  })
})

describe('lmiPremium', () => {
  it('multiplies loan × rate × 1.10 Victorian insurance duty', () => {
    expect(lmiPremium(675_000, 90)).toBeCloseTo(16_706.25, 6)
    expect(lmiPremium(690_000, 92)).toBeCloseTo(22_390.5, 6)
    expect(lmiPremium(600_000, 80)).toBe(0)
  })
})
