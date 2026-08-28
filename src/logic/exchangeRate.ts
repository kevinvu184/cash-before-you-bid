// Exchange rates for the display currency switch. Amounts are held in
// BASE_CURRENCY (see currencyConfig); a rate converts one base unit into the
// currency being displayed. Rates never touch the calculation — only the
// formatter — so a wrong or stale rate can misprice the view but can never
// change what the calculator worked out.

import { BASE_CURRENCY, type CurrencyCode, type DisplayCurrency } from './currencyConfig'

/**
 * Indicative rates, used until the live ones arrive and whenever the network
 * refuses. Deliberately round numbers: they are a legible stand-in, not a
 * quote, and a suspiciously precise fallback would read as live data.
 *
 * Sampled 28 Aug 2026. The UI always says which of the two a figure came from.
 */
export const FALLBACK_RATES: Record<DisplayCurrency, number> = {
  AUD: 1,
  VND: 18_700,
}

export const FALLBACK_RATES_AS_AT = '2026-08-28'

// Keyless, CORS-enabled, and it carries the timestamp of the quote itself
// rather than of our request. ECB-backed services (Frankfurter and friends)
// were not an option: the ECB publishes no đồng reference rate.
export const RATE_ENDPOINT = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`

export const RATE_PROVIDER = 'exchangerate-api.com'

// A live quote is reused for this long before a refetch is attempted. FX moves
// far too little in a day to matter against figures already rounded to the
// nearest 100.000 ₫, and this keeps a returning visitor off the network.
export const RATE_MAX_AGE_MS = 12 * 60 * 60 * 1000

// Bounds for any rate we accept, from the network or from the override field.
// Wide enough for any real currency pair, tight enough to reject a zero, a
// negative, or a parse that landed on nonsense.
export const RATE_MIN = 0.000_001
export const RATE_MAX = 10_000_000

export function isValidRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= RATE_MIN && value <= RATE_MAX
}

export interface Quote {
  rate: number
  /** When the provider last repriced, in epoch milliseconds. */
  updatedAt: number
}

/**
 * Reads one currency's rate out of an open.er-api.com payload. Returns null
 * for anything that is not a usable quote — a failed result, a missing
 * currency, a rate outside the sane band — so a malformed response falls back
 * rather than displaying a garbage conversion.
 */
export function parseQuote(payload: unknown, currency: CurrencyCode): Quote | null {
  if (typeof payload !== 'object' || payload === null) return null
  const body = payload as Record<string, unknown>
  if (body.result !== 'success') return null
  if (body.base_code !== BASE_CURRENCY) return null

  const rates = body.rates
  if (typeof rates !== 'object' || rates === null) return null
  const rate = (rates as Record<string, unknown>)[currency]
  if (!isValidRate(rate)) return null

  // Seconds in the payload, milliseconds everywhere in this codebase. An
  // absent or unusable stamp is not fatal: the rate is still good, so the
  // fetch time stands in for it.
  const stamp = body.time_last_update_unix
  const updatedAt =
    typeof stamp === 'number' && Number.isFinite(stamp) && stamp > 0 ? stamp * 1000 : Date.now()

  return { rate, updatedAt }
}

/**
 * A rate at the precision it is ever shown at: whole display-currency units.
 * A rate carried to six decimals reads as precision this conversion does not
 * have, and the đồng has no minor unit to spend them on.
 *
 * It lives here rather than in the formatter because two places need to agree
 * on it — the override box seeds its draft with the rate as shown, and the
 * core decides whether applying that draft back changed anything. Rounding in
 * one and comparing in the other let a click on Apply pin an override the
 * reader never typed.
 */
export function rateAsShown(rate: number): number {
  return Math.round(rate)
}

/** Converts a base-currency amount into the display currency. */
export function convert(amount: number, currency: CurrencyCode, rate: number): number {
  if (currency === BASE_CURRENCY) return amount
  return amount * rate
}
