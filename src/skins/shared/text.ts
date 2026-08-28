import type { TFunction } from 'i18next'
import { formatAud, formatNumber, formatPercent } from '../../logic/format'
import type { Flag, RowHow } from '../../types/calculator'
import type { TextParam, TextRef } from '../../types/viewModel'

// The calculator emits codes and numbers; these maps turn them into text for
// the active locale. Every key is a literal — no key construction — so a
// grep for a key always finds both the JSON entry and its use.
//
// This module is shared presentation, not core: it is the one place where a
// key and its numbers become a sentence, so no skin has to own that mapping
// and no two skins can disagree about it.

/** Formats one interpolation parameter the view model tagged with a format. */
export function textParam(param: TextParam, locale: string): string | number {
  switch (param.format) {
    case 'money':
      return formatAud(param.value, locale)
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
      return t('flags.schemeCapExceeded', { cap: formatAud(p.cap, locale) })
    case 'schemeResidency':
      return t('flags.schemeResidency')
    case 'schemeOwnerOccupier':
      return t('flags.schemeOwnerOccupier')
    case 'htbCapExceeded':
      return t('flags.htbCapExceeded', { cap: formatAud(p.cap, locale) })
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
        assessed: formatAud(p.assessed, locale),
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
      text = t('how.dutyFhbExempt', { dutiableValue: formatAud(p.dutiableValue, locale) })
      break
    case 'dutyFhbConcession':
      text = t('how.dutyFhbConcession', {
        base: formatAud(p.base, locale),
        dutiableValue: formatAud(p.dutiableValue, locale),
      })
      break
    case 'dutyFhbAboveCap':
      text = t('how.dutyFhbAboveCap', { dutiableValue: formatAud(p.dutiableValue, locale) })
      break
    case 'dutyPpr':
      text = t('how.dutyPpr', { dutiableValue: formatAud(p.dutiableValue, locale) })
      break
    case 'dutyGeneral':
      text = t('how.dutyGeneral', { dutiableValue: formatAud(p.dutiableValue, locale) })
      break
    case 'foreignDuty':
      text = t('how.foreignDuty', { dutiableValue: formatAud(p.dutiableValue, locale) })
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
        loan: formatAud(p.loan, locale),
        rate: formatPercent(p.ratePct, locale),
        lvr: formatPercent(p.lvrPct, locale),
      })
      break
    case 'lmiChargedCapitalised':
      text = t('how.lmiChargedCapitalised', {
        loan: formatAud(p.loan, locale),
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
        price: formatAud(p.price, locale),
      })
      break
    case 'costsSubtotal':
      text = t('how.costsSubtotal')
      break
    case 'buffer':
      text = t('how.buffer', { count: p.months, repayment: formatAud(p.repayment, locale) })
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
      price: formatAud(otp.price, locale),
      construction: formatAud(otp.construction, locale),
      dutiableValue: formatAud(otp.dutiableValue, locale),
    })
    return `${prefix} ${text}`
  }
  return text
}
