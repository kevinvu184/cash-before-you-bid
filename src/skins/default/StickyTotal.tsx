import { useTranslation } from 'react-i18next'
import type { StatField } from '../../types/viewModel'
import { useDisplay } from '../shared/display'
import { estimateMoney } from '../shared/text'

interface StickyTotalProps {
  total: StatField
  shown: boolean
}

/**
 * A slim ink strip pinned to the top of the viewport once the header scrolls
 * off, so the figure being driven by the inputs is never out of sight while
 * editing. Hidden from assistive technology and carrying no data-field: it
 * duplicates the total stat, which stays in the document either way. Hidden
 * outright at 1024px, where the stat row is already beside the inputs.
 */
export function StickyTotal({ total, shown }: StickyTotalProps) {
  const { t } = useTranslation()
  const display = useDisplay()
  return (
    <div className={shown ? 'sticky-total shown' : 'sticky-total'} aria-hidden="true">
      <span className="sticky-total-label">{t(total.labelKey)}</span>
      <span className="sticky-total-value">{estimateMoney(total.value, display)}</span>
    </div>
  )
}
