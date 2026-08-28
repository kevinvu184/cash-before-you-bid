import { useTranslation } from 'react-i18next'
import { formatNumber } from '../logic/format'
import type { SunkCostSummary } from '../types/calculator'
import { estimateMoney } from './resultText'
import { Stat } from './StatRow'

interface SunkCostPanelProps {
  sunkCost: SunkCostSummary
}

/**
 * The money that leaves the account before the hammer falls, per property and
 * across a whole search. It sits beside the cash stack rather than inside it:
 * the total above is what buying *this* property costs, and adding the losing
 * auctions into it would misstate that.
 */
export function SunkCostPanel({ sunkCost }: SunkCostPanelProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const aud = (amount: number) => estimateMoney(amount, locale)
  const count = sunkCost.properties

  return (
    <section className="sunk" aria-labelledby="sunkHeading">
      <h3 id="sunkHeading">{t('sunk.heading')}</h3>
      <div className="stats">
        <Stat
          id="tSunkPer"
          label={t('sunk.perPropertyLabel')}
          value={aud(sunkCost.perProperty)}
          sub={t('sunk.perPropertySub')}
        />
        <Stat
          id="tSunkSearch"
          label={t('sunk.searchLabel', { count, properties: formatNumber(count, locale) })}
          value={aud(sunkCost.expectedTotal)}
          sub={
            sunkCost.onPropertiesNotWon > 0
              ? t('sunk.searchSubWithLosses', { lost: aud(sunkCost.onPropertiesNotWon) })
              : t('sunk.searchSub')
          }
        />
      </div>
      <p className="small">{t('sunk.framing')}</p>
    </section>
  )
}
