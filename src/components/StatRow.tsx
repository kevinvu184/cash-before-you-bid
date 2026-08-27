import type { CalculationResult } from '../types/calculator'

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
  tiles: CalculationResult['tiles']
}

// A rule-divided list on a phone, a hairline-divided row from 820px. Ledger has
// no stat component; these are list rows, not cards.
export function StatRow({ tiles }: StatRowProps) {
  return (
    <div className="stats">
      <Stat
        id="tTotal"
        label="Total cash before you bid"
        value={tiles.total.value}
        sub={tiles.total.sub}
        emphasis
      />
      <Stat id="tDep" label="Deposit" value={tiles.deposit.value} sub={tiles.deposit.sub} />
      <Stat id="tCosts" label="Purchase costs" value={tiles.costs.value} sub={tiles.costs.sub} />
      <Stat id="tLoan" label="Loan" value={tiles.loan.value} sub={tiles.loan.sub} />
      <Stat
        id="tRep"
        label="Repayment / month"
        value={tiles.repayment.value}
        sub={tiles.repayment.sub}
      />
    </div>
  )
}
