import {
  SAFE_MAX_BID_BOUND_KEY,
  SAFE_MAX_BID_LABEL_KEY,
  SAFE_MAX_BID_NO_FIGURES_KEY,
  SAFE_MAX_BID_ROUNDING_KEY,
  SAFE_MAX_BID_UNAFFORDABLE_KEY,
  SAFE_MAX_BID_UNBOUNDED_KEY,
} from './fieldLabels'
import { SAFE_MAX_BID_CEILING, SAFE_MAX_BID_UNIT } from './safeMaxBid'
import type { SafeMaxBidResult } from '../types/calculator'
import type { SafeMaxBidField, TextParam, TextRef } from '../types/viewModel'

const moneyExact = (value: number): TextParam => ({ format: 'moneyExact', value })

/**
 * The safe maximum bid, as the sentence that states it.
 *
 * The core says which pocket ran out and therefore which lever moves the
 * number; the skin says it in the user's language and decides how loudly. The
 * rounding unit and the search ceiling are interpolated from the constants the
 * search itself uses, so the sentence cannot come to disagree with the
 * arithmetic; both are rules rather than estimates, so both are quoted exactly.
 *
 * Only a bounded answer carries a figure, and only it carries the rounding
 * disclosure — there is nothing rounded about "no price clears" or "nothing
 * caps this". `status` is what a skin reads to know which of the three it has.
 */
export function buildSafeMaxBidField(bid: SafeMaxBidResult, savings: number): SafeMaxBidField {
  let summary: TextRef
  let detail: TextRef | null = null
  if (bid.status === 'bound') {
    summary = { key: SAFE_MAX_BID_BOUND_KEY[bid.binding], params: {} }
    detail = { key: SAFE_MAX_BID_ROUNDING_KEY, params: { unit: moneyExact(SAFE_MAX_BID_UNIT) } }
  } else if (bid.status === 'unbounded') {
    const price = moneyExact(SAFE_MAX_BID_CEILING)
    summary = { key: SAFE_MAX_BID_UNBOUNDED_KEY, params: { price } }
  } else {
    // No price clears. With nothing saved that is not a verdict on the buyer,
    // it is a field they have not filled in yet, so the copy asks rather than
    // tells; with savings entered, the costs really do outrun them, and the
    // verdict below already says by how much.
    const key = savings > 0 ? SAFE_MAX_BID_UNAFFORDABLE_KEY : SAFE_MAX_BID_NO_FIGURES_KEY
    summary = { key, params: {} }
  }
  return {
    id: 'safeMaxBid',
    labelKey: SAFE_MAX_BID_LABEL_KEY,
    value: bid.price,
    kind: 'money',
    importance: 'primary',
    status: bid.status,
    binding: bid.binding,
    summary,
    detail,
  }
}
