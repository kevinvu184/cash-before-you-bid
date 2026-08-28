import { useTranslation } from 'react-i18next'
import { BASE_CURRENCY, type DisplayCurrency } from '../logic/currencyConfig'
import type { RateStatus } from '../hooks/useExchangeRate'
import { CurrencySwitcher } from './CurrencySwitcher'
import { SYMBOL_KEYS } from './currencyLabels'
import { RateLine } from './RateLine'

interface CurrencyBarProps {
  currency: DisplayCurrency
  setCurrency: (currency: DisplayCurrency) => void
  rate: number
  status: RateStatus
  updatedAt: number | null
  manualRate: number | null
  setManualRate: (rate: number | null) => void
}

/**
 * Heads the results with the currency the figures below are written in.
 *
 * It sits with the results rather than with the inputs on purpose: the switch
 * changes nothing that was calculated, only how it is read. The rate line
 * appears with it, and only while a conversion is actually in force — under
 * the base currency there is no rate doing any work, and quoting one would
 * suggest the figures had been through it.
 */
export function CurrencyBar({
  currency,
  setCurrency,
  rate,
  status,
  updatedAt,
  manualRate,
  setManualRate,
}: CurrencyBarProps) {
  const { t } = useTranslation()

  return (
    <div className="curbar">
      <div className="curbar-top">
        <span className="ctl-label" id="currency-label">
          {t('currency.label')}
        </span>
        <CurrencySwitcher currency={currency} setCurrency={setCurrency} />
      </div>
      {currency !== BASE_CURRENCY ? (
        <>
          <RateLine
            currency={currency}
            rate={rate}
            status={status}
            updatedAt={updatedAt}
            manualRate={manualRate}
            setManualRate={setManualRate}
          />
          {/* The fields keep asking for Australian dollars whatever is on
              display here, and someone reading a page full of đồng needs
              telling before they type a đồng figure into one. */}
          <p className="curnote">
            {t('currency.note', { currency: t(SYMBOL_KEYS[currency]) })}
          </p>
        </>
      ) : null}
    </div>
  )
}
