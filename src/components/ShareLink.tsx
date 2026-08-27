import { useCopyLink } from '../hooks/useCopyLink'

/**
 * The calculator state lives entirely in the URL, so sharing is copying the
 * address. Built from Ledger primitives: a hairline-framed button with the
 * outcome announced in a mono status line.
 */
export function ShareLink() {
  const { copy, status, fallbackUrl } = useCopyLink()

  return (
    <div className="share">
      <button type="button" className="copy-link" onClick={() => void copy()}>
        Copy link to these numbers
      </button>
      <span className="share-status" role="status" aria-live="polite">
        {status === 'copied' && 'Link copied'}
        {status === 'failed' && 'Copy failed — select the link below'}
      </span>
      {fallbackUrl && (
        <input
          className="share-fallback"
          type="text"
          readOnly
          value={fallbackUrl}
          aria-label="Shareable link"
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  )
}
