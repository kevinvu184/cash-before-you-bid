import { describe, expect, it } from 'vitest'
import { firstHomeOwnerGrant } from './grant'

describe('firstHomeOwnerGrant', () => {
  const eligible = {
    firstHomeBuyer: true,
    newHome: true,
    ownerOccupier: true,
    price: 700_000,
    foreignPurchaser: false,
  }

  it('pays $10,000 for eligible first home buyers of new homes to $750k', () => {
    expect(firstHomeOwnerGrant(eligible)).toBe(10_000)
    expect(firstHomeOwnerGrant({ ...eligible, price: 750_000 })).toBe(10_000)
  })

  it('pays nothing above the price cap', () => {
    expect(firstHomeOwnerGrant({ ...eligible, price: 750_001 })).toBe(0)
  })

  it('requires new home, FHB, owner-occupier, and non-foreign status', () => {
    expect(firstHomeOwnerGrant({ ...eligible, newHome: false })).toBe(0)
    expect(firstHomeOwnerGrant({ ...eligible, firstHomeBuyer: false })).toBe(0)
    expect(firstHomeOwnerGrant({ ...eligible, ownerOccupier: false })).toBe(0)
    expect(firstHomeOwnerGrant({ ...eligible, foreignPurchaser: true })).toBe(0)
  })
})
