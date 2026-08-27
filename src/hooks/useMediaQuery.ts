import { useCallback, useSyncExternalStore } from 'react'

// The line table and the stat row change shape, not just style, across the
// 820px breakpoint, so the breakpoint has to be readable from render.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      // Safari only grew the EventTarget interface on MediaQueryList in 14;
      // before that there is just the deprecated addListener pair, and calling
      // addEventListener throws rather than degrading.
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', onChange)
        return () => mql.removeEventListener('change', onChange)
      }
      mql.addListener(onChange)
      return () => mql.removeListener(onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
