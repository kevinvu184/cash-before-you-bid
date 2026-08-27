import { useCopyLink } from '../hooks/useCopyLink'

/**
 * The whole state of the calculator lives in the query string, so the current
 * URL is the shareable artefact. A hairline-outlined button, not the accent
 * one: on this page the accent is spent on links and focus only.
 */
export function CopyLink() {
  const { copy, status, fallbackUrl } = useCopyLink()

  return (
    <div className="share">
      <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
        Copy link
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
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  )
}
