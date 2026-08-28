// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCENARIOS_KEY, MAX_SCENARIOS, parseScenarios } from '../logic/scenarioStore'
import { useSavedScenarios } from './useSavedScenarios'

const QUERY = 'price=820000&route=lmi'

function readBack() {
  return parseScenarios(window.localStorage.getItem(SCENARIOS_KEY))
}

function quotaError() {
  return new DOMException('exceeded the quota', 'QuotaExceededError')
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useSavedScenarios', () => {
  it('saves, renames and deletes, persisting each change', () => {
    const { result } = renderHook(() => useSavedScenarios())
    expect(result.current.scenarios).toEqual([])

    act(() => {
      result.current.save('12 Rose St', QUERY)
    })
    expect(result.current.scenarios).toHaveLength(1)
    expect(result.current.scenarios[0]).toMatchObject({ name: '12 Rose St', query: QUERY })
    expect(readBack()[0]).toMatchObject({ name: '12 Rose St', query: QUERY })

    const { id } = result.current.scenarios[0]
    act(() => {
      result.current.rename(id, '  12 Rose St, Preston  ')
    })
    expect(result.current.scenarios[0].name).toBe('12 Rose St, Preston')
    expect(readBack()[0].name).toBe('12 Rose St, Preston')

    act(() => {
      result.current.remove(id)
    })
    expect(result.current.scenarios).toEqual([])
    expect(readBack()).toEqual([])
  })

  it('puts the newest scenario first', () => {
    const { result } = renderHook(() => useSavedScenarios())
    act(() => {
      result.current.save('first', QUERY)
    })
    act(() => {
      result.current.save('second', QUERY)
    })
    expect(result.current.scenarios.map((s) => s.name)).toEqual(['second', 'first'])
  })

  it('reads what a previous visit stored', () => {
    const first = renderHook(() => useSavedScenarios())
    act(() => {
      first.result.current.save('12 Rose St', QUERY)
    })
    cleanup()
    const { result } = renderHook(() => useSavedScenarios())
    expect(result.current.scenarios.map((s) => s.name)).toEqual(['12 Rose St'])
    expect(result.current.scenarios[0].query).toBe(QUERY)
  })

  it('refuses a blank name without touching storage', () => {
    const { result } = renderHook(() => useSavedScenarios())
    let saved = true
    act(() => {
      saved = result.current.save('   ', QUERY)
    })
    expect(saved).toBe(false)
    expect(result.current.scenarios).toEqual([])
    expect(window.localStorage.getItem(SCENARIOS_KEY)).toBeNull()
  })

  it('starts empty when reading storage throws, and says the feature is unavailable', () => {
    // Private mode, blocked cookies, storage disabled: the getter itself throws.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied')
    })
    const { result } = renderHook(() => useSavedScenarios())
    expect(result.current.scenarios).toEqual([])
    expect(result.current.error).toBe('unavailable')
  })

  it('starts empty on a corrupt payload rather than throwing', () => {
    window.localStorage.setItem(SCENARIOS_KEY, '{"scenarios":[')
    const { result } = renderHook(() => useSavedScenarios())
    expect(result.current.scenarios).toEqual([])
    // Nothing failed: the next save works normally.
    expect(result.current.error).toBeNull()
    act(() => {
      result.current.save('12 Rose St', QUERY)
    })
    expect(result.current.error).toBeNull()
    expect(readBack()).toHaveLength(1)
  })

  it('leaves the list untouched when a write throws, and reports it', () => {
    const { result } = renderHook(() => useSavedScenarios())
    act(() => {
      result.current.save('kept', QUERY)
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write denied')
    })
    let saved = true
    act(() => {
      saved = result.current.save('lost', QUERY)
    })
    expect(saved).toBe(false)
    expect(result.current.error).toBe('unavailable')
    // The panel must show what is stored, not what the user hoped to store.
    expect(result.current.scenarios.map((s) => s.name)).toEqual(['kept'])
    expect(readBack().map((s) => s.name)).toEqual(['kept'])
  })

  it('calls a quota error "full" once something has been stored', () => {
    const { result } = renderHook(() => useSavedScenarios())
    act(() => {
      result.current.save('kept', QUERY)
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError()
    })
    act(() => {
      result.current.save('too big', QUERY)
    })
    expect(result.current.error).toBe('full')
  })

  it('calls a quota error on the very first write "unavailable"', () => {
    // Safari's private mode reports a zero-byte quota for every write; nothing
    // is stored and deleting a scenario cannot help, so "full" would mislead.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError()
    })
    const { result } = renderHook(() => useSavedScenarios())
    act(() => {
      result.current.save('12 Rose St', QUERY)
    })
    expect(result.current.error).toBe('unavailable')
  })

  it('clears the error once a write succeeds again', () => {
    const { result } = renderHook(() => useSavedScenarios())
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write denied')
    })
    act(() => {
      result.current.save('lost', QUERY)
    })
    expect(result.current.error).toBe('unavailable')
    spy.mockRestore()
    act(() => {
      result.current.save('saved', QUERY)
    })
    expect(result.current.error).toBeNull()
    expect(result.current.scenarios.map((s) => s.name)).toEqual(['saved'])
  })

  it('refuses to add past the cap and says there is no room', () => {
    window.localStorage.setItem(
      SCENARIOS_KEY,
      JSON.stringify({
        version: 1,
        scenarios: Array.from({ length: MAX_SCENARIOS }, (_, i) => ({
          id: `s${i}`,
          name: `scenario ${i}`,
          query: QUERY,
          savedAt: 1,
        })),
      }),
    )
    const { result } = renderHook(() => useSavedScenarios())
    expect(result.current.scenarios).toHaveLength(MAX_SCENARIOS)
    let saved = true
    act(() => {
      saved = result.current.save('one too many', QUERY)
    })
    expect(saved).toBe(false)
    expect(result.current.error).toBe('full')
    expect(result.current.scenarios).toHaveLength(MAX_SCENARIOS)
  })
})
