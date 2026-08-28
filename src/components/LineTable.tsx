import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { groupRowsByBand } from '../logic/bands'
import type { RowCode, TableRow, TimingBand } from '../types/calculator'
import {
  bandLabel,
  bandNote,
  bandSubtotalLabel,
  estimateRowAmount,
  howText,
  rowLabel,
} from './resultText'

interface LineTableProps {
  rows: TableRow[]
}

/**
 * Three columns from 820px. On a phone the working — "How it was worked out" —
 * would either force a horizontal scroll or shrink the figures, so it moves
 * behind a per-row disclosure instead. Row codes are unique, so they key both
 * the rows and which disclosures are open, which keeps a row open across a
 * recalculation.
 *
 * Rows are grouped by when the money is due: one `<tbody>` per timing band,
 * each headed by its name and closed by its own subtotal, with the grand total
 * in a final group of its own. The band subtotals supersede the flat
 * `costsSubtotal` row, which adds across bands and so is not placed in one;
 * `groupRowsByBand` leaves it out and it is not shown here.
 */
export function LineTable({ rows }: LineTableProps) {
  const { t } = useTranslation()
  const wide = useMediaQuery('(min-width: 820px)')
  const [open, setOpen] = useState<ReadonlySet<RowCode>>(() => new Set())

  const toggle = (code: RowCode) =>
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(code)) next.add(code)
      return next
    })

  const groups = groupRowsByBand(rows)
  const total = rows.find((row) => row.code === 'total')

  const renderRow = (row: TableRow) =>
    wide ? (
      <WideRow key={row.code} row={row} />
    ) : (
      <MobileRow
        key={row.code}
        row={row}
        open={open.has(row.code)}
        onToggle={() => toggle(row.code)}
      />
    )

  return (
    <table className="lines">
      <thead>
        <tr>
          <th scope="col">{t('table.line')}</th>
          <th scope="col" className="n">
            {t('table.amount')}
          </th>
          {wide ? (
            <th scope="col" className="m">
              {t('table.how')}
            </th>
          ) : null}
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.band}>
          <BandHead band={group.band} wide={wide} />
          {group.rows.map(renderRow)}
          <BandSubtotal band={group.band} subtotal={group.subtotal} wide={wide} />
        </tbody>
      ))}
      {total ? <tbody>{renderRow(total)}</tbody> : null}
    </table>
  )
}

interface BandHeadProps {
  band: TimingBand
  wide: boolean
}

function BandHead({ band, wide }: BandHeadProps) {
  const { t } = useTranslation()
  return (
    <tr className="band-head">
      {/* `rowgroup` scope: this heading labels the rows of its own tbody. */}
      <th scope="rowgroup" colSpan={wide ? 3 : 2}>
        <span className="band-name">{bandLabel(band, t)}</span>
        <span className="band-note">{bandNote(band, t)}</span>
      </th>
    </tr>
  )
}

interface BandSubtotalProps {
  band: TimingBand
  subtotal: number
  wide: boolean
}

function BandSubtotal({ band, subtotal, wide }: BandSubtotalProps) {
  const { t, i18n } = useTranslation()
  return (
    <tr className="band-subtotal">
      <td>{bandSubtotalLabel(band, t)}</td>
      <td className="n">{estimateRowAmount(subtotal, i18n.language)}</td>
      {wide ? <td className="m" /> : null}
    </tr>
  )
}

function WideRow({ row }: { row: TableRow }) {
  const { t, i18n } = useTranslation()
  return (
    <tr className={row.emphasis ? 'total' : undefined}>
      <td>{rowLabel(row.code, t)}</td>
      <td className="n">{estimateRowAmount(row.amount, i18n.language)}</td>
      <td className="m">{howText(row.how, t, i18n.language)}</td>
    </tr>
  )
}

interface MobileRowProps {
  row: TableRow
  open: boolean
  onToggle: () => void
}

function MobileRow({ row, open, onToggle }: MobileRowProps) {
  const { t, i18n } = useTranslation()
  const how = howText(row.how, t, i18n.language)
  const expanded = open && how !== ''
  const className = [row.emphasis ? 'total' : '', expanded ? 'expanded' : '']
    .filter(Boolean)
    .join(' ')
  const formulaId = `how-${row.code}`

  return (
    <Fragment>
      <tr className={className || undefined}>
        <td>
          {how !== '' ? (
            <button
              type="button"
              className="line-disclosure"
              aria-expanded={expanded}
              aria-controls={formulaId}
              onClick={onToggle}
            >
              <span>{rowLabel(row.code, t)}</span>
              <span className="line-disclosure-mark" aria-hidden="true">
                {expanded ? '−' : '+'}
              </span>
            </button>
          ) : (
            rowLabel(row.code, t)
          )}
        </td>
        <td className="n">{estimateRowAmount(row.amount, i18n.language)}</td>
      </tr>
      {/* Always rendered, hidden by CSS when collapsed, so aria-controls always
          resolves. Never `.total`: the ink rule belongs to the row above, and
          the continuation carries that row's bottom hairline. */}
      {how !== '' ? (
        <tr className={expanded ? 'formula shown' : 'formula'}>
          <td className="m" id={formulaId} colSpan={2}>
            {how}
          </td>
        </tr>
      ) : null}
    </Fragment>
  )
}
