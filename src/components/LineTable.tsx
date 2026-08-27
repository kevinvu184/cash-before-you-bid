import { Fragment, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { TableRow } from '../types/calculator'

const slug = (label: string): string => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')

interface LineTableProps {
  rows: TableRow[]
}

/**
 * Three columns from 820px. On a phone the working — "How it was worked out" —
 * would either force a horizontal scroll or shrink the figures, so it moves
 * behind a per-row disclosure instead. Row labels are unique, so they key both
 * the rows and which disclosures are open, which keeps a row open across a
 * recalculation.
 */
export function LineTable({ rows }: LineTableProps) {
  const wide = useMediaQuery('(min-width: 820px)')
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = (label: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(label)) next.add(label)
      return next
    })

  return (
    <table className="lines">
      <thead>
        <tr>
          <th scope="col">Line</th>
          <th scope="col" className="n">
            $
          </th>
          {wide ? (
            <th scope="col" className="m">
              How it was worked out
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) =>
          wide ? (
            <tr key={row.label} className={row.emphasis ? 'total' : undefined}>
              <td>{row.label}</td>
              <td className="n">{row.formatted}</td>
              <td className="m">{row.how}</td>
            </tr>
          ) : (
            <MobileRow
              key={row.label}
              row={row}
              open={open.has(row.label)}
              onToggle={() => toggle(row.label)}
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
  const expanded = open && Boolean(row.how)
  const className = [row.emphasis ? 'total' : '', expanded ? 'expanded' : '']
    .filter(Boolean)
    .join(' ')
  const formulaId = `how-${slug(row.label)}`

  return (
    <Fragment>
      <tr className={className || undefined}>
        <td>
          {row.how ? (
            <button
              type="button"
              className="line-disclosure"
              aria-expanded={expanded}
              aria-controls={formulaId}
              onClick={onToggle}
            >
              <span>{row.label}</span>
              <span className="line-disclosure-mark" aria-hidden="true">
                {expanded ? '−' : '+'}
              </span>
            </button>
          ) : (
            row.label
          )}
        </td>
        <td className="n">{row.formatted}</td>
      </tr>
      {/* Always rendered, hidden by CSS when collapsed, so aria-controls always
          resolves. Never `.total`: the ink rule belongs to the row above, and
          the continuation carries that row's bottom hairline. */}
      {row.how ? (
        <tr className={expanded ? 'formula shown' : 'formula'}>
          <td className="m" id={formulaId} colSpan={2}>
            {row.how}
          </td>
        </tr>
      ) : null}
    </Fragment>
  )
}
