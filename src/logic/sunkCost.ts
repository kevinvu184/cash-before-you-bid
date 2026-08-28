import type { SunkCostSummary, TableRow } from '../types/calculator'

/**
 * Pre-auction costs, multiplied across a property search.
 *
 * A bidder pays for an inspection and a contract review on every property they
 * take to auction. Only one of those auctions ends with a purchase, so those
 * lines are spent again on each attempt, while everything else in the stack —
 * deposit, stamp duty, government fees, LMI, settlement adjustments, building
 * insurance, moving, buffer — is paid once, on the property actually bought.
 *
 * Which rows those are is not decided here: #15 stamps every row with the
 * timing band it falls in, and `src/logic/bands.ts` is the one table saying
 * which is which. This module only multiplies what that table already calls
 * pre-auction, so the two can never drift apart.
 */

/** One property is the floor: you cannot buy without bidding at least once. */
export const PROPERTIES_MIN = 1

/**
 * A ceiling for the URL codec and the field alike. The published research
 * tops out at "seven or more"; 50 is well past any real search and keeps the
 * expected total from running away on a mistyped figure.
 */
export const PROPERTIES_MAX = 50

/**
 * Non-integer counts are honoured rather than rounded: someone budgeting for
 * an *expected* number of attempts (2.5 auctions) is asking a sensible
 * question, and rounding it would silently change their answer.
 */
export function clampProperties(properties: number): number {
  if (!Number.isFinite(properties)) return PROPERTIES_MIN
  return Math.min(PROPERTIES_MAX, Math.max(PROPERTIES_MIN, properties))
}

function isPreAuction(row: TableRow): boolean {
  return row.band === 'preAuction'
}

export function sunkCost(rows: readonly TableRow[], properties: number): SunkCostSummary {
  const count = clampProperties(properties)
  const perProperty = rows.reduce((sum, row) => (isPreAuction(row) ? sum + row.amount : sum), 0)
  const expectedTotal = perProperty * count
  return {
    perProperty,
    properties: count,
    expectedTotal,
    onPropertiesNotWon: expectedTotal - perProperty,
  }
}
