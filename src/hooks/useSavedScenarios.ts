import { useCallback, useState } from 'react'
import {
  MAX_SCENARIOS,
  SCENARIOS_KEY,
  newScenarioId,
  normaliseName,
  parseScenarios,
  serialiseScenarios,
  type SavedScenario,
} from '../logic/scenarioStore'

/**
 * Named scenarios, kept in localStorage and nowhere else. They hold what
 * someone can afford to spend on a house, so they stay on the device: nothing
 * here uploads, syncs or reports.
 *
 * Every read and every write is wrapped, following useTranslationNotice: a
 * browser that refuses storage (private mode, cookies blocked, storage
 * disabled) makes this feature degrade to nothing rather than take the page
 * with it. `error` says which way it failed so the panel can explain itself
 * instead of silently dropping a save on the floor.
 */

export type ScenarioStoreError =
  /** Storage refused the write outright — the feature is unavailable here. */
  | 'unavailable'
  /** There is no room: the quota is exhausted, or the list is at its cap. */
  | 'full'

export interface UseSavedScenariosResult {
  scenarios: readonly SavedScenario[]
  /** The last failure, or null. Cleared by the next write that succeeds. */
  error: ScenarioStoreError | null
  /** Saves the query string under a name. Returns false if nothing was stored. */
  save(name: string, query: string): boolean
  rename(id: string, name: string): boolean
  remove(id: string): boolean
}

interface StoreState {
  scenarios: readonly SavedScenario[]
  error: ScenarioStoreError | null
}

function readInitial(): StoreState {
  try {
    return { scenarios: parseScenarios(window.localStorage.getItem(SCENARIOS_KEY)), error: null }
  } catch {
    // Reading threw, so writing will too; the panel says so and stays usable.
    return { scenarios: [], error: 'unavailable' }
  }
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: unknown }).name
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
}

export function useSavedScenarios(): UseSavedScenariosResult {
  const [state, setState] = useState<StoreState>(readInitial)

  const commit = useCallback((next: readonly SavedScenario[]): boolean => {
    try {
      window.localStorage.setItem(SCENARIOS_KEY, serialiseScenarios(next))
      setState({ scenarios: next, error: null })
      return true
    } catch (error) {
      // The in-memory list deliberately does not move: the panel must show
      // what is actually stored, not what the user hoped to store.
      setState((prev) => ({
        scenarios: prev.scenarios,
        // A quota error on the first write is not a full disk — it is Safari's
        // private mode, which reports a zero-byte quota for everything. Only
        // once something has been stored successfully does "full" mean full.
        error: isQuotaError(error) && prev.scenarios.length > 0 ? 'full' : 'unavailable',
      }))
      return false
    }
  }, [])

  const save = useCallback(
    (name: string, query: string): boolean => {
      const trimmed = normaliseName(name)
      if (trimmed === '') return false
      if (state.scenarios.length >= MAX_SCENARIOS) {
        setState((prev) => ({ scenarios: prev.scenarios, error: 'full' }))
        return false
      }
      const scenario: SavedScenario = {
        id: newScenarioId(),
        name: trimmed,
        query,
        savedAt: Date.now(),
      }
      // Newest first: the scenario just saved is the one being looked at.
      return commit([scenario, ...state.scenarios])
    },
    [commit, state.scenarios],
  )

  const rename = useCallback(
    (id: string, name: string): boolean => {
      const trimmed = normaliseName(name)
      if (trimmed === '') return false
      const next = state.scenarios.map((scenario) =>
        scenario.id === id ? { ...scenario, name: trimmed } : scenario,
      )
      return commit(next)
    },
    [commit, state.scenarios],
  )

  const remove = useCallback(
    (id: string): boolean => commit(state.scenarios.filter((scenario) => scenario.id !== id)),
    [commit, state.scenarios],
  )

  return { scenarios: state.scenarios, error: state.error, save, rename, remove }
}
