import { useTranslation } from 'react-i18next'
import { RESULTS_ANCHOR_ID } from './anchors'

/**
 * The first tab stop on the page, hidden until it takes focus.
 *
 * It skips to the results rather than to "main content", which is the
 * conventional wording and would be close to useless here: the main content
 * starts with the inputs, so a reader who only wants to see whether last
 * night's numbers still clear would tab through twenty-odd fields to reach the
 * answer. The inputs are two tab stops away for anyone who does want them.
 *
 * It lives in the shell so that it is the first focusable element whichever
 * skin is mounted, and so a skin cannot forget it.
 */
export function SkipLink() {
  const { t } = useTranslation()
  return (
    <a className="skip-link" href={`#${RESULTS_ANCHOR_ID}`}>
      {t('a11y.skipToResults')}
    </a>
  )
}
