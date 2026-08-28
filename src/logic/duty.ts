import {
  DUTY_BAND_BASE,
  DUTY_BAND_THRESHOLD,
  FHB_DUTY_CONCESSION_CAP,
  FHB_DUTY_CONCESSION_RANGE,
  FHB_DUTY_EXEMPTION_CAP,
} from '../data/constants'
import type { DutyHowCode, OffThePlanHow } from '../types/calculator'

// Victorian land transfer duty, general rates. The third band's base and
// threshold come from constants because the above-cap explanation quotes them:
// a figure a sentence states and a figure the arithmetic uses must be the same
// figure, or the two can drift apart.
export function generalDuty(dutiableValue: number): number {
  if (dutiableValue <= 25_000) return dutiableValue * 0.014
  if (dutiableValue <= DUTY_BAND_THRESHOLD) return 350 + 0.024 * (dutiableValue - 25_000)
  if (dutiableValue <= 960_000) {
    return DUTY_BAND_BASE + 0.06 * (dutiableValue - DUTY_BAND_THRESHOLD)
  }
  if (dutiableValue <= 2_000_000) return 0.055 * dutiableValue
  return 110_000 + 0.065 * (dutiableValue - 2_000_000)
}

// Principal-place-of-residence concession rates, used up to $550k. Its first
// band happens to share the general rate's base and threshold today, but it is
// a separate rule that could be changed on its own, and no explanation quotes
// it — so the figures stay literal here rather than borrowing the constants.
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
  // The first home buyer exemption and concession require at least one
  // purchaser to be an Australian citizen or permanent resident. A foreign
  // purchaser falls back to the PPR or general rates — and still pays the
  // foreign purchaser additional duty on top, which the caller adds.
  const firstHomeConcessional = firstHomeBuyer && ownerOccupier && !foreignPurchaser
  const base =
    ownerOccupier && !firstHomeConcessional && dutiableValue <= 550_000
      ? pprDuty(dutiableValue)
      : generalDuty(dutiableValue)
  let duty = base
  let code: DutyHowCode
  let params: Record<string, number> = { dutiableValue }
  if (firstHomeConcessional) {
    if (dutiableValue <= FHB_DUTY_EXEMPTION_CAP) {
      duty = 0
      code = 'dutyFhbExempt'
    } else if (dutiableValue <= FHB_DUTY_CONCESSION_CAP) {
      duty = (base * (dutiableValue - FHB_DUTY_EXEMPTION_CAP)) / FHB_DUTY_CONCESSION_RANGE
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
