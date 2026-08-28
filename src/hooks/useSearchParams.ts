import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * The query string as React state.
 *
 * This app has one page and no routes — every piece of state lives in the
 * query string (src/logic/urlState.ts), and the only navigation that happens
 * is the browser's own back and forward. A router was carrying that job and
 * charging the bundle for a matcher, a route tree and a data layer none of it
 * uses, on a page whose primary reader is on mobile data. So the job is done
 * here instead, against the History API directly.
 *
 * The contract matches the `useSearchParams` it replaces, because
 * `useUrlState` depends on the details:
 *
 *   - The returned `URLSearchParams` is referentially stable for as long as
 *     the query string is unchanged. `useUrlState` compares it by identity to
 *     decide whether a debounced write has been overtaken by a back or
 *     forward navigation, so a fresh object every render would break it.
 *   - The setter takes the params to write and an optional `{ replace }`.
 *   - `pathname` and `hash` are preserved, so the GitHub Pages base path
 *     survives every write.
 */

// pushState and replaceState do not fire popstate, so every subscriber is
// notified by hand after a programmatic write. popstate covers back, forward
// and any navigation the browser drives itself.
const subscribers = new Set<() => void>()

function notify(): void {
  for (const subscriber of subscribers) subscriber()
}

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange)
  window.addEventListener('popstate', onStoreChange)
  return () => {
    subscribers.delete(onStoreChange)
    window.removeEventListener('popstate', onStoreChange)
  }
}

const getSearch = () => window.location.search

// No URL to read when there is no window; the app then starts on defaults.
const getServerSearch = () => ''

export type SetSearchParams = (next: URLSearchParams, options?: { replace?: boolean }) => void

export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch)
  const params = useMemo(() => new URLSearchParams(search), [search])

  const setSearchParams = useCallback<SetSearchParams>((next, options) => {
    const query = next.toString()
    const url = `${window.location.pathname}${query === '' ? '' : `?${query}`}${window.location.hash}`
    if (options?.replace === true) {
      window.history.replaceState(window.history.state, '', url)
    } else {
      window.history.pushState(null, '', url)
    }
    notify()
  }, [])

  return [params, setSearchParams]
}
