import type { RowCode, SunkCostSummary, TableRow } from '../types/calculator'

/**
 * Pre-auction costs, multiplied across a property search.
 *
 * A bidder pays for an inspection and a contract review on every property they
 * take to auction. Only one of those auctions ends with a purchase, so those
 * lines are spent again on each attempt, while everything else in the stack —
 * deposit, stamp duty, government fees, LMI, settlement adjustments, building
 * insurance, moving, buffer — is paid once, on the property actually bought.
 *
 * Which rows are pre-auction is deliberately one list in one module. Issue #15
 * gives every row a timing band; when that lands, the body of `isPreAuction`
 * becomes `row.band === 'preAuction'` and nothing else here changes.
 */
export const PRE_AUCTION_ROWS: ReadonlySet<RowCode> = new Set<RowCode>([
  'conveyancing',
  'buildingAndPest',
])

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
  return PRE_AUCTION_ROWS.has(row.code)
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
