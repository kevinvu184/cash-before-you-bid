import { useCallback, useEffect, useReducer } from 'react'
import { DEFAULT_INPUTS, STORAGE_KEY } from '../data/defaults'
import { calculate } from '../logic/calculate'
import { clampDepositPct, defaultDepositPctForRoute } from '../logic/deposit'
import { deserializeInputs, serializeInputs } from '../logic/storage'
import type { CalculationResult, CalculatorInputs, DepositRoute } from '../types/calculator'

// Changing route must also reset the deposit to the route default, so route is
// only settable through the dedicated setRoute action.
type SettableField = Exclude<keyof CalculatorInputs, 'route'>

type SetAction = {
  [K in SettableField]: { type: 'set'; field: K; value: CalculatorInputs[K] }
}[SettableField]

type Action = SetAction | { type: 'setRoute'; route: DepositRoute }

function withField<K extends SettableField>(
  state: CalculatorInputs,
  field: K,
  value: CalculatorInputs[K],
): CalculatorInputs {
  return { ...state, [field]: value }
}

function reducer(state: CalculatorInputs, action: Action): CalculatorInputs {
  switch (action.type) {
    case 'set': {
      const next = withField(state, action.field, action.value)
      return { ...next, depositPct: clampDepositPct(next.route, next.depositPct) }
    }
    case 'setRoute':
      return { ...state, route: action.route, depositPct: defaultDepositPctForRoute(action.route) }
  }
}

function readStoredInputs(): CalculatorInputs {
  try {
    return deserializeInputs(localStorage.getItem(STORAGE_KEY), DEFAULT_INPUTS)
  } catch {
    // localStorage can throw in private browsing; the original ignores this too.
    return DEFAULT_INPUTS
  }
}

export interface UseCalculatorResult {
  inputs: CalculatorInputs
  result: CalculationResult
  setField: <K extends SettableField>(field: K, value: CalculatorInputs[K]) => void
  setRoute: (route: DepositRoute) => void
}

export function useCalculator(): UseCalculatorResult {
  const [inputs, dispatch] = useReducer(reducer, undefined, readStoredInputs)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeInputs(inputs))
    } catch {
      // Persistence is best-effort, exactly like the original try/catch.
    }
  }, [inputs])

  const setField = useCallback(
    <K extends SettableField>(field: K, value: CalculatorInputs[K]) =>
      dispatch({ type: 'set', field, value } as SetAction),
    [],
  )
  const setRoute = useCallback((route: DepositRoute) => dispatch({ type: 'setRoute', route }), [])

  return { inputs, result: calculate(inputs), setField, setRoute }
}
