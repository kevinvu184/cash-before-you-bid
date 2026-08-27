import type { DutyHowCode, OffThePlanHow } from '../types/calculator'

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

// The working is data — a code plus the numbers that go into it — so the UI
// can render it in the active language. Display text never originates here.
export interface StampDutyHow {
  code: DutyHowCode
  params: Readonly<Record<string, number>>
  offThePlan: OffThePlanHow | null
}

export interface StampDutyResult {
  dutiableValue: number
  duty: number
  how: StampDutyHow
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
  let code: DutyHowCode
  let params: Record<string, number> = { dutiableValue }
  if (firstHomeBuyer && ownerOccupier) {
    if (dutiableValue <= 600_000) {
      duty = 0
      code = 'dutyFhbExempt'
    } else if (dutiableValue <= 750_000) {
      duty = (base * (dutiableValue - 600_000)) / 150_000
      code = 'dutyFhbConcession'
      params = { base, dutiableValue }
    } else {
      code = 'dutyFhbAboveCap'
    }
  } else if (ownerOccupier && dutiableValue <= 550_000) {
    code = 'dutyPpr'
  } else {
    code = 'dutyGeneral'
  }
  const offThePlan: OffThePlanHow | null =
    otp > 0 ? { price, construction: otp, dutiableValue } : null
  return { dutiableValue, duty, how: { code, params, offThePlan } }
}
