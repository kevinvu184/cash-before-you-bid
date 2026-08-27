import { formatMoney } from './format'

// Victorian land transfer duty, general rates.
export function generalDuty(dutiableValue: number): number {
  if (dutiableValue <= 25_000) return dutiableValue * 0.014
  if (dutiableValue <= 130_000) return 350 + 0.024 * (dutiableValue - 25_000)
  if (dutiableValue <= 960_000) return 2870 + 0.06 * (dutiableValue - 130_000)
  if (dutiableValue <= 2_000_000) return 0.055 * dutiableValue
  return 110_000 + 0.065 * (dutiableValue - 2_000_000)
}

// Principal-place-of-residence concession rates, used up to $550k.
export function pprDuty(dutiableValue: number): number {
  if (dutiableValue <= 130_000) return generalDuty(dutiableValue)
  if (dutiableValue <= 440_000) return 2870 + 0.05 * (dutiableValue - 130_000)
  return 18_370 + 0.06 * (dutiableValue - 440_000)
}

export function foreignPurchaserDuty(dutiableValue: number): number {
  return dutiableValue * 0.08
}

export interface StampDutyInput {
  price: number
  offThePlanConstruction: number
  firstHomeBuyer: boolean
  ownerOccupier: boolean
}

export interface StampDutyResult {
  dutiableValue: number
  duty: number
  how: string
}

export function stampDuty(input: StampDutyInput): StampDutyResult {
  const { price, firstHomeBuyer, ownerOccupier } = input
  const otp = Math.min(input.offThePlanConstruction, price)
  const dutiableValue = Math.max(0, price - otp)
  const base =
    ownerOccupier && !firstHomeBuyer && dutiableValue <= 550_000
      ? pprDuty(dutiableValue)
      : generalDuty(dutiableValue)
  let duty = base
  let how: string
  if (firstHomeBuyer && ownerOccupier) {
    if (dutiableValue <= 600_000) {
      duty = 0
      how = `First home buyer exemption: dutiable value ${formatMoney(dutiableValue)} ≤ $600,000 → $0`
    } else if (dutiableValue <= 750_000) {
      duty = (base * (dutiableValue - 600_000)) / 150_000
      how = `General duty ${formatMoney(base)} × (${formatMoney(dutiableValue)} − $600,000) ÷ $150,000`
    } else {
      how = `Above $750,000: no first home concession. $2,870 + 6% × (${formatMoney(dutiableValue)} − $130,000)`
    }
  } else if (ownerOccupier && dutiableValue <= 550_000) {
    how = `PPR concession rate on ${formatMoney(dutiableValue)}`
  } else {
    how = `General rate on ${formatMoney(dutiableValue)}`
  }
  if (otp > 0) {
    how = `Off-the-plan: ${formatMoney(price)} − ${formatMoney(otp)} construction = dutiable ${formatMoney(dutiableValue)}. ${how}`
  }
  return { dutiableValue, duty, how }
}
