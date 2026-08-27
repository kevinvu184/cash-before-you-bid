import { describe, expect, it } from 'vitest'
import { mortgageRegistrationFee, pexaFees, transferRegistrationFee } from './fees'

describe('transferRegistrationFee', () => {
  it('charges $104.30 + $2.34 per whole $1,000, rounded up', () => {
    expect(transferRegistrationFee(750_000)).toBe(1860)
    expect(transferRegistrationFee(700_000)).toBe(1743)
    expect(transferRegistrationFee(500_000)).toBe(1275)
  })

  it('caps at $3,614', () => {
    expect(transferRegistrationFee(1_600_000)).toBe(3614)
  })
})

describe('mortgageRegistrationFee', () => {
  it('is $129.20 when there is a loan, otherwise nothing', () => {
    expect(mortgageRegistrationFee(712_500)).toBe(129.2)
    expect(mortgageRegistrationFee(0)).toBe(0)
  })
})

describe('pexaFees', () => {
  it('adds the mortgage fee only when there is a loan', () => {
    expect(pexaFees(712_500)).toBeCloseTo(220.44, 6)
    expect(pexaFees(0)).toBeCloseTo(146.3, 6)
  })
})
