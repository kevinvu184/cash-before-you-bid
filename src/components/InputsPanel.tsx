import type { UseCalculatorResult } from '../hooks/useCalculator'
import type { CalculatorInputs, DepositRoute, Region } from '../types/calculator'
import { CopyLink } from './CopyLink'
import { CheckboxField, NumberField, SelectField } from './Field'

const ROUTE_OPTIONS: ReadonlyArray<{ value: DepositRoute; label: string }> = [
  { value: 'scheme', label: 'Australian Government 5% Deposit Scheme (no LMI)' },
  { value: 'lmi', label: 'Pay LMI (deposit under 20%)' },
  { value: 'nolmi', label: '20%+ deposit or family guarantor (no LMI)' },
  { value: 'htb', label: 'Help to Buy (2% deposit, government equity)' },
]

const REGION_OPTIONS: ReadonlyArray<{ value: Region; label: string }> = [
  { value: 'metro', label: 'Melbourne or Geelong (scheme cap $950k)' },
  { value: 'regional', label: 'Rest of Victoria (scheme cap $650k)' },
]

interface InputsPanelProps {
  inputs: CalculatorInputs
  depositHint: string
  setField: UseCalculatorResult['setField']
  setRoute: (route: DepositRoute) => void
}

export function InputsPanel({ inputs, depositHint, setField, setRoute }: InputsPanelProps) {
  return (
    <aside className="panel" aria-label="Inputs">
      <h2 className="section-mark">01 — Your numbers</h2>

      <NumberField
        id="price"
        label="Purchase price ($)"
        value={inputs.price}
        step={5000}
        min={50000}
        onChange={(next) => setField('price', next)}
      />
      <SelectField
        id="route"
        label="Deposit route"
        value={inputs.route}
        options={ROUTE_OPTIONS}
        onChange={setRoute}
      />
      <NumberField
        id="dep"
        label="Your deposit (%)"
        value={inputs.depositPct}
        hint={depositHint}
        step={0.5}
        min={0}
        max={100}
        onChange={(next) => setField('depositPct', next)}
      />
      <SelectField
        id="region"
        label="Where in Victoria"
        value={inputs.region}
        options={REGION_OPTIONS}
        onChange={(next) => setField('region', next)}
      />
      <CheckboxField
        id="fhb"
        label="Eligible first home buyer (never owned, will live in it 12 months)"
        checked={inputs.firstHomeBuyer}
        onChange={(next) => setField('firstHomeBuyer', next)}
      />
      <CheckboxField
        id="ppr"
        label="Buying to live in (principal place of residence)"
        checked={inputs.ownerOccupier}
        onChange={(next) => setField('ownerOccupier', next)}
      />
      <CheckboxField
        id="newhome"
        label="New home (never occupied) — First Home Owner Grant $10,000 if ≤ $750k"
        checked={inputs.newHome}
        onChange={(next) => setField('newHome', next)}
      />
      <NumberField
        id="otp"
        label="Off-the-plan: construction cost still to be built at contract ($)"
        value={inputs.offThePlanConstruction}
        hint="Strata apartments/townhouses only; reduces dutiable value. 0 for established homes."
        step={10000}
        min={0}
        onChange={(next) => setField('offThePlanConstruction', next)}
      />
      <CheckboxField
        id="foreign"
        label="Not a citizen or permanent resident (foreign purchaser duty +8%)"
        checked={inputs.foreignPurchaser}
        onChange={(next) => setField('foreignPurchaser', next)}
      />
      <NumberField
        id="rate"
        label="Interest rate (% p.a.)"
        value={inputs.interestRatePct}
        step={0.05}
        min={1}
        max={15}
        onChange={(next) => setField('interestRatePct', next)}
      />

      <details className="assumptions">
        <summary>Cost assumptions (edit if you have quotes)</summary>
        <NumberField
          id="conv"
          label="Conveyancing incl. disbursements ($)"
          value={inputs.conveyancing}
          step={50}
          onChange={(next) => setField('conveyancing', next)}
        />
        <NumberField
          id="bp"
          label="Building and pest inspection ($)"
          value={inputs.buildingAndPest}
          step={50}
          onChange={(next) => setField('buildingAndPest', next)}
        />
        <NumberField
          id="lender"
          label="Lender fees: settlement + valuation ($)"
          value={inputs.lenderFees}
          step={50}
          onChange={(next) => setField('lenderFees', next)}
        />
        <NumberField
          id="adj"
          label="Settlement adjustments to vendor ($)"
          value={inputs.settlementAdjustments}
          step={50}
          onChange={(next) => setField('settlementAdjustments', next)}
        />
        <NumberField
          id="ins"
          label="Building insurance, first year ($)"
          value={inputs.buildingInsurance}
          step={50}
          onChange={(next) => setField('buildingInsurance', next)}
        />
        <NumberField
          id="move"
          label="Moving and set-up ($)"
          value={inputs.movingCosts}
          step={250}
          onChange={(next) => setField('movingCosts', next)}
        />
        <NumberField
          id="bufm"
          label="Buffer (months of repayments)"
          value={inputs.bufferMonths}
          step={1}
          min={0}
          onChange={(next) => setField('bufferMonths', next)}
        />
        <CheckboxField
          id="caplmi"
          label="Capitalise LMI into the loan (pay nothing upfront)"
          checked={inputs.capitaliseLmi}
          onChange={(next) => setField('capitaliseLmi', next)}
        />
      </details>

      <CopyLink />

      <p className="panel-foot">
        Your numbers live in the address bar, so a link reproduces this exact view. Rules as at 25
        Aug 2026; indicative only, not advice.
      </p>
    </aside>
  )
}
