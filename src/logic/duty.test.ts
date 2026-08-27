import { describe, expect, it } from 'vitest'
import { foreignPurchaserDuty, generalDuty, pprDuty, stampDuty } from './duty'

describe('generalDuty', () => {
  it('applies the Victorian general rate brackets', () => {
    expect(generalDuty(20_000)).toBeCloseTo(280, 6)
    expect(generalDuty(25_000)).toBeCloseTo(350, 6)
    expect(generalDuty(100_000)).toBeCloseTo(2150, 6)
    expect(generalDuty(130_000)).toBeCloseTo(2870, 6)
    expect(generalDuty(750_000)).toBeCloseTo(40_070, 6)
    expect(generalDuty(900_000)).toBeCloseTo(49_070, 6)
    expect(generalDuty(1_600_000)).toBeCloseTo(88_000, 6)
    expect(generalDuty(2_000_000)).toBeCloseTo(110_000, 6)
    expect(generalDuty(2_500_000)).toBeCloseTo(142_500, 6)
  })
})

describe('pprDuty', () => {
  it('applies the owner-occupier concession brackets', () => {
    expect(pprDuty(100_000)).toBeCloseTo(2150, 6)
    expect(pprDuty(440_000)).toBeCloseTo(18_370, 6)
    expect(pprDuty(500_000)).toBeCloseTo(21_970, 6)
    expect(pprDuty(550_000)).toBeCloseTo(24_970, 6)
  })
})

describe('foreignPurchaserDuty', () => {
  it('is 8% of the dutiable value', () => {
    expect(foreignPurchaserDuty(750_000)).toBeCloseTo(60_000, 6)
  })
})

describe('stampDuty', () => {
  const base = { offThePlanConstruction: 0, firstHomeBuyer: true, ownerOccupier: true }

  it('exempts first home buyers up to $600k', () => {
    const r = stampDuty({ ...base, price: 550_000 })
    expect(r.duty).toBe(0)
    expect(r.how).toBe('First home buyer exemption: dutiable value $550,000 ≤ $600,000 → $0')
  })

  it('phases the concession out between $600k and $750k', () => {
    const r = stampDuty({ ...base, price: 700_000 })
    expect(r.duty).toBeCloseTo(24_713.333333333332, 6)
    expect(r.how).toBe('General duty $37,070 × ($700,000 − $600,000) ÷ $150,000')
    expect(stampDuty({ ...base, price: 750_000 }).duty).toBeCloseTo(40_070, 6)
  })

  it('charges full general duty above $750k for first home buyers', () => {
    const r = stampDuty({ ...base, price: 800_000 })
    expect(r.duty).toBeCloseTo(43_070, 6)
    expect(r.how).toBe('Above $750,000: no first home concession. $2,870 + 6% × ($800,000 − $130,000)')
  })

  it('uses PPR concession rates for non-FHB owner-occupiers up to $550k', () => {
    const r = stampDuty({ ...base, firstHomeBuyer: false, price: 500_000 })
    expect(r.duty).toBeCloseTo(21_970, 6)
    expect(r.how).toBe('PPR concession rate on $500,000')
  })

  it('uses general rates for non-owner-occupiers', () => {
    const r = stampDuty({ ...base, firstHomeBuyer: false, ownerOccupier: false, price: 500_000 })
    expect(r.duty).toBeCloseTo(25_070, 6)
    expect(r.how).toBe('General rate on $500,000')
  })

  it('reduces dutiable value by off-the-plan construction and explains it', () => {
    const r = stampDuty({ ...base, price: 750_000, offThePlanConstruction: 200_000 })
    expect(r.dutiableValue).toBe(550_000)
    expect(r.duty).toBe(0)
    expect(r.how).toBe(
      'Off-the-plan: $750,000 − $200,000 construction = dutiable $550,000. First home buyer exemption: dutiable value $550,000 ≤ $600,000 → $0',
    )
  })

  it('caps the construction deduction at the price', () => {
    const r = stampDuty({ ...base, price: 300_000, offThePlanConstruction: 400_000 })
    expect(r.dutiableValue).toBe(0)
    expect(r.duty).toBe(0)
  })

  it('does not mutate its input', () => {
    const input = { ...base, price: 750_000 }
    const copy = { ...input }
    stampDuty(input)
    expect(input).toEqual(copy)
  })
})
