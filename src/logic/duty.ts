import {
  dutyFromBrackets,
  FHB_CONCESSION_BAND,
  FHB_CONCESSION_CEILING,
  FHB_EXEMPTION_CEILING,
  firstHomeConcessionApplies,
  FOREIGN_PURCHASER_DUTY_RATE,
  GENERAL_DUTY_BRACKETS,
  PPR_CONCESSION_CEILING,
  PPR_DUTY_BRACKETS,
} from '../data/rates'
import type { DutyHowCode, OffThePlanHow } from '../types/calculator'

// The rates themselves live in `data/rates.ts`, versioned and carrying the
// date they were last checked against the State Revenue Office. This file
// applies them; it states none of its own.

// Victorian land transfer duty, general rates.
export function generalDuty(dutiableValue: number): number {
  return dutyFromBrackets(dutiableValue, GENERAL_DUTY_BRACKETS)
}

// Principal-place-of-residence concession rates, used up to
// PPR_CONCESSION_CEILING.
export function pprDuty(dutiableValue: number): number {
  return dutyFromBrackets(dutiableValue, PPR_DUTY_BRACKETS)
}

export function foreignPurchaserDuty(dutiableValue: number): number {
  return dutiableValue * FOREIGN_PURCHASER_DUTY_RATE
}

export interface StampDutyInput {
  price: number
  offThePlanConstruction: number
  firstHomeBuyer: boolean
  ownerOccupier: boolean
  foreignPurchaser: boolean
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
  const { price, firstHomeBuyer, ownerOccupier, foreignPurchaser } = input
  const otp = Math.min(input.offThePlanConstruction, price)
  const dutiableValue = Math.max(0, price - otp)
  // The eligibility rule lives with the thresholds in `data/rates.ts`: the
  // exemption and concession require at least one purchaser to be an
  // Australian citizen or permanent resident, and the home to be
  // owner-occupied. A foreign purchaser falls back to the PPR or general
  // rates — and still pays the foreign purchaser additional duty on top,
  // which the caller adds.
  const firstHomeConcessional = firstHomeConcessionApplies({
    firstHomeBuyer,
    ownerOccupier,
    foreignPurchaser,
  })
  const base =
    ownerOccupier && !firstHomeConcessional && dutiableValue <= PPR_CONCESSION_CEILING
      ? pprDuty(dutiableValue)
      : generalDuty(dutiableValue)
  let duty = base
  let code: DutyHowCode
  let params: Record<string, number> = { dutiableValue }
  if (firstHomeConcessional) {
    if (dutiableValue <= FHB_EXEMPTION_CEILING) {
      duty = 0
      code = 'dutyFhbExempt'
    } else if (dutiableValue <= FHB_CONCESSION_CEILING) {
      duty = (base * (dutiableValue - FHB_EXEMPTION_CEILING)) / FHB_CONCESSION_BAND
      code = 'dutyFhbConcession'
      params = { base, dutiableValue }
    } else {
      code = 'dutyFhbAboveCap'
    }
  } else if (ownerOccupier && dutiableValue <= PPR_CONCESSION_CEILING) {
    code = 'dutyPpr'
  } else {
    code = 'dutyGeneral'
  }
  const offThePlan: OffThePlanHow | null =
    otp > 0 ? { price, construction: otp, dutiableValue } : null
  return { dutiableValue, duty, how: { code, params, offThePlan } }
}
