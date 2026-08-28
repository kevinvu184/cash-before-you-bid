import type { DisplayCurrency } from '../logic/currencyConfig'

// One place mapping a currency to the keys that name it, so the symbol on the
// switch, the symbol heading the amount column, and the name a screen reader
// announces can never drift apart. Literal keys, like every other key map
// here — a grep finds the JSON entry and its use together.

export const SYMBOL_KEYS: Record<DisplayCurrency, string> = {
  AUD: 'currency.symbolAud',
  VND: 'currency.symbolVnd',
}

export const NAME_KEYS: Record<DisplayCurrency, string> = {
  AUD: 'currency.nameAud',
  VND: 'currency.nameVnd',
}

/**
 * What heads the amount column. Not always the symbol: formatMoney writes AUD
 * as the ISO code for a vi reader, because "AU$" there does not read as
 * unambiguously Australian — so the column head follows the cells under it
 * rather than the symbol on the switch.
 */
export const AMOUNT_HEADER_KEYS: Record<DisplayCurrency, string> = {
  AUD: 'table.amount',
  VND: 'table.amountVnd',
}
