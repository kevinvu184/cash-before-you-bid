import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { formatAud, formatRowAmount } from '../../logic/format'
import type { FlagKind } from '../../types/calculator'
import type {
  Field,
  LineField,
  NoteEntry,
  ResultsViewModel,
  SourcesValue,
  StatField,
} from '../../types/viewModel'
import { flagText, howText, refText } from '../shared/text'

// Ledger has no alert or toast component, so the flags are rule-divided strips
// with the state carried by a mono label in one of the desaturated semantics.
const KIND_KEYS: Record<FlagKind, string> = {
  warn: 'flagKinds.warn',
  note: 'flagKinds.note',
  ok: 'flagKinds.ok',
}

function FlagList({
  field,
  regionLabelKey,
}: {
  field: ResultsViewModel['flags']
  regionLabelKey: string
}) {
  const { t, i18n } = useTranslation()
  return (
    <div
      className="flags"
      role="region"
      aria-label={t(regionLabelKey)}
      data-field={field.id}
      data-importance={field.importance}
    >
      {field.value.map((flag) => (
        <p className={`flag ${flag.kind}`} key={`${flag.kind}:${flag.code}`}>
          <span className="flag-label">{t(KIND_KEYS[flag.kind])}</span>
          <span className="flag-text">{flagText(flag, t, i18n.language)}</span>
        </p>
      ))}
    </div>
  )
}

function Stat({ stat }: { stat: StatField }) {
  const { t, i18n } = useTranslation()
  const emphasis = stat.importance === 'primary'
  return (
    <div
      className={emphasis ? 'stat emphasis' : 'stat'}
      data-field={stat.id}
      data-importance={stat.importance}
    >
      <div className="stat-label">{t(stat.labelKey)}</div>
      <div className="stat-value">{formatAud(stat.value, i18n.language)}</div>
      <div className="stat-sub">
        {stat.detail === null ? '' : refText(stat.detail, t, i18n.language)}
      </div>
    </div>
  )
}

/**
 * Three columns from 820px. On a phone the working — "How it was worked out" —
 * would either force a horizontal scroll or shrink the figures, so it moves
 * behind a per-row disclosure instead. Field ids are unique, so they key both
 * the rows and which disclosures are open, which keeps a row open across a
 * recalculation. The working stays in the DOM either way.
 */
function LineTable({ results }: { results: ResultsViewModel }) {
  const { t, i18n } = useTranslation()
  const wide = useMediaQuery('(min-width: 820px)')
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <table className="lines">
      <thead>
        <tr>
          <th scope="col">{t(results.tableHeadingKeys.line)}</th>
          <th scope="col" className="n">
            {t(results.tableHeadingKeys.amount)}
          </th>
          {wide ? (
            <th scope="col" className="m">
              {t(results.tableHeadingKeys.how)}
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {results.lines.map((line) =>
          wide ? (
            <tr
              key={line.id}
              className={line.emphasis ? 'total' : undefined}
              data-field={line.id}
              data-importance={line.importance}
            >
              <td>{t(line.labelKey)}</td>
              <td className="n">{formatRowAmount(line.value, i18n.language)}</td>
              <td className="m">{howText(line.how, t, i18n.language)}</td>
            </tr>
          ) : (
            <MobileRow
              key={line.id}
              line={line}
              open={open.has(line.id)}
              onToggle={() => toggle(line.id)}
            />
          ),
        )}
      </tbody>
    </table>
  )
}

interface MobileRowProps {
  line: LineField
  open: boolean
  onToggle: () => void
}

function MobileRow({ line, open, onToggle }: MobileRowProps) {
  const { t, i18n } = useTranslation()
  const how = howText(line.how, t, i18n.language)
  const expanded = open && how !== ''
  const className = [line.emphasis ? 'total' : '', expanded ? 'expanded' : '']
    .filter(Boolean)
    .join(' ')
  const formulaId = `how-${line.id}`

  return (
    <Fragment>
      <tr className={className || undefined} data-field={line.id} data-importance={line.importance}>
        <td>
          {how !== '' ? (
            <button
              type="button"
              className="line-disclosure"
              aria-expanded={expanded}
              aria-controls={formulaId}
              onClick={onToggle}
            >
              <span>{t(line.labelKey)}</span>
              <span className="line-disclosure-mark" aria-hidden="true">
                {expanded ? '−' : '+'}
              </span>
            </button>
          ) : (
            t(line.labelKey)
          )}
        </td>
        <td className="n">{formatRowAmount(line.value, i18n.language)}</td>
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

function RulesNotes({
  headingKey,
  notes,
  sources,
}: {
  headingKey: string
  notes: Field<readonly NoteEntry[]>
  sources: Field<SourcesValue>
}) {
  const { t } = useTranslation()
  const link = sources.value
  return (
    <section className="notes">
      <h3>{t(headingKey)}</h3>
      <ul className="small" data-field={notes.id} data-importance={notes.importance}>
        {notes.value.map((entry) => (
          <li key={entry.id}>
            {entry.parts.map((part) => (
              <Fragment key={part.termKey}>
                <strong>{t(part.termKey)}</strong>
                {t(part.bodyKey)}
              </Fragment>
            ))}
          </li>
        ))}
      </ul>
      <p className="small" data-field={sources.id} data-importance={sources.importance}>
        {t(link.beforeKey)}
        <a href={link.href}>{t(link.linkKey)}</a>
        {t(link.afterKey)}
      </p>
    </section>
  )
}

export function Results({ results }: { results: ResultsViewModel }) {
  return (
    <main className="results">
      <FlagList field={results.flags} regionLabelKey={results.flagsRegionLabelKey} />
      <div className="stats">
        {results.stats.map((stat) => (
          <Stat key={stat.id} stat={stat} />
        ))}
      </div>
      <LineTable results={results} />
      <RulesNotes
        headingKey={results.notesHeadingKey}
        notes={results.notes}
        sources={results.sources}
      />
    </main>
  )
}
