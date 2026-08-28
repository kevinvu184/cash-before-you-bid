import {
  VERDICT_FINANCE_NOT_CHECKED_KEY,
  VERDICT_LABEL_KEY,
  VERDICT_SHORTFALL_KEY,
  VERDICT_STATUS_KEY,
  VERDICT_SUMMARY_KEY,
} from './fieldLabels'
import type { Readiness } from '../types/calculator'
import { VERDICT_FIELD_ID } from '../types/viewModel'
import type { TextParam, TextRef, VerdictField } from '../types/viewModel'

const money = (value: number): TextParam => ({ format: 'money', value })
const moneyExact = (value: number): TextParam => ({ format: 'moneyExact', value })

/**
 * The two verdicts, as the sentences that state them. The core says which
 * check failed, by how much and out of which pocket; the skin says it in the
 * user's language and decides what covered and short look like.
 *
 * The verdicts are never merged and their shortfalls are never added together
 * on screen: a cash gap is closed by saving more or bidding less, and a loan
 * gap by a bigger pre-approval. Reporting one figure would hide which.
 */
export function buildVerdictFields(readiness: Readiness): readonly VerdictField[] {
  return readiness.verdicts.map((verdict): VerdictField => {
    const short = verdict.checks.filter((check) => check.shortfall > 0)
    const details: TextRef[] = short.map((check) => ({
      key: VERDICT_SHORTFALL_KEY[check.code],
      params: {
        shortfall: money(check.shortfall),
        required: money(check.required),
        // Savings and a pre-approval are quoted as entered; what is left of
        // the savings after the deposit is a figure we computed, so it reads
        // as the estimate it is.
        available:
          check.code === 'settlementCash' ? money(check.available) : moneyExact(check.available),
      },
    }))
    // A check that did not run is not a check that passed: say so where the
    // user is reading the settlement verdict, not only in the flag list.
    if (verdict.code === 'atSettlement' && !readiness.financeChecked) {
      details.push({ key: VERDICT_FINANCE_NOT_CHECKED_KEY, params: {} })
    }
    const status = verdict.covered ? 'covered' : 'short'
    const cash = verdict.checks.find((check) => check.pocket === 'cash')
    const keys = VERDICT_SUMMARY_KEY[verdict.code]
    // With one pocket short the headline quotes its gap. With two, it quotes
    // none: adding a cash gap to a loan gap would produce a figure that is not
    // a sum of anything a bidder can act on, and the details below give each.
    const summaryKey = verdict.covered
      ? keys.covered
      : short.length > 1 && keys.shortMultiple !== undefined
        ? keys.shortMultiple
        : keys.short
    return {
      id: VERDICT_FIELD_ID[verdict.code],
      labelKey: VERDICT_LABEL_KEY[verdict.code],
      value: verdict.shortfall,
      kind: 'money',
      importance: 'primary',
      code: verdict.code,
      status,
      statusKey: VERDICT_STATUS_KEY[status],
      summary: {
        key: summaryKey,
        params: {
          required: money(cash?.required ?? 0),
          shortfall: money(short.length === 1 ? short[0].shortfall : verdict.shortfall),
        },
      },
      details,
    }
  })
}
