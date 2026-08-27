import { CURRENCY_ROUNDING, type CurrencyCode } from './currencyConfig'

/**
 * Round-half-up to the nearest multiple of `unit`. Negative amounts round
 * symmetrically: roundToUnit(-150, 100) === -roundToUnit(150, 100) === -200.
 * Display-only — calculations always run on full precision.
 */
export function roundToUnit(amount: number, unit: number): number {
  if (amount < 0) {
    const rounded = -roundToUnit(-amount, unit)
    // Never return -0: Intl renders it with a minus sign ("-A$0").
    return rounded === 0 ? 0 : rounded
  }
  return Math.round(amount / unit) * unit
}

/**
 * Rounds an amount for display in the given currency: below |smallThreshold|
 * the currency's smallUnit applies, from exactly smallThreshold upward its
 * unit does.
 */
export function roundForDisplay(amount: number, currency: CurrencyCode): number {
  const { unit, smallThreshold, smallUnit } = CURRENCY_ROUNDING[currency]
  if (smallThreshold !== undefined && smallUnit !== undefined && Math.abs(amount) < smallThreshold) {
    return roundToUnit(amount, smallUnit)
  }
  return roundToUnit(amount, unit)
}
