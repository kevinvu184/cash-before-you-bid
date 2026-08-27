import { useCallback } from 'react'
import { calculate } from '../logic/calculate'
import { clampDepositPct, defaultDepositPctForRoute } from '../logic/deposit'
import { parseParams, serialiseParams } from '../logic/urlState'
import type { CalculationResult, CalculatorInputs, DepositRoute } from '../types/calculator'
import { useUrlState, type UrlStateCodec } from './useUrlState'

// Changing route must also reset the deposit to the route default, so route is
// only settable through the dedicated setRoute action.
type SettableField = Exclude<keyof CalculatorInputs, 'route'>

const codec: UrlStateCodec<CalculatorInputs> = {
  parse: parseParams,
  serialise: serialiseParams,
}

export interface UseCalculatorResult {
  inputs: CalculatorInputs
  result: CalculationResult
  setField: <K extends SettableField>(field: K, value: CalculatorInputs[K]) => void
  setRoute: (route: DepositRoute) => void
}

// All shareable state lives in the URL query string; there is no copy in
// component state or localStorage.
export function useCalculator(): UseCalculatorResult {
  const { state: inputs, setState } = useUrlState(codec)

  const setField = useCallback(
    <K extends SettableField>(field: K, value: CalculatorInputs[K]) => {
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

  return { inputs, result: calculate(inputs), setField, setRoute }
}
