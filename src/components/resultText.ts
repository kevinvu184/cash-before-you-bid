import type { TFunction } from 'i18next'
import { APP_CURRENCY } from '../logic/currencyConfig'
import { formatMoney, formatNumber, formatPercent } from '../logic/format'
import type { Flag, RowCode, RowHow } from '../types/calculator'

// The calculator emits codes and numbers; these maps turn them into text for
// the active locale. Every key is a literal — no key construction — so a
// grep for a key always finds both the JSON entry and its use.
//
// Money comes in two flavours. Computed figures are estimates: rounded for
// display (per-currency unit) and prefixed via the money.approx key. Figures
// that must read exactly — what the user typed, statutory caps written into
// the rules — stay unrounded and unprefixed.

/** A computed figure: rounded to the currency's display unit, "~"-prefixed. */
export function approxMoney(amount: number, t: TFunction, locale: string): string {
  return t('money.approx', { amount: formatMoney(amount, APP_CURRENCY, locale) })
}

/**
 * A table row amount: rounded and "~"-prefixed, with the typographic minus
 * ahead of the prefix ("−~10.000 AUD") — the sign applies to the whole
 * approximate amount, not the other way around.
 */
export function approxRowAmount(amount: number, t: TFunction, locale: string): string {
  const approxAbs = approxMoney(Math.abs(amount), t, locale)
  return (amount < 0 ? '−' : '') + approxAbs
}

/** An exact figure (user input or statutory constant): never rounded. */
function exactMoney(amount: number, locale: string): string {
  return formatMoney(amount, APP_CURRENCY, locale, { round: false })
}

export function flagText(flag: Flag, t: TFunction, locale: string): string {
  const p = flag.params ?? {}
  switch (flag.code) {
    case 'schemeNotNeeded':
      return t('flags.schemeNotNeeded')
    case 'schemeCapExceeded':
      return t('flags.schemeCapExceeded', { cap: exactMoney(p.cap, locale) })
    case 'schemeResidency':
      return t('flags.schemeResidency')
    case 'schemeOwnerOccupier':
      return t('flags.schemeOwnerOccupier')
    case 'htbCapExceeded':
      return t('flags.htbCapExceeded', { cap: exactMoney(p.cap, locale) })
    case 'htbCitizenship':
      return t('flags.htbCitizenship')
    case 'htbDetails':
      return t('flags.htbDetails', { share: formatPercent(p.sharePct, locale) })
    case 'guarantorGap':
      return t('flags.guarantorGap')
    case 'fhogPriceCap':
      return t('flags.fhogPriceCap')
    case 'genuineSavings':
      return t('flags.genuineSavings')
    case 'serviceability':
      return t('flags.serviceability', {
        assessed: approxMoney(p.assessed, t, locale),
        rate: formatPercent(p.ratePct, locale),
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

export function howText(how: RowHow | null, t: TFunction, locale: string): string {
  if (how === null) return ''
  const p = how.params ?? {}
  let text: string
  switch (how.code) {
    case 'dutyFhbExempt':
      text = t('how.dutyFhbExempt', { dutiableValue: approxMoney(p.dutiableValue, t, locale) })
      break
    case 'dutyFhbConcession':
      text = t('how.dutyFhbConcession', {
        base: approxMoney(p.base, t, locale),
        dutiableValue: approxMoney(p.dutiableValue, t, locale),
      })
      break
    case 'dutyFhbAboveCap':
      text = t('how.dutyFhbAboveCap', { dutiableValue: approxMoney(p.dutiableValue, t, locale) })
      break
    case 'dutyPpr':
      text = t('how.dutyPpr', { dutiableValue: approxMoney(p.dutiableValue, t, locale) })
      break
    case 'dutyGeneral':
      text = t('how.dutyGeneral', { dutiableValue: approxMoney(p.dutiableValue, t, locale) })
      break
    case 'foreignDuty':
      text = t('how.foreignDuty', { dutiableValue: approxMoney(p.dutiableValue, t, locale) })
      break
    case 'transferFee':
      text = t('how.transferFee', { thousands: formatNumber(p.thousands, locale) })
      break
    case 'mortgageFeeLoan':
      text = t('how.mortgageFeeLoan')
      break
    case 'mortgageFeeNoLoan':
      text = t('how.mortgageFeeNoLoan')
      break
    case 'pexaBoth':
      text = t('how.pexaBoth')
      break
    case 'pexaTransferOnly':
      text = t('how.pexaTransferOnly')
      break
    case 'lmiHtb':
      text = t('how.lmiHtb')
      break
    case 'lmiScheme':
      text = t('how.lmiScheme')
      break
    case 'lmiLvrUnder80':
      text = t('how.lmiLvrUnder80', { lvr: formatPercent(p.lvrPct, locale) })
      break
    case 'lmiGuarantor':
      text = t('how.lmiGuarantor')
      break
    case 'lmiCharged':
      text = t('how.lmiCharged', {
        loan: approxMoney(p.loan, t, locale),
        rate: formatPercent(p.ratePct, locale),
        lvr: formatPercent(p.lvrPct, locale),
      })
      break
    case 'lmiChargedCapitalised':
      text = t('how.lmiChargedCapitalised', {
        loan: approxMoney(p.loan, t, locale),
        rate: formatPercent(p.ratePct, locale),
        lvr: formatPercent(p.lvrPct, locale),
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
      text = t('how.grant')
      break
    case 'deposit':
      text = t('how.deposit', {
        pct: formatPercent(p.pct, locale),
        price: exactMoney(p.price, locale),
      })
      break
    case 'costsSubtotal':
      text = t('how.costsSubtotal')
      break
    case 'buffer':
      text = t('how.buffer', { count: p.months, repayment: approxMoney(p.repayment, t, locale) })
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
      price: exactMoney(otp.price, locale),
      construction: exactMoney(otp.construction, locale),
      dutiableValue: approxMoney(otp.dutiableValue, t, locale),
    })
    return `${prefix} ${text}`
  }
  return text
}
