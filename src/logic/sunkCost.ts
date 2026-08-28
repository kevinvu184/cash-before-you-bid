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
 * Which rows are pre-auction is not decided here. #15 gave every row a timing
 * band, stamped from the one table in `bands.ts`; this module reads that field
 * and owns nothing about membership. A row added to the pre-auction band there
 * is multiplied here with no change to this file.
 *
 * One consequence, deliberate and stated on screen: `conveyancing` is a single
 * input covering the contract review *and* the settlement work, and #15 banded
 * it pre-auction whole. Only the review part is really paid per attempt, so the
 * whole-search figure reads high. Budgeting high is the safe direction for this
 * tool, and the per-property copy says which way it errs. Splitting the input
 * in two is the fix, and it is an input change, not a change here.
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
