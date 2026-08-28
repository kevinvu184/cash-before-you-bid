import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from './useSearchParams'

export interface UrlStateCodec<T> {
  parse(searchParams: URLSearchParams): T
  serialise(state: T): URLSearchParams
}

export type UrlUpdateMode = 'push' | 'replace'

export interface UseUrlStateResult<T> {
  state: T
  setState(next: T, mode?: UrlUpdateMode): void
}

export const URL_DEBOUNCE_MS = 300

// A debounced write not yet flushed to the URL. It is only live for up to
// URL_DEBOUNCE_MS; the URL stays the source of truth. baseParams remembers
// which URL the write was based on, so an external navigation (back/forward)
// arriving in that window makes the write stale instead of clobbering the
// new URL.
interface PendingWrite<T> {
  value: T
  baseParams: URLSearchParams
}

export function useUrlState<T>(codec: UrlStateCodec<T>): UseUrlStateResult<T> {
  const [searchParams, setSearchParams] = useSearchParams()
  const [pending, setPending] = useState<PendingWrite<T> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const urlState = useMemo(() => codec.parse(searchParams), [codec, searchParams])

  // A pending write is stale once the URL has moved from under it.
  const activePending = pending !== null && pending.baseParams === searchParams ? pending : null

  useEffect(() => {
    if (pending !== null && pending.baseParams !== searchParams && timer.current !== null) {
      // External navigation during the debounce window: cancel the stale
      // write's timer so it cannot overwrite the new URL.
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [pending, searchParams])

  // Rewrite an invalid, unordered, or redundant query string to its cleaned
  // form. `replace` keeps history intact; parsing already used the defaults,
  // so there is no flash of default state.
  useEffect(() => {
    if (activePending !== null) return
    const canonical = codec.serialise(urlState)
    if (canonical.toString() !== searchParams.toString()) {
      setSearchParams(canonical, { replace: true })
    }
  }, [activePending, codec, searchParams, setSearchParams, urlState])

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  const setState = useCallback(
    (next: T, mode: UrlUpdateMode = 'push') => {
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = null
      if (mode === 'push') {
        setPending(null)
        setSearchParams(codec.serialise(next))
        return
      }
      // Continuous input: show the value immediately, debounce the URL write.
      setPending({ value: next, baseParams: searchParams })
      timer.current = setTimeout(() => {
        timer.current = null
        setPending(null)
        setSearchParams(codec.serialise(next), { replace: true })
      }, URL_DEBOUNCE_MS)
    },
    [codec, searchParams, setSearchParams],
  )

  return { state: activePending !== null ? activePending.value : urlState, setState }
}
