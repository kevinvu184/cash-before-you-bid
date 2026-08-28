import type { TFunction } from 'i18next'
import {
  BUFFER_BASE_AMOUNT,
  DUTY_BAND_BASE,
  DUTY_BAND_THRESHOLD,
  FHB_DUTY_CONCESSION_CAP,
  FHB_DUTY_CONCESSION_RANGE,
  FHB_DUTY_EXEMPTION_CAP,
  FHOG_PRICE_CAP,
  HTB_INCOME_CAP_COUPLE,
  HTB_INCOME_CAP_SINGLE,
  PEXA_MORTGAGE_FEE,
  PEXA_TRANSFER_FEE,
  TRANSFER_FEE_BASE,
  TRANSFER_FEE_CAP,
  TRANSFER_FEE_PER_THOUSAND,
  TRANSFER_FEE_UNIT,
} from '../data/constants'
import { BASE_CURRENCY } from '../logic/currencyConfig'
import { displayMoney, type Display } from '../logic/display'
import { formatNumber, formatPercent } from '../logic/format'
import type { Flag, RowCode, RowHow } from '../types/calculator'

// The calculator emits codes and numbers; these maps turn them into text for
// the active locale. Every key is a literal — no key construction — so a
// grep for a key always finds both the JSON entry and its use.
//
// Money comes in two flavours. Computed figures are estimates: rounded for
// display (per-currency unit) and prefixed via the money.approx key. Figures
// that must read exactly — what the user typed, statutory caps written into
// the rules — stay unrounded and unprefixed while they are shown in the
// currency they were written in (see exactMoney).
//
// Both take the Display: the amounts arriving here are all in the base
// currency, and it carries the conversion to whatever the reader chose. Every
// figure in a sentence goes through one of the two, constants included — an
// explanation that mixed a converted amount with a literal dollar threshold
// would read as an equation subtracting dollars from đồng.

/** A computed figure: rounded to the currency's display unit, "~"-prefixed. */
export function approxMoney(amount: number, t: TFunction, display: Display): string {
  return t('money.approx', { amount: displayMoney(amount, display) })
}

/**
 * A table row amount: rounded and "~"-prefixed, with the typographic minus
 * ahead of the prefix ("−~10.000 AUD") — the sign applies to the whole
 * approximate amount, not the other way around.
 */
export function approxRowAmount(amount: number, t: TFunction, display: Display): string {
  const approxAbs = approxMoney(Math.abs(amount), t, display)
  return (amount < 0 ? '−' : '') + approxAbs
}

/**
 * An exact figure: what the user typed, or a statutory constant written into
 * the Victorian rules.
 *
 * Exact is a claim that only holds in the currency the figure is defined in.
 * A $600,000 threshold is exact in dollars; put through a rate it becomes an
 * estimate like any other, and printing it to the đồng would claim a precision
 * the rate does not have. So it reads exactly in the base currency and joins
 * the other estimates — rounded, "~"-prefixed — once converted.
 */
function exactMoney(amount: number, t: TFunction, display: Display): string {
  if (display.currency === BASE_CURRENCY) {
    return displayMoney(amount, display, { round: false })
  }
  return approxMoney(amount, t, display)
}

export function flagText(flag: Flag, t: TFunction, display: Display): string {
  const p = flag.params ?? {}
  switch (flag.code) {
    case 'schemeNotNeeded':
      return t('flags.schemeNotNeeded')
    case 'schemeCapExceeded':
      return t('flags.schemeCapExceeded', { cap: exactMoney(p.cap, t, display) })
    case 'schemeResidency':
      return t('flags.schemeResidency')
    case 'schemeOwnerOccupier':
      return t('flags.schemeOwnerOccupier')
    case 'htbCapExceeded':
      return t('flags.htbCapExceeded', { cap: exactMoney(p.cap, t, display) })
    case 'htbCitizenship':
      return t('flags.htbCitizenship')
    case 'htbDetails':
      return t('flags.htbDetails', {
        share: formatPercent(p.sharePct, display.locale),
        single: exactMoney(HTB_INCOME_CAP_SINGLE, t, display),
        couple: exactMoney(HTB_INCOME_CAP_COUPLE, t, display),
      })
    case 'guarantorGap':
      return t('flags.guarantorGap')
    case 'fhogPriceCap':
      return t('flags.fhogPriceCap', { cap: exactMoney(FHOG_PRICE_CAP, t, display) })
    case 'genuineSavings':
      return t('flags.genuineSavings')
    case 'serviceability':
      return t('flags.serviceability', {
        assessed: approxMoney(p.assessed, t, display),
        rate: formatPercent(p.ratePct, display.locale),
      })
  }
}

const ROW_LABEL_KEYS: Record<RowCode, string> = {
  deposit: 'rows.deposit',
  stampDuty: 'rows.stampDuty',
  foreignDuty: 'rows.foreignDuty',
  transferFee: 'rows.transferFee',
  mortgageFee: 'rows.mortgageFee',
  pexaFees: 'rows.pexaFees',
  lmi: 'rows.lmi',
  conveyancing: 'rows.conveyancing',
  buildingAndPest: 'rows.buildingAndPest',
  lenderFees: 'rows.lenderFees',
  settlementAdjustments: 'rows.settlementAdjustments',
  buildingInsurance: 'rows.buildingInsurance',
  grant: 'rows.grant',
  costsSubtotal: 'rows.costsSubtotal',
  moving: 'rows.moving',
  buffer: 'rows.buffer',
  total: 'rows.total',
}

export function rowLabel(code: RowCode, t: TFunction): string {
  return t(ROW_LABEL_KEYS[code])
}

export function howText(how: RowHow | null, t: TFunction, display: Display): string {
  if (how === null) return ''
  const p = how.params ?? {}
  let text: string
  switch (how.code) {
    case 'dutyFhbExempt':
      text = t('how.dutyFhbExempt', {
        dutiableValue: approxMoney(p.dutiableValue, t, display),
        cap: exactMoney(FHB_DUTY_EXEMPTION_CAP, t, display),
        zero: exactMoney(0, t, display),
      })
      break
    case 'dutyFhbConcession':
      text = t('how.dutyFhbConcession', {
        base: approxMoney(p.base, t, display),
        dutiableValue: approxMoney(p.dutiableValue, t, display),
        cap: exactMoney(FHB_DUTY_EXEMPTION_CAP, t, display),
        range: exactMoney(FHB_DUTY_CONCESSION_RANGE, t, display),
      })
      break
    case 'dutyFhbAboveCap':
      text = t('how.dutyFhbAboveCap', {
        dutiableValue: approxMoney(p.dutiableValue, t, display),
        cap: exactMoney(FHB_DUTY_CONCESSION_CAP, t, display),
        bandBase: exactMoney(DUTY_BAND_BASE, t, display),
        bandThreshold: exactMoney(DUTY_BAND_THRESHOLD, t, display),
      })
      break
    case 'dutyPpr':
      text = t('how.dutyPpr', { dutiableValue: approxMoney(p.dutiableValue, t, display) })
      break
    case 'dutyGeneral':
      text = t('how.dutyGeneral', { dutiableValue: approxMoney(p.dutiableValue, t, display) })
      break
    case 'foreignDuty':
      text = t('how.foreignDuty', { dutiableValue: approxMoney(p.dutiableValue, t, display) })
      break
    case 'transferFee':
      text = t('how.transferFee', {
        thousands: formatNumber(p.thousands, display.locale),
        base: exactMoney(TRANSFER_FEE_BASE, t, display),
        perThousand: exactMoney(TRANSFER_FEE_PER_THOUSAND, t, display),
        unit: exactMoney(TRANSFER_FEE_UNIT, t, display),
        cap: exactMoney(TRANSFER_FEE_CAP, t, display),
      })
      break
    case 'mortgageFeeLoan':
      text = t('how.mortgageFeeLoan')
      break
    case 'mortgageFeeNoLoan':
      text = t('how.mortgageFeeNoLoan')
      break
    case 'pexaBoth':
      text = t('how.pexaBoth', {
        transfer: exactMoney(PEXA_TRANSFER_FEE, t, display),
        mortgage: exactMoney(PEXA_MORTGAGE_FEE, t, display),
      })
      break
    case 'pexaTransferOnly':
      text = t('how.pexaTransferOnly', {
        transfer: exactMoney(PEXA_TRANSFER_FEE, t, display),
      })
      break
    case 'lmiHtb':
      text = t('how.lmiHtb')
      break
    case 'lmiScheme':
      text = t('how.lmiScheme')
      break
    case 'lmiLvrUnder80':
      text = t('how.lmiLvrUnder80', { lvr: formatPercent(p.lvrPct, display.locale) })
      break
    case 'lmiGuarantor':
      text = t('how.lmiGuarantor')
      break
    case 'lmiCharged':
      text = t('how.lmiCharged', {
        loan: approxMoney(p.loan, t, display),
        rate: formatPercent(p.ratePct, display.locale),
        lvr: formatPercent(p.lvrPct, display.locale),
      })
      break
    case 'lmiChargedCapitalised':
      text = t('how.lmiChargedCapitalised', {
        loan: approxMoney(p.loan, t, display),
        rate: formatPercent(p.ratePct, display.locale),
        lvr: formatPercent(p.lvrPct, display.locale),
      })
      break
    case 'yourFigure':
      text = t('how.yourFigure')
      break
    case 'settlementAdjustments':
      text = t('how.settlementAdjustments')
      break
    case 'buildingInsurance':
      text = t('how.buildingInsurance')
      break
    case 'grant':
      text = t('how.grant', { cap: exactMoney(FHOG_PRICE_CAP, t, display) })
      break
    case 'deposit':
      text = t('how.deposit', {
        pct: formatPercent(p.pct, display.locale),
        price: exactMoney(p.price, t, display),
      })
      break
    case 'costsSubtotal':
      text = t('how.costsSubtotal')
      break
    case 'buffer':
      text = t('how.buffer', {
        count: p.months,
        repayment: approxMoney(p.repayment, t, display),
        base: exactMoney(BUFFER_BASE_AMOUNT, t, display),
      })
      break
    case 'noBuffer':
      text = t('how.noBuffer')
      break
    case 'total':
      text = t('how.total')
      break
  }
  if (how.offThePlan) {
    const otp = how.offThePlan
    const prefix = t('how.dutyOffThePlan', {
      price: exactMoney(otp.price, t, display),
      construction: exactMoney(otp.construction, t, display),
      dutiableValue: approxMoney(otp.dutiableValue, t, display),
    })
    return `${prefix} ${text}`
  }
  return text
}
