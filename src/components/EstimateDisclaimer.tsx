import { useTranslation } from 'react-i18next'
import { APP_CURRENCY, CURRENCY_ROUNDING } from '../logic/currencyConfig'
import { formatMoney } from '../logic/format'

/**
 * Sits under the results: says the figures are rounded estimates (naming the
 * currency's rounding unit, and the finer unit used below the threshold when
 * the currency defines one) and that independently rounded parts may not add
 * to the independently rounded total.
 */
export function EstimateDisclaimer() {
  const { t, i18n } = useTranslation()
  const config = CURRENCY_ROUNDING[APP_CURRENCY]
  const exact = (amount: number) =>
    formatMoney(amount, APP_CURRENCY, i18n.language, { round: false })
  const small =
    config.smallThreshold !== undefined && config.smallUnit !== undefined
      ? t('money.disclaimerSmall', {
          threshold: exact(config.smallThreshold),
          smallUnit: exact(config.smallUnit),
        })
      : null
  // Joined in JS so the paragraph is one text node with single spaces,
  // rather than JSX whitespace rules deciding the gaps.
  const text = [t('money.disclaimer', { unit: exact(config.unit) }), small, t('money.roundingNote')]
    .filter((sentence) => sentence !== null)
    .join(' ')
  return <p className="small estimate-note">{text}</p>
}
