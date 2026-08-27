// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Two MediaQueryList shapes: the current EventTarget one, and the pre-Safari-14
// list that carries only the deprecated addListener pair.
function stubMatchMedia(matches: boolean, { legacy = false } = {}) {
  const listeners = new Set<() => void>()
  const modern = {
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }
  const deprecated = {
    addListener: (fn: () => void) => listeners.add(fn),
    removeListener: (fn: () => void) => listeners.delete(fn),
  }
  let current = matches
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    get matches() {
      return current
    },
    ...(legacy ? deprecated : { ...modern, ...deprecated }),
  }))
  return {
    listeners,
    change(next: boolean) {
      current = next
      act(() => listeners.forEach((fn) => fn()))
    },
  }
}

describe('useMediaQuery', () => {
  it('reports the current match and follows changes', () => {
    const mql = stubMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(min-width: 820px)'))
    expect(result.current).toBe(false)
    mql.change(true)
    expect(result.current).toBe(true)
  })

  it('falls back to addListener where addEventListener is missing', () => {
    const mql = stubMatchMedia(false, { legacy: true })
    // Without the fallback this throws on subscribe and takes the app with it.
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 820px)'))
    expect(result.current).toBe(false)
    mql.change(true)
    expect(result.current).toBe(true)
    unmount()
    expect(mql.listeners.size).toBe(0)
  })
})
