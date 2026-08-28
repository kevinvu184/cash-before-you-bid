import { useMemo } from 'react'
import { safeMaxBid } from '../logic/safeMaxBid'
import type { CalculatorInputs, SafeMaxBidResult } from '../types/calculator'

/**
 * The safe maximum bid, recomputed only when an input it actually reads
 * changes.
 *
 * It is the one figure on the page that is not a single pass of the engine:
 * the search evaluates `calculate()` about forty times, which measures at
 * ~0.3ms on a laptop and several times that on the phone this is built for.
 * Memoising on the inputs object alone would never hit — a numeric field
 * reports every keystroke, including one that parses to the number already
 * held, and `setField` builds a fresh state object for each — so the memo is
 * keyed on the values instead.
 *
 * The price is deliberately not part of that key. The search replaces it at
 * every step, so the answer provably cannot depend on it, and the price field
 * is the one people type in most: keying on it would put forty engine passes
 * behind every keypress in the field that needs them least.
 *
 * The key is built by walking the inputs rather than by listing them, so a
 * calculator input added later is covered here without anyone having to
 * remember to come back.
 */

/** Inputs the search provably does not read. */
const IGNORED: ReadonlySet<string> = new Set([
  // Overwritten at every step of the search, so it cannot change the answer.
  'price',
  // Not a calculator input at all: the UI language rides in the same state.
  'lang',
])

/** Every input that can move the answer, in a fixed order. */
export function safeMaxBidKey(inputs: CalculatorInputs): string {
  return Object.entries(inputs)
    .filter(([name]) => !IGNORED.has(name))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([name, value]) => `${name}:${String(value)}`)
    .join('|')
}

export function useSafeMaxBid(inputs: CalculatorInputs): SafeMaxBidResult {
  const key = safeMaxBidKey(inputs)
  // The key stands in for `inputs`: it is exactly the values the search reads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => safeMaxBid(inputs), [key])
}
