import { useEffect, useRef, useState } from 'react'

/**
 * How long the figures have to hold still before the live region says
 * anything. Long enough to sit out the gaps between keystrokes in a price —
 * a digit every 200-300ms for most people — and short enough that the
 * announcement still feels like a consequence of the edit that caused it.
 */
export const SETTLE_MS = 800

/**
 * Publishes text into a live region only once the results have settled.
 *
 * `signature` is what changed, `text` is what to say about it. They are
 * separate on purpose: `signature` is built from figures and outcomes and
 * carries no words, so switching language, skin or colour mode rewrites `text`
 * without ever counting as a result change. Announcing on a language switch
 * would be reading the numbers out as a side effect of a control that had
 * nothing to do with them.
 *
 * The signature the caller mounts with is treated as already reported, so the
 * figures a reader arrives on are read by the page in its own order rather
 * than thrown at them out of a live region before they reach the results.
 */
export function useSettledAnnouncement(
  signature: string,
  text: string,
  delay: number = SETTLE_MS,
): string {
  const [announced, setAnnounced] = useState('')
  const reported = useRef(signature)
  // Read when the timer fires rather than when it was set, so the sentence is
  // the one the language in force at that moment would write.
  const latest = useRef(text)

  useEffect(() => {
    latest.current = text
  }, [text])

  useEffect(() => {
    if (signature === reported.current) return
    const timer = window.setTimeout(() => {
      reported.current = signature
      setAnnounced(latest.current)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [signature, delay])

  return announced
}
