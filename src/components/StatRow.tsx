import { useTranslation } from 'react-i18next'
import { useDisplay } from '../hooks/useDisplay'
import { displayMoney } from '../logic/display'
import { formatPercent } from '../logic/format'
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
  const { t } = useTranslation()
  const display = useDisplay()
  const locale = display.locale
  // Computed figures are estimates: rounded and "~"-prefixed. The purchase
  // price is the user's own input, so it stays exact.
  const money = (amount: number) => approxMoney(amount, t, display)
  const exact = (amount: number) => displayMoney(amount, display, { round: false })
  const pct = (value: number) => formatPercent(value, locale)

  const loanSub =
    tiles.loan.governmentEquity > 0
      ? t('stats.loanSubWithEquity', {
          lvr: pct(tiles.loan.lvrPct),
          equity: money(tiles.loan.governmentEquity),
        })
      : t('stats.loanSub', { lvr: pct(tiles.loan.lvrPct) })

  return (
    <div className="stats">
      <Stat
        id="tTotal"
        label={t('stats.totalLabel')}
        value={money(tiles.total.value)}
        sub={t('stats.totalSub', {
          deposit: money(tiles.total.deposit),
          costs: money(tiles.total.costs),
          moving: money(tiles.total.moving),
          buffer: money(tiles.total.buffer),
        })}
        emphasis
      />
      <Stat
        id="tDep"
        label={t('stats.depositLabel')}
        value={money(tiles.deposit.value)}
        sub={t('stats.depositSub', {
          pct: pct(tiles.deposit.pct),
          price: exact(tiles.deposit.price),
        })}
      />
      <Stat
        id="tCosts"
        label={t('stats.costsLabel')}
        value={money(tiles.costs.value)}
        sub={
          tiles.costs.pctOfPrice === null
            ? ''
            : t('stats.costsSub', { pct: pct(tiles.costs.pctOfPrice) })
        }
      />
      <Stat id="tLoan" label={t('stats.loanLabel')} value={money(tiles.loan.value)} sub={loanSub} />
      <Stat
        id="tRep"
        label={t('stats.repaymentLabel')}
        value={money(tiles.repayment.value)}
        sub={t('stats.repaymentSub', {
          rate: pct(tiles.repayment.ratePct),
          assessedRate: pct(tiles.repayment.assessedRatePct),
          assessed: money(tiles.repayment.assessedValue),
        })}
      />
    </div>
  )
}
