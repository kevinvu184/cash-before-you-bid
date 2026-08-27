import { useTranslation } from 'react-i18next'
import type { UseCalculatorResult } from '../hooks/useCalculator'
import type { CalculatorInputs, DepositRoute, Region } from '../types/calculator'
import { CheckboxField, NumberField, SelectField } from './Field'
import { ShareLink } from './ShareLink'

const ROUTE_KEYS: Record<DepositRoute, string> = {
  scheme: 'routes.scheme',
  lmi: 'routes.lmi',
  nolmi: 'routes.nolmi',
  htb: 'routes.htb',
}

const REGION_KEYS: Record<Region, string> = {
  metro: 'regions.metro',
  regional: 'regions.regional',
}

const HINT_KEYS: Record<DepositRoute, string> = {
  scheme: 'hints.scheme',
  lmi: 'hints.lmi',
  nolmi: 'hints.nolmi',
  htb: 'hints.htb',
}

const ROUTE_ORDER: readonly DepositRoute[] = ['scheme', 'lmi', 'nolmi', 'htb']
const REGION_ORDER: readonly Region[] = ['metro', 'regional']

interface InputsPanelProps {
  inputs: CalculatorInputs
  setField: UseCalculatorResult['setField']
  setRoute: (route: DepositRoute) => void
}

export function InputsPanel({ inputs, setField, setRoute }: InputsPanelProps) {
  const { t } = useTranslation()

  const routeOptions = ROUTE_ORDER.map((value) => ({ value, label: t(ROUTE_KEYS[value]) }))
  const regionOptions = REGION_ORDER.map((value) => ({ value, label: t(REGION_KEYS[value]) }))

  return (
    <aside className="panel" aria-label={t('inputs.label')}>
      <h2 className="section-mark">{t('inputs.heading')}</h2>

      <NumberField
        id="price"
        label={t('inputs.price')}
        value={inputs.price}
        onChange={(next) => setField('price', next)}
      />
      <SelectField
        id="route"
        label={t('inputs.route')}
        value={inputs.route}
        options={routeOptions}
        onChange={setRoute}
      />
      <NumberField
        id="dep"
        label={t('inputs.deposit')}
        value={inputs.depositPct}
        hint={t(HINT_KEYS[inputs.route])}
        onChange={(next) => setField('depositPct', next)}
      />
      <SelectField
        id="region"
        label={t('inputs.region')}
        value={inputs.region}
        options={regionOptions}
        onChange={(next) => setField('region', next)}
      />
      <CheckboxField
        id="fhb"
        label={t('inputs.fhb')}
        checked={inputs.firstHomeBuyer}
        onChange={(next) => setField('firstHomeBuyer', next)}
      />
      <CheckboxField
        id="ppr"
        label={t('inputs.ppr')}
        checked={inputs.ownerOccupier}
        onChange={(next) => setField('ownerOccupier', next)}
      />
      <CheckboxField
        id="newhome"
        label={t('inputs.newHome')}
        checked={inputs.newHome}
        onChange={(next) => setField('newHome', next)}
      />
      <NumberField
        id="otp"
        label={t('inputs.otp')}
        value={inputs.offThePlanConstruction}
        hint={t('inputs.otpHint')}
        onChange={(next) => setField('offThePlanConstruction', next)}
      />
      <CheckboxField
        id="foreign"
        label={t('inputs.foreign')}
        checked={inputs.foreignPurchaser}
        onChange={(next) => setField('foreignPurchaser', next)}
      />
      <NumberField
        id="rate"
        label={t('inputs.rate')}
        value={inputs.interestRatePct}
        onChange={(next) => setField('interestRatePct', next)}
      />

      <details className="assumptions">
        <summary>{t('inputs.assumptions')}</summary>
        <NumberField
          id="conv"
          label={t('inputs.conveyancing')}
          value={inputs.conveyancing}
          onChange={(next) => setField('conveyancing', next)}
        />
        <NumberField
          id="bp"
          label={t('inputs.buildingAndPest')}
          value={inputs.buildingAndPest}
          onChange={(next) => setField('buildingAndPest', next)}
        />
        <NumberField
          id="lender"
          label={t('inputs.lenderFees')}
          value={inputs.lenderFees}
          onChange={(next) => setField('lenderFees', next)}
        />
        <NumberField
          id="adj"
          label={t('inputs.settlementAdjustments')}
          value={inputs.settlementAdjustments}
          onChange={(next) => setField('settlementAdjustments', next)}
        />
        <NumberField
          id="ins"
          label={t('inputs.buildingInsurance')}
          value={inputs.buildingInsurance}
          onChange={(next) => setField('buildingInsurance', next)}
        />
        <NumberField
          id="move"
          label={t('inputs.moving')}
          value={inputs.movingCosts}
          onChange={(next) => setField('movingCosts', next)}
        />
        <NumberField
          id="bufm"
          label={t('inputs.bufferMonths')}
          value={inputs.bufferMonths}
          onChange={(next) => setField('bufferMonths', next)}
        />
        <CheckboxField
          id="caplmi"
          label={t('inputs.capitaliseLmi')}
          checked={inputs.capitaliseLmi}
          onChange={(next) => setField('capitaliseLmi', next)}
        />
      </details>

      <ShareLink />

      <p className="panel-foot">{t('inputs.foot')}</p>
    </aside>
  )
}
