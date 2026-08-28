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
} from '../../data/constants'
import { BASE_CURRENCY } from '../../logic/currencyConfig'
import { rateAsShown } from '../../logic/exchangeRate'
import { displayMoney, displayRowAmount, displayUnit, type Display } from '../../logic/display'
import { formatNumber, formatNumberInput, formatPercent } from '../../logic/format'
import type { Flag, RowHow } from '../../types/calculator'
import type { TextParam, TextRef } from '../../types/viewModel'

// The calculator emits codes and numbers; these maps turn them into text for
// the active locale. Every key is a literal — no key construction — so a
// grep for a key always finds both the JSON entry and its use.
//
// Money comes in two flavours. Computed figures are estimates: rounded for
// display (per-currency unit). Figures that must read exactly — what the user
// typed, statutory caps written into the rules — stay unrounded while they are
// shown in the currency they were written in (see exactMoney). Estimates carry
// no per-figure marker; the estimate note under the results says once, for the
// whole page, that the computed figures are rounded estimates.
//
// Every one of them takes the Display. The amounts arriving here are all in
// the base currency, and it carries the conversion to whatever the reader
// chose — statutory constants included. An explanation that mixed a converted
// amount with a literal dollar threshold would read as an equation subtracting
// dollars from đồng, which is why no money figure in the locale files is a
// literal any more.
//
// This module is shared presentation, not core: it is the one place where a
// key and its numbers become a sentence, so no skin has to own that mapping
// and no two skins can disagree about it.

/** A computed figure: rounded to the display currency's unit. */
export function estimateMoney(amount: number, display: Display): string {
  return displayMoney(amount, display)
}

/**
 * A table row amount: the same rounded estimate, with the typographic minus
 * ahead of the digits ("−10.000 AUD"). displayRowAmount owns that sign
 * convention, so there is only ever one row-formatting path.
 */
export function estimateRowAmount(amount: number, display: Display): string {
  return displayRowAmount(amount, display)
}

/**
 * An exact figure: what the user typed, or a statutory constant written into
 * the Victorian rules.
 *
 * Exact is a claim that only holds in the currency the figure is defined in.
 * A $600,000 threshold is exact in dollars; put through a rate it becomes an
 * estimate like any other, and printing it to the đồng would claim a precision
 * the rate does not have. So it reads exactly in the base currency and joins
 * the other estimates — rounded to the display unit — once converted.
 */
export function exactMoney(amount: number, display: Display): string {
  // Zero is the one figure no rate can make approximate — 0 times any rate is
  // exactly 0 — so it reads exactly in every currency. Without this the duty
  // exemption would round its own "→ 0" through the display unit, treating as
  // an estimate the one number in the sentence that is certain.
  if (display.currency === BASE_CURRENCY || amount === 0) {
    return displayMoney(amount, display, { round: false })
  }
  return estimateMoney(amount, display)
}

/**
 * The exchange rate itself, as the rate line quotes it: one base unit written
 * in the display currency, at the precision rateAsShown fixes.
 */
export function quotedRate(rate: number, display: Display): string {
  return displayUnit(rateAsShown(rate), display)
}

/** The same rate, serialised for editing in the override field. */
export function rateDraft(rate: number, display: Display): string {
  return formatNumberInput(rateAsShown(rate), display.locale)
}

/**
 * When the provider last repriced. It stamps the quote in UTC; it is shown in
 * the reader's own zone, which is the only one they can check it against.
 */
export function rateStamp(at: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(at),
  )
}

/**
 * Formats one interpolation parameter the view model tagged with a format.
 * `money` is a computed figure and reads as a rounded estimate; `moneyExact`
 * is what the user typed or what a rule states, and is never rounded while it
 * is shown in the currency it was written in. `moneyUnit` is already in the
 * display currency and is never converted. The same distinction between
 * computed and entered holds for `number` and `numberExact`.
 */
export function textParam(param: TextParam, display: Display): string | number {
  switch (param.format) {
    case 'money':
      return estimateMoney(param.value, display)
    case 'moneyExact':
      return exactMoney(param.value, display)
    case 'moneyUnit':
      return displayUnit(param.value, display)
    case 'percent':
      return formatPercent(param.value, display.locale)
    case 'number':
      return formatNumber(param.value, display.locale)
    case 'numberExact':
      // formatNumber caps at two decimals; this is the user's own figure, so
      // it is shown the way the field and the URL hold it.
      return formatNumberInput(param.value, display.locale)
    case 'count':
      // i18next needs the raw number to pick the plural form.
      return param.value
    case 'raw':
      return param.value
  }
}

/** Renders a view-model TextRef: its key, with its numbers formatted. */
export function refText(ref: TextRef, t: TFunction, display: Display): string {
  const params: Record<string, string | number> = {}
  for (const [name, param] of Object.entries(ref.params)) {
    params[name] = textParam(param, display)
  }
  return t(ref.key, params)
}

export function flagText(flag: Flag, t: TFunction, display: Display): string {
  const p = flag.params ?? {}
  switch (flag.code) {
    case 'schemeNotNeeded':
      return t('flags.schemeNotNeeded')
    case 'schemeCapExceeded':
      return t('flags.schemeCapExceeded', { cap: exactMoney(p.cap, display) })
    case 'schemeResidency':
      return t('flags.schemeResidency')
    case 'schemeOwnerOccupier':
      return t('flags.schemeOwnerOccupier')
    case 'htbCapExceeded':
      return t('flags.htbCapExceeded', { cap: exactMoney(p.cap, display) })
    case 'htbCitizenship':
      return t('flags.htbCitizenship')
    case 'htbDetails':
      return t('flags.htbDetails', {
        share: formatPercent(p.sharePct, display.locale),
        single: exactMoney(HTB_INCOME_CAP_SINGLE, display),
        couple: exactMoney(HTB_INCOME_CAP_COUPLE, display),
      })
    case 'guarantorGap':
      return t('flags.guarantorGap')
    case 'fhbResidency':
      return t('flags.fhbResidency')
    case 'fhogPriceCap':
      return t('flags.fhogPriceCap', { cap: exactMoney(FHOG_PRICE_CAP, display) })
    case 'genuineSavings':
      return t('flags.genuineSavings')
    case 'serviceability':
      return t('flags.serviceability', {
        assessed: estimateMoney(p.assessed, display),
        rate: formatPercent(p.ratePct, display.locale),
      })
    case 'financeUnconditional':
      return t('flags.financeUnconditional')
    case 'noPreApproval':
      return t('flags.noPreApproval')
  }
}

export function howText(how: RowHow | null, t: TFunction, display: Display): string {
  if (how === null) return ''
  const p = how.params ?? {}
  let text: string
  switch (how.code) {
    case 'dutyFhbExempt':
      text = t('how.dutyFhbExempt', {
        dutiableValue: estimateMoney(p.dutiableValue, display),
        cap: exactMoney(FHB_DUTY_EXEMPTION_CAP, display),
        zero: exactMoney(0, display),
      })
      break
    case 'dutyFhbConcession':
      text = t('how.dutyFhbConcession', {
        base: estimateMoney(p.base, display),
        dutiableValue: estimateMoney(p.dutiableValue, display),
        cap: exactMoney(FHB_DUTY_EXEMPTION_CAP, display),
        range: exactMoney(FHB_DUTY_CONCESSION_RANGE, display),
      })
      break
    case 'dutyFhbAboveCap':
      text = t('how.dutyFhbAboveCap', {
        dutiableValue: estimateMoney(p.dutiableValue, display),
        cap: exactMoney(FHB_DUTY_CONCESSION_CAP, display),
        bandBase: exactMoney(DUTY_BAND_BASE, display),
        bandThreshold: exactMoney(DUTY_BAND_THRESHOLD, display),
      })
      break
    case 'dutyPpr':
      text = t('how.dutyPpr', { dutiableValue: estimateMoney(p.dutiableValue, display) })
      break
    case 'dutyGeneral':
      text = t('how.dutyGeneral', { dutiableValue: estimateMoney(p.dutiableValue, display) })
      break
    case 'foreignDuty':
      text = t('how.foreignDuty', { dutiableValue: estimateMoney(p.dutiableValue, display) })
      break
    case 'transferFee':
      text = t('how.transferFee', {
        thousands: formatNumber(p.thousands, display.locale),
        base: exactMoney(TRANSFER_FEE_BASE, display),
        perThousand: exactMoney(TRANSFER_FEE_PER_THOUSAND, display),
        unit: exactMoney(TRANSFER_FEE_UNIT, display),
        cap: exactMoney(TRANSFER_FEE_CAP, display),
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
        transfer: exactMoney(PEXA_TRANSFER_FEE, display),
        mortgage: exactMoney(PEXA_MORTGAGE_FEE, display),
      })
      break
    case 'pexaTransferOnly':
      text = t('how.pexaTransferOnly', { transfer: exactMoney(PEXA_TRANSFER_FEE, display) })
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
        loan: estimateMoney(p.loan, display),
        rate: formatPercent(p.ratePct, display.locale),
        lvr: formatPercent(p.lvrPct, display.locale),
      })
      break
    case 'lmiChargedCapitalised':
      text = t('how.lmiChargedCapitalised', {
        loan: estimateMoney(p.loan, display),
        rate: formatPercent(p.ratePct, display.locale),
        lvr: formatPercent(p.lvrPct, display.locale),
      })
      break
    case 'yourFigure':
      text = t('how.yourFigure')
      break
    case 'conveyancing':
      text = t('how.conveyancing')
      break
    case 'settlementAdjustments':
      text = t('how.settlementAdjustments')
      break
    case 'buildingInsurance':
      text = t('how.buildingInsurance')
      break
    case 'grant':
      text = t('how.grant', { cap: exactMoney(FHOG_PRICE_CAP, display) })
      break
    case 'deposit':
      text = t('how.deposit', {
        pct: formatPercent(p.pct, display.locale),
        price: exactMoney(p.price, display),
      })
      break
    case 'costsSubtotal':
      text = t('how.costsSubtotal')
      break
    case 'buffer':
      text = t('how.buffer', {
        count: p.months,
        repayment: estimateMoney(p.repayment, display),
        base: exactMoney(BUFFER_BASE_AMOUNT, display),
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
      price: exactMoney(otp.price, display),
      construction: exactMoney(otp.construction, display),
      dutiableValue: estimateMoney(otp.dutiableValue, display),
    })
    return `${prefix} ${text}`
  }
  return text
}

/**
 * The day a scenario was saved, in the active locale — or null when the stored
 * payload carried no usable date (hand-edited, or written by a version that
 * did not record one). Null rather than a guard at every call site: a skin
 * that forgot the check would print 1 January 1970.
 */
export function savedDate(timestamp: number, locale: string): string | null {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(timestamp)
}
