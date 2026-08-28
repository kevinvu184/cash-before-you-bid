import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaQuery } from '../../hooks/useMediaQuery'

import type { FlagKind } from '../../types/calculator'
import type {
  Field,
  LineField,
  NoteEntry,
  ResultsViewModel,
  SourcesValue,
  StatField,
  SunkCostViewModel,
  TextRef,
} from '../../types/viewModel'
import { estimateMoney, estimateRowAmount, flagText, howText, refText } from '../shared/text'

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
      <div className="stat-value">{estimateMoney(stat.value, i18n.language)}</div>
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
 *
 * Rows are grouped by when the money is due: one `<tbody>` per timing band,
 * headed by its name and closed by its own subtotal, with the grand total in a
 * final group of its own. The core does the grouping and the arithmetic; this
 * only draws it.
 */
function LineTable({ results }: { results: ResultsViewModel }) {
  const { t } = useTranslation()
  const wide = useMediaQuery('(min-width: 820px)')
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const renderLine = (line: LineField) =>
    wide ? (
      <WideRow key={line.id} line={line} />
    ) : (
      <MobileRow
        key={line.id}
        line={line}
        open={open.has(line.id)}
        onToggle={() => toggle(line.id)}
      />
    )

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
      {results.lineGroups.map((group) => (
        <tbody key={group.band}>
          <tr className="band-head">
            {/* `rowgroup` scope: this heading labels the rows of its own tbody. */}
            <th scope="rowgroup" colSpan={wide ? 3 : 2}>
              <span className="band-name">{t(group.labelKey)}</span>
              <span className="band-note">{t(group.noteKey)}</span>
            </th>
          </tr>
          {group.lines.map(renderLine)}
          <SubtotalRow line={group.subtotal} wide={wide} />
        </tbody>
      ))}
      <tbody>{renderLine(results.total)}</tbody>
    </table>
  )
}

/**
 * A band's closing figure. It has no working of its own — the lines above it
 * are the working — so it is a plain row at every width rather than a
 * disclosure that would open on nothing.
 */
function SubtotalRow({ line, wide }: { line: LineField; wide: boolean }) {
  const { t, i18n } = useTranslation()
  return (
    <tr className="band-subtotal" data-field={line.id} data-importance={line.importance}>
      <td>{t(line.labelKey)}</td>
      <td className="n">{estimateRowAmount(line.value, i18n.language)}</td>
      {wide ? <td className="m" /> : null}
    </tr>
  )
}

function WideRow({ line }: { line: LineField }) {
  const { t, i18n } = useTranslation()
  return (
    <tr
      className={line.emphasis ? 'total' : undefined}
      data-field={line.id}
      data-importance={line.importance}
    >
      <td>{t(line.labelKey)}</td>
      <td className="n">{estimateRowAmount(line.value, i18n.language)}</td>
      <td className="m">{howText(line.how, t, i18n.language)}</td>
    </tr>
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
        <td className="n">{estimateRowAmount(line.value, i18n.language)}</td>
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

/**
 * Sits under the results: the single place that says every computed figure on
 * the page is a rounded estimate. Because it carries that once, no figure is
 * marked individually.
 */
function EstimateNote({ field }: { field: Field<readonly TextRef[]> }) {
  const { t, i18n } = useTranslation()
  // Joined in JS so the paragraph is one text node with single spaces, rather
  // than JSX whitespace rules deciding the gaps.
  const text = field.value.map((ref) => refText(ref, t, i18n.language)).join(' ')
  return (
    <p
      className="small estimate-note"
      data-field={field.id}
      data-importance={field.importance}
    >
      {text}
    </p>
  )
}

/**
 * The pre-auction spend, under the table and above the estimate note. Its own
 * section, not two more tiles in the stat row: the figures above are what
 * buying this one property costs, and this money is spent whether or not the
 * auction is won.
 */
function SunkCost({ sunk }: { sunk: SunkCostViewModel }) {
  const { t, i18n } = useTranslation()
  const research = sunk.research.value
  return (
    <section className="sunk">
      <h3>{t(sunk.headingKey)}</h3>
      <div className="stats">
        {sunk.stats.map((stat) => (
          <Stat key={stat.id} stat={stat} />
        ))}
      </div>
      <p
        className="small"
        data-field={sunk.framing.id}
        data-importance={sunk.framing.importance}
      >
        {refText(sunk.framing.value, t, i18n.language)}
      </p>
      <p
        className="small"
        data-field={sunk.research.id}
        data-importance={sunk.research.importance}
      >
        {t(research.beforeKey)}
        <a href={research.href}>{t(research.linkKey)}</a>
        {t(research.afterKey)}
      </p>
    </section>
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
      <SunkCost sunk={results.sunkCost} />
      <EstimateNote field={results.estimateNote} />
      <RulesNotes
        headingKey={results.notesHeadingKey}
        notes={results.notes}
        sources={results.sources}
      />
    </main>
  )
}
