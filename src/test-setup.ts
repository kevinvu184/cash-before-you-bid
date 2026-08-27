// jsdom implements neither matchMedia nor IntersectionObserver, both of which
// the layout uses: the line table changes shape across the 820px breakpoint,
// and the sticky total watches the masthead. These are the minimum stubs that
// let a component render — matchMedia reports no match, so tests see the phone
// layout, and the observer never fires, so the sticky strip stays hidden.
//
// Both are cast rather than typed structurally: these interfaces gain members
// between DOM library versions, and a stub should not have to grow with them.
if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  }

  if (typeof window.IntersectionObserver !== 'function') {
    window.IntersectionObserver = class {
      root = null
      rootMargin = ''
      thresholds: readonly number[] = []
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    } as unknown as typeof IntersectionObserver
  }
}
