import type { RowCode, TableRow, TimingBand } from '../types/calculator'

// Which band each line falls in — one table, so the answer to "when is this
// due?" lives in exactly one place. `calculate` stamps every row from here and
// the UI never decides banding for itself.
//
// The two summary rows are `null`: they add across bands, so they cannot sit
// inside one. `costsSubtotal` in particular is superseded on screen by the
// per-band subtotals; it stays in the result for callers that still want a
// costs-only figure (the purchase-costs stat tile reads `totals.purchaseCosts`).
const ROW_BAND: Record<RowCode, TimingBand | null> = {
  // Spent win or lose: you pay for these before you know whether you own it.
  buildingAndPest: 'preAuction',
  conveyancing: 'preAuction',

  // Due on the fall of the hammer.
  deposit: 'auctionDay',

  // Due weeks later, on the settlement date.
  stampDuty: 'atSettlement',
  foreignDuty: 'atSettlement',
  transferFee: 'atSettlement',
  mortgageFee: 'atSettlement',
  pexaFees: 'atSettlement',
  lmi: 'atSettlement',
  lenderFees: 'atSettlement',
  settlementAdjustments: 'atSettlement',
  buildingInsurance: 'atSettlement',
  grant: 'atSettlement',

  // Not due on the day, but the money still has to exist.
  moving: 'afterSettlement',
  buffer: 'afterSettlement',

  costsSubtotal: null,
  total: null,
}

/** The order the bands are shown in: the order a purchase actually runs. */
export const BAND_ORDER: readonly TimingBand[] = [
  'preAuction',
  'auctionDay',
  'atSettlement',
  'afterSettlement',
]

export function rowBand(code: RowCode): TimingBand | null {
  return ROW_BAND[code]
}

export interface BandGroup {
  band: TimingBand
  rows: TableRow[]
  subtotal: number
}

/**
 * Splits banded rows into sections in `BAND_ORDER`, each with its own subtotal.
 * Summary rows (band `null`) are left out — the caller places those itself.
 * A band with no rows is dropped rather than shown empty.
 *
 * Subtotals are exact sums of the exact row amounts, so a band total is rounded
 * once for display rather than assembled from rounded parts.
 */
export function groupRowsByBand(rows: readonly TableRow[]): BandGroup[] {
  return BAND_ORDER.map((band) => {
    const banded = rows.filter((row) => row.band === band)
    return { band, rows: banded, subtotal: banded.reduce((sum, row) => sum + row.amount, 0) }
  }).filter((group) => group.rows.length > 0)
}
