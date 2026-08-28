import { useTranslation } from 'react-i18next'
import { useDisplay } from '../hooks/useDisplay'
import { CURRENCY_ROUNDING } from '../logic/currencyConfig'
import { formatMoney } from '../logic/format'

/**
 * Sits under the results: says the figures are rounded estimates (naming the
 * currency's rounding unit) and that independently rounded parts may not add
 * to the independently rounded total.
 *
 * The unit is the display currency's own — it is already a figure in that
 * currency, so it is written straight rather than converted.
 */
export function EstimateDisclaimer() {
  const { t } = useTranslation()
  const { currency, locale } = useDisplay()
  const unit = formatMoney(CURRENCY_ROUNDING[currency].unit, currency, locale, {
    round: false,
  })
  return (
    <p className="small estimate-note">
      {t('money.disclaimer', { unit })} {t('money.roundingNote')}
    </p>
  )
}
