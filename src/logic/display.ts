// How money is rendered right now: which locale writes the digits, which
// currency the reader asked to see, and the rate that gets a base-currency
// amount there. Bundled because every money string needs all three, and
// threading them separately through the result text made every signature
// three parameters longer.

import { BASE_CURRENCY, type DisplayCurrency } from './currencyConfig'
import { convert } from './exchangeRate'
import { formatMoney, formatRowAmount, type FormatMoneyOptions } from './format'

/**
 * The half of a display the core decides: what the reader asked to see, and
 * the rate that gets them there. It rides in the view model; the locale is
 * added at the point of use (see `src/skins/shared/display.ts`).
 */
export interface DisplaySettings {
  currency: DisplayCurrency
  /** Display-currency units per one base-currency unit. */
  rate: number
}

export interface Display extends DisplaySettings {
  locale: string
}

/**
 * The display to write figures with, with the one invariant `DisplaySettings`
 * can state but not enforce: the base currency is always at a rate of 1.
 *
 * Nothing converts a base-currency amount — `convert` returns it whatever the
 * rate says — so a rate other than 1 there is a number with no meaning left
 * sitting in the contract. An override rides in the URL and survives a switch
 * back to dollars, so `?fx=20000` with dollars showing would otherwise hand
 * every reader of `useDisplay()` a display claiming 20,000 dollars per dollar.
 * Harmless to the arithmetic today, and exactly the kind of thing the next
 * person to read `rate` would be entitled to believe.
 */
export function displaySettings(currency: DisplayCurrency, rate: number): DisplaySettings {
  return { currency, rate: currency === BASE_CURRENCY ? 1 : rate }
}

/**
 * A base-currency amount, converted and formatted for the current display.
 * Rounded to the display currency's own unit by default: a converted figure
 * is an estimate twice over — the amount was one, and the rate is another —
 * so it must never be shown to the đồng.
 */
export function displayMoney(
  amount: number,
  display: Display,
  opts: FormatMoneyOptions = {},
): string {
  return formatMoney(
    convert(amount, display.currency, display.rate),
    display.currency,
    display.locale,
    opts,
  )
}

/** As displayMoney, with the typographic minus ahead of a negative amount. */
export function displayRowAmount(
  amount: number,
  display: Display,
  opts: FormatMoneyOptions = {},
): string {
  return formatRowAmount(
    convert(amount, display.currency, display.rate),
    display.currency,
    display.locale,
    opts,
  )
}

/**
 * A figure already denominated in the display currency — a rounding unit out
 * of the currency's own config, or the exchange rate itself — written exactly
 * and never put through the rate again.
 */
export function displayUnit(amount: number, display: Display): string {
  return formatMoney(amount, display.currency, display.locale, { round: false })
}
