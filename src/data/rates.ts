/**
 * Versioned Victorian rate config.
 *
 * Every statutory figure the calculator prints originates here or in
 * `constants.ts` beside it, so a reader can trace a number on screen to a
 * dated source and check it themselves. Nothing in this file is derived and
 * nothing is a guess: each block names what it was checked against.
 *
 * ## The as-at date
 *
 * `RATES_AS_AT` is the day every figure in this file *and* in `constants.ts`
 * was last confirmed against its source. It is rendered in the interface
 * beside a link to the State Revenue Office calculator — a date kept only in
 * a code comment tells the user nothing. **Move it when, and only when, you
 * have re-checked the figures**: a fresher date over a stale number is worse
 * than no date at all.
 *
 * ## The rounding rule (the one statement of it; other tickets cite this)
 *
 * Round **conservatively**, which means the direction depends on what the
 * figure is for:
 *
 * - **Costs and cash requirements round UP.** An under-estimate of what a
 *   buyer needs is the failure this tool exists to prevent — an auction
 *   purchase is unconditional, so being short on the day is not recoverable.
 * - **A safe maximum bid rounds DOWN.** The same instinct applied backwards
 *   would be a bug: rounding a bid ceiling up hands the user a number they
 *   cannot actually afford.
 *
 * So the rule is *not* "always round up". It is: round in whichever direction
 * leaves the user with more margin, never less. Display rounding lives in
 * `logic/rounding.ts`, which rounds half-up to a display unit — a presentation
 * concern applied to figures already computed at full precision, and separate
 * from this rule, which governs which way a *derived* figure is taken when it
 * has to move.
 */

/**
 * The day the figures in this file and in `constants.ts` were last verified
 * against the State Revenue Office and Land Services Victoria. ISO-8601, so
 * each locale formats it its own way.
 */
export const RATES_AS_AT = '2026-08-28'

/** Where a reader checks a duty figure for themselves. */
export const SRO_DUTY_CALCULATOR_URL =
  'https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/land-transfer-stamp-duty-calculator'

/**
 * One row of a duty rate table: `base` dollars plus `rate` of the dutiable
 * value above `over`, applying to values up to and including `upTo`. The top
 * row of a table carries `upTo: null`.
 *
 * The two-part shape covers both forms the SRO tables use: the usual
 * "$2,870 plus 6% of the excess over $130,000" row, and the flat
 * "5.5% of the dutiable value" row, which is `base: 0` with `over: 0`.
 */
export interface DutyBracket {
  /** Inclusive upper bound of the bracket; null on the top bracket. */
  upTo: number | null
  base: number
  rate: number
  /** The value the excess is measured from. */
  over: number
}

/**
 * General land transfer duty rates — the rates that apply when no concession
 * does. Source: State Revenue Office, "Land transfer duty – non-principal
 * place of residence (current rates)", for contracts entered into on or after
 * 1 July 2021.
 */
export const GENERAL_DUTY_BRACKETS: readonly DutyBracket[] = [
  { upTo: 25_000, base: 0, rate: 0.014, over: 0 },
  { upTo: 130_000, base: 350, rate: 0.024, over: 25_000 },
  { upTo: 960_000, base: 2870, rate: 0.06, over: 130_000 },
  // The $960k–$2m band is a flat percentage of the whole value, not of an
  // excess — hence base 0 and over 0.
  { upTo: 2_000_000, base: 0, rate: 0.055, over: 0 },
  { upTo: null, base: 110_000, rate: 0.065, over: 2_000_000 },
]

/**
 * Principal-place-of-residence concession rates. Source: State Revenue
 * Office, "Land transfer duty – principal place of residence (current
 * rates)", for contracts entered into on or after 6 May 2008. The first two
 * bands are the general ones; the concession is in the two above $130,000.
 */
export const PPR_DUTY_BRACKETS: readonly DutyBracket[] = [
  { upTo: 25_000, base: 0, rate: 0.014, over: 0 },
  { upTo: 130_000, base: 350, rate: 0.024, over: 25_000 },
  { upTo: 440_000, base: 2870, rate: 0.05, over: 130_000 },
  { upTo: null, base: 18_370, rate: 0.06, over: 440_000 },
]

/**
 * The PPR concession applies only up to this dutiable value; above it an
 * owner-occupier pays the general rates.
 */
export const PPR_CONCESSION_CEILING = 550_000

/**
 * First home buyer duty exemption and concession. Source: State Revenue
 * Office, "First home buyer duty exemption or concession": no duty up to
 * $600,000, and a reduced amount from $600,001 to $750,000.
 *
 * The concession is the duty otherwise payable, scaled by how far into the
 * band the dutiable value sits — so it is nil at the exemption ceiling and
 * full duty at the concession ceiling.
 */
export const FHB_EXEMPTION_CEILING = 600_000
export const FHB_CONCESSION_CEILING = 750_000
/** The width of the phase-out band, which the scaling divides by. */
export const FHB_CONCESSION_BAND = FHB_CONCESSION_CEILING - FHB_EXEMPTION_CEILING

/**
 * Eligibility for the first home buyer exemption and concession, recorded
 * beside the numbers because it decides whether they apply at all.
 *
 * The State Revenue Office requires that at least one purchaser be an
 * Australian citizen or permanent resident. A foreign purchaser therefore
 * gets neither the exemption nor the concession: they fall back to the PPR or
 * general rates, and still pay foreign purchaser additional duty on top.
 */
export const FHB_ELIGIBILITY = {
  /** At least one purchaser must be an Australian citizen or permanent resident. */
  requiresCitizenOrPermanentResident: true,
  /** The property must be the purchaser's principal place of residence. */
  requiresOwnerOccupier: true,
} as const

/** What the eligibility rule above is decided from. */
export interface PurchaserStatus {
  firstHomeBuyer: boolean
  ownerOccupier: boolean
  foreignPurchaser: boolean
}

/**
 * Whether this purchaser gets the first home buyer exemption or concession.
 * The rule is stated once, here, beside the thresholds it gates, so nothing
 * downstream has to restate which conditions the concession carries.
 */
export function firstHomeConcessionApplies(purchaser: PurchaserStatus): boolean {
  if (!purchaser.firstHomeBuyer) return false
  if (FHB_ELIGIBILITY.requiresOwnerOccupier && !purchaser.ownerOccupier) return false
  if (FHB_ELIGIBILITY.requiresCitizenOrPermanentResident && purchaser.foreignPurchaser) {
    return false
  }
  return true
}

/**
 * Foreign purchaser additional duty, charged on the dutiable value on top of
 * the duty above. Source: State Revenue Office, "Foreign purchaser additional
 * duty (current rates)": 8% for agreements entered into on or after
 * 1 July 2019.
 */
export const FOREIGN_PURCHASER_DUTY_RATE = 0.08

/**
 * Duty from a rate table: the first bracket whose ceiling the value does not
 * exceed. The top bracket has no ceiling, so the search always terminates.
 */
export function dutyFromBrackets(
  dutiableValue: number,
  brackets: readonly DutyBracket[],
): number {
  for (const bracket of brackets) {
    if (bracket.upTo === null || dutiableValue <= bracket.upTo) {
      return bracket.base + bracket.rate * (dutiableValue - bracket.over)
    }
  }
  // Unreachable while a table ends in `upTo: null`; a table that does not is a
  // config error, and returning 0 duty would understate the cost.
  throw new Error('Duty rate table has no open-ended top bracket')
}
