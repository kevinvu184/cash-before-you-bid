import { useCallback } from 'react'
import { calculate } from '../logic/calculate'
import { clampDepositPct, defaultDepositPctForRoute } from '../logic/deposit'
import type { Lang } from '../logic/lang'
import type { SkinId } from '../logic/skins'
import {
  parseUrlState,
  serialiseUrlState,
  type AppState,
  type ModePreference,
  type PresentationState,
  type UrlState,
} from '../logic/urlState'
import type { CalculationResult, DepositRoute } from '../types/calculator'
import { useUrlState, type UrlStateCodec } from './useUrlState'

// Changing route must also reset the deposit to the route default, so route is
// only settable through the dedicated setRoute action; the language has its
// own action for the same reason (it is not a calculator input).
type SettableField = Exclude<keyof AppState, 'route' | 'lang'>

const codec: UrlStateCodec<UrlState> = {
  parse: parseUrlState,
  serialise: serialiseUrlState,
}

export interface UseCalculatorResult {
  inputs: AppState
  presentation: PresentationState
  result: CalculationResult
  setField: <K extends SettableField>(field: K, value: AppState[K]) => void
  setRoute: (route: DepositRoute) => void
  setLang: (lang: Lang) => void
  setSkin: (skin: SkinId) => void
  setMode: (mode: ModePreference) => void
  /**
   * The query string that reproduces exactly what is on screen. This is what a
   * saved scenario stores: one serialisation format, the URL codec's, so an
   * input added there is saved and restored without a second format to update.
   */
  currentQuery: string
  /** Applies a stored query string — the other half of the round trip. */
  loadQuery: (query: string) => void
}

// All shareable state lives in the URL query string — calculator inputs, the
// UI language, the skin and the colour mode alike; there is no copy in
// component state or localStorage.
export function useCalculator(): UseCalculatorResult {
  const { state, setState } = useUrlState(codec)
  const inputs = state.app
  const presentation = state.presentation

  const setField = useCallback(
    <K extends SettableField>(field: K, value: AppState[K]) => {
      const next = { ...inputs, [field]: value }
      next.depositPct = clampDepositPct(next.route, next.depositPct)
      // Numeric fields are continuous inputs (typing), so the URL update is
      // debounced and replaces the current entry; everything else is a
      // discrete choice the back button should step through.
      setState({ ...state, app: next }, typeof value === 'number' ? 'replace' : 'push')
    },
    [inputs, setState, state],
  )

  const setRoute = useCallback(
    (route: DepositRoute) =>
      setState(
        {
          ...state,
          app: {
            ...inputs,
            route,
            depositPct: defaultDepositPctForRoute(route),
          },
        },
        'push',
      ),
    [inputs, setState, state],
  )

  const setLang = useCallback(
    (lang: Lang) => setState({ ...state, app: { ...inputs, lang } }, 'push'),
    [inputs, setState, state],
  )

  const setSkin = useCallback(
    (skin: SkinId) => setState({ ...state, presentation: { ...presentation, skin } }, 'push'),
    [presentation, setState, state],
  )

  const loadQuery = useCallback(
    (query: string) => {
      const saved = parseUrlState(new URLSearchParams(query))
      // The calculator half of a saved scenario is the property; the language,
      // skin and colour mode are how the reader likes to be shown it. Loading
      // last Saturday's numbers must not flip the interface out from under
      // them, so the current presentation and language are kept.
      setState({ app: { ...saved.app, lang: inputs.lang }, presentation }, 'push')
    },
    [inputs.lang, presentation, setState],
  )

  const setMode = useCallback(
    (mode: ModePreference) =>
      setState({ ...state, presentation: { ...presentation, mode } }, 'push'),
    [presentation, setState, state],
  )

  return {
    inputs,
    presentation,
    result: calculate(inputs),
    setField,
    setRoute,
    setLang,
    setSkin,
    setMode,
    currentQuery: serialiseUrlState(state).toString(),
    loadQuery,
  }
}
