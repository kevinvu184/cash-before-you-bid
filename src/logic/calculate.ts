import { APRA_ASSESSMENT_BUFFER, BUFFER_BASE_AMOUNT, FHOG_PRICE_CAP } from '../data/constants'
import type {
  CalculationResult,
  CalculatorInputs,
  Flag,
  FlagCode,
  FlagKind,
  RowCode,
  RowHow,
  TableRow,
} from '../types/calculator'
import { clampDepositPct, governmentEquityShare, regionPriceCap } from './deposit'
import { foreignPurchaserDuty, stampDuty } from './duty'
import { mortgageRegistrationFee, pexaFees, transferRegistrationFee } from './fees'
import { firstHomeOwnerGrant } from './grant'
import { lmiRate } from './lmi'
import { monthlyRepayment } from './loan'

// Mirrors the original's `+value || 0` guard for cleared/invalid inputs.
const orZero = (n: number): number => (Number.isFinite(n) ? n : 0)

const round2 = (n: number): number => Math.round(n * 100) / 100

// Everything here is data: codes and numbers. The UI owns words and
// locale-specific formatting.
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
  const flag = (kind: FlagKind, code: FlagCode, params?: Record<string, number>) =>
    flags.push(params ? { kind, code, params } : { kind, code })

  const cap = regionPriceCap(region)
  const govEq = governmentEquityShare(route, newHome)
  if (route === 'scheme') {
    if (depositPct >= 20) flag('note', 'schemeNotNeeded')
    if (price > cap) flag('warn', 'schemeCapExceeded', { cap })
    if (foreignPurchaser) flag('warn', 'schemeResidency')
    if (!ownerOccupier) flag('warn', 'schemeOwnerOccupier')
  }
  if (route === 'htb') {
    if (price > cap) flag('warn', 'htbCapExceeded', { cap })
    if (foreignPurchaser) flag('warn', 'htbCitizenship')
    flag('note', 'htbDetails', { sharePct: govEq * 100 })
  }
  if (route === 'nolmi' && depositPct < 20) flag('note', 'guarantorGap')

  const deposit = (price * depositPct) / 100
  const loan = Math.max(0, price - deposit - price * govEq)
  const lvr = price > 0 ? (loan / price) * 100 : 0

  const lines: TableRow[] = []
  const line = (code: RowCode, amount: number, how: RowHow | null) =>
    lines.push({ code, amount, how, emphasis: false })

  const dutyResult = stampDuty({
    price,
    offThePlanConstruction: otp,
    firstHomeBuyer,
    ownerOccupier,
  })
  const { dutiableValue, duty } = dutyResult
  const fpad = foreignPurchaser ? foreignPurchaserDuty(dutiableValue) : 0
  line('stampDuty', duty, dutyResult.how)
  if (foreignPurchaser) line('foreignDuty', fpad, { code: 'foreignDuty', params: { dutiableValue } })

  line('transferFee', transferRegistrationFee(price), {
    code: 'transferFee',
    params: { thousands: Math.floor(price / 1000) },
  })
  line('mortgageFee', mortgageRegistrationFee(loan), {
    code: loan > 0 ? 'mortgageFeeLoan' : 'mortgageFeeNoLoan',
  })
  line('pexaFees', pexaFees(loan), { code: loan > 0 ? 'pexaBoth' : 'pexaTransferOnly' })

  const schemeOK =
    route === 'scheme' && price <= cap && !foreignPurchaser && ownerOccupier && depositPct < 20
  let lmi = 0
  let lmiHow: RowHow
  if (route === 'htb') {
    lmiHow = { code: 'lmiHtb' }
  } else if (schemeOK) {
    lmiHow = { code: 'lmiScheme' }
  } else if (route === 'nolmi') {
    lmiHow =
      depositPct >= 20
        ? { code: 'lmiLvrUnder80', params: { lvrPct: round2(lvr) } }
        : { code: 'lmiGuarantor' }
  } else {
    const r = lmiRate(lvr)
    lmi = loan * r * 1.1
    lmiHow =
      lvr <= 80
        ? { code: 'lmiLvrUnder80', params: { lvrPct: round2(lvr) } }
        : { code: 'lmiCharged', params: { loan, ratePct: round2(r * 100), lvrPct: round2(lvr) } }
  }
  let lmiCash = lmi
  let loanFinal = loan
  if (lmi > 0 && capitaliseLmi) {
    lmiCash = 0
    loanFinal = loan + lmi
    lmiHow = { code: 'lmiChargedCapitalised', params: lmiHow.params }
  }
  line('lmi', lmiCash, lmiHow)

  line('conveyancing', conveyancing, { code: 'yourFigure' })
  line('buildingAndPest', buildingAndPest, { code: 'yourFigure' })
  line('lenderFees', lenderFees, { code: 'yourFigure' })
  line('settlementAdjustments', settlementAdjustments, { code: 'settlementAdjustments' })
  line('buildingInsurance', buildingInsurance, { code: 'buildingInsurance' })

  const grant = firstHomeOwnerGrant({ firstHomeBuyer, newHome, ownerOccupier, price, foreignPurchaser })
  if (grant > 0) {
    line('grant', -grant, { code: 'grant' })
  } else if (newHome && price > FHOG_PRICE_CAP) {
    flag('note', 'fhogPriceCap')
  }

  const costs = lines.reduce((sum, l) => sum + l.amount, 0)
  const rep = monthlyRepayment(loanFinal, rate)
  const repAssessed = monthlyRepayment(loanFinal, rate + APRA_ASSESSMENT_BUFFER)
  const buffer = bufferMonths > 0 ? bufferMonths * rep + BUFFER_BASE_AMOUNT : 0
  const total = deposit + costs + movingCosts + buffer

  const tiles = {
    total: { value: total, deposit, costs, moving: movingCosts, buffer },
    deposit: { value: deposit, pct: depositPct, price },
    costs: { value: costs, pctOfPrice: price > 0 ? (costs / price) * 100 : null },
    loan: {
      value: loanFinal,
      lvrPct: (loanFinal / price) * 100,
      governmentEquity: price * govEq,
    },
    repayment: {
      value: rep,
      ratePct: rate * 100,
      assessedRatePct: (rate + APRA_ASSESSMENT_BUFFER) * 100,
      assessedValue: repAssessed,
    },
  }

  const rows: TableRow[] = []
  const row = (code: RowCode, amount: number, how: RowHow | null, emphasis = false) =>
    rows.push({ code, amount, how, emphasis })
  row('deposit', deposit, { code: 'deposit', params: { pct: depositPct, price } })
  rows.push(...lines)
  row('costsSubtotal', costs, { code: 'costsSubtotal' }, true)
  row('moving', movingCosts, { code: 'yourFigure' })
  row(
    'buffer',
    buffer,
    bufferMonths > 0
      ? { code: 'buffer', params: { months: bufferMonths, repayment: rep } }
      : { code: 'noBuffer' },
  )
  row('total', total, { code: 'total' }, true)

  if (total > 0 && price > 0 && depositPct < 20 && lvr > 90 && !schemeOK && route !== 'htb')
    flag('note', 'genuineSavings')
  if (loanFinal > 0 && repAssessed > 0)
    flag('ok', 'serviceability', {
      assessed: repAssessed,
      ratePct: (rate + APRA_ASSESSMENT_BUFFER) * 100,
    })

  return {
    appliedDepositPct: depositPct,
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
