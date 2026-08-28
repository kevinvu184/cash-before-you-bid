import { useTranslation } from 'react-i18next'
import { estimateMoney } from './resultText'

interface StickyTotalProps {
  total: number
  shown: boolean
}

/**
 * A slim ink strip pinned to the top of the viewport once the header scrolls
 * off, so the figure being driven by the inputs is never out of sight while
 * editing. Hidden from assistive technology: it duplicates the total in the
 * stat row, which stays in the document either way. Hidden outright at 1024px,
 * where the stat row is already beside the inputs.
 */
export function StickyTotal({ total, shown }: StickyTotalProps) {
  const { t, i18n } = useTranslation()
  return (
    <div className={shown ? 'sticky-total shown' : 'sticky-total'} aria-hidden="true">
      <span className="sticky-total-label">{t('stats.totalLabel')}</span>
      <span className="sticky-total-value">{estimateMoney(total, i18n.language)}</span>
    </div>
  )
}
