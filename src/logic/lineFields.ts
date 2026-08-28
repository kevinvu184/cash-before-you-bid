import type { TableRow } from '../types/calculator'
import { BAND_SUBTOTAL_FIELD_ID, LINE_FIELD_ID } from '../types/viewModel'
import type { LineField, LineGroup } from '../types/viewModel'
import { groupRowsByBand } from './bands'
import {
  BAND_GUIDANCE,
  BAND_LABEL_KEY,
  BAND_NOTE_KEY,
  BAND_SUBTOTAL_LABEL_KEY,
  ROW_LABEL_KEY,
} from './fieldLabels'

export interface BuiltLines {
  /** Display order: each band's lines, its subtotal, then the grand total. */
  lines: readonly LineField[]
  lineGroups: readonly LineGroup[]
  total: LineField
}

const lineField = (row: TableRow): LineField => ({
  // Only ever called for rows that have a field id.
  id: LINE_FIELD_ID[row.code] as NonNullable<(typeof LINE_FIELD_ID)[typeof row.code]>,
  labelKey: ROW_LABEL_KEY[row.code],
  value: row.amount,
  kind: 'money',
  importance: row.emphasis ? 'primary' : 'secondary',
  how: row.how,
  emphasis: row.emphasis,
  band: row.band,
})

/**
 * Turns calculator rows into the line fields a skin renders, grouped by when
 * the money is due. The core owns the grouping and the subtotal arithmetic —
 * a skin decides only whether to draw the sections — so this is the single
 * place either is done, for the live calculator and the test fixture alike.
 *
 * Rows without a field id are dropped: `costsSubtotal` adds across bands, and
 * the per-band subtotals say what it used to say.
 */
export function buildLineFields(rows: readonly TableRow[]): BuiltLines {
  const lineGroups: LineGroup[] = groupRowsByBand(rows).map((group) => ({
    band: group.band,
    labelKey: BAND_LABEL_KEY[group.band],
    noteKey: BAND_NOTE_KEY[group.band],
    lines: group.rows.filter((row) => LINE_FIELD_ID[row.code] !== null).map(lineField),
    subtotal: {
      id: BAND_SUBTOTAL_FIELD_ID[group.band],
      labelKey: BAND_SUBTOTAL_LABEL_KEY[group.band],
      value: group.subtotal,
      kind: 'money',
      importance: 'primary',
      // A subtotal is its own working: the lines above it.
      how: null,
      emphasis: true,
      band: group.band,
    },
    // Not every band has something to say about how the money is paid.
    guidance: BAND_GUIDANCE[group.band] ?? null,
  }))

  const totalRow = rows.find((row) => row.code === 'total')
  if (totalRow === undefined) throw new Error('calculator produced no total row')
  const total = lineField(totalRow)

  return {
    lines: [...lineGroups.flatMap((group) => [...group.lines, group.subtotal]), total],
    lineGroups,
    total,
  }
}
