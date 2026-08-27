import {
  DEFAULT_DEPOSIT_PCT,
  HTB_EQUITY_EXISTING,
  HTB_EQUITY_NEW,
  MIN_DEPOSIT_PCT,
  SCHEME_PRICE_CAPS,
} from '../data/constants'
import type { DepositRoute, Region } from '../types/calculator'

export function regionPriceCap(region: Region): number {
  return SCHEME_PRICE_CAPS[region]
}

// The original writes the clamped value back into the deposit field.
export function clampDepositPct(route: DepositRoute, depositPct: number): number {
  const min = MIN_DEPOSIT_PCT[route]
  return min !== undefined && depositPct < min ? min : depositPct
}

export function defaultDepositPctForRoute(route: DepositRoute): number {
  return DEFAULT_DEPOSIT_PCT[route]
}

export function governmentEquityShare(route: DepositRoute, newHome: boolean): number {
  if (route !== 'htb') return 0
  return newHome ? HTB_EQUITY_NEW : HTB_EQUITY_EXISTING
}
