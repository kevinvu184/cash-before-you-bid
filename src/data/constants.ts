import type { DepositRoute, Region } from '../types/calculator'

// Rules as at 25 Aug 2026, matching the source page.
export const SCHEME_PRICE_CAPS: Record<Region, number> = {
  metro: 950_000,
  regional: 650_000,
}

// [LVR %, premium as fraction of the loan] — Helia-derived indicative points.
export const LMI_RATE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [80, 0.002],
  [81, 0.004],
  [85, 0.012],
  [90, 0.0225],
  [95, 0.04],
  [97, 0.05],
]
// 10% Victorian insurance duty on the LMI premium.
export const LMI_DUTY_MULTIPLIER = 1.1

// Land Services Victoria 2026-27 and PEXA FY27 fees.
export const TRANSFER_FEE_BASE = 104.3
export const TRANSFER_FEE_PER_THOUSAND = 2.34
export const TRANSFER_FEE_CAP = 3614
export const MORTGAGE_REGISTRATION_FEE = 129.2
export const PEXA_TRANSFER_FEE = 146.3
export const PEXA_MORTGAGE_FEE = 74.14

// First home buyer duty concession (Victoria): nothing to pay up to the
// exemption cap, then the general duty tapered across the range above it.
export const FHB_DUTY_EXEMPTION_CAP = 600_000
export const FHB_DUTY_CONCESSION_CAP = 750_000
export const FHB_DUTY_CONCESSION_RANGE = 150_000

// The general-rate band the above-cap explanation quotes.
export const DUTY_BAND_BASE = 2870
export const DUTY_BAND_THRESHOLD = 130_000

// The transfer fee is quoted per whole thousand of the price.
export const TRANSFER_FEE_UNIT = 1000

// Help to Buy income caps, quoted in the scheme's own note.
export const HTB_INCOME_CAP_SINGLE = 103_000
export const HTB_INCOME_CAP_COUPLE = 165_000

export const FHOG_AMOUNT = 10_000
export const FHOG_PRICE_CAP = 750_000

export const LOAN_TERM_MONTHS = 360
// APRA serviceability buffer added to the actual rate.
export const APRA_ASSESSMENT_BUFFER = 0.03
// Flat amount added on top of the months-of-repayments buffer.
export const BUFFER_BASE_AMOUNT = 1000

export const HTB_EQUITY_NEW = 0.4
export const HTB_EQUITY_EXISTING = 0.3

export const MIN_DEPOSIT_PCT: Partial<Record<DepositRoute, number>> = {
  scheme: 5,
  htb: 2,
}

// Deposit the route selector resets to, from the original route-change handler.
export const DEFAULT_DEPOSIT_PCT: Record<DepositRoute, number> = {
  scheme: 5,
  htb: 2,
  nolmi: 20,
  lmi: 10,
}
