import type { ChangeEvent } from 'react'
import './App.css'
import { useCalculator } from './hooks/useCalculator'
import { useCopyLink } from './hooks/useCopyLink'
import type { DepositRoute, Region } from './types/calculator'

interface NumberFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  hint?: string
}

// Mirrors the original page's `+value || 0` guard: a cleared field is 0.
function toNumber(event: ChangeEvent<HTMLInputElement>): number {
  const n = Number(event.target.value)
  return Number.isFinite(n) ? n : 0
}

function NumberField({ id, label, value, onChange, min, max, step, hint }: NumberFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(toNumber(e))}
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  )
}

interface CheckboxFieldProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function CheckboxField({ id, label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

const ROUTE_LABELS: Record<DepositRoute, string> = {
  scheme: '5% Deposit Scheme (no LMI)',
  lmi: 'Low deposit with LMI',
  nolmi: '20% deposit / guarantor (no LMI)',
  htb: 'Help to Buy (shared equity)',
}

const REGION_LABELS: Record<Region, string> = {
  metro: 'Melbourne / Geelong',
  regional: 'Regional Victoria',
}

function CopyLinkButton() {
  const { copy, status, fallbackUrl } = useCopyLink()
  return (
    <div className="share">
      <button type="button" className="copy-link" onClick={() => void copy()}>
        Copy link
      </button>
      <span className="share-status" role="status" aria-live="polite">
        {status === 'copied' && 'Link copied'}
        {status === 'failed' && 'Copy failed — select the link below'}
      </span>
      {fallbackUrl && (
        <input
          className="share-fallback"
          type="text"
          readOnly
          value={fallbackUrl}
          aria-label="Shareable link"
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  )
}

function App() {
  const { inputs, result, setField, setRoute } = useCalculator()

  return (
    <main className="app">
      <header className="app-header">
        <h1>Cash Before You Bid</h1>
        <p className="tagline">Know your numbers before the auction starts.</p>
      </header>

      <form className="inputs" onSubmit={(e) => e.preventDefault()}>
        <div className="field-grid">
          <NumberField
            id="price"
            label="Purchase price ($)"
            value={inputs.price}
            onChange={(v) => setField('price', v)}
            min={0}
            step={10_000}
          />
          <div className="field">
            <label htmlFor="route">Deposit route</label>
            <select
              id="route"
              value={inputs.route}
              onChange={(e) => setRoute(e.target.value as DepositRoute)}
            >
              {(Object.keys(ROUTE_LABELS) as DepositRoute[]).map((route) => (
                <option key={route} value={route}>
                  {ROUTE_LABELS[route]}
                </option>
              ))}
            </select>
          </div>
          <NumberField
            id="dep"
            label="Deposit (%)"
            value={inputs.depositPct}
            onChange={(v) => setField('depositPct', v)}
            min={0}
            max={100}
            step={1}
            hint={result.depositHint}
          />
          <div className="field">
            <label htmlFor="region">Region</label>
            <select
              id="region"
              value={inputs.region}
              onChange={(e) => setField('region', e.target.value as Region)}
            >
              {(Object.keys(REGION_LABELS) as Region[]).map((region) => (
                <option key={region} value={region}>
                  {REGION_LABELS[region]}
                </option>
              ))}
            </select>
          </div>
          <NumberField
            id="rate"
            label="Interest rate (% p.a.)"
            value={inputs.interestRatePct}
            onChange={(v) => setField('interestRatePct', v)}
            min={0}
            max={25}
            step={0.05}
          />
          <NumberField
            id="otp"
            label="Off-the-plan construction ($)"
            value={inputs.offThePlanConstruction}
            onChange={(v) => setField('offThePlanConstruction', v)}
            min={0}
            step={10_000}
          />
        </div>

        <div className="check-grid">
          <CheckboxField
            id="fhb"
            label="First home buyer"
            checked={inputs.firstHomeBuyer}
            onChange={(v) => setField('firstHomeBuyer', v)}
          />
          <CheckboxField
            id="ppr"
            label="Living in it (owner-occupier)"
            checked={inputs.ownerOccupier}
            onChange={(v) => setField('ownerOccupier', v)}
          />
          <CheckboxField
            id="newhome"
            label="New home"
            checked={inputs.newHome}
            onChange={(v) => setField('newHome', v)}
          />
          <CheckboxField
            id="foreign"
            label="Foreign purchaser"
            checked={inputs.foreignPurchaser}
            onChange={(v) => setField('foreignPurchaser', v)}
          />
          <CheckboxField
            id="caplmi"
            label="Capitalise LMI into the loan"
            checked={inputs.capitaliseLmi}
            onChange={(v) => setField('capitaliseLmi', v)}
          />
        </div>

        <div className="field-grid">
          <NumberField
            id="conv"
            label="Conveyancing ($)"
            value={inputs.conveyancing}
            onChange={(v) => setField('conveyancing', v)}
            min={0}
            step={50}
          />
          <NumberField
            id="bp"
            label="Building and pest ($)"
            value={inputs.buildingAndPest}
            onChange={(v) => setField('buildingAndPest', v)}
            min={0}
            step={50}
          />
          <NumberField
            id="lender"
            label="Lender fees ($)"
            value={inputs.lenderFees}
            onChange={(v) => setField('lenderFees', v)}
            min={0}
            step={50}
          />
          <NumberField
            id="adj"
            label="Settlement adjustments ($)"
            value={inputs.settlementAdjustments}
            onChange={(v) => setField('settlementAdjustments', v)}
            min={0}
            step={50}
          />
          <NumberField
            id="ins"
            label="Building insurance ($)"
            value={inputs.buildingInsurance}
            onChange={(v) => setField('buildingInsurance', v)}
            min={0}
            step={50}
          />
          <NumberField
            id="move"
            label="Moving and set-up ($)"
            value={inputs.movingCosts}
            onChange={(v) => setField('movingCosts', v)}
            min={0}
            step={100}
          />
          <NumberField
            id="bufm"
            label="Buffer (months of repayments)"
            value={inputs.bufferMonths}
            onChange={(v) => setField('bufferMonths', v)}
            min={0}
            max={24}
            step={1}
          />
        </div>
      </form>

      <CopyLinkButton />

      <section className="results" aria-label="Results">
        <div className="tiles">
          <div className="tile tile-total">
            <h2>Total cash before you bid</h2>
            <p className="tile-value">{result.tiles.total.value}</p>
            <p className="tile-sub">{result.tiles.total.sub}</p>
          </div>
          <div className="tile">
            <h2>Deposit</h2>
            <p className="tile-value">{result.tiles.deposit.value}</p>
            <p className="tile-sub">{result.tiles.deposit.sub}</p>
          </div>
          <div className="tile">
            <h2>Purchase costs</h2>
            <p className="tile-value">{result.tiles.costs.value}</p>
            <p className="tile-sub">{result.tiles.costs.sub}</p>
          </div>
          <div className="tile">
            <h2>Loan</h2>
            <p className="tile-value">{result.tiles.loan.value}</p>
            <p className="tile-sub">{result.tiles.loan.sub}</p>
          </div>
          <div className="tile">
            <h2>Repayment / month</h2>
            <p className="tile-value">{result.tiles.repayment.value}</p>
            <p className="tile-sub">{result.tiles.repayment.sub}</p>
          </div>
        </div>

        {result.flags.length > 0 && (
          <ul className="flags">
            {result.flags.map((flag) => (
              <li key={flag.message} className={`flag flag-${flag.kind}`}>
                {flag.message}
              </li>
            ))}
          </ul>
        )}

        <table className="breakdown">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="amount">
                Amount
              </th>
              <th scope="col">How it is worked out</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.label} className={row.emphasis ? 'emphasis' : undefined}>
                <td>{row.label}</td>
                <td className="amount">{row.formatted}</td>
                <td className="how">{row.how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default App
