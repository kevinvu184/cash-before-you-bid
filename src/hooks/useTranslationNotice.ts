import { useCallback, useState } from 'react'

const DISMISS_KEY = 'viTranslationNoticeDismissed'

// localStorage can throw (private mode, storage disabled); the notice then
// simply reappears next visit.
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Nothing to do; dismissal just won't persist.
  }
}

export interface TranslationNoticeState {
  visible: boolean
  dismiss(): void
}

/**
 * Whether the machine-translation disclosure applies. State and persistence
 * live here, above the skin boundary, so switching skin does not bring a
 * dismissed notice back.
 */
export function useTranslationNotice(applies: boolean): TranslationNoticeState {
  const [dismissed, setDismissed] = useState(readDismissed)
  const dismiss = useCallback(() => {
    setDismissed(true)
    writeDismissed()
  }, [])
  return { visible: applies && !dismissed, dismiss }
}
