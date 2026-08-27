import { useTranslation } from 'react-i18next'
import { APP_CURRENCY, CURRENCY_ROUNDING } from '../logic/currencyConfig'
import { formatMoney } from '../logic/format'

/**
 * Sits under the results: says the figures are rounded estimates (naming the
 * currency's rounding unit) and that independently rounded parts may not add
 * to the independently rounded total.
 */
export function EstimateDisclaimer() {
  const { t, i18n } = useTranslation()
  const unit = formatMoney(CURRENCY_ROUNDING[APP_CURRENCY].unit, APP_CURRENCY, i18n.language, {
    round: false,
  })
  return (
    <p className="small estimate-note">
      {t('money.disclaimer', { unit })} {t('money.roundingNote')}
    </p>
  )
}
