import type {
  CalculatorInputs,
  Readiness,
  SafeMaxBidBinding,
  SafeMaxBidResult,
  VerdictPocket,
} from '../types/calculator'
import { calculate } from './calculate'
import { PRICE_MAX } from './urlState'

/**
 * The signature answer, and the inverse of the verdict: how high can this
 * bidder go and still be covered when the hammer falls and again at
 * settlement.
 *
 * ## Why this is a search and not algebra
 *
 * The cash a purchase demands is monotonically non-decreasing in price. Duty
 * never falls as the price rises — not at the $600k and $750k first home buyer
 * thresholds, not at the $960k and $2m general-rate boundaries, and not where
 * a concession or the grant drops out; fees are non-decreasing; and the
 * deposit is a fixed percentage. So the set of prices that clear both checks
 * is an interval starting at zero, and bisection finds its top edge.
 *
 * Inverting the duty brackets algebraically would be a second implementation
 * of the rate table — one that would go quietly wrong the first time a rate
 * changes, and would have to be re-derived for every concession. Instead this
 * evaluates the same `calculate()` the screen is showing at each candidate
 * price, so the ceiling can never disagree with the stack under it.
 *
 * ## What "covered" means here
 *
 * Exactly what `assessReadiness` decided it means, unchanged: the deposit due
 * on the day out of savings, and the statutory band at settlement out of what
 * is left, with the balance of the price against a pre-approval when one was
 * entered. No pre-approval means the finance check does not run, so the
 * ceiling reported is a cash ceiling and the copy says so.
 *
 * ## Rounding
 *
 * The solve runs to the cent, then rounds **down** to `SAFE_MAX_BID_UNIT`.
 * Costs round up and this rounds down, for the same reason — round in
 * whichever direction leaves the user with more margin; the rule is stated
 * once, in `src/data/rates.ts`, and this is the one figure it sends the other
 * way. The answer also has to be a number a bidder can call out over the
 * noise, which a figure like $847,312.46 is not.
 */

/**
 * What the answer is rounded down to. A bid is called out in round numbers,
 * and an auctioneer takes rises in them; anything finer is not a bid.
 */
export const SAFE_MAX_BID_UNIT = 1000

/**
 * Where the search stops. The price field itself clamps to `PRICE_MAX`, so a
 * ceiling above it would be a number the user could not enter.
 */
export const SAFE_MAX_BID_CEILING = PRICE_MAX

/** Half a cent — the same figure the verdict treats as float noise. */
const TOLERANCE = 0.005

/**
 * Bisecting [0, $100m] to half a cent takes log2(2 × 10^10) ≈ 35 steps. The
 * rest is headroom against a wider ceiling or a finer tolerance later; it is a
 * guarantee of termination, never a budget to spend.
 */
export const SAFE_MAX_BID_MAX_ITERATIONS = 60

const shortPockets = (readiness: Readiness): ReadonlySet<VerdictPocket> => {
  const pockets = new Set<VerdictPocket>()
  for (const verdict of readiness.verdicts) {
    for (const check of verdict.checks) {
      if (check.shortfall > 0) pockets.add(check.pocket)
    }
  }
  return pockets
}

function binding(readiness: Readiness): SafeMaxBidBinding {
  const pockets = shortPockets(readiness)
  if (pockets.has('cash')) return pockets.has('loan') ? 'both' : 'cash'
  return pockets.has('loan') ? 'loan' : 'none'
}

const isCovered = (readiness: Readiness): boolean =>
  readiness.verdicts.every((verdict) => verdict.covered)

export function safeMaxBid(inputs: CalculatorInputs): SafeMaxBidResult {
  // The one evaluator: the engine the screen is already showing, at a
  // candidate price and otherwise exactly the inputs the user gave.
  const readinessAt = (price: number): Readiness => calculate({ ...inputs, price }).readiness

  // A price of nothing is the cheapest purchase there is. If it is short, no
  // price clears, and the gap is in the costs that do not move with the price.
  const atZero = readinessAt(0)
  if (!isCovered(atZero)) {
    return { price: 0, exact: 0, binding: binding(atZero), status: 'unaffordable', iterations: 0 }
  }

  const atCeiling = readinessAt(SAFE_MAX_BID_CEILING)
  if (isCovered(atCeiling)) {
    return {
      price: SAFE_MAX_BID_CEILING,
      exact: SAFE_MAX_BID_CEILING,
      binding: 'none',
      status: 'unbounded',
      iterations: 0,
    }
  }

  // Invariant: `low` is covered, `high` is not. Bisection preserves it, so the
  // loop can only ever narrow onto the boundary between them — and the
  // iteration cap means it stops whatever the inputs do.
  let low = 0
  let high = SAFE_MAX_BID_CEILING
  let highReadiness = atCeiling
  let iterations = 0
  while (high - low > TOLERANCE && iterations < SAFE_MAX_BID_MAX_ITERATIONS) {
    iterations += 1
    const mid = low + (high - low) / 2
    const readiness = readinessAt(mid)
    if (isCovered(readiness)) {
      low = mid
    } else {
      high = mid
      highReadiness = readiness
    }
  }

  // Round down to a callable figure. `low` is covered and the floor is below
  // it, so the answer is covered too. The floor can land a whole unit low when
  // the true ceiling sits within a tolerance of a multiple — a $700,000 answer
  // solved as $699,999.998 — so the next multiple up is offered back to the
  // engine: it is only taken if the engine itself says it is covered.
  const floored = Math.max(0, Math.floor(low / SAFE_MAX_BID_UNIT) * SAFE_MAX_BID_UNIT)
  const next = floored + SAFE_MAX_BID_UNIT
  const price = next <= SAFE_MAX_BID_CEILING && isCovered(readinessAt(next)) ? next : floored

  return { price, exact: low, binding: binding(highReadiness), status: 'bound', iterations }
}
