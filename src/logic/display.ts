// How money is rendered right now: which locale writes the digits, which
// currency the reader asked to see, and the rate that gets a base-currency
// amount there. Bundled because every money string needs all three, and
// threading them separately through the result text made every signature
// three parameters longer.

import type { DisplayCurrency } from './currencyConfig'
import { convert } from './exchangeRate'
import { formatMoney, formatRowAmount, type FormatMoneyOptions } from './format'

export interface Display {
  locale: string
  currency: DisplayCurrency
  /** Display-currency units per one base-currency unit. */
  rate: number
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
