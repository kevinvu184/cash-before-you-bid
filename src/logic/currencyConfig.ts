// Per-currency display-rounding configuration. This file is the ONLY place a
// rounding unit may be defined; everything else reads this map. Adding a
// currency later means adding one entry here (and to CurrencyCode) — no logic
// changes anywhere.

export type CurrencyCode = 'AUD' | 'VND' | 'USD' // extend as needed

export interface CurrencyRounding {
  unit: number // round displayed values to nearest multiple of this
  smallThreshold?: number // below this |amount|, use smallUnit instead
  smallUnit?: number
  fractionDigits: 0 // rounded display never shows minor units
}

export const CURRENCY_ROUNDING: Record<CurrencyCode, CurrencyRounding> = {
  AUD: { unit: 100, smallThreshold: 1000, smallUnit: 10, fractionDigits: 0 },
  USD: { unit: 100, smallThreshold: 1000, smallUnit: 10, fractionDigits: 0 },
  VND: { unit: 100_000, smallThreshold: 1_000_000, smallUnit: 10_000, fractionDigits: 0 },
}

// Kept as an independent literal (not Object.keys) so the runtime completeness
// test actually exercises the map rather than deriving one from the other.
export const CURRENCY_CODES: readonly CurrencyCode[] = ['AUD', 'VND', 'USD']

// The single currency the UI is wired to today.
export const APP_CURRENCY: CurrencyCode = 'AUD'
