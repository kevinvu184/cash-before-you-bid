import { useTranslation } from 'react-i18next'
import { useCopyLink } from '../hooks/useCopyLink'

/**
 * The calculator state lives entirely in the URL, so sharing is copying the
 * address. Built from Ledger primitives: a hairline-framed button with the
 * outcome announced in a mono status line.
 */
export function ShareLink() {
  const { t } = useTranslation()
  const { copy, status, fallbackUrl } = useCopyLink()

  return (
    <div className="share">
      <button type="button" className="copy-link" onClick={() => void copy()}>
        {t('share.copy')}
      </button>
      <span className="share-status" role="status" aria-live="polite">
        {status === 'copied' && t('share.copied')}
        {status === 'failed' && t('share.failed')}
      </span>
      {fallbackUrl && (
        <input
          className="share-fallback"
          type="text"
          readOnly
          value={fallbackUrl}
          aria-label={t('share.fallbackLabel')}
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  )
}
