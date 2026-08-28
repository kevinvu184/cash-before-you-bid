import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDisplay } from '../hooks/useDisplay'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { RowCode, TableRow } from '../types/calculator'
import { AMOUNT_HEADER_KEYS } from './currencyLabels'
import { approxRowAmount, howText, rowLabel } from './resultText'

interface LineTableProps {
  rows: TableRow[]
}

/**
 * Three columns from 820px. On a phone the working — "How it was worked out" —
 * would either force a horizontal scroll or shrink the figures, so it moves
 * behind a per-row disclosure instead. Row codes are unique, so they key both
 * the rows and which disclosures are open, which keeps a row open across a
 * recalculation.
 */
export function LineTable({ rows }: LineTableProps) {
  const { t } = useTranslation()
  const display = useDisplay()
  const wide = useMediaQuery('(min-width: 820px)')
  const [open, setOpen] = useState<ReadonlySet<RowCode>>(() => new Set())

  const toggle = (code: RowCode) =>
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(code)) next.add(code)
      return next
    })

  return (
    <table className="lines">
      <thead>
        <tr>
          <th scope="col">{t('table.line')}</th>
          <th scope="col" className="n">
            {/* The column is headed by the currency its figures are written
                in, so it says what it holds without a word of prose. */}
            {t(AMOUNT_HEADER_KEYS[display.currency])}
          </th>
          {wide ? (
            <th scope="col" className="m">
              {t('table.how')}
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) =>
          wide ? (
            <tr key={row.code} className={row.emphasis ? 'total' : undefined}>
              <td>{rowLabel(row.code, t)}</td>
              <td className="n">{approxRowAmount(row.amount, t, display)}</td>
              <td className="m">{howText(row.how, t, display)}</td>
            </tr>
          ) : (
            <MobileRow
              key={row.code}
              row={row}
              open={open.has(row.code)}
              onToggle={() => toggle(row.code)}
            />
          ),
        )}
      </tbody>
    </table>
  )
}

interface MobileRowProps {
  row: TableRow
  open: boolean
  onToggle: () => void
}

function MobileRow({ row, open, onToggle }: MobileRowProps) {
  const { t } = useTranslation()
  const display = useDisplay()
  const how = howText(row.how, t, display)
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
        <td className="n">{approxRowAmount(row.amount, t, display)}</td>
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
