import { useCallback } from 'react'
import { calculate } from '../logic/calculate'
import type { DisplayCurrency } from '../logic/currencyConfig'
import { clampDepositPct, defaultDepositPctForRoute } from '../logic/deposit'
import type { Lang } from '../logic/lang'
import { parseParams, serialiseParams, type AppState } from '../logic/urlState'
import type { CalculationResult, DepositRoute } from '../types/calculator'
import { useUrlState, type UrlStateCodec } from './useUrlState'

// Changing route must also reset the deposit to the route default, so route is
// only settable through the dedicated setRoute action; the language, display
// currency and rate override have their own for the same reason (none of them
// is a calculator input — they change how the result is written, not what it
// is).
type SettableField = Exclude<keyof AppState, 'route' | 'lang' | 'currency' | 'manualRate'>

const codec: UrlStateCodec<AppState> = {
  parse: parseParams,
  serialise: serialiseParams,
}

export interface UseCalculatorResult {
  inputs: AppState
  result: CalculationResult
  setField: <K extends SettableField>(field: K, value: AppState[K]) => void
  setRoute: (route: DepositRoute) => void
  setLang: (lang: Lang) => void
  setCurrency: (currency: DisplayCurrency) => void
  setManualRate: (rate: number | null) => void
}

// All shareable state lives in the URL query string — calculator inputs and
// the UI language alike; there is no copy in component state or localStorage.
export function useCalculator(): UseCalculatorResult {
  const { state: inputs, setState } = useUrlState(codec)

  const setField = useCallback(
    <K extends SettableField>(field: K, value: AppState[K]) => {
      const next = { ...inputs, [field]: value }
      next.depositPct = clampDepositPct(next.route, next.depositPct)
      // Numeric fields are continuous inputs (typing), so the URL update is
      // debounced and replaces the current entry; everything else is a
      // discrete choice the back button should step through.
      setState(next, typeof value === 'number' ? 'replace' : 'push')
    },
    [inputs, setState],
  )

  const setRoute = useCallback(
    (route: DepositRoute) =>
      setState({ ...inputs, route, depositPct: defaultDepositPctForRoute(route) }, 'push'),
    [inputs, setState],
  )

  const setLang = useCallback(
    (lang: Lang) => setState({ ...inputs, lang }, 'push'),
    [inputs, setState],
  )

  const setCurrency = useCallback(
    (currency: DisplayCurrency) => setState({ ...inputs, currency }, 'push'),
    [inputs, setState],
  )

  // Applying or resetting an override is a deliberate act, not typing: it
  // lands in the URL at once and the back button steps over it.
  const setManualRate = useCallback(
    (manualRate: number | null) => setState({ ...inputs, manualRate }, 'push'),
    [inputs, setState],
  )

  return {
    inputs,
    result: calculate(inputs),
    setField,
    setRoute,
    setLang,
    setCurrency,
    setManualRate,
  }
}
