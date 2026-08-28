import { useEffect, useState, type RefObject } from 'react'

// Presentation-only: a skin that pins something to the top of the viewport
// needs to know when the header has gone. Nothing in the core depends on it.
// True once the referenced element has scrolled off the top of the viewport.
// An IntersectionObserver keeps this off the scroll thread — no layout reads.
export function useScrolledPast(ref: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return past
}
