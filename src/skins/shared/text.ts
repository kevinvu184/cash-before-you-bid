import type { TFunction } from 'i18next'
import { APP_CURRENCY } from '../../logic/currencyConfig'
import { formatMoney, formatNumber, formatPercent, formatRowAmount } from '../../logic/format'
import type { Flag, RowHow } from '../../types/calculator'
import type { TextParam, TextRef } from '../../types/viewModel'

// The calculator emits codes and numbers; these maps turn them into text for
// the active locale. Every key is a literal — no key construction — so a
// grep for a key always finds both the JSON entry and its use.
//
// Money comes in two flavours. Computed figures are estimates: rounded for
// display (per-currency unit). Figures that must read exactly — what the user
// typed, statutory caps written into the rules — stay unrounded. Estimates
// carry no per-figure marker; the EstimateDisclaimer under the results says
// once, for the whole page, that the computed figures are rounded estimates.
//
// This module is shared presentation, not core: it is the one place where a
// key and its numbers become a sentence, so no skin has to own that mapping
// and no two skins can disagree about it.

/** A computed figure: rounded to the currency's display unit. */
export function estimateMoney(amount: number, locale: string): string {
  return formatMoney(amount, APP_CURRENCY, locale)
}

/**
 * A table row amount: the same rounded estimate, with the typographic minus
 * ahead of the digits ("−10.000 AUD"). formatRowAmount owns that sign
 * convention, so there is only ever one row-formatting path.
 */
export function estimateRowAmount(amount: number, locale: string): string {
  return formatRowAmount(amount, APP_CURRENCY, locale)
}

/** An exact figure (user input or statutory constant): never rounded. */
export function exactMoney(amount: number, locale: string): string {
  return formatMoney(amount, APP_CURRENCY, locale, { round: false })
}

/**
 * Formats one interpolation parameter the view model tagged with a format.
 * `money` is a computed figure and reads as a rounded estimate; `moneyExact`
 * is what the user typed or what a rule states, and is never rounded.
 */
export function textParam(param: TextParam, locale: string): string | number {
  switch (param.format) {
    case 'money':
      return estimateMoney(param.value, locale)
    case 'moneyExact':
      return exactMoney(param.value, locale)
    case 'percent':
      return formatPercent(param.value, locale)
    case 'number':
      return formatNumber(param.value, locale)
    case 'count':
      // i18next needs the raw number to pick the plural form.
      return param.value
    case 'raw':
      return param.value
  }
}

/** Renders a view-model TextRef: its key, with its numbers formatted. */
export function refText(ref: TextRef, t: TFunction, locale: string): string {
  const params: Record<string, string | number> = {}
  for (const [name, param] of Object.entries(ref.params)) {
    params[name] = textParam(param, locale)
  }
  return t(ref.key, params)
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
    case 'fhbResidency':
      return t('flags.fhbResidency')
    case 'fhogPriceCap':
      return t('flags.fhogPriceCap')
    case 'genuineSavings':
      return t('flags.genuineSavings')
    case 'serviceability':
      return t('flags.serviceability', {
        assessed: estimateMoney(p.assessed, locale),
        rate: formatPercent(p.ratePct, locale),
      })
  }
}

export function howText(how: RowHow | null, t: TFunction, locale: string): string {
  if (how === null) return ''
  const p = how.params ?? {}
  let text: string
  switch (how.code) {
    case 'dutyFhbExempt':
      text = t('how.dutyFhbExempt', { dutiableValue: estimateMoney(p.dutiableValue, locale) })
      break
    case 'dutyFhbConcession':
      text = t('how.dutyFhbConcession', {
        base: estimateMoney(p.base, locale),
        dutiableValue: estimateMoney(p.dutiableValue, locale),
      })
      break
    case 'dutyFhbAboveCap':
      text = t('how.dutyFhbAboveCap', { dutiableValue: estimateMoney(p.dutiableValue, locale) })
      break
    case 'dutyPpr':
      text = t('how.dutyPpr', { dutiableValue: estimateMoney(p.dutiableValue, locale) })
      break
    case 'dutyGeneral':
      text = t('how.dutyGeneral', { dutiableValue: estimateMoney(p.dutiableValue, locale) })
      break
    case 'foreignDuty':
      text = t('how.foreignDuty', { dutiableValue: estimateMoney(p.dutiableValue, locale) })
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
        loan: estimateMoney(p.loan, locale),
        rate: formatPercent(p.ratePct, locale),
        lvr: formatPercent(p.lvrPct, locale),
      })
      break
    case 'lmiChargedCapitalised':
      text = t('how.lmiChargedCapitalised', {
        loan: estimateMoney(p.loan, locale),
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
      text = t('how.buffer', { count: p.months, repayment: estimateMoney(p.repayment, locale) })
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
      dutiableValue: estimateMoney(otp.dutiableValue, locale),
    })
    return `${prefix} ${text}`
  }
  return text
}

/**
 * The day a scenario was saved, in the active locale. A stored timestamp of 0
 * means the payload carried no usable date (hand-edited, or written by a
 * version that did not record one); the caller shows nothing rather than
 * 1 January 1970.
 */
export function savedDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(timestamp)
}
