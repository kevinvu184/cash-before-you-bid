import {
  MORTGAGE_REGISTRATION_FEE,
  PEXA_MORTGAGE_FEE,
  PEXA_TRANSFER_FEE,
  TRANSFER_FEE_BASE,
  TRANSFER_FEE_CAP,
  TRANSFER_FEE_PER_THOUSAND,
} from '../data/constants'

export function transferRegistrationFee(price: number): number {
  return Math.min(
    TRANSFER_FEE_CAP,
    Math.ceil(TRANSFER_FEE_BASE + TRANSFER_FEE_PER_THOUSAND * Math.floor(price / 1000)),
  )
}

export function mortgageRegistrationFee(loan: number): number {
  return loan > 0 ? MORTGAGE_REGISTRATION_FEE : 0
}

export function pexaFees(loan: number): number {
  return PEXA_TRANSFER_FEE + (loan > 0 ? PEXA_MORTGAGE_FEE : 0)
}
