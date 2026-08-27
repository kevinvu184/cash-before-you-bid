import { APRA_ASSESSMENT_BUFFER, BUFFER_BASE_AMOUNT, FHOG_PRICE_CAP } from '../data/constants'
import type {
  CalculationResult,
  CalculatorInputs,
  Flag,
  FlagKind,
  TableRow,
} from '../types/calculator'
import {
  clampDepositPct,
  depositHint,
  governmentEquityShare,
  regionPriceCap,
} from './deposit'
import { foreignPurchaserDuty, stampDuty } from './duty'
import { mortgageRegistrationFee, pexaFees, transferRegistrationFee } from './fees'
import { formatMoney, formatPercent, formatRowAmount } from './format'
import { firstHomeOwnerGrant } from './grant'
import { lmiRate } from './lmi'
import { monthlyRepayment } from './loan'

// Mirrors the original's `+value || 0` guard for cleared/invalid inputs.
const orZero = (n: number): number => (Number.isFinite(n) ? n : 0)

export function calculate(inputs: CalculatorInputs): CalculationResult {
  const price = orZero(inputs.price)
  const { route, region, firstHomeBuyer, ownerOccupier, newHome, foreignPurchaser } = inputs
  const depositPct = clampDepositPct(route, orZero(inputs.depositPct))
  const otp = Math.min(orZero(inputs.offThePlanConstruction), price)
  const rate = orZero(inputs.interestRatePct) / 100
  const conveyancing = orZero(inputs.conveyancing)
  const buildingAndPest = orZero(inputs.buildingAndPest)
  const lenderFees = orZero(inputs.lenderFees)
  const settlementAdjustments = orZero(inputs.settlementAdjustments)
  const buildingInsurance = orZero(inputs.buildingInsurance)
  const movingCosts = orZero(inputs.movingCosts)
  const bufferMonths = orZero(inputs.bufferMonths)
  const capitaliseLmi = inputs.capitaliseLmi

  const flags: Flag[] = []
  const flag = (kind: FlagKind, message: string) => flags.push({ kind, message })

  const cap = regionPriceCap(region)
  const govEq = governmentEquityShare(route, newHome)
  if (route === 'scheme') {
    if (depositPct >= 20)
      flag('note', 'With 20% or more you do not need the scheme; LMI is not charged anyway.')
    if (price > cap)
      flag(
        'warn',
        `Price is above the 5% Deposit Scheme cap of ${formatMoney(cap)} for this region — the scheme is not available; LMI has been applied instead.`,
      )
    if (foreignPurchaser)
      flag('warn', 'The scheme requires an Australian citizen or permanent resident — LMI applied instead.')
    if (!ownerOccupier) flag('warn', 'The scheme is owner-occupier only — LMI applied instead.')
  }
  if (route === 'htb') {
    if (price > cap)
      flag('warn', `Price is above the Help to Buy cap of ${formatMoney(cap)} for this region.`)
    if (foreignPurchaser) flag('warn', 'Help to Buy requires Australian citizenship.')
    flag(
      'note',
      `Help to Buy: income caps $103,000 single / $165,000 couple; 10,000 places a year; CBA and Bank Australia only (Jun 2026). Government share is ${formatPercent(govEq * 100)} and is repaid at market value on sale.`,
    )
  }
  if (route === 'nolmi' && depositPct < 20)
    flag('note', 'Under 20% deposit without LMI needs a family guarantor pledging the gap; shown with no LMI.')

  const deposit = (price * depositPct) / 100
  const loan = Math.max(0, price - deposit - price * govEq)
  const lvr = price > 0 ? (loan / price) * 100 : 0

  const lines: TableRow[] = []
  const line = (label: string, amount: number, how: string) =>
    lines.push({ label, amount, formatted: formatRowAmount(amount), how, emphasis: false })

  const dutyResult = stampDuty({
    price,
    offThePlanConstruction: otp,
    firstHomeBuyer,
    ownerOccupier,
  })
  const { dutiableValue, duty } = dutyResult
  const fpad = foreignPurchaser ? foreignPurchaserDuty(dutiableValue) : 0
  line('Stamp duty (land transfer duty)', duty, dutyResult.how)
  if (foreignPurchaser)
    line('Foreign purchaser additional duty', fpad, `8% × ${formatMoney(dutiableValue)}`)

  line(
    'Transfer registration fee',
    transferRegistrationFee(price),
    `$104.30 + $2.34 × ${Math.floor(price / 1000)} (per $1,000), capped $3,614, rounded up`,
  )
  line(
    'Mortgage registration fee',
    mortgageRegistrationFee(loan),
    loan > 0 ? 'Land Services Victoria 2026-27' : 'No loan',
  )
  line(
    'PEXA fees',
    pexaFees(loan),
    loan > 0 ? '$146.30 transfer + $74.14 mortgage' : '$146.30 transfer',
  )

  const schemeOK =
    route === 'scheme' && price <= cap && !foreignPurchaser && ownerOccupier && depositPct < 20
  let lmi = 0
  let lmiHow: string
  if (route === 'htb') {
    lmiHow = 'Help to Buy: no LMI'
  } else if (schemeOK) {
    lmiHow = '5% Deposit Scheme: government guarantees 15%, no LMI'
  } else if (route === 'nolmi') {
    lmiHow =
      depositPct >= 20
        ? `LVR ${formatPercent(lvr)} ≤ 80%: no LMI`
        : 'Guarantor covers the gap: no LMI'
  } else {
    const r = lmiRate(lvr)
    lmi = loan * r * 1.1
    lmiHow =
      lvr <= 80
        ? `LVR ${formatPercent(lvr)} ≤ 80%: no LMI`
        : `Loan ${formatMoney(loan)} × ${formatPercent(r * 100)} (LVR ${formatPercent(lvr)}) × 1.10 Victorian insurance duty — indicative`
  }
  let lmiCash = lmi
  let loanFinal = loan
  if (lmi > 0 && capitaliseLmi) {
    lmiCash = 0
    loanFinal = loan + lmi
    lmiHow += ' — capitalised into the loan'
  }
  line('Lenders Mortgage Insurance (incl. 10% duty)', lmiCash, lmiHow)

  line('Conveyancing incl. disbursements', conveyancing, 'Your figure')
  line('Building and pest inspection', buildingAndPest, 'Your figure')
  line('Lender fees', lenderFees, 'Your figure')
  line(
    'Settlement adjustments',
    settlementAdjustments,
    'Rates, water, owners corp apportioned to settlement day',
  )
  line('Building insurance (first year)', buildingInsurance, 'Lender requires cover before settlement')

  const grant = firstHomeOwnerGrant({ firstHomeBuyer, newHome, ownerOccupier, price, foreignPurchaser })
  if (grant > 0) {
    line(
      'First Home Owner Grant',
      -grant,
      'New home ≤ $750,000, eligible first home buyer; usually applied at settlement',
    )
  } else if (newHome && price > FHOG_PRICE_CAP) {
    flag('note', 'First Home Owner Grant not available: price above $750,000.')
  }

  const costs = lines.reduce((sum, l) => sum + l.amount, 0)
  const rep = monthlyRepayment(loanFinal, rate)
  const repAssessed = monthlyRepayment(loanFinal, rate + APRA_ASSESSMENT_BUFFER)
  const buffer = bufferMonths > 0 ? bufferMonths * rep + BUFFER_BASE_AMOUNT : 0
  const total = deposit + costs + movingCosts + buffer

  const tiles = {
    total: {
      value: formatMoney(total),
      sub: `Deposit ${formatMoney(deposit)} + costs ${formatMoney(costs)} + moving ${formatMoney(movingCosts)} + buffer ${formatMoney(buffer)}`,
    },
    deposit: {
      value: formatMoney(deposit),
      sub: `${formatPercent(depositPct)} of ${formatMoney(price)}`,
    },
    costs: {
      value: formatMoney(costs),
      sub: price > 0 ? `${formatPercent((costs / price) * 100)} of price` : '',
    },
    loan: {
      value: formatMoney(loanFinal),
      sub:
        `LVR ${formatPercent((loanFinal / price) * 100)}` +
        (govEq ? ` · government equity ${formatMoney(price * govEq)}` : ''),
    },
    repayment: {
      value: formatMoney(rep),
      sub: `at ${formatPercent(rate * 100)} · assessed at ${formatPercent((rate + APRA_ASSESSMENT_BUFFER) * 100)}: ${formatMoney(repAssessed)}/mo`,
    },
  }

  const rows: TableRow[] = []
  const row = (label: string, amount: number, how: string, emphasis = false) =>
    rows.push({ label, amount, formatted: formatRowAmount(amount), how, emphasis })
  row('Deposit', deposit, `${formatPercent(depositPct)} × ${formatMoney(price)}`)
  rows.push(...lines)
  row('Purchase costs subtotal', costs, 'Sum of the lines above (excluding deposit)', true)
  row('Moving and set-up', movingCosts, 'Your figure')
  row(
    'Buffer',
    buffer,
    bufferMonths > 0 ? `${bufferMonths} × ${formatMoney(rep)} + $1,000` : 'No buffer',
  )
  row('Total cash before you bid', total, 'Deposit + costs + moving + buffer', true)

  if (total > 0 && price > 0 && depositPct < 20 && lvr > 90 && !schemeOK && route !== 'htb')
    flag('note', 'LVR above 90%: most lenders want 5% of the price as genuine savings held for 3+ months.')
  if (loanFinal > 0 && repAssessed > 0)
    flag(
      'ok',
      `Serviceability check: the lender will test ${formatMoney(repAssessed)}/month at ${formatPercent((rate + APRA_ASSESSMENT_BUFFER) * 100)}. If that is more than about 35–40% of your after-tax income, expect the loan to be cut.`,
    )

  return {
    appliedDepositPct: depositPct,
    depositHint: depositHint(route),
    flags,
    tiles,
    rows,
    totals: {
      deposit,
      purchaseCosts: costs,
      loan: loanFinal,
      // Reported against the final loan so it stays consistent with `loan`
      // when LMI is capitalised; the pre-capitalisation `lvr` above is what
      // prices the LMI and drives the flags, matching the original.
      lvrPct: price > 0 ? (loanFinal / price) * 100 : 0,
      monthlyRepayment: rep,
      assessedRepayment: repAssessed,
      buffer,
      totalCash: total,
      governmentEquity: price * govEq,
      lmiPremium: lmi,
      lmiCash,
      stampDuty: duty,
      dutiableValue,
      grant,
    },
  }
}
