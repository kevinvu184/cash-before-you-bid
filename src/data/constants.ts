import type { DepositRoute, Region } from '../types/calculator'

// The fees, caps and scheme thresholds. The duty brackets, the date all of
// this was last checked against source (`RATES_AS_AT`), and the conservative
// rounding rule live in `rates.ts` beside this file.
//
// Source: Housing Australia, 5% Deposit Scheme property price caps — $950,000
// for Melbourne and Geelong, $650,000 for the rest of Victoria, from
// 1 October 2025.
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

// Land Services Victoria 2026-27 lodgement fees (electronic) and PEXA FY27
// fees for a single title with financial settlement.
export const TRANSFER_FEE_BASE = 104.3
export const TRANSFER_FEE_PER_THOUSAND = 2.34
export const TRANSFER_FEE_CAP = 3614
export const MORTGAGE_REGISTRATION_FEE = 129.2
export const PEXA_TRANSFER_FEE = 146.3
export const PEXA_MORTGAGE_FEE = 74.14

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
