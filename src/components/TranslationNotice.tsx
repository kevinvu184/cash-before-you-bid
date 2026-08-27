import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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

interface TranslationNoticeProps {
  active: boolean
}

/**
 * A slim, dismissible strip disclosing that the Vietnamese copy is machine
 * translation. Rendered only while the vi locale is active; never blocks
 * interaction, and the dismiss control is a full 44px tap target.
 */
export function TranslationNotice({ active }: TranslationNoticeProps) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(readDismissed)

  if (!active || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    writeDismissed()
  }

  return (
    <div className="translation-notice" role="note">
      <p className="translation-notice-text">{t('notice.aiTranslation')}</p>
      <button
        type="button"
        className="translation-notice-dismiss"
        aria-label={t('notice.dismiss')}
        onClick={dismiss}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  )
}
