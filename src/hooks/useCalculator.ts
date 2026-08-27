import { useCallback } from 'react'
import { calculate } from '../logic/calculate'
import { clampDepositPct, defaultDepositPctForRoute } from '../logic/deposit'
import type { Lang } from '../logic/lang'
import { parseParams, serialiseParams, type AppState } from '../logic/urlState'
import type { CalculationResult, DepositRoute } from '../types/calculator'
import { useUrlState, type UrlStateCodec } from './useUrlState'

// Changing route must also reset the deposit to the route default, so route is
// only settable through the dedicated setRoute action; the language has its
// own action for the same reason (it is not a calculator input).
type SettableField = Exclude<keyof AppState, 'route' | 'lang'>

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

  return { inputs, result: calculate(inputs), setField, setRoute, setLang }
}
