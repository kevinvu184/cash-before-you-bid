// Shared vitest setup. Most suites run in the node environment; the stubs
// below only apply to jsdom suites, where the browser APIs the app relies on
// (matchMedia, IntersectionObserver) are missing from jsdom itself.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  }

  if (!('IntersectionObserver' in window)) {
    class StubIntersectionObserver {
      readonly root = null
      readonly rootMargin = ''
      readonly thresholds: ReadonlyArray<number> = []
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: StubIntersectionObserver,
    })
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: StubIntersectionObserver,
    })
  }
}
