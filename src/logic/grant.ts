import { FHOG_AMOUNT, FHOG_PRICE_CAP } from '../data/constants'

export interface GrantInput {
  firstHomeBuyer: boolean
  newHome: boolean
  ownerOccupier: boolean
  price: number
  foreignPurchaser: boolean
}

export function firstHomeOwnerGrant(input: GrantInput): number {
  const eligible =
    input.firstHomeBuyer &&
    input.newHome &&
    input.ownerOccupier &&
    input.price <= FHOG_PRICE_CAP &&
    !input.foreignPurchaser
  return eligible ? FHOG_AMOUNT : 0
}
