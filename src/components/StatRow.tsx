import { useTranslation } from 'react-i18next'
import { APP_CURRENCY } from '../logic/currencyConfig'
import { formatMoney, formatPercent } from '../logic/format'
import type { CalculationTiles } from '../types/calculator'
import { approxMoney } from './resultText'

interface StatProps {
  id: string
  label: string
  value: string
  sub: string
  emphasis?: boolean
}

function Stat({ id, label, value, sub, emphasis }: StatProps) {
  return (
    <div className={emphasis ? 'stat emphasis' : 'stat'}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" id={id}>
        {value}
      </div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}

interface StatRowProps {
  tiles: CalculationTiles
}

// A rule-divided list on a phone, a hairline-divided row from 820px. Ledger has
// no stat component; these are list rows, not cards.
export function StatRow({ tiles }: StatRowProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  // Computed figures are estimates: rounded and "~"-prefixed. The purchase
  // price is the user's own input, so it stays exact.
  const aud = (amount: number) => approxMoney(amount, t, locale)
  const exact = (amount: number) => formatMoney(amount, APP_CURRENCY, locale, { round: false })
  const pct = (value: number) => formatPercent(value, locale)

  const loanSub =
    tiles.loan.governmentEquity > 0
      ? t('stats.loanSubWithEquity', {
          lvr: pct(tiles.loan.lvrPct),
          equity: aud(tiles.loan.governmentEquity),
        })
      : t('stats.loanSub', { lvr: pct(tiles.loan.lvrPct) })

  return (
    <div className="stats">
      <Stat
        id="tTotal"
        label={t('stats.totalLabel')}
        value={aud(tiles.total.value)}
        sub={t('stats.totalSub', {
          deposit: aud(tiles.total.deposit),
          costs: aud(tiles.total.costs),
          moving: aud(tiles.total.moving),
          buffer: aud(tiles.total.buffer),
        })}
        emphasis
      />
      <Stat
        id="tDep"
        label={t('stats.depositLabel')}
        value={aud(tiles.deposit.value)}
        sub={t('stats.depositSub', {
          pct: pct(tiles.deposit.pct),
          price: exact(tiles.deposit.price),
        })}
      />
      <Stat
        id="tCosts"
        label={t('stats.costsLabel')}
        value={aud(tiles.costs.value)}
        sub={
          tiles.costs.pctOfPrice === null
            ? ''
            : t('stats.costsSub', { pct: pct(tiles.costs.pctOfPrice) })
        }
      />
      <Stat id="tLoan" label={t('stats.loanLabel')} value={aud(tiles.loan.value)} sub={loanSub} />
      <Stat
        id="tRep"
        label={t('stats.repaymentLabel')}
        value={aud(tiles.repayment.value)}
        sub={t('stats.repaymentSub', {
          rate: pct(tiles.repayment.ratePct),
          assessedRate: pct(tiles.repayment.assessedRatePct),
          assessed: aud(tiles.repayment.assessedValue),
        })}
      />
    </div>
  )
}
